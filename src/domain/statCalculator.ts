import {
  AggregateStats,
  BattingOutcome,
  FieldingOutcome,
  Game,
  GameEvent,
  SheetGameRow,
} from './types';

export interface StatCalculationOptions {
  /**
   * When true, Reached on Error (E_BAT) is included in the numerator of OBP:
   * (H + BB + E_BAT) / (AB + BB).
   * Defaults to false per standard baseball rules and docs/ARCHITECTURE.md section 3.1:
   * (H + BB) / (AB + BB).
   */
  includeReachedOnErrorInObp?: boolean;
}

interface RawStatCounts {
  singles: number;
  doubles: number;
  triples: number;
  hr: number;
  eBatting: number;
  bb: number;
  rbi: number;
  fc: number;
  k: number;
  fo: number;
  go: number;
  po: number;
  assists: number;
  errors: number;
}

function createEmptyCounts(): RawStatCounts {
  return {
    singles: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    eBatting: 0,
    bb: 0,
    rbi: 0,
    fc: 0,
    k: 0,
    fo: 0,
    go: 0,
    po: 0,
    assists: 0,
    errors: 0,
  };
}

/**
 * Computes derived counting stats and rate stats from raw batting/fielding counts.
 * All rate stats guard against division by zero by returning `null`.
 */
export function buildSheetRowFromCounts(
  context: { date: string; position: string },
  counts: RawStatCounts,
  options: StatCalculationOptions = {}
): SheetGameRow {
  const h = counts.singles + counts.doubles + counts.triples + counts.hr;
  const ab = h + counts.eBatting + counts.fc + counts.k + counts.fo + counts.go;

  const avg = ab > 0 ? h / ab : null;

  const obpDenominator = ab + counts.bb;
  const obpNumerator = options.includeReachedOnErrorInObp
    ? h + counts.bb + counts.eBatting
    : h + counts.bb;
  const obp = obpDenominator > 0 ? obpNumerator / obpDenominator : null;

  const totalBases =
    counts.singles + 2 * counts.doubles + 3 * counts.triples + 4 * counts.hr;
  const slg = ab > 0 ? totalBases / ab : null;

  // OPS is defined whenever at least OBP or SLG is defined (or when both are defined;
  // in a walk-only game where AB = 0 and BB > 0, SLG is null/0 and OBP is 1.000,
  // but in standard baseball / Google Sheets OPS = OBP + SLG where both are required,
  // or if AB = 0 and BB > 0, let's check how OPS is handled).
  const ops =
    obp !== null && slg !== null
      ? obp + slg
      : obp !== null && ab === 0
        ? obp
        : null;

  const totalChances = counts.po + counts.assists + counts.errors;
  const fldPct =
    totalChances > 0 ? (counts.po + counts.assists) / totalChances : null;

  return {
    date: context.date,
    position: context.position,
    ab,
    h,
    avg,
    singles: counts.singles,
    doubles: counts.doubles,
    triples: counts.triples,
    hr: counts.hr,
    eBatting: counts.eBatting,
    bb: counts.bb,
    obp,
    slg,
    ops,
    rbi: counts.rbi,
    fc: counts.fc,
    k: counts.k,
    fo: counts.fo,
    go: counts.go,
    po: counts.po,
    assists: counts.assists,
    errors: counts.errors,
    fldPct,
  };
}

/**
 * Calculates the 23-column SheetGameRow from a game's metadata and its ordered event stream.
 */
export function calculateGameStats(
  game: Pick<Game, 'gameDate' | 'position'>,
  events: readonly GameEvent[],
  options: StatCalculationOptions = {}
): SheetGameRow {
  const counts = createEmptyCounts();

  for (const event of events) {
    if (event.category === 'batting') {
      const outcome = event.eventType as BattingOutcome;
      switch (outcome) {
        case '1B':
          counts.singles += 1;
          break;
        case '2B':
          counts.doubles += 1;
          break;
        case '3B':
          counts.triples += 1;
          break;
        case 'HR':
          counts.hr += 1;
          break;
        case 'E_BAT':
          counts.eBatting += 1;
          break;
        case 'BB':
          counts.bb += 1;
          break;
        case 'FC':
          counts.fc += 1;
          break;
        case 'K':
          counts.k += 1;
          break;
        case 'FO':
          counts.fo += 1;
          break;
        case 'GO':
          counts.go += 1;
          break;
      }
      counts.rbi += Math.max(0, event.rbi ?? 0);
    } else if (event.category === 'fielding') {
      const outcome = event.eventType as FieldingOutcome;
      switch (outcome) {
        case 'PO':
          counts.po += 1;
          break;
        case 'ASSIST':
          counts.assists += 1;
          break;
        case 'E_FLD':
          counts.errors += 1;
          break;
      }
    }
  }

  return buildSheetRowFromCounts(
    { date: game.gameDate, position: game.position },
    counts,
    options
  );
}

/**
 * Aggregates multiple SheetGameRow entries into cumulative season/career totals and rate stats.
 */
export function calculateAggregateStats(
  rows: readonly SheetGameRow[],
  options: StatCalculationOptions = {}
): AggregateStats {
  const counts = createEmptyCounts();
  const uniquePositions: string[] = [];

  for (const row of rows) {
    counts.singles += row.singles;
    counts.doubles += row.doubles;
    counts.triples += row.triples;
    counts.hr += row.hr;
    counts.eBatting += row.eBatting;
    counts.bb += row.bb;
    counts.rbi += row.rbi;
    counts.fc += row.fc;
    counts.k += row.k;
    counts.fo += row.fo;
    counts.go += row.go;
    counts.po += row.po;
    counts.assists += row.assists;
    counts.errors += row.errors;

    if (row.position && !uniquePositions.includes(row.position)) {
      uniquePositions.push(row.position);
    }
  }

  const baseRow = buildSheetRowFromCounts(
    {
      date: rows.length > 0 ? `${rows.length} Games` : '0 Games',
      position: uniquePositions.length > 0 ? uniquePositions.join(', ') : 'ALL',
    },
    counts,
    options
  );

  const totalBases =
    counts.singles + 2 * counts.doubles + 3 * counts.triples + 4 * counts.hr;
  const totalChances = counts.po + counts.assists + counts.errors;

  return {
    ...baseRow,
    games: rows.length,
    pa: baseRow.ab + baseRow.bb,
    totalBases,
    totalChances,
  };
}
