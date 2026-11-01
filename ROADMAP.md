# Baseball Box Score — Sequential Development Roadmap

This roadmap breaks the development of the Baseball Box Score iOS app into **5 sequential vertical milestones**. Each milestone produces a working, verifiable increment that can be tested inside **WSL Ubuntu** on Windows before deploying to a physical iPhone via **Expo Go**.

---

## Development & Testing Workflow (WSL Ubuntu + Windows + iPhone)

At every milestone, verification follows a three-tier loop:
1. **Tier 1 — Automated Tests in WSL Terminal:** Run `npm test` (Vitest/Jest) for sub-second verification of baseball math, storage persistence, and Google Sheets row formatting.
2. **Tier 2 — Interactive Browser Test on Windows:** Run `npx expo start --web` in WSL and open `http://localhost:8081` in Windows Chrome/Edge with the **iPhone 15 Pro** mobile viewport enabled in DevTools.
3. **Tier 3 — Physical iPhone Test via Expo Go:** Run `npx expo start --tunnel` in WSL and scan the terminal QR code using the iPhone Camera to open the app natively in **Expo Go**.

---

## Milestone 1: Project Scaffold & Pure Baseball Domain Engine

**Objective:** Initialize the Expo TypeScript workspace in WSL and implement 100% of the baseball stat calculation and 23-column Google Sheets formatting logic as pure, unit-tested TypeScript modules.

### Tasks
1. **Scaffold Expo Project:**
   - Initialize an Expo project with TypeScript, Expo Router, and web support (`react-native-web`, `react-dom`).
   - Configure `vitest` (or `jest`) so `npm test` executes cleanly inside WSL Ubuntu.
2. **Define Domain Contracts (`src/domain/types.ts`):**
   - Define `BattingOutcome` (`1B`, `2B`, `3B`, `HR`, `E_BAT`, `BB`, `FC`, `K`, `FO`, `GO`).
   - Define `FieldingOutcome` (`PO`, `ASSIST`, `E_FLD`).
   - Define `Game`, `GameEvent`, and the 23-column `SheetGameRow` interface matching the exact Google Sheets column order:
     `Date, Position, AB, H, AVG, 1B, 2B, 3B, HR, E (Batting), BB, OBP, SLG, OPS, RBI, FC, K, FO, GO, PO, Assists, Errors, FLD PCT`.
3. **Implement Stat Calculator (`src/domain/statCalculator.ts`):**
   - Implement `calculateGameStats(game: Pick<Game, 'gameDate' | 'position'>, events: GameEvent[]): SheetGameRow`.
   - Implement multi-game aggregation `calculateAggregateStats(rows: SheetGameRow[])` for season/career totals.
   - Ensure zero-division guards (`AVG`, `OBP`, `SLG`, `OPS`, `FLD PCT` return `null` when their denominator is `0`).
4. **Implement Google Sheets Formatter (`src/domain/sheetFormatter.ts`):**
   - Implement `toTsvRow(row: SheetGameRow, options)` for 1-tap clipboard pasting into Google Sheets.
   - Implement `toCsvDocument(rows: SheetGameRow[], options)` for full CSV file export.
   - Support configurable handling of calculated columns (`AVG`, `OBP`, `SLG`, `OPS`, `FLD PCT`): either formatted decimals (`0.333`) or blank cells (`""`) to preserve sheet formulas.

### Definition of Done / Verification
- [x] `npm test` passes 100% in WSL.
- [x] Unit tests cover:
  - Standard multi-hit game (`1B`, `2B`, `HR`, `BB`, `K`, `FO`, `GO`, `PO`, `ASSIST`, `E_FLD`).
  - Reached on Batting Error (`E_BAT`) and Fielder's Choice (`FC`) incrementing `AB` without incrementing `H`.
  - Fly Outs (`FO`, including line outs) and Ground Outs (`GO`) tracked separately and both incrementing `AB`.
  - Walk-only game (`0 AB`, `2 BB` -> `AVG = null`, `OBP = 1.000`).
  - Zero-chance fielding game (`0 PO`, `0 A`, `0 E` -> `FLD PCT = null`).
  - Exact 23-column order verification on TSV and CSV output strings.

---

## Milestone 2: Local-First Storage & Repository Layer

**Objective:** Build the local persistence layer so games and in-game events are saved immediately on-device and work identically on iOS (`expo-sqlite`) and in the Windows desktop browser during WSL development.

### Tasks
1. **Create Storage Adapter (`src/storage/database.ts`):**
   - Configure `expo-sqlite` for native iOS and a seamless Web storage fallback (`localStorage` / `IndexedDB` or SQLite WASM) so `npx expo start --web` works out of the box in WSL.
   - Run automatic schema migrations on startup for the `games` and `game_events` tables.
2. **Implement `GameRepository` (`src/storage/gameRepository.ts`):**
   - `getOrCreateActiveGame(todayDate: string, defaultPosition: string): Promise<Game>` — returns today's active game if one is already in progress, or creates one automatically.
   - `recordEvent(input: { gameId: string; category: 'batting' | 'fielding'; eventType: BattingOutcome | FieldingOutcome; rbi?: number }): Promise<GameEvent>` — appends the next `sequence_num` event.
   - `undoLastEvent(gameId: string): Promise<GameEvent | null>` — removes the most recent event in the game.
   - `deleteEvent(eventId: string): Promise<void>` — removes a specific event and preserves sequence order.
   - `updateGameMetadata(gameId: string, patch: Partial<Pick<Game, 'gameDate' | 'position' | 'opponent' | 'notes' | 'status' | 'syncedToSheets'>>): Promise<Game>`.
   - `listGamesWithStats(): Promise<Array<{ game: Game; stats: SheetGameRow; eventCount: number }>>`.
3. **User Preferences Store (`src/storage/preferencesStore.ts`):**
   - Persist `lastUsedPosition` (default `'SS'`), `sheetFormulaMode`, and `appsScriptWebhookUrl`.

### Definition of Done / Verification
- [x] Integration tests in `tests/gameRepository.test.ts` verify creating a game, appending 6 events, undoing the last event, deleting a middle event, and recomputing the exact `SheetGameRow`.
- [x] Reloading the web app or restarting the native app restores the active game state with zero data loss.

---

## Milestone 3: Zero-Friction Live Game Dugout UI (MVP Usable App)

**Objective:** Build the primary dugout recording screen optimized for bright sunlight, one-handed thumb operation, zero required text inputs, and instant visual + haptic feedback.

### Tasks
1. **Instant-Launch Active Game Flow (`app/index.tsx`):**
   - On launch, automatically load today's active game (or create one with `gameDate = Today` and `position = lastUsedPosition`).
   - Top bar displays a compact **Date Pill** and **Position Selector Pill** (`C`, `P`, `1B`, `2B`, `3B`, `SS`, `LF`, `LCF`, `CF`, `RCF`, `RF`, `RV`, `UTL`). Tapping a position sets the game's single position (`UTL` is used if playing multiple positions) and immediately dismisses the selector.
2. **Batting Action Pad (`src/components/BattingPad.tsx`):**
   - High-contrast, neutral-styled oversized touch buttons grouped by outcome:
     - **Hits:** `1B` (Single), `2B` (Double), `3B` (Triple), `HR` (Home Run)
     - **On Base / Misc:** `BB` (Walk), `E` (Reached on Err), `FC` (Fielder's Choice)
     - **Outs:** `FO` (Fly / Line Out), `GO` (Ground Out), `K` (Strikeout)
   - **Zero-Typing RBI Quick Bar:** Simple `0 | +1 | +2 | +3 | +4 RBI` pill selector so RBIs are logged in a single thumb tap (`HR` defaults to `1 RBI` automatically and can be tapped up to `2–4`).
3. **Fielding Action Pad (`src/components/FieldingPad.tsx`):**
   - Three large single-tap neutral buttons: **`PO`** (Putout), **`A`** (Assist), and **`E`** (Error (Field)) with immediate counter badges.
4. **1-Tap Undo Last Play (`src/components/EventTimeline.tsx`):**
   - Prominent amber/yellow **Undo Last Play** button in the thumb zone (no cluttering play-by-play list on the main screen).
   - Trigger `expo-haptics` light/medium impact on native iOS taps.
5. **Live Box Score Summary Tile (`src/components/LiveScoreStrip.tsx`):**
   - Positioned at the bottom of the screen (just above the game Submit / Export actions), showing live batting (`2-for-3 | 2B, HR | 2 RBI | 1 BB | .667 AVG | 1.417 OPS`) and live fielding (`2 PO | 3 A | 0 E | 1.000 FLD`).

### Definition of Done / Verification
- [x] Start `npx expo start --web` in WSL and record a full game (4 plate appearances + 5 fielding chances + 1 undo) in `<15 seconds` without touching the keyboard.
- [x] Refresh the browser tab mid-game and confirm all logged plays remain intact.
- [x] Open in **Expo Go** on iPhone and verify touch targets, readability, and haptic feedback.

---

## Milestone 4: Google Sheets Export (TSV Copy, CSV Share, & 1-Tap Webhook Push)

**Objective:** Connect completed games to the user's Google Sheet so manual Apple Notes transcription is completely eliminated.

### Tasks
1. **23-Column Sheet Row Preview (`src/components/SheetRowPreview.tsx`):**
   - Horizontal preview card showing the exact 23 columns (`Date` through `FLD PCT`) for the current or selected game.
2. **1-Tap "Copy Row for Google Sheets" (`src/services/sheetsSyncService.ts`):**
   - Uses `expo-clipboard` to copy the tab-separated (`\t`) row to the clipboard.
   - Shows a confirmation toast (`"Copied 23-column row! Paste into Column A in Google Sheets"`).
   - Optionally marks the game as `Completed & Synced`.
3. **CSV Export (`src/services/sheetsSyncService.ts`):**
   - Exports selected or all unsynced games as a `.csv` file (downloads in browser on Web; opens iOS Share Sheet via `expo-file-system` / `expo-sharing` on iPhone).
4. **1-Tap Google Apps Script Webhook Integration:**
   - Provide `scripts/GoogleAppsScript.gs` containing a lightweight `doPost(e)` script that appends a game row to the active Google Sheet while preserving formula columns (`AVG`, `OBP`, `SLG`, `OPS`, `FLD PCT`).
   - Add a **Push to Google Sheets** button in the app that sends the JSON payload to the user's configured Apps Script URL and marks `synced_to_sheets = 1`.

### Definition of Done / Verification
- [ ] Copy a game row from the app and paste it into the user's Google Sheet; verify all 23 columns align with `Date, Position, AB, H, AVG, 1B, 2B, 3B, HR, E (Batting), BB, OBP, SLG, OPS, RBI, FC, K, FO, GO, PO, Assists, Errors, FLD PCT`.
- [ ] Verify formula mode leaves `AVG`, `OBP`, `SLG`, `OPS`, and `FLD PCT` formulas intact when desired.

---

## Milestone 5: Game History, Career Dashboard & Polish

**Objective:** Provide a complete multi-game history log, past-game editing, and an offline Season/Career statistics dashboard on the phone.

### Tasks
1. **Game History Screen (`app/history.tsx`):**
   - Chronological list of all recorded games with date, position, batting line (`2-4, 2B, HR, 2 RBI`), fielding line (`3 PO, 2 A, 0 E`), and sync status badge (`Synced` / `Unsynced`).
   - Tap any historical game to reopen it, edit/add events, copy its TSV row, or push it to Google Sheets.
   - **"Start New Game"** action (supports doubleheaders on the same date!).
2. **Season & Career Stats Dashboard (`app/career.tsx`):**
   - Aggregates all completed/active games locally using `calculateAggregateStats`.
   - Displays headline cards for `AVG`, `OBP`, `SLG`, `OPS`, and `FLD PCT` alongside counting totals (`Games`, `AB`, `H`, `1B`, `2B`, `3B`, `HR`, `RBI`, `BB`, `K`, `FO`, `GO`, `PO`, `A`, `E`).
   - Filterable by **Position** (e.g., view stats when playing `SS` vs. `CF`) or **Year/Season**.
3. **Settings & Backup Screen (`app/settings.tsx`):**
   - Default starting position selector.
   - Google Sheets formula handling toggle (`Include calculated rates` vs. `Leave rate columns blank for Sheet formulas`).
   - Google Apps Script Webhook URL input + **"Test Connection"** button.
   - Full JSON/CSV backup export.
4. **Standalone Build Readiness (`app.json` & `eas.json`):**
   - Configure app icons, splash screen, dark/high-contrast theme, and `eas.json` profile for optional standalone iOS builds.

### Definition of Done / Verification
- [ ] Confirm doubleheader support (two separate games on the same date can be logged and exported independently).
- [ ] Confirm Season/Career dashboard accurately aggregates stats across multiple games and filters by position.
- [ ] All unit and integration tests pass in WSL (`npm test`) and full app flow is verified on iPhone via Expo Go.
