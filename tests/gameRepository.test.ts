import { beforeEach, describe, expect, it } from 'vitest';
import {
  KeyValueBackend,
  WebStorageDriver,
} from '../src/storage/database';
import { GameRepository } from '../src/storage/gameRepository';
import {
  DEFAULT_USER_PREFERENCES,
  PreferencesStore,
} from '../src/storage/preferencesStore';

class MockPersistentKeyValueBackend implements KeyValueBackend {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) ?? null) : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}

describe('GameRepository & PreferencesStore Integration', () => {
  let kvBackend: MockPersistentKeyValueBackend;
  let driver: WebStorageDriver;
  let repo: GameRepository;
  let prefsStore: PreferencesStore;

  beforeEach(async () => {
    kvBackend = new MockPersistentKeyValueBackend();
    driver = new WebStorageDriver(kvBackend, 'test_baseball_db');
    await driver.init();
    repo = new GameRepository(driver);
    prefsStore = new PreferencesStore(driver);
  });

  it('creates an active game, appends 6 events, undoes the last event, and recomputes the exact SheetGameRow', async () => {
    // 1. Create or load today's active game
    const game = await repo.getOrCreateActiveGame('2026-10-31', 'SS');
    expect(game.gameDate).toBe('2026-10-31');
    expect(game.position).toBe('SS');
    expect(game.status).toBe('active');
    expect(game.syncedToSheets).toBe(false);

    // Calling getOrCreateActiveGame again for the same date returns the same active game
    const sameGame = await repo.getOrCreateActiveGame('2026-10-31', 'CF');
    expect(sameGame.id).toBe(game.id);

    // 2. Append 6 events:
    // #1: 1B (0 RBI)
    // #2: FO (0 RBI)
    // #3: HR (defaults to 1 RBI)
    // #4: BB (0 RBI)
    // #5: PO (fielding)
    // #6: K (0 RBI) -> last event we will undo
    const evt1 = await repo.recordEvent({
      gameId: game.id,
      category: 'batting',
      eventType: '1B',
      rbi: 0,
    });
    const evt2 = await repo.recordEvent({
      gameId: game.id,
      category: 'batting',
      eventType: 'FO',
      rbi: 0,
    });
    const evt3 = await repo.recordEvent({
      gameId: game.id,
      category: 'batting',
      eventType: 'HR',
    });
    const evt4 = await repo.recordEvent({
      gameId: game.id,
      category: 'batting',
      eventType: 'BB',
      rbi: 0,
    });
    const evt5 = await repo.recordEvent({
      gameId: game.id,
      category: 'fielding',
      eventType: 'PO',
    });
    const evt6 = await repo.recordEvent({
      gameId: game.id,
      category: 'batting',
      eventType: 'K',
      rbi: 0,
    });

    expect(evt1.sequenceNum).toBe(1);
    expect(evt2.sequenceNum).toBe(2);
    expect(evt3.sequenceNum).toBe(3);
    expect(evt3.rbi).toBe(1); // HR defaults to 1 RBI
    expect(evt4.sequenceNum).toBe(4);
    expect(evt5.sequenceNum).toBe(5);
    expect(evt6.sequenceNum).toBe(6);

    // Verify stats with all 6 events:
    // Batting: 1B, FO, HR, BB, K -> 4 AB, 2 H, 1 BB, 1 RBI, 1 FO, 1 K
    const afterSix = await repo.getGameWithStats(game.id);
    expect(afterSix?.eventCount).toBe(6);
    expect(afterSix?.stats.ab).toBe(4);
    expect(afterSix?.stats.h).toBe(2);
    expect(afterSix?.stats.k).toBe(1);

    // 3. Undo the last event (#6: K)
    const undone = await repo.undoLastEvent(game.id);
    expect(undone?.id).toBe(evt6.id);
    expect(undone?.eventType).toBe('K');

    const afterUndo = await repo.getGameWithStats(game.id);
    expect(afterUndo?.eventCount).toBe(5);
    expect(afterUndo?.stats.k).toBe(0);
    expect(afterUndo?.stats.ab).toBe(3);

    const remainingEvents = await repo.getEventsForGame(game.id);
    expect(remainingEvents).toHaveLength(5);
    expect(remainingEvents.map((e) => e.sequenceNum)).toEqual([1, 2, 3, 4, 5]);
    expect(remainingEvents.map((e) => e.eventType)).toEqual([
      '1B',
      'FO',
      'HR',
      'BB',
      'PO',
    ]);

    // 4. Recompute the exact 23-column SheetGameRow
    // Remaining plays: 1B (0 RBI), FO (0 RBI), HR (1 RBI), BB (0 RBI), PO
    // AB = 3, H = 2, AVG = 2/3, 1B = 1, HR = 1, BB = 1, OBP = 3/4 = 0.75, SLG = 5/3, OPS = 0.75 + 5/3, FO = 1, PO = 1, FLD PCT = 1.000
    const finalSummary = await repo.getGameWithStats(game.id);
    expect(finalSummary).not.toBeNull();
    expect(finalSummary!.stats.date).toBe('2026-10-31');
    expect(finalSummary!.stats.position).toBe('SS');
    expect(finalSummary!.stats.ab).toBe(3);
    expect(finalSummary!.stats.h).toBe(2);
    expect(finalSummary!.stats.avg).toBeCloseTo(2 / 3, 5);
    expect(finalSummary!.stats.singles).toBe(1);
    expect(finalSummary!.stats.hr).toBe(1);
    expect(finalSummary!.stats.bb).toBe(1);
    expect(finalSummary!.stats.obp).toBeCloseTo(0.75, 5);
    expect(finalSummary!.stats.slg).toBeCloseTo(5 / 3, 5);
    expect(finalSummary!.stats.ops).toBeCloseTo(0.75 + 5 / 3, 5);
    expect(finalSummary!.stats.rbi).toBe(1);
    expect(finalSummary!.stats.fo).toBe(1);
    expect(finalSummary!.stats.po).toBe(1);
    expect(finalSummary!.stats.fldPct).toBe(1.0);
  });

  it('restores the active game state and events after simulated app/browser reload with zero data loss', async () => {
    expect(DEFAULT_USER_PREFERENCES).toEqual({
      lastUsedPosition: 'RCF',
    });

    const game = await repo.getOrCreateActiveGame('2026-10-31', 'CF');
    await repo.recordEvent({
      gameId: game.id,
      category: 'batting',
      eventType: '2B',
      rbi: 2,
    });
    await repo.recordEvent({
      gameId: game.id,
      category: 'fielding',
      eventType: 'ASSIST',
    });
    await prefsStore.setLastUsedPosition('CF');

    // Simulate reloading the web app / restarting the native app by instantiating
    // a brand-new driver, repository, and preferences store over the same underlying storage
    const reloadedDriver = new WebStorageDriver(kvBackend, 'test_baseball_db');
    await reloadedDriver.init();
    const reloadedRepo = new GameRepository(reloadedDriver);
    const reloadedPrefsStore = new PreferencesStore(reloadedDriver);

    const restoredPrefs = await reloadedPrefsStore.getPreferences();
    expect(restoredPrefs).toEqual({
      lastUsedPosition: 'CF',
    });

    const restoredGame = await reloadedRepo.getOrCreateActiveGame(
      '2026-10-31',
      restoredPrefs.lastUsedPosition
    );
    expect(restoredGame.id).toBe(game.id);
    expect(restoredGame.position).toBe('CF');

    const gamesList = await reloadedRepo.listGamesWithStats();
    expect(gamesList).toHaveLength(1);
    expect(gamesList[0].eventCount).toBe(2);
    expect(gamesList[0].stats.doubles).toBe(1);
    expect(gamesList[0].stats.rbi).toBe(2);
    expect(gamesList[0].stats.assists).toBe(1);
  });

  it('reopens today\'s completed game on getOrCreateActiveGame without spawning a phantom Game 2, and creates Game 2 only via startNewGame', async () => {
    const game1 = await repo.getOrCreateActiveGame('2026-10-31', 'SS');
    await repo.recordEvent({
      gameId: game1.id,
      category: 'batting',
      eventType: '1B',
    });

    // Mark game 1 completed and synced (as happens when copying data row)
    const updatedGame1 = await repo.updateGameMetadata(game1.id, {
      position: 'SS',
      opponent: 'Tigers',
      status: 'completed',
      syncedToSheets: true,
    });
    expect(updatedGame1.status).toBe('completed');
    expect(updatedGame1.syncedToSheets).toBe(true);
    expect(updatedGame1.syncedAt).not.toBeNull();

    // Switching tabs or relaunching the app calls getOrCreateActiveGame:
    // It must return the completed game for today instead of spawning a phantom 0-for-0 game!
    const reopenedToday = await repo.getOrCreateActiveGame('2026-10-31', '2B');
    expect(reopenedToday.id).toBe(game1.id);
    expect(await repo.listGamesWithStats()).toHaveLength(1);

    // Explicitly tapping "+ New Game" via startNewGame creates Game 2 (doubleheader)
    const game2 = await repo.startNewGame('2026-10-31', '2B');
    expect(game2.id).not.toBe(game1.id);
    expect(game2.status).toBe('active');
    expect(game2.position).toBe('2B');

    const allGames = await repo.listGamesWithStats();
    expect(allGames).toHaveLength(2);
  });

  it('reuses an existing empty active game when startNewGame is called to prevent duplicate 0-for-0 games', async () => {
    const emptyGame = await repo.getOrCreateActiveGame('2026-10-30', 'LF');
    expect(await repo.getEventsForGame(emptyGame.id)).toHaveLength(0);

    // Tapping "+ New Game" when the active game has 0 events reuses & updates that game
    const reusedGame = await repo.startNewGame('2026-10-31', 'CF');
    expect(reusedGame.id).toBe(emptyGame.id);
    expect(reusedGame.gameDate).toBe('2026-10-31');
    expect(reusedGame.position).toBe('CF');
    expect(reusedGame.status).toBe('active');
    expect(await repo.listGamesWithStats()).toHaveLength(1);

    // Once an event is recorded, calling startNewGame marks the first game completed and creates a new one
    await repo.recordEvent({
      gameId: reusedGame.id,
      category: 'batting',
      eventType: 'HR',
    });

    const nextGame = await repo.startNewGame('2026-10-31', 'SS');
    expect(nextGame.id).not.toBe(reusedGame.id);
    expect(nextGame.status).toBe('active');

    const completedPrev = await repo.getGameById(reusedGame.id);
    expect(completedPrev?.status).toBe('completed');
    expect(await repo.listGamesWithStats()).toHaveLength(2);
  });

  it('deletes a full game and all of its associated events', async () => {
    const game = await repo.getOrCreateActiveGame('2026-11-01', 'RCF');
    await repo.recordEvent({
      gameId: game.id,
      category: 'batting',
      eventType: '1B',
    });
    await repo.recordEvent({
      gameId: game.id,
      category: 'fielding',
      eventType: 'PO',
    });

    expect(await repo.listGamesWithStats()).toHaveLength(1);

    await repo.deleteGame(game.id);

    expect(await repo.listGamesWithStats()).toHaveLength(0);
    expect(await repo.getEventsForGame(game.id)).toHaveLength(0);
  });
});
