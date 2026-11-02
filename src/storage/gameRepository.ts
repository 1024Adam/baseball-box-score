import { calculateGameStats } from '../domain/statCalculator';
import {
  BattingOutcome,
  EventCategory,
  FieldingOutcome,
  Game,
  GameEvent,
  GameStatus,
  SheetGameRow,
} from '../domain/types';
import { getStorageDriver, StorageDriver } from './database';

export interface RecordEventInput {
  gameId: string;
  category: EventCategory;
  eventType: BattingOutcome | FieldingOutcome;
  rbi?: number;
  inning?: number | null;
  positionAtEvent?: string | null;
}

export interface GameMetadataPatch {
  gameDate?: string;
  position?: string;
  opponent?: string;
  notes?: string;
  status?: GameStatus;
  syncedToSheets?: boolean;
  syncedAt?: string | null;
}

export interface GameWithStats {
  game: Game;
  stats: SheetGameRow;
  events: GameEvent[];
  eventCount: number;
}

function generateUuid(): string {
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class GameRepository {
  private customDriver?: StorageDriver;

  constructor(driver?: StorageDriver) {
    this.customDriver = driver;
  }

  private async driver(): Promise<StorageDriver> {
    if (this.customDriver) {
      await this.customDriver.init();
      return this.customDriver;
    }
    return getStorageDriver();
  }

  /**
   * Returns today's active game if one is already in progress, or if a completed game already
   * exists for `todayDate` returns the most recent game for `todayDate` (preventing phantom
   * "Game 2" creation on tab switches or app relaunches after syncing). Only creates a new
   * game automatically when no game exists for `todayDate` at all.
   */
  async getOrCreateActiveGame(
    todayDate: string,
    defaultPosition = 'RCF'
  ): Promise<Game> {
    const store = await this.driver();
    const games = await store.getAllGames();

    const activeToday = games.find(
      (g) => g.gameDate === todayDate && g.status === 'active'
    );
    if (activeToday) {
      return activeToday;
    }

    const latestToday = games.find((g) => g.gameDate === todayDate);
    if (latestToday) {
      return latestToday;
    }

    return this.createNewGame({
      gameDate: todayDate,
      position: defaultPosition,
    });
  }

  /**
   * Starts a new game when the user explicitly taps `+ New Game`:
   * - If any existing active game has `0` recorded events, reuses/resets that empty game
   *   (updating its `gameDate` and `position`) rather than creating orphan `0-for-0` games.
   * - Marks any existing active games that have `> 0` recorded events as `status: 'completed'`
   *   before returning/creating the active game.
   */
  async startNewGame(
    todayDate: string,
    defaultPosition = 'RCF'
  ): Promise<Game> {
    const store = await this.driver();
    const games = await store.getAllGames();
    const activeGames = games.filter((g) => g.status === 'active');

    let emptyActiveToReuse: Game | null = null;

    for (const activeGame of activeGames) {
      const events = await store.getEventsForGame(activeGame.id);
      if (events.length === 0) {
        if (!emptyActiveToReuse) {
          emptyActiveToReuse = activeGame;
        }
      } else {
        await this.updateGameMetadata(activeGame.id, {
          status: 'completed',
        });
      }
    }

    if (emptyActiveToReuse) {
      return this.updateGameMetadata(emptyActiveToReuse.id, {
        gameDate: todayDate,
        position: defaultPosition.trim() || 'RCF',
        opponent: '',
        notes: '',
        status: 'active',
        syncedToSheets: false,
        syncedAt: null,
      });
    }

    return this.createNewGame({
      gameDate: todayDate,
      position: defaultPosition,
    });
  }

  /**
   * Explicitly creates a new game (used on first launch or for doubleheaders on the same date).
   */
  async createNewGame(input: {
    gameDate: string;
    position?: string;
    opponent?: string;
    notes?: string;
  }): Promise<Game> {
    const store = await this.driver();
    const now = new Date().toISOString();

    const game: Game = {
      id: generateUuid(),
      gameDate: input.gameDate,
      position: input.position?.trim() || 'RCF',
      opponent: input.opponent?.trim() ?? '',
      notes: input.notes?.trim() ?? '',
      status: 'active',
      syncedToSheets: false,
      syncedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await store.insertGame(game);
    return game;
  }

  async getGameById(gameId: string): Promise<Game | null> {
    const store = await this.driver();
    return store.getGameById(gameId);
  }

  async getEventsForGame(gameId: string): Promise<GameEvent[]> {
    const store = await this.driver();
    return store.getEventsForGame(gameId);
  }

  async getGameWithStats(gameId: string): Promise<GameWithStats | null> {
    const store = await this.driver();
    const game = await store.getGameById(gameId);
    if (!game) {
      return null;
    }

    const events = await store.getEventsForGame(gameId);
    const stats = calculateGameStats(game, events);

    return {
      game,
      stats,
      events,
      eventCount: events.length,
    };
  }

  /**
   * Appends the next `sequence_num` event for a game and marks the game updated.
   * Note: HR defaults to 1 RBI if `rbi` is not explicitly provided.
   */
  async recordEvent(input: RecordEventInput): Promise<GameEvent> {
    const store = await this.driver();
    const game = await store.getGameById(input.gameId);
    if (!game) {
      throw new Error(`Cannot record event for unknown game: ${input.gameId}`);
    }

    const existingEvents = await store.getEventsForGame(input.gameId);
    const maxSeq = existingEvents.reduce(
      (max, e) => (e.sequenceNum > max ? e.sequenceNum : max),
      0
    );

    const defaultRbi =
      input.category === 'batting' && input.eventType === 'HR' ? 1 : 0;
    const rbi =
      input.category === 'batting'
        ? Math.max(0, Math.min(4, input.rbi ?? defaultRbi))
        : 0;

    const now = new Date().toISOString();
    const event: GameEvent = {
      id: generateUuid(),
      gameId: input.gameId,
      sequenceNum: maxSeq + 1,
      category: input.category,
      eventType: input.eventType,
      rbi,
      inning: input.inning ?? null,
      positionAtEvent: input.positionAtEvent ?? game.position,
      createdAt: now,
    };

    await store.insertEvent(event);
    await store.updateGame({
      ...game,
      syncedToSheets: false,
      updatedAt: now,
    });

    return event;
  }

  /**
   * Removes the most recent event in the game and returns the removed event (or `null` if none).
   */
  async undoLastEvent(gameId: string): Promise<GameEvent | null> {
    const store = await this.driver();
    const events = await store.getEventsForGame(gameId);
    if (events.length === 0) {
      return null;
    }

    const lastEvent = events[events.length - 1];
    await store.deleteEventById(lastEvent.id);

    const game = await store.getGameById(gameId);
    if (game) {
      await store.updateGame({
        ...game,
        syncedToSheets: false,
        updatedAt: new Date().toISOString(),
      });
    }

    return lastEvent;
  }

  /**
   * Updates game metadata (`gameDate`, `position`, `opponent`, `notes`, `status`, `syncedToSheets`).
   */
  async updateGameMetadata(
    gameId: string,
    patch: GameMetadataPatch
  ): Promise<Game> {
    const store = await this.driver();
    const existing = await store.getGameById(gameId);
    if (!existing) {
      throw new Error(`Game not found: ${gameId}`);
    }

    const now = new Date().toISOString();
    const syncedToSheets =
      patch.syncedToSheets !== undefined
        ? patch.syncedToSheets
        : existing.syncedToSheets;
    const syncedAt =
      patch.syncedAt !== undefined
        ? patch.syncedAt
        : patch.syncedToSheets === true
        ? now
        : patch.syncedToSheets === false
        ? null
        : existing.syncedAt;

    const updated: Game = {
      ...existing,
      gameDate: patch.gameDate ?? existing.gameDate,
      position: patch.position ?? existing.position,
      opponent: patch.opponent ?? existing.opponent,
      notes: patch.notes ?? existing.notes,
      status: patch.status ?? existing.status,
      syncedToSheets,
      syncedAt,
      updatedAt: now,
    };

    await store.updateGame(updated);
    return updated;
  }

  async deleteGame(gameId: string): Promise<void> {
    const store = await this.driver();
    await store.deleteGame(gameId);
  }

  /**
   * Returns all games ordered newest first with their derived 23-column `SheetGameRow` and event count.
   */
  async listGamesWithStats(): Promise<
    Array<{ game: Game; stats: SheetGameRow; eventCount: number }>
  > {
    const store = await this.driver();
    const games = await store.getAllGames();
    const results: Array<{
      game: Game;
      stats: SheetGameRow;
      eventCount: number;
    }> = [];

    for (const game of games) {
      const events = await store.getEventsForGame(game.id);
      const stats = calculateGameStats(game, events);
      results.push({
        game,
        stats,
        eventCount: events.length,
      });
    }

    return results;
  }
}

export const defaultGameRepository = new GameRepository();
