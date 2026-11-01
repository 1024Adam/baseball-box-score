import { formatRateStat } from './sheetFormatter';
import { PlayerPosition, SheetGameRow } from './types';

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

/**
 * Parses a game's position string (e.g. `"SS / 2B"`) into individual position codes.
 */
export function parsePositions(positionStr: string): string[] {
  return positionStr
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Updates a game's position string when a user taps a position pill:
 * - In `'switch'` mode, replaces the position with `selectedPosition`.
 * - In `'append'` mode, toggles `selectedPosition` in the `/` separated list
 *   (e.g. `"SS"` + `"2B"` -> `"SS / 2B"`), always keeping at least one position.
 */
export function applyPositionSelection(
  currentPosition: string,
  selectedPosition: PlayerPosition | string,
  mode: 'switch' | 'append'
): string {
  const target = selectedPosition.trim();
  if (!target) {
    return currentPosition || 'SS';
  }

  if (mode === 'switch') {
    return target;
  }

  const currentList = parsePositions(currentPosition);
  if (currentList.includes(target)) {
    if (currentList.length === 1) {
      return target;
    }
    return currentList.filter((p) => p !== target).join(' / ');
  }

  return [...currentList, target].join(' / ');
}
