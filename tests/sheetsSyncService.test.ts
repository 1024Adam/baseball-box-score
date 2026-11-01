import { describe, expect, it, vi } from 'vitest';
import { calculateGameStats } from '../src/domain/statCalculator';
import { SHEET_COLUMN_HEADERS } from '../src/domain/types';
import {
  copyRowToClipboard,
  exportGamesToCsv,
  pushGameToWebhook,
  testWebhookConnection,
} from '../src/services/sheetsSyncService';

describe('sheetsSyncService', () => {
  const sampleRow = calculateGameStats(
    { gameDate: '2026-11-01', position: 'CF' },
    [
      {
        id: 'e1',
        gameId: 'g1',
        sequenceNum: 1,
        category: 'batting',
        eventType: '2B',
        rbi: 1,
        createdAt: '2026-11-01T18:00:00Z',
      },
      {
        id: 'e2',
        gameId: 'g1',
        sequenceNum: 2,
        category: 'batting',
        eventType: 'GO',
        rbi: 0,
        createdAt: '2026-11-01T18:05:00Z',
      },
      {
        id: 'e3',
        gameId: 'g1',
        sequenceNum: 3,
        category: 'fielding',
        eventType: 'PO',
        rbi: 0,
        createdAt: '2026-11-01T18:10:00Z',
      },
    ]
  );

  it('copies an exact 23-column TSV row to the clipboard', async () => {
    let clipboardText = '';
    const mockClipboard = {
      async setStringAsync(text: string) {
        clipboardText = text;
        return true;
      },
    };

    const result = await copyRowToClipboard(
      sampleRow,
      { formulaMode: 'computed_values' },
      mockClipboard
    );

    expect(result.copiedToClipboard).toBe(true);
    expect(result.message).toContain('Copied 23-column row!');

    const cols = clipboardText.split('\t');
    expect(cols).toHaveLength(23);
    expect(cols[0]).toBe('2026-11-01'); // Col A: Date
    expect(cols[1]).toBe('CF');         // Col B: Position
    expect(cols[2]).toBe('2');          // Col C: AB
    expect(cols[3]).toBe('1');          // Col D: H
    expect(cols[4]).toBe('0.500');      // Col E: AVG
    expect(cols[6]).toBe('1');          // Col G: 2B
    expect(cols[11]).toBe('0.500');     // Col L: OBP
    expect(cols[12]).toBe('1.000');     // Col M: SLG
    expect(cols[13]).toBe('1.500');     // Col N: OPS
    expect(cols[14]).toBe('1');         // Col O: RBI
    expect(cols[18]).toBe('1');         // Col S: GO
    expect(cols[19]).toBe('1');         // Col T: PO
    expect(cols[22]).toBe('1.000');     // Col W: FLD PCT
  });

  it('leaves AVG, OBP, SLG, OPS, and FLD PCT blank when copying in blank_for_arrayformula mode', async () => {
    let clipboardText = '';
    const mockClipboard = {
      async setStringAsync(text: string) {
        clipboardText = text;
        return true;
      },
    };

    await copyRowToClipboard(
      sampleRow,
      { formulaMode: 'blank_for_arrayformula' },
      mockClipboard
    );

    const cols = clipboardText.split('\t');
    expect(cols).toHaveLength(23);
    expect(cols[4]).toBe('');  // AVG
    expect(cols[11]).toBe(''); // OBP
    expect(cols[12]).toBe(''); // SLG
    expect(cols[13]).toBe(''); // OPS
    expect(cols[22]).toBe(''); // FLD PCT
    // Raw stats stay intact
    expect(cols[2]).toBe('2'); // AB
    expect(cols[3]).toBe('1'); // H
    expect(cols[6]).toBe('1'); // 2B
    expect(cols[19]).toBe('1'); // PO
  });

  it('exports a 23-column CSV document with matching headers', async () => {
    const result = await exportGamesToCsv([sampleRow], {
      formulaMode: 'computed_values',
    });

    expect(result.filename).toBe('baseball-box-score-2026-11-01.csv');
    const lines = result.csvContent.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0].split(',')).toEqual([...SHEET_COLUMN_HEADERS]);
    expect(lines[1].split(',')).toHaveLength(23);
  });

  it('pushes a 23-column payload to the Google Apps Script webhook URL', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({ ok: true, rowNumber: 42, sheetName: '2026 Season' }),
    }) as unknown as typeof fetch;

    const result = await pushGameToWebhook(
      sampleRow,
      'https://script.google.com/macros/s/abc123/exec',
      { formulaMode: 'webhook_preserve_formulas' },
      mockFetch
    );

    expect(result.ok).toBe(true);
    expect(result.rowNumber).toBe(42);
    expect(result.message).toContain('Row #42');
    expect(result.payload.cells).toHaveLength(23);
    expect(result.payload.cells[4]).toBeNull();  // AVG left null for sheet formula
    expect(result.payload.cells[11]).toBeNull(); // OBP
    expect(result.payload.cells[12]).toBeNull(); // SLG
    expect(result.payload.cells[13]).toBeNull(); // OPS
    expect(result.payload.cells[22]).toBeNull(); // FLD PCT
  });

  it('validates webhook URL and supports ping connection test', async () => {
    const missingUrl = await pushGameToWebhook(sampleRow, '   ');
    expect(missingUrl.ok).toBe(false);

    const mockPingFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        message: 'Connected to sheet: 2026 Stats',
      }),
    }) as unknown as typeof fetch;

    const pingResult = await testWebhookConnection(
      'https://script.google.com/macros/s/abc123/exec',
      mockPingFetch
    );
    expect(pingResult.ok).toBe(true);
    expect(pingResult.message).toBe('Connected to sheet: 2026 Stats');
  });
});
