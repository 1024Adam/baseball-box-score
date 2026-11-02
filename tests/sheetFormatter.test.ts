import { describe, expect, it } from 'vitest';
import {
  formatRateStat,
  toCsvDocument,
  toOrderedCells,
  toTsvRow,
} from '../src/domain/sheetFormatter';
import { calculateGameStats } from '../src/domain/statCalculator';
import { GameEvent, SHEET_COLUMN_HEADERS } from '../src/domain/types';

describe('sheetFormatter', () => {
  const sampleEvents: GameEvent[] = [
    {
      id: '1',
      gameId: 'g1',
      sequenceNum: 1,
      category: 'batting',
      eventType: '1B',
      rbi: 0,
      createdAt: '2026-10-31T18:00:00Z',
    },
    {
      id: '2',
      gameId: 'g1',
      sequenceNum: 2,
      category: 'batting',
      eventType: 'HR',
      rbi: 2,
      createdAt: '2026-10-31T18:05:00Z',
    },
    {
      id: '3',
      gameId: 'g1',
      sequenceNum: 3,
      category: 'batting',
      eventType: 'BB',
      rbi: 0,
      createdAt: '2026-10-31T18:10:00Z',
    },
    {
      id: '4',
      gameId: 'g1',
      sequenceNum: 4,
      category: 'batting',
      eventType: 'FO',
      rbi: 0,
      createdAt: '2026-10-31T18:15:00Z',
    },
    {
      id: '5',
      gameId: 'g1',
      sequenceNum: 5,
      category: 'fielding',
      eventType: 'PO',
      rbi: 0,
      createdAt: '2026-10-31T18:20:00Z',
    },
    {
      id: '6',
      gameId: 'g1',
      sequenceNum: 6,
      category: 'fielding',
      eventType: 'ASSIST',
      rbi: 0,
      createdAt: '2026-10-31T18:25:00Z',
    },
  ];

  const sampleRow = calculateGameStats(
    { gameDate: '2026-10-31', position: 'SS' },
    sampleEvents
  );

  it('verifies the exact 23-column Google Sheets header order', () => {
    expect(SHEET_COLUMN_HEADERS).toHaveLength(23);
    expect(SHEET_COLUMN_HEADERS.join(', ')).toBe(
      'Date, Position, AB, H, AVG, 1B, 2B, 3B, HR, E (Batting), BB, OBP, SLG, OPS, RBI, FC, K, FO, GO, PO, Assists, Errors, FLD PCT'
    );
  });

  it('produces an exact 23-column TSV row with computed values', () => {
    const tsv = toTsvRow(sampleRow, { formulaMode: 'computed_values' });
    const columns = tsv.split('\t');

    expect(columns).toHaveLength(23);
    // Col A-W verification:
    // AB = 3 (1B, HR, FO), H = 2, AVG = 0.667, 1B = 1, 2B = 0, 3B = 0, HR = 1, E(Bat) = 0, BB = 1
    // OBP = (2+1)/(3+1) = 0.750, SLG = (1+4)/3 = 1.667, OPS = 0.75 + 1.6666... = 2.417
    // RBI = 2, FC = 0, K = 0, FO = 1, GO = 0, PO = 1, Assists = 1, Errors = 0, FLD PCT = 1.000
    expect(columns).toEqual([
      '2026-10-31', // 1: Date
      'SS', // 2: Position
      '3', // 3: AB
      '2', // 4: H
      '0.667', // 5: AVG
      '1', // 6: 1B
      '0', // 7: 2B
      '0', // 8: 3B
      '1', // 9: HR
      '0', // 10: E (Batting)
      '1', // 11: BB
      '0.750', // 12: OBP
      '1.667', // 13: SLG
      '2.417', // 14: OPS
      '2', // 15: RBI
      '0', // 16: FC
      '0', // 17: K
      '1', // 18: FO
      '0', // 19: GO
      '1', // 20: PO
      '1', // 21: Assists
      '0', // 22: Errors
      '1.000', // 23: FLD PCT
    ]);
  });

  it('supports blank_for_arrayformula mode by leaving AVG, OBP, SLG, OPS, and FLD PCT empty', () => {
    const cells = toOrderedCells(sampleRow, {
      formulaMode: 'blank_for_arrayformula',
    });

    expect(cells).toHaveLength(23);
    expect(cells[4]).toBe(''); // Col E (5): AVG
    expect(cells[11]).toBe(''); // Col L (12): OBP
    expect(cells[12]).toBe(''); // Col M (13): SLG
    expect(cells[13]).toBe(''); // Col N (14): OPS
    expect(cells[22]).toBe(''); // Col W (23): FLD PCT

    // Raw counting columns remain populated
    expect(cells[2]).toBe('3'); // AB
    expect(cells[3]).toBe('2'); // H
    expect(cells[5]).toBe('1'); // 1B
    expect(cells[8]).toBe('1'); // HR
    expect(cells[10]).toBe('1'); // BB
    expect(cells[14]).toBe('2'); // RBI
    expect(cells[17]).toBe('1'); // FO
    expect(cells[19]).toBe('1'); // PO
    expect(cells[20]).toBe('1'); // Assists
  });

  it('generates a complete 23-column CSV document with header and properly escaped cells', () => {
    const rowWithCommaPosition = {
      ...sampleRow,
      position: 'SS, 2B',
    };

    const csv = toCsvDocument([rowWithCommaPosition]);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe(
      'Date,Position,AB,H,AVG,1B,2B,3B,HR,E (Batting),BB,OBP,SLG,OPS,RBI,FC,K,FO,GO,PO,Assists,Errors,FLD PCT'
    );
    expect(lines[1]).toBe(
      '2026-10-31,"SS, 2B",3,2,0.667,1,0,0,1,0,1,0.750,1.667,2.417,2,0,0,1,0,1,1,0,1.000'
    );
  });

  it('formats null rates and omitLeadingZero options cleanly', () => {
    expect(formatRateStat(null)).toBe('');
    expect(formatRateStat(null, { nullRateOutput: '-' })).toBe('-');
    expect(formatRateStat(1 / 3, { omitLeadingZero: true })).toBe('.333');
    expect(formatRateStat(1.0, { omitLeadingZero: true })).toBe('1.000');
  });
});
