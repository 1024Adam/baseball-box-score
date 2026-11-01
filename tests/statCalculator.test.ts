import { describe, expect, it } from 'vitest';
import {
  calculateAggregateStats,
  calculateGameStats,
} from '../src/domain/statCalculator';
import {
  BattingOutcome,
  FieldingOutcome,
  GameEvent,
} from '../src/domain/types';

function makeBattingEvent(
  sequenceNum: number,
  eventType: BattingOutcome,
  rbi = 0,
  gameId = 'game-1'
): GameEvent {
  return {
    id: `evt-${sequenceNum}`,
    gameId,
    sequenceNum,
    category: 'batting',
    eventType,
    rbi,
    createdAt: '2026-10-31T18:00:00.000Z',
  };
}

function makeFieldingEvent(
  sequenceNum: number,
  eventType: FieldingOutcome,
  gameId = 'game-1'
): GameEvent {
  return {
    id: `evt-${sequenceNum}`,
    gameId,
    sequenceNum,
    category: 'fielding',
    eventType,
    rbi: 0,
    createdAt: '2026-10-31T18:00:00.000Z',
  };
}

describe('statCalculator', () => {
  it('calculates a standard multi-hit game with batting and fielding plays accurately', () => {
    const events: GameEvent[] = [
      makeBattingEvent(1, '1B', 0),
      makeBattingEvent(2, '2B', 1),
      makeBattingEvent(3, 'HR', 2),
      makeBattingEvent(4, 'BB', 0),
      makeBattingEvent(5, 'K', 0),
      makeBattingEvent(6, 'FO', 0),
      makeBattingEvent(7, 'GO', 0),
      makeFieldingEvent(8, 'PO'),
      makeFieldingEvent(9, 'PO'),
      makeFieldingEvent(10, 'ASSIST'),
      makeFieldingEvent(11, 'ASSIST'),
      makeFieldingEvent(12, 'ASSIST'),
      makeFieldingEvent(13, 'E_FLD'),
    ];

    const row = calculateGameStats(
      { gameDate: '2026-10-31', position: 'SS' },
      events
    );

    // 1B + 2B + HR + K + FO + GO = 6 AB (BB excluded from AB)
    expect(row.date).toBe('2026-10-31');
    expect(row.position).toBe('SS');
    expect(row.ab).toBe(6);
    expect(row.h).toBe(3);
    expect(row.singles).toBe(1);
    expect(row.doubles).toBe(1);
    expect(row.triples).toBe(0);
    expect(row.hr).toBe(1);
    expect(row.eBatting).toBe(0);
    expect(row.bb).toBe(1);
    expect(row.rbi).toBe(3);
    expect(row.fc).toBe(0);
    expect(row.k).toBe(1);
    expect(row.fo).toBe(1);
    expect(row.go).toBe(1);

    // Rate stats:
    // AVG = 3 / 6 = 0.500
    // OBP = (3 + 1) / (6 + 1) = 4 / 7 ≈ 0.571428...
    // SLG = (1 + 2*1 + 3*0 + 4*1) / 6 = 7 / 6 ≈ 1.166666...
    // OPS = 4/7 + 7/6 = 73/42 ≈ 1.738095...
    expect(row.avg).toBeCloseTo(0.5, 5);
    expect(row.obp).toBeCloseTo(4 / 7, 5);
    expect(row.slg).toBeCloseTo(7 / 6, 5);
    expect(row.ops).toBeCloseTo(4 / 7 + 7 / 6, 5);

    // Fielding: 2 PO, 3 Assists, 1 Error -> 5 / 6 ≈ 0.833333...
    expect(row.po).toBe(2);
    expect(row.assists).toBe(3);
    expect(row.errors).toBe(1);
    expect(row.fldPct).toBeCloseTo(5 / 6, 5);
  });

  it('counts E_BAT (Reached on Error) and FC (Fielder\'s Choice) as AB without incrementing H', () => {
    const events: GameEvent[] = [
      makeBattingEvent(1, 'E_BAT', 1),
      makeBattingEvent(2, 'FC', 1),
      makeBattingEvent(3, '1B', 0),
    ];

    const row = calculateGameStats(
      { gameDate: '2026-10-31', position: '2B' },
      events
    );

    expect(row.ab).toBe(3);
    expect(row.h).toBe(1);
    expect(row.eBatting).toBe(1);
    expect(row.fc).toBe(1);
    expect(row.rbi).toBe(2);
    expect(row.avg).toBeCloseTo(1 / 3, 5);
    expect(row.obp).toBeCloseTo(1 / 3, 5);

    // Optional OBP mode that includes E_BAT in on-base numerator:
    const rowWithRoeObp = calculateGameStats(
      { gameDate: '2026-10-31', position: '2B' },
      events,
      { includeReachedOnErrorInObp: true }
    );
    expect(rowWithRoeObp.obp).toBeCloseTo(2 / 3, 5);
  });

  it('tracks Fly Outs (FO, including line outs) and Ground Outs (GO) separately and both increment AB', () => {
    const events: GameEvent[] = [
      makeBattingEvent(1, 'FO', 0),
      makeBattingEvent(2, 'FO', 1), // Sac/productive fly out with RBI
      makeBattingEvent(3, 'GO', 0),
      makeBattingEvent(4, '3B', 0),
    ];

    const row = calculateGameStats(
      { gameDate: '2026-10-31', position: 'CF' },
      events
    );

    expect(row.fo).toBe(2);
    expect(row.go).toBe(1);
    expect(row.triples).toBe(1);
    expect(row.ab).toBe(4);
    expect(row.h).toBe(1);
    expect(row.rbi).toBe(1);
    expect(row.avg).toBeCloseTo(0.25, 5);
    expect(row.slg).toBeCloseTo(0.75, 5);
  });

  it('handles a walk-only game (0 AB, 2 BB -> AVG = null, SLG = null, OBP = 1.000)', () => {
    const events: GameEvent[] = [
      makeBattingEvent(1, 'BB', 0),
      makeBattingEvent(2, 'BB', 1),
    ];

    const row = calculateGameStats(
      { gameDate: '2026-10-31', position: 'LF' },
      events
    );

    expect(row.ab).toBe(0);
    expect(row.h).toBe(0);
    expect(row.bb).toBe(2);
    expect(row.rbi).toBe(1);
    expect(row.avg).toBeNull();
    expect(row.slg).toBeNull();
    expect(row.obp).toBe(1.0);
    expect(row.ops).toBe(1.0);
  });

  it('handles a zero-chance fielding game (0 PO, 0 A, 0 E -> FLD PCT = null)', () => {
    const events: GameEvent[] = [makeBattingEvent(1, '1B', 0)];

    const row = calculateGameStats(
      { gameDate: '2026-10-31', position: 'DH' },
      events
    );

    expect(row.po).toBe(0);
    expect(row.assists).toBe(0);
    expect(row.errors).toBe(0);
    expect(row.fldPct).toBeNull();
  });

  it('handles a brand-new empty game with zero events (all rate stats null)', () => {
    const row = calculateGameStats(
      { gameDate: '2026-10-31', position: 'SS' },
      []
    );

    expect(row.ab).toBe(0);
    expect(row.h).toBe(0);
    expect(row.avg).toBeNull();
    expect(row.obp).toBeNull();
    expect(row.slg).toBeNull();
    expect(row.ops).toBeNull();
    expect(row.fldPct).toBeNull();
  });

  it('aggregates multiple games accurately into season/career totals', () => {
    const game1 = calculateGameStats(
      { gameDate: '2026-10-30', position: 'SS' },
      [
        makeBattingEvent(1, '1B', 0),
        makeBattingEvent(2, 'HR', 2),
        makeFieldingEvent(3, 'PO'),
        makeFieldingEvent(4, 'ASSIST'),
      ]
    );

    const game2 = calculateGameStats(
      { gameDate: '2026-10-31', position: '2B' },
      [
        makeBattingEvent(1, '2B', 1),
        makeBattingEvent(2, 'BB', 0),
        makeBattingEvent(3, 'GO', 0),
        makeFieldingEvent(4, 'PO'),
        makeFieldingEvent(5, 'E_FLD'),
      ]
    );

    const aggregate = calculateAggregateStats([game1, game2]);

    expect(aggregate.games).toBe(2);
    expect(aggregate.position).toBe('SS, 2B');
    expect(aggregate.ab).toBe(4);
    expect(aggregate.h).toBe(3);
    expect(aggregate.bb).toBe(1);
    expect(aggregate.pa).toBe(5);
    expect(aggregate.totalBases).toBe(1 + 2 + 4); // 1B + 2B + HR = 7
    expect(aggregate.rbi).toBe(3);
    expect(aggregate.avg).toBeCloseTo(3 / 4, 5);
    expect(aggregate.obp).toBeCloseTo(4 / 5, 5);
    expect(aggregate.slg).toBeCloseTo(7 / 4, 5);
    expect(aggregate.ops).toBeCloseTo(4 / 5 + 7 / 4, 5);
    expect(aggregate.po).toBe(2);
    expect(aggregate.assists).toBe(1);
    expect(aggregate.errors).toBe(1);
    expect(aggregate.totalChances).toBe(4);
    expect(aggregate.fldPct).toBeCloseTo(3 / 4, 5);
  });
});
