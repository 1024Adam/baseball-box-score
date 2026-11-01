# Contributing to Baseball Box Score

Thank you for your interest in contributing to **Baseball Box Score**!

## Development Workflow

1. **Read the Docs First**:
   - Review [ARCHITECTURE.md](./ARCHITECTURE.md) for the domain rules and the 23-column Google Sheets schema contract.
   - Review [ROADMAP.md](./ROADMAP.md) for milestone structure and verification checklists.
2. **Local Setup (WSL / Linux / macOS)**:
   ```bash
   npm install
   ```
3. **Architecture Guardrails**:
   - Keep `src/domain/` 100% pure TypeScript with zero UI or database dependencies.
   - Maintain the exact 23-column order in `SheetGameRow` (`Date` through `FLD PCT`).
   - Ensure storage changes in `src/storage/` work seamlessly on both native iOS (`expo-sqlite`) and Web (`localStorage`).
4. **Verification Before Submitting a PR**:
   Run unit/integration tests and TypeScript typechecking:
   ```bash
   npm test
   npm run typecheck
   ```
