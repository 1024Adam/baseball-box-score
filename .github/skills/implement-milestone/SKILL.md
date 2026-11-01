---
name: implement-milestone
description: "Implement a milestone from ROADMAP.md following the specifications in ARCHITECTURE.md. Use when: implementing a milestone, building the next milestone, executing the roadmap, starting Milestone 1-6, continuing development of the baseball stats app."
argument-hint: "Optional milestone number (e.g., '1', 'Milestone 2', or omit for next incomplete milestone)"
user-invocable: true
disable-model-invocation: false
---

# Implement Milestone Workflow

## Purpose
Execute a vertical-slice milestone from [ROADMAP.md](../../../ROADMAP.md) in strict alignment with the architecture and domain contracts defined in [ARCHITECTURE.md](../../../ARCHITECTURE.md).

## When to Use
- The user runs `/implement-milestone` (with or without a milestone number).
- The user asks to "build Milestone N", "implement the next milestone", or "start building the app from the roadmap".

---

## Step-by-Step Procedure

### Step 1: Load Context & Identify Target Milestone
1. Read [ARCHITECTURE.md](../../../ARCHITECTURE.md) and [ROADMAP.md](../../../ROADMAP.md) in the repository root.
2. Determine which milestone to implement:
   - **If the user specified a milestone** (e.g., `/implement-milestone 1` or "Milestone 2"), target that milestone.
   - **If no milestone was specified**, inspect the `### Definition of Done / Verification` checkboxes (`- [ ]` vs `- [x]`) in [ROADMAP.md](../../../ROADMAP.md) and the existing codebase to select the **first incomplete milestone**.
3. Verify prerequisites:
   - Confirm that prior milestones' core files exist and their unit/integration tests pass before starting a higher-numbered milestone.

### Step 2: Enforce Architectural Guardrails
While implementing the target milestone, strictly adhere to the architectural decisions in [ARCHITECTURE.md](../../../ARCHITECTURE.md):
- **Tech Stack (WSL Ubuntu + Windows + iPhone)**:
  - Use **React Native (Expo) + Expo Router + TypeScript** (`npx expo start --web` for Windows browser testing and `npx expo start --tunnel` for iPhone Expo Go testing).
  - Do **not** generate Xcode/Swift files that cannot be built or tested inside the user's WSL Ubuntu environment.
- **23-Column Google Sheet Contract**:
  - Maintain the exact 23-column order in `SheetGameRow` and all TSV/CSV/Webhook formatters:
    `Date, Position, AB, H, AVG, 1B, 2B, 3B, HR, E (Batting), BB, OBP, SLG, OPS, RBI, FC, K, FO, GO, PO, Assists, Errors, FLD PCT`.
  - Keep `FO` (Fly Outs, including Line Outs / Pop Outs) and `GO` (Ground Outs) separate, with both incrementing `AB`.
  - Ensure `E_BAT` (Reached on Error) and `FC` (Fielder's Choice) increment `AB` without incrementing `H`.
  - Ensure `BB` (Walk) does **not** increment `AB`.
  - Guard all rate calculations (`AVG`, `OBP`, `SLG`, `OPS`, `FLD PCT`) against division by zero (`null` when denominator is `0`).
- **Clean Layer Separation**:
  - Keep `src/domain/` 100% pure TypeScript with zero React Native or database imports so domain logic runs in `<1s` in WSL unit tests.
  - Ensure `src/storage/` provides seamless persistence on both iOS (`expo-sqlite`) and Web (`localStorage` / `IndexedDB` or web SQLite fallback) so browser testing in WSL works identically to iPhone testing.
  - Design UI components in `src/components/` and screens in `app/` for one-handed, high-contrast dugout usage with zero required text fields before logging a play.

### Step 3: Implement All Milestone Tasks
1. Work through every numbered task under the target milestone's `### Tasks` section in [ROADMAP.md](../../../ROADMAP.md).
2. Write or update comprehensive automated tests in `tests/` covering the milestone's new functionality and edge cases.

### Step 4: Run WSL Verification Loop
Before marking the milestone complete, run verification commands inside WSL Ubuntu:
1. **Unit & Integration Tests**:
   - Run `npm test` (or `npx vitest run` / `npx jest`) and ensure all tests pass with zero failures.
2. **TypeScript Typecheck**:
   - Run `npx tsc --noEmit` and resolve any type errors.
3. **Web / App Smoke Check (for Milestones 3–5)**:
   - Verify the Expo web bundle compiles cleanly (`npx expo export --platform web` or dev server check) so the user can test immediately in their Windows browser.

### Step 5: Update `ROADMAP.md` & Report Results
1. Update the completed verification checkboxes (`- [ ]` -> `- [x]`) under the target milestone's `### Definition of Done / Verification` section in [ROADMAP.md](../../../ROADMAP.md).
2. Present a concise completion report containing:
   - **Milestone Completed**: Summary of files created/updated.
   - **Automated Verification Results**: Output summary of `npm test` and `npx tsc --noEmit`.
   - **How to Test Locally & on iPhone**:
     - **Windows Browser (from WSL):** `npx expo start --web`
     - **iPhone (Expo Go):** `npx expo start --tunnel`
   - **Next Milestone Preview**: Brief summary of what the next `/implement-milestone` call will build.
