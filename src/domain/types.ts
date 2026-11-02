export type BattingOutcome =
  | '1B'
  | '2B'
  | '3B'
  | 'HR'
  | 'E_BAT'
  | 'BB'
  | 'FC'
  | 'K'
  | 'FO'
  | 'GO';

export type FieldingOutcome = 'PO' | 'ASSIST' | 'E_FLD';

export type PlayerPosition =
  | 'C'
  | 'P'
  | '1B'
  | '2B'
  | '3B'
  | 'SS'
  | 'LF'
  | 'LCF'
  | 'RCF'
  | 'RF'
  | 'CF'
  | 'RV'
  | 'UTL';

export const PLAYER_POSITIONS: readonly PlayerPosition[] = [
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
] as const;

export type EventCategory = 'batting' | 'fielding';

export type GameStatus = 'active' | 'completed';

export type SheetFormulaMode =
  | 'computed_values'
  | 'blank_for_arrayformula';

export interface Game {
  id: string;
  gameDate: string;          // YYYY-MM-DD
  position: string;          // e.g. 'SS', 'CF', 'SS / 2B'
  opponent: string;
  notes: string;
  status: GameStatus;
  syncedToSheets: boolean;
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GameEvent {
  id: string;
  gameId: string;
  sequenceNum: number;
  category: EventCategory;
  eventType: BattingOutcome | FieldingOutcome;
  rbi: number;
  inning?: number | null;
  positionAtEvent?: string | null;
  createdAt: string;
}

export interface SheetGameRow {
  date: string;              // Col A (1): Date
  position: string;          // Col B (2): Position
  ab: number;                // Col C (3): AB
  h: number;                 // Col D (4): H
  avg: number | null;        // Col E (5): AVG (calculated)
  singles: number;           // Col F (6): 1B
  doubles: number;           // Col G (7): 2B
  triples: number;           // Col H (8): 3B
  hr: number;                // Col I (9): HR
  eBatting: number;          // Col J (10): E (Batting)
  bb: number;                // Col K (11): BB
  obp: number | null;        // Col L (12): OBP (calculated)
  slg: number | null;        // Col M (13): SLG (calculated)
  ops: number | null;        // Col N (14): OPS (calculated)
  rbi: number;               // Col O (15): RBI
  fc: number;                // Col P (16): FC
  k: number;                 // Col Q (17): K
  fo: number;                // Col R (18): FO (Fly Outs / Line Outs)
  go: number;                // Col S (19): GO (Ground Outs)
  po: number;                // Col T (20): PO
  assists: number;           // Col U (21): Assists
  errors: number;            // Col V (22): Errors
  fldPct: number | null;     // Col W (23): FLD PCT (calculated)
}

export interface AggregateStats extends SheetGameRow {
  games: number;
  pa: number;
  totalBases: number;
  totalChances: number;
}

/**
 * Exact 23-column header order required by the target Google Sheet.
 */
export const SHEET_COLUMN_HEADERS: readonly [
  'Date',
  'Position',
  'AB',
  'H',
  'AVG',
  '1B',
  '2B',
  '3B',
  'HR',
  'E (Batting)',
  'BB',
  'OBP',
  'SLG',
  'OPS',
  'RBI',
  'FC',
  'K',
  'FO',
  'GO',
  'PO',
  'Assists',
  'Errors',
  'FLD PCT'
] = [
  'Date',
  'Position',
  'AB',
  'H',
  'AVG',
  '1B',
  '2B',
  '3B',
  'HR',
  'E (Batting)',
  'BB',
  'OBP',
  'SLG',
  'OPS',
  'RBI',
  'FC',
  'K',
  'FO',
  'GO',
  'PO',
  'Assists',
  'Errors',
  'FLD PCT',
] as const;

