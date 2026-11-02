# Baseball Box Score — Sequential Development Roadmap

This roadmap breaks the development of the Baseball Box Score iOS app into **7 sequential vertical milestones**. Each milestone produces a working, verifiable increment that can be tested inside **WSL Ubuntu** on Windows before deploying to a physical iPhone via **Expo Go**.

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
   - Three large single-tap neutral buttons: **`PO`** (Putout), **`A`** (Assist), and **`E`** (Error) with immediate counter badges.
4. **1-Tap Undo Last Play (`src/components/EventTimeline.tsx`):**
   - Prominent amber/yellow **Undo Last Play** button in the thumb zone (no cluttering play-by-play list on the main screen).
   - Trigger `expo-haptics` light/medium impact on native iOS taps.
5. **Submit Button (`app/index.tsx` -> `app/summary.tsx`):**
   - Bottom **`SUMMARY →`** button on the main logging screen navigates to the dedicated Summary & Export screen (`app/summary.tsx`) with a **`← Back`** button and iOS swipe-back gesture.

### Definition of Done / Verification
- [x] Start `npx expo start --web` in WSL and record a full game (4 plate appearances + 5 fielding chances + 1 undo) in `<15 seconds` without touching the keyboard.
- [x] Refresh the browser tab mid-game and confirm all logged plays remain intact.
- [x] Open in **Expo Go** on iPhone and verify touch targets, readability, and haptic feedback.

---

## Milestone 4: Google Sheets Export (TSV Copy & CSV Share)

**Objective:** Connect completed games to the user's Google Sheet so manual Apple Notes transcription is completely eliminated.

### Tasks
1. **Summary & Data Sync Card (`app/summary.tsx`, `src/components/LiveScoreStrip.tsx`, `src/components/SheetRowPreview.tsx`):**
   - Dedicated post-game / mid-game review screen showing the summarized Box Score tile (`LiveScoreStrip`) and a clean **DATA SYNC** card with sync status indicator (`UNSYNCED` / green `✓ COPIED`), **`← Back`** button, and swipe-back support.
2. **Primary 1-Tap "COPY DATA ROW" (`src/services/sheetsSyncService.ts`):**
   - Uses `expo-clipboard` to copy the tab-separated (`\t`) row to the clipboard.
   - Shows a confirmation toast (`"Copied 23-column row! Paste into Column A in Google Sheets"`).
   - Marks the game as `Completed & Synced`.
3. **CSV Export (`src/services/sheetsSyncService.ts`):**
   - Secondary button that exports selected or all unsynced games as a `.csv` file (downloads in browser on Web; opens iOS Share Sheet via `expo-file-system` / `expo-sharing` on iPhone).

### Definition of Done / Verification
- [x] Copy a game row from the app and paste it into the user's Google Sheet; verify all 23 columns align with `Date, Position, AB, H, AVG, 1B, 2B, 3B, HR, E (Batting), BB, OBP, SLG, OPS, RBI, FC, K, FO, GO, PO, Assists, Errors, FLD PCT`.
- [x] Verify formula mode leaves `AVG`, `OBP`, `SLG`, `OPS`, and `FLD PCT` formulas intact when desired.

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
   - Displays headline cards for `AVG`, `OBP`, `SLG`, `OPS`, and `FLD PCT` alongside counting totals (`Games`, `PA`, `AB`, `H`, `1B`, `2B`, `3B`, `HR`, `RBI`, `BB`, `E (Bat)`, `FC`, `K`, `FO`, `GO`, `PO`, `Assists`, `Errors`).
   - Filterable by **Year/Season**.
3. **Settings & Backup Screen (`app/settings.tsx`):**
   - Default starting position selector.
   - Full CSV backup export.
4. **Standalone Build Readiness (`app.json` & `eas.json`):**
   - Configure app icons, splash screen, dark/high-contrast theme, and `eas.json` profile for optional standalone iOS builds.

### Definition of Done / Verification
- [x] Confirm doubleheader support (two separate games on the same date can be logged and exported independently).
- [x] Confirm Season/Career dashboard accurately aggregates stats across multiple games and filters by season.
- [x] All unit and integration tests pass in WSL (`npm test`) and full app flow is verified on iPhone via Expo Go.

---

## Milestone 6: Codebase Cleanup & Game Lifecycle Hardening

**Objective:** Eliminate all dead/unwired code identified during the post-Milestone 5 architecture audit, deduplicate date utilities, and fix active-game / `+ New Game` lifecycle edge cases so completed games never spawn phantom `0-for-0` entries.

### Tasks
1. **Fix Active Game & `+ New Game` Lifecycle Bugs (`src/storage/gameRepository.ts`, `app/index.tsx`, `app/history.tsx`):**
   - **Prevent Phantom "Game 2" After Syncing:** Update `getOrCreateActiveGame(todayDate, defaultPosition)` in `src/storage/gameRepository.ts` so that if an `active` game exists for `todayDate` it is returned, and if no `active` game exists for `todayDate` but a `completed` game already exists for `todayDate`, the most recent game for `todayDate` is returned instead of automatically creating a new empty game on tab switches or app relaunches. A second game on the same date (doubleheader) must only be created when the user explicitly taps **`+ New Game`**.
   - **Prevent Duplicate Empty Games on `+ New Game`:** Add a repository method `startNewGame(todayDate: string, defaultPosition: string): Promise<Game>` (or equivalent logic) used by both `app/index.tsx` and `app/history.tsx`:
     - If any existing active game has `0` recorded events, reuse/reset that empty game (updating its `gameDate` and `position`) rather than creating orphan `0-for-0` games.
     - Mark any existing active games that have `> 0` recorded events as `status: 'completed'` before creating the new active game.
2. **Consolidate Local Date Utilities (`src/domain/liveGameHelpers.ts`, `app/index.tsx`, `app/summary.tsx`, `app/history.tsx`, `app/settings.tsx`, `src/services/sheetsSyncService.ts`):**
   - Export `getTodayDateString()` and `shiftDateString(dateStr: string, deltaDays: number)` from `src/domain/liveGameHelpers.ts`.
   - Remove the 3 duplicate local definitions in `app/index.tsx`, `app/summary.tsx`, and `app/history.tsx`.
   - Replace `new Date().toISOString().slice(0, 10)` (UTC date) in `app/settings.tsx` and `src/services/sheetsSyncService.ts` with `getTodayDateString()` so evening games always use the local date.
3. **Remove Unwired Webhook & Formula-Mode Dead Code (`scripts/GoogleAppsScript.gs`, `src/domain/types.ts`, `src/domain/sheetFormatter.ts`, `src/services/sheetsSyncService.ts`, `src/storage/preferencesStore.ts`, `tests/`):**
   - Delete `scripts/GoogleAppsScript.gs`.
   - Remove `toWebhookPayload`, `WebhookRowPayload`, and `'webhook_preserve_formulas'` from `src/domain/sheetFormatter.ts` and `src/domain/types.ts`.
   - Remove `pushGameToWebhook`, `testWebhookConnection`, and `WebhookPushResult` from `src/services/sheetsSyncService.ts`.
   - Simplify `PreferencesStore` (`src/storage/preferencesStore.ts`) to persist `lastUsedPosition` only, removing the unused `sheetFormulaMode` and `appsScriptWebhookUrl` preferences and setters.
   - Update `tests/sheetFormatter.test.ts`, `tests/sheetsSyncService.test.ts`, and `tests/gameRepository.test.ts` accordingly.
4. **Remove Unused Props, Helpers, Storage Methods & Dependencies:**
   - **Unused Event Deletion Plumbing:** Remove `onDeleteEvent` from `EventTimelineProps` (`src/components/EventTimeline.tsx`), `handleDeleteEvent` from `app/index.tsx`, `deleteEvent` from `GameRepository` (`src/storage/gameRepository.ts`), and `getEventById` / `replaceEventsForGame` from `StorageDriver` (`src/storage/database.ts`).
   - **Unused Component Prop & Redundant Ternary:** Remove the unused `stats` prop from `SheetRowPreviewProps` (`src/components/SheetRowPreview.tsx` and `app/summary.tsx`), and simplify the redundant `btn.outcome === 'HR'` subtitle ternary in `src/components/BattingPad.tsx`.
   - **Unused Domain Exports & Position Filter Code:** Remove unused `PositionOption`, `POSITION_OPTIONS`, `BATTING_OUTCOMES`, and `FIELDING_OUTCOMES` from `src/domain/types.ts`. In `src/domain/liveGameHelpers.ts`, remove `applyPositionSelection`, `parsePositions`, and the unused `position` filter property in `CareerFilterOptions` / `filterSheetGameRows` (retaining `year` filtering only).
   - **Unused Package Dependency:** Remove `"query-string"` from `package.json`.

### Definition of Done / Verification
- [x] Completing/copying today's game and switching tabs (or reloading the app) reopens today's completed game without spawning a phantom `0-for-0` game in History.
- [x] Tapping `+ New Game` when the current active game has `0` events reuses that game instead of creating duplicate empty games.
- [x] Zero dead exports, unused props, or unwired webhook files remain in the codebase.
- [x] `npm test` and `npm run typecheck` pass with 0 errors in WSL.

---

## Milestone 7: GitHub Actions CI & Code Quality Workflows

**Objective:** Add automated code quality (typechecking, linting, formatting), unit/integration test, and Expo bundle build checks that run both locally in WSL (`npm run ...`) and automatically in GitHub Actions on every push and pull request.

### Tasks
1. **Configure Linting, Formatting & Build Scripts (`package.json`, `eslint.config.mjs`, `.prettierrc`):**
   - Install and configure **ESLint** (TypeScript + React/React Hooks rules) and **Prettier** so code style and static analysis are enforced consistently.
   - Format any existing files that do not yet match `.prettierrc`.
   - Ensure `package.json` exposes clear, standard scripts for local and CI execution:
     - `"typecheck": "tsc --noEmit"`
     - `"lint": "eslint \"app/**/*.{ts,tsx}\" \"src/**/*.{ts,tsx}\" \"tests/**/*.ts\""`
     - `"format": "prettier --write \"app/**/*.{ts,tsx}\" \"src/**/*.{ts,tsx}\" \"tests/**/*.ts\""`
     - `"format:check": "prettier --check \"app/**/*.{ts,tsx}\" \"src/**/*.{ts,tsx}\" \"tests/**/*.ts\""`
     - `"test": "vitest run"`
     - `"build": "expo export --platform web"` (verifies Metro bundles all Expo Router screens, components, and assets cleanly on Linux runners without requiring macOS/Apple signing certificates).
2. **Create GitHub Actions Workflows (`.github/workflows/`):**
   - Implement GitHub Actions workflow(s) triggered on `push` (to `main`) and `pull_request` running on `ubuntu-latest` with Node 20 and `npm ci` caching across three distinct checks:
     1. **Code Quality / Linting / Formatting (`.github/workflows/code-quality.yml`):** Runs `npm run typecheck`, `npm run lint`, and `npm run format:check`.
     2. **Tests (`.github/workflows/test.yml`):** Runs `npm test` (Vitest unit & repository integration suite).
     3. **Build (`.github/workflows/build.yml`):** Runs `npm run build` (`npx expo export --platform web`) to verify the full production Metro bundle compiles with zero unresolved imports or asset errors.

### Definition of Done / Verification
- [ ] `npm run typecheck`, `npm run lint`, and `npm run format:check` pass with 0 errors or warnings in WSL.
- [ ] `npm test` passes 100% in WSL.
- [ ] `npm run build` (`expo export --platform web`) succeeds cleanly in WSL.
- [ ] `.github/workflows/code-quality.yml`, `.github/workflows/test.yml`, and `.github/workflows/build.yml` are valid and ready for GitHub Actions execution.
