import { formatRateStat } from './sheetFormatter';
import { SheetGameRow } from './types';

/**
 * Returns today's local calendar date formatted as `YYYY-MM-DD`.
 */
export function getTodayDateString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Shifts a `YYYY-MM-DD` date string by `deltaDays` in local time.
 */
export function shiftDateString(dateStr: string, deltaDays: number): string {
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return getTodayDateString();
  }
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  dt.setDate(dt.getDate() + deltaDays);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a compact live batting summary line for the dugout header:
 * e.g. `2-for-3 | 2B, HR | 2 RBI | 1 BB | .667 AVG | 1.417 OPS`
 */
export function formatLiveBattingLine(stats: SheetGameRow): string {
  const parts: string[] = [`${stats.h}-for-${stats.ab}`];

  const hitBreakdown: string[] = [];
  if (stats.singles > 0) {
    hitBreakdown.push(stats.singles === 1 ? '1B' : `${stats.singles}×1B`);
  }
  if (stats.doubles > 0) {
    hitBreakdown.push(stats.doubles === 1 ? '2B' : `${stats.doubles}×2B`);
  }
  if (stats.triples > 0) {
    hitBreakdown.push(stats.triples === 1 ? '3B' : `${stats.triples}×3B`);
  }
  if (stats.hr > 0) {
    hitBreakdown.push(stats.hr === 1 ? 'HR' : `${stats.hr}×HR`);
  }
  if (hitBreakdown.length > 0) {
    parts.push(hitBreakdown.join(', '));
  }

  parts.push(`${stats.rbi} RBI`);
  parts.push(`${stats.bb} BB`);

  const avgText = formatRateStat(stats.avg, {
    omitLeadingZero: true,
    nullRateOutput: '---',
  });
  const opsText = formatRateStat(stats.ops, {
    omitLeadingZero: true,
    nullRateOutput: '---',
  });

  parts.push(`${avgText} AVG`);
  parts.push(`${opsText} OPS`);

  return parts.join(' | ');
}

/**
 * Formats a compact live fielding summary line for the dugout header:
 * e.g. `2 PO | 3 A | 0 E | 1.000 FLD`
 */
export function formatLiveFieldingLine(stats: SheetGameRow): string {
  const fldText = formatRateStat(stats.fldPct, {
    omitLeadingZero: true,
    nullRateOutput: '---',
  });
  return `${stats.po} PO | ${stats.assists} A | ${stats.errors} E | ${fldText} FLD`;
}

export interface CareerFilterOptions {
  year?: string; // 'ALL' or a 4-digit year like '2026'
}

/**
 * Extracts distinct 4-digit years from a list of `SheetGameRow` records (sorted newest first).
 */
export function extractAvailableYears(rows: readonly SheetGameRow[]): string[] {
  const years = new Set<string>();
  for (const row of rows) {
    const yearPrefix = row.date?.slice(0, 4);
    if (yearPrefix && /^\d{4}$/.test(yearPrefix)) {
      years.add(yearPrefix);
    }
  }
  return Array.from(years).sort((a, b) => b.localeCompare(a));
}

/**
 * Filters an array of `SheetGameRow` records by 4-digit season year.
 */
export function filterSheetGameRows(
  rows: readonly SheetGameRow[],
  filter: CareerFilterOptions
): SheetGameRow[] {
  const targetYear = filter.year?.trim();

  return rows.filter((row) => {
    if (targetYear && targetYear !== 'ALL') {
      if (!row.date.startsWith(targetYear)) {
        return false;
      }
    }
    return true;
  });
}
