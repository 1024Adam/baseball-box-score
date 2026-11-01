import {
  SHEET_COLUMN_HEADERS,
  SheetFormulaMode,
  SheetGameRow,
} from './types';

export interface SheetFormatterOptions {
  /**
   * Controls how calculated rate columns (`AVG`, `OBP`, `SLG`, `OPS`, `FLD PCT`) are serialized:
   * - `'computed_values'` (default): outputs 3-decimal formatted rate strings (e.g. `0.333`, `1.067`).
   * - `'blank_for_arrayformula'`: outputs `""` in the 5 rate columns so Google Sheet formulas are not overwritten.
   * - `'webhook_preserve_formulas'`: alias for leaving calculated columns blank when sending raw row cells.
   */
  formulaMode?: SheetFormulaMode;

  /**
   * When true, omits the leading zero on values in (-1, 1), e.g. `.333` instead of `0.333`.
   * Defaults to false (`0.333`) for maximum compatibility with spreadsheet numeric parsing.
   */
  omitLeadingZero?: boolean;

  /**
   * Whether to include the 23-column header row in `toCsvDocument`. Defaults to true.
   */
  includeHeader?: boolean;

  /**
   * Value to emit when a calculated rate is `null` (e.g. `0 AB` or `0 Fielding Chances`)
   * while `formulaMode` is `'computed_values'`. Defaults to `""`.
   */
  nullRateOutput?: string;
}

/**
 * Formats a baseball rate stat (`AVG`, `OBP`, `SLG`, `OPS`, `FLD PCT`) to 3 decimal places.
 */
export function formatRateStat(
  value: number | null,
  options: Pick<SheetFormatterOptions, 'omitLeadingZero' | 'nullRateOutput'> = {}
): string {
  if (value === null || Number.isNaN(value)) {
    return options.nullRateOutput ?? '';
  }

  const fixed = value.toFixed(3);
  if (options.omitLeadingZero && fixed.startsWith('0.')) {
    return fixed.slice(1);
  }
  return fixed;
}

/**
 * Converts a `SheetGameRow` into an ordered 23-element array of cell strings
 * matching the exact Google Sheets column schema:
 * `Date, Position, AB, H, AVG, 1B, 2B, 3B, HR, E (Batting), BB, OBP, SLG, OPS, RBI, FC, K, FO, GO, PO, Assists, Errors, FLD PCT`.
 */
export function toOrderedCells(
  row: SheetGameRow,
  options: SheetFormatterOptions = {}
): string[] {
  const formulaMode = options.formulaMode ?? 'computed_values';
  const leaveRatesBlank =
    formulaMode === 'blank_for_arrayformula' ||
    formulaMode === 'webhook_preserve_formulas';

  const rateCell = (val: number | null): string =>
    leaveRatesBlank ? '' : formatRateStat(val, options);

  return [
    row.date,                     // Col A (1): Date
    row.position,                 // Col B (2): Position
    String(row.ab),               // Col C (3): AB
    String(row.h),                // Col D (4): H
    rateCell(row.avg),            // Col E (5): AVG
    String(row.singles),          // Col F (6): 1B
    String(row.doubles),          // Col G (7): 2B
    String(row.triples),          // Col H (8): 3B
    String(row.hr),               // Col I (9): HR
    String(row.eBatting),         // Col J (10): E (Batting)
    String(row.bb),               // Col K (11): BB
    rateCell(row.obp),            // Col L (12): OBP
    rateCell(row.slg),            // Col M (13): SLG
    rateCell(row.ops),            // Col N (14): OPS
    String(row.rbi),              // Col O (15): RBI
    String(row.fc),               // Col P (16): FC
    String(row.k),                // Col Q (17): K
    String(row.fo),               // Col R (18): FO
    String(row.go),               // Col S (19): GO
    String(row.po),               // Col T (20): PO
    String(row.assists),          // Col U (21): Assists
    String(row.errors),           // Col V (22): Errors
    rateCell(row.fldPct),         // Col W (23): FLD PCT
  ];
}

/**
 * Formats a `SheetGameRow` as a single 23-column tab-separated (`\t`) line
 * suitable for 1-tap clipboard pasting directly into Column A of Google Sheets.
 */
export function toTsvRow(
  row: SheetGameRow,
  options: SheetFormatterOptions = {}
): string {
  const cells = toOrderedCells(row, options).map((cell) =>
    cell.replace(/[\t\r\n]+/g, ' ')
  );
  return cells.join('\t');
}

function escapeCsvCell(cell: string): string {
  if (
    cell.includes(',') ||
    cell.includes('"') ||
    cell.includes('\n') ||
    cell.includes('\r')
  ) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}

/**
 * Formats a single `SheetGameRow` as a 23-column CSV line.
 */
export function toCsvRow(
  row: SheetGameRow,
  options: SheetFormatterOptions = {}
): string {
  return toOrderedCells(row, options).map(escapeCsvCell).join(',');
}

/**
 * Formats an array of `SheetGameRow` items into a complete 23-column CSV document.
 */
export function toCsvDocument(
  rows: readonly SheetGameRow[],
  options: SheetFormatterOptions = {}
): string {
  const includeHeader = options.includeHeader ?? true;
  const lines: string[] = [];

  if (includeHeader) {
    lines.push(SHEET_COLUMN_HEADERS.map(escapeCsvCell).join(','));
  }

  for (const row of rows) {
    lines.push(toCsvRow(row, options));
  }

  return lines.join('\n');
}

export interface WebhookRowPayload {
  headers: readonly string[];
  formulaMode: SheetFormulaMode;
  row: SheetGameRow;
  cells: (string | number | null)[];
}

/**
 * Builds the JSON payload for the Google Apps Script webhook receiver.
 */
export function toWebhookPayload(
  row: SheetGameRow,
  options: SheetFormatterOptions = {}
): WebhookRowPayload {
  const formulaMode = options.formulaMode ?? 'webhook_preserve_formulas';
  const leaveRatesBlank =
    formulaMode === 'blank_for_arrayformula' ||
    formulaMode === 'webhook_preserve_formulas';

  const rateVal = (val: number | null): number | null =>
    leaveRatesBlank || val === null ? null : Number(val.toFixed(3));

  return {
    headers: SHEET_COLUMN_HEADERS,
    formulaMode,
    row,
    cells: [
      row.date,
      row.position,
      row.ab,
      row.h,
      rateVal(row.avg),
      row.singles,
      row.doubles,
      row.triples,
      row.hr,
      row.eBatting,
      row.bb,
      rateVal(row.obp),
      rateVal(row.slg),
      rateVal(row.ops),
      row.rbi,
      row.fc,
      row.k,
      row.fo,
      row.go,
      row.po,
      row.assists,
      row.errors,
      rateVal(row.fldPct),
    ],
  };
}
