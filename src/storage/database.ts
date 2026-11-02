import {
  BattingOutcome,
  EventCategory,
  FieldingOutcome,
  Game,
  GameEvent,
  GameStatus,
} from '../domain/types';

/**
 * Exact SQLite schema from ARCHITECTURE.md section 4.1.
 */
export const SQLITE_SCHEMA_MIGRATIONS = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY NOT NULL,
    game_date TEXT NOT NULL,
    position TEXT NOT NULL DEFAULT 'UTL',
    opponent TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    synced_to_sheets INTEGER NOT NULL DEFAULT 0,
    synced_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_events (
    id TEXT PRIMARY KEY NOT NULL,
    game_id TEXT NOT NULL,
    sequence_num INTEGER NOT NULL,
    category TEXT NOT NULL,
    event_type TEXT NOT NULL,
    rbi INTEGER NOT NULL DEFAULT 0,
    inning INTEGER,
    position_at_event TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_game_events_game_seq
    ON game_events(game_id, sequence_num);

CREATE TABLE IF NOT EXISTS user_preferences (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
`;

export interface StorageDriver {
  readonly kind: 'sqlite' | 'web_storage';
  init(): Promise<void>;
  getAllGames(): Promise<Game[]>;
  getGameById(gameId: string): Promise<Game | null>;
  insertGame(game: Game): Promise<void>;
  updateGame(game: Game): Promise<void>;
  deleteGame(gameId: string): Promise<void>;
  getEventsForGame(gameId: string): Promise<GameEvent[]>;
  insertEvent(event: GameEvent): Promise<void>;
  deleteEventById(eventId: string): Promise<void>;
  getPreference(key: string): Promise<string | null>;
  setPreference(key: string, value: string, updatedAt: string): Promise<void>;
  clearAll(): Promise<void>;
}

export interface KeyValueBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class InMemoryKeyValueBackend implements KeyValueBackend {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) ?? null) : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }
}

const DEFAULT_MEMORY_BACKEND = new InMemoryKeyValueBackend();

function resolveDefaultKeyValueBackend(): KeyValueBackend {
  if (
    typeof globalThis !== 'undefined' &&
    'localStorage' in globalThis &&
    globalThis.localStorage &&
    typeof globalThis.localStorage.getItem === 'function'
  ) {
    return globalThis.localStorage;
  }
  return DEFAULT_MEMORY_BACKEND;
}

const WEB_STORE_KEY = 'baseball_box_score_db_v1';

interface SerializedWebDatabase {
  schemaVersion: number;
  games: Game[];
  gameEvents: GameEvent[];
  preferences: Record<string, string>;
}

/**
 * Storage driver backed by browser `localStorage` (or an injectable key-value store for WSL tests).
 * Provides synchronous `<1ms` persistence across browser reloads while maintaining the exact
 * relational semantics (`games`, `game_events` with `ON DELETE CASCADE`, and `user_preferences`).
 */
export class WebStorageDriver implements StorageDriver {
  readonly kind = 'web_storage' as const;
  private kv: KeyValueBackend;
  private storageKey: string;

  constructor(kv?: KeyValueBackend, storageKey = WEB_STORE_KEY) {
    this.kv = kv ?? resolveDefaultKeyValueBackend();
    this.storageKey = storageKey;
  }

  private readState(): SerializedWebDatabase {
    const raw = this.kv.getItem(this.storageKey);
    if (!raw) {
      return {
        schemaVersion: 1,
        games: [],
        gameEvents: [],
        preferences: {},
      };
    }

    try {
      const parsed = JSON.parse(raw) as Partial<SerializedWebDatabase>;
      return {
        schemaVersion: parsed.schemaVersion ?? 1,
        games: Array.isArray(parsed.games) ? parsed.games : [],
        gameEvents: Array.isArray(parsed.gameEvents) ? parsed.gameEvents : [],
        preferences:
          parsed.preferences && typeof parsed.preferences === 'object'
            ? parsed.preferences
            : {},
      };
    } catch {
      return {
        schemaVersion: 1,
        games: [],
        gameEvents: [],
        preferences: {},
      };
    }
  }

  private writeState(state: SerializedWebDatabase): void {
    this.kv.setItem(this.storageKey, JSON.stringify(state));
  }

  async init(): Promise<void> {
    const state = this.readState();
    this.writeState(state);
  }

  async getAllGames(): Promise<Game[]> {
    const { games } = this.readState();
    return [...games].sort((a, b) => {
      if (a.gameDate !== b.gameDate) {
        return b.gameDate.localeCompare(a.gameDate);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  async getGameById(gameId: string): Promise<Game | null> {
    const { games } = this.readState();
    return games.find((g) => g.id === gameId) ?? null;
  }

  async insertGame(game: Game): Promise<void> {
    const state = this.readState();
    const existingIndex = state.games.findIndex((g) => g.id === game.id);
    if (existingIndex >= 0) {
      state.games[existingIndex] = { ...game };
    } else {
      state.games.push({ ...game });
    }
    this.writeState(state);
  }

  async updateGame(game: Game): Promise<void> {
    const state = this.readState();
    const idx = state.games.findIndex((g) => g.id === game.id);
    if (idx < 0) {
      throw new Error(`Game not found: ${game.id}`);
    }
    state.games[idx] = { ...game };
    this.writeState(state);
  }

  async deleteGame(gameId: string): Promise<void> {
    const state = this.readState();
    state.games = state.games.filter((g) => g.id !== gameId);
    state.gameEvents = state.gameEvents.filter((e) => e.gameId !== gameId);
    this.writeState(state);
  }

  async getEventsForGame(gameId: string): Promise<GameEvent[]> {
    const { gameEvents } = this.readState();
    return gameEvents
      .filter((e) => e.gameId === gameId)
      .sort((a, b) => a.sequenceNum - b.sequenceNum);
  }

  async insertEvent(event: GameEvent): Promise<void> {
    const state = this.readState();
    state.gameEvents.push({ ...event });
    this.writeState(state);
  }

  async deleteEventById(eventId: string): Promise<void> {
    const state = this.readState();
    state.gameEvents = state.gameEvents.filter((e) => e.id !== eventId);
    this.writeState(state);
  }

  async getPreference(key: string): Promise<string | null> {
    const state = this.readState();
    return Object.prototype.hasOwnProperty.call(state.preferences, key)
      ? state.preferences[key]
      : null;
  }

  async setPreference(
    key: string,
    value: string,
    _updatedAt: string
  ): Promise<void> {
    const state = this.readState();
    state.preferences[key] = value;
    this.writeState(state);
  }

  async clearAll(): Promise<void> {
    this.kv.removeItem(this.storageKey);
  }
}

interface SqliteGameRow {
  id: string;
  game_date: string;
  position: string;
  opponent: string;
  notes: string;
  status: string;
  synced_to_sheets: number;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
}

interface SqliteGameEventRow {
  id: string;
  game_id: string;
  sequence_num: number;
  category: string;
  event_type: string;
  rbi: number;
  inning: number | null;
  position_at_event: string | null;
  created_at: string;
}

function mapSqliteRowToGame(row: SqliteGameRow): Game {
  return {
    id: row.id,
    gameDate: row.game_date,
    position: row.position,
    opponent: row.opponent,
    notes: row.notes,
    status: (row.status as GameStatus) ?? 'active',
    syncedToSheets: Boolean(row.synced_to_sheets),
    syncedAt: row.synced_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSqliteRowToEvent(row: SqliteGameEventRow): GameEvent {
  return {
    id: row.id,
    gameId: row.game_id,
    sequenceNum: row.sequence_num,
    category: row.category as EventCategory,
    eventType: row.event_type as BattingOutcome | FieldingOutcome,
    rbi: row.rbi,
    inning: row.inning ?? null,
    positionAtEvent: row.position_at_event ?? null,
    createdAt: row.created_at,
  };
}

interface ExpoSqliteDatabaseLike {
  execAsync(source: string): Promise<void>;
  runAsync(
    source: string,
    ...params: (string | number | null)[]
  ): Promise<unknown>;
  getFirstAsync<T>(
    source: string,
    ...params: (string | number | null)[]
  ): Promise<T | null>;
  getAllAsync<T>(
    source: string,
    ...params: (string | number | null)[]
  ): Promise<T[]>;
}

/**
 * Native SQLite driver backed by `expo-sqlite` on iOS / Android.
 */
export class ExpoSqliteDriver implements StorageDriver {
  readonly kind = 'sqlite' as const;
  private dbPromise: Promise<ExpoSqliteDatabaseLike> | null = null;
  private dbName: string;

  constructor(dbName = 'baseball_box_score.db') {
    this.dbName = dbName;
  }

  private async getDb(): Promise<ExpoSqliteDatabaseLike> {
    if (!this.dbPromise) {
      this.dbPromise = (async () => {
        // Dynamic import so Node/Web environments do not load native SQLite bindings unless needed
        const SQLite = await import('expo-sqlite');
        const db = (await SQLite.openDatabaseAsync(
          this.dbName
        )) as unknown as ExpoSqliteDatabaseLike;
        await db.execAsync(SQLITE_SCHEMA_MIGRATIONS);
        return db;
      })();
    }
    return this.dbPromise;
  }

  async init(): Promise<void> {
    await this.getDb();
  }

  async getAllGames(): Promise<Game[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<SqliteGameRow>(
      `SELECT * FROM games ORDER BY game_date DESC, created_at DESC`
    );
    return rows.map(mapSqliteRowToGame);
  }

  async getGameById(gameId: string): Promise<Game | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<SqliteGameRow>(
      `SELECT * FROM games WHERE id = ?`,
      gameId
    );
    return row ? mapSqliteRowToGame(row) : null;
  }

  async insertGame(game: Game): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO games (
        id, game_date, position, opponent, notes, status, synced_to_sheets, synced_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      game.id,
      game.gameDate,
      game.position,
      game.opponent,
      game.notes,
      game.status,
      game.syncedToSheets ? 1 : 0,
      game.syncedAt,
      game.createdAt,
      game.updatedAt
    );
  }

  async updateGame(game: Game): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `UPDATE games SET
        game_date = ?,
        position = ?,
        opponent = ?,
        notes = ?,
        status = ?,
        synced_to_sheets = ?,
        synced_at = ?,
        updated_at = ?
      WHERE id = ?`,
      game.gameDate,
      game.position,
      game.opponent,
      game.notes,
      game.status,
      game.syncedToSheets ? 1 : 0,
      game.syncedAt,
      game.updatedAt,
      game.id
    );
  }

  async deleteGame(gameId: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`DELETE FROM game_events WHERE game_id = ?`, gameId);
    await db.runAsync(`DELETE FROM games WHERE id = ?`, gameId);
  }

  async getEventsForGame(gameId: string): Promise<GameEvent[]> {
    const db = await this.getDb();
    const rows = await db.getAllAsync<SqliteGameEventRow>(
      `SELECT * FROM game_events WHERE game_id = ? ORDER BY sequence_num ASC`,
      gameId
    );
    return rows.map(mapSqliteRowToEvent);
  }

  async insertEvent(event: GameEvent): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT INTO game_events (
        id, game_id, sequence_num, category, event_type, rbi, inning, position_at_event, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      event.id,
      event.gameId,
      event.sequenceNum,
      event.category,
      event.eventType,
      event.rbi,
      event.inning ?? null,
      event.positionAtEvent ?? null,
      event.createdAt
    );
  }

  async deleteEventById(eventId: string): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(`DELETE FROM game_events WHERE id = ?`, eventId);
  }

  async getPreference(key: string): Promise<string | null> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM user_preferences WHERE key = ?`,
      key
    );
    return row ? row.value : null;
  }

  async setPreference(
    key: string,
    value: string,
    updatedAt: string
  ): Promise<void> {
    const db = await this.getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO user_preferences (key, value, updated_at) VALUES (?, ?, ?)`,
      key,
      value,
      updatedAt
    );
  }

  async clearAll(): Promise<void> {
    const db = await this.getDb();
    await db.execAsync(`
      DELETE FROM game_events;
      DELETE FROM games;
      DELETE FROM user_preferences;
    `);
  }
}

let activeDriver: StorageDriver | null = null;

function isNativeMobileRuntime(): boolean {
  if (typeof navigator !== 'undefined' && navigator.product === 'ReactNative') {
    return true;
  }
  return false;
}

/**
 * Returns the singleton platform-aware storage driver, initializing it if needed.
 * Uses `ExpoSqliteDriver` on native iOS/Android and `WebStorageDriver` on Web and in Node tests.
 */
export async function getStorageDriver(): Promise<StorageDriver> {
  if (!activeDriver) {
    activeDriver = isNativeMobileRuntime()
      ? new ExpoSqliteDriver()
      : new WebStorageDriver();
    await activeDriver.init();
  }
  return activeDriver;
}

/**
 * Overrides the active storage driver (useful for isolated tests or custom storage backends).
 */
export function setStorageDriver(driver: StorageDriver | null): void {
  activeDriver = driver;
}
