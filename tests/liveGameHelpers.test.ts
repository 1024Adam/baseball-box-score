import { describe, expect, it } from 'vitest';
import {
  extractAvailableYears,
  filterSheetGameRows,
  formatLiveBattingLine,
  formatLiveFieldingLine,
  getTodayDateString,
  shiftDateString,
} from '../src/domain/liveGameHelpers';
import {
  calculateAggregateStats,
  calculateGameStats,
} from '../src/domain/statCalculator';
import { PLAYER_POSITIONS } from '../src/domain/types';

describe('liveGameHelpers', () => {
  it('includes all 13 official player positions', () => {
    expect(PLAYER_POSITIONS).toEqual([
      'C',
      'P',
      '1B',
      '2B',
      '3B',
      'SS',
      'LF',
      'LCF',
      'CF',
      'RCF',
      'RF',
      'RV',
      'UTL',
    ]);
  });

  it('formats local dates and shifts dates across month/year boundaries cleanly', () => {
    const sampleDate = new Date(2026, 10, 1, 22, 30, 0); // Nov 1, 2026 10:30 PM local
    expect(getTodayDateString(sampleDate)).toBe('2026-11-01');
    expect(shiftDateString('2026-11-01', -1)).toBe('2026-10-31');
    expect(shiftDateString('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftDateString('invalid-date', 1)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('formats live batting and fielding box score strip lines', () => {
    const stats = calculateGameStats(
      { gameDate: '2026-11-01', position: 'SS' },
      [
        {
          id: '1',
          gameId: 'g1',
          sequenceNum: 1,
          category: 'batting',
          eventType: '2B',
          rbi: 0,
          createdAt: '2026-11-01T18:00:00Z',
        },
        {
          id: '2',
          gameId: 'g1',
          sequenceNum: 2,
          category: 'batting',
          eventType: 'HR',
          rbi: 2,
          createdAt: '2026-11-01T18:05:00Z',
        },
        {
          id: '3',
          gameId: 'g1',
          sequenceNum: 3,
          category: 'batting',
          eventType: 'FO',
          rbi: 0,
          createdAt: '2026-11-01T18:10:00Z',
        },
        {
          id: '4',
          gameId: 'g1',
          sequenceNum: 4,
          category: 'batting',
          eventType: 'BB',
          rbi: 0,
          createdAt: '2026-11-01T18:15:00Z',
        },
        {
          id: '5',
          gameId: 'g1',
          sequenceNum: 5,
          category: 'fielding',
          eventType: 'PO',
          rbi: 0,
          createdAt: '2026-11-01T18:20:00Z',
        },
        {
          id: '6',
          gameId: 'g1',
          sequenceNum: 6,
          category: 'fielding',
          eventType: 'PO',
          rbi: 0,
          createdAt: '2026-11-01T18:22:00Z',
        },
        {
          id: '7',
          gameId: 'g1',
          sequenceNum: 7,
          category: 'fielding',
          eventType: 'ASSIST',
          rbi: 0,
          createdAt: '2026-11-01T18:25:00Z',
        },
      ]
    );

    expect(formatLiveBattingLine(stats)).toBe(
      '2-for-3 | 2B, HR | 2 RBI | 1 BB | .667 AVG | 2.750 OPS'
    );
    expect(formatLiveFieldingLine(stats)).toBe(
      '2 PO | 1 A | 0 E | 1.000 FLD'
    );
  });

  it('filters and aggregates career stats by season year', () => {
    const g1 = calculateGameStats(
      { gameDate: '2025-07-15', position: 'SS' },
      [
        {
          id: '1',
          gameId: 'g1',
          sequenceNum: 1,
          category: 'batting',
          eventType: '1B',
          rbi: 1,
          createdAt: '2025-07-15T18:00:00Z',
        },
        {
          id: '2',
          gameId: 'g1',
          sequenceNum: 2,
          category: 'batting',
          eventType: 'K',
          rbi: 0,
          createdAt: '2025-07-15T18:05:00Z',
        },
      ]
    );

    const g2 = calculateGameStats(
      { gameDate: '2026-06-10', position: 'CF' },
      [
        {
          id: '3',
          gameId: 'g2',
          sequenceNum: 1,
          category: 'batting',
          eventType: 'HR',
          rbi: 2,
          createdAt: '2026-06-10T18:00:00Z',
        },
      ]
    );

    const g3 = calculateGameStats(
      { gameDate: '2026-06-10', position: 'SS' }, // Doubleheader Game 2 on same date
      [
        {
          id: '4',
          gameId: 'g3',
          sequenceNum: 1,
          category: 'batting',
          eventType: '2B',
          rbi: 0,
          createdAt: '2026-06-10T20:00:00Z',
        },
      ]
    );

    const allRows = [g1, g2, g3];

    expect(extractAvailableYears(allRows)).toEqual(['2026', '2025']);

    const allSeasons = filterSheetGameRows(allRows, {
      year: 'ALL',
    });
    expect(allSeasons).toHaveLength(3);
    const allAgg = calculateAggregateStats(allSeasons);
    expect(allAgg.games).toBe(3);
    expect(allAgg.ab).toBe(4);
    expect(allAgg.h).toBe(3);

    const year2026Only = filterSheetGameRows(allRows, {
      year: '2026',
    });
    expect(year2026Only).toHaveLength(2);
    const yrAgg = calculateAggregateStats(year2026Only);
    expect(yrAgg.games).toBe(2);
    expect(yrAgg.hr).toBe(1);
    expect(yrAgg.doubles).toBe(1);
  });
});
