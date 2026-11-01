# Baseball Box Score

A fast, offline-first personal baseball/softball game logger built with **React Native (Expo), Expo Router, TypeScript, and SQLite (`expo-sqlite`)**.

Designed to replace manual in-game Apple Notes logging in the dugout and sync seamlessly with a **23-column Google Sheet**.

---

## Features

- **Zero-Friction In-Game Logging**: Launches straight into today's active game with 1-tap buttons for:
  - **Positions**: `C`, `P`, `1B`, `2B`, `3B`, `SS`, `LF`, `LCF`, `CF`, `RCF`, `RF`, `RV` (Rover), `UTL` (Utility)
  - **Hits**: `1B`, `2B`, `3B`, `HR`
  - **On Base / Misc**: `BB`, `E` (Reached on Error), `FC` (Fielder's Choice)
  - **Outs**: `FO` (Fly / Line Out), `GO` (Ground Out), `K` (Strikeout)
  - **RBIs**: Full-width `0 | +1 | +2 | +3 | +4` quick bar (`HR` defaults to `1 RBI`)
  - **Fielding Chances**: `PO` (Putout), `A` (Assist), `E` (Fielding Error)
  - **1-Tap Undo**: Instant `↶ UNDO LAST PLAY` backed by an append-only event log
- **Local-First & Offline-Resilient**: Every play is persisted immediately on-device (`expo-sqlite` on iOS, `localStorage` on Web) with full support for doubleheaders on the same date.
- **23-Column Google Sheets Sync**:
  - Outputs tab-separated (`TSV`) rows and `.csv` exports aligned to:
    `Date, Position, AB, H, AVG, 1B, 2B, 3B, HR, E (Batting), BB, OBP, SLG, OPS, RBI, FC, K, FO, GO, PO, Assists, Errors, FLD PCT`
  - Leaves formula columns (`AVG`, `OBP`, `SLG`, `OPS`, `FLD PCT`) empty by default so sheet-level `ARRAYFORMULA` columns calculate automatically when pasted into Column A.

---

## Getting Started (WSL Ubuntu + Windows + iPhone)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Tests & Typecheck
```bash
npm test
npm run typecheck
```

### 3. Preview in Desktop Browser (Windows / WSL)
```bash
npx expo start --web
```
Open `http://localhost:8081` in your browser (use Mobile Viewport in DevTools to preview the iPhone layout).

### 4. Run on Physical iPhone via Expo Go
```bash
npx expo start --tunnel
```
Scan the terminal QR code with your iPhone Camera to open the app natively in **Expo Go**.

---

## Project Architecture & Roadmap

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Domain model, 23-column Google Sheets contract, SQLite schema, and system data flow.
- [ROADMAP.md](./ROADMAP.md) — Sequential 5-milestone development plan.

---

## License

Licensed under the [MIT License](./LICENSE).
