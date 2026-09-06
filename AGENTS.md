# Repository Guidelines

## Project Structure & Modules
- `index.ts`: Orchestrates data flow for keeper cost generation.
- `classes/League.ts`: Core logic to fetch Sleeper data, read CSVs, and compute stats.
- `utils.ts`: Small utilities (e.g., keeper increment via Fibonacci).
- `types.ts`: Shared TypeScript interfaces.
- `data/`: Static inputs (player refs, stats CSVs, keeper lists).
- Output files (e.g., `combinedData_<year>.csv`, `keeper_costs.csv`) are written to repo root.

## Build, Test, and Development
- `npm start`: Compiles TypeScript then runs `dist/index.js`.
- `npm run prestart`: TypeScript compile via `npx tsc`.
- Dev loop: `npx tsc -w` in one terminal; `node dist/index.js` in another.
- VS Code: `.vscode/launch.json` is configured to build and launch `index.ts`.
- Runtime: Use Node 18+ (Devcontainer pins Node 22) for global `fetch`.

## Coding Style & Conventions
- Formatting: Prettier enforced by `.prettierrc` (2 spaces, single quotes, no semicolons, width 80, trailing commas es5).
- Run on save in the devcontainer, or manually: `npx prettier --write .`.
- TypeScript: CommonJS modules, target ES2016. Keep types in `types.ts` and reuse.
- Naming: PascalCase for classes, camelCase for variables/functions, UPPER_SNAKE_CASE for constants.

## Testing Guidelines
- Framework: Not set up yet. Preferred: Jest or Vitest with ts-jest/ts-node.
- Suggested structure: `tests/**/*.test.ts` or colocate as `__tests__/` near source.
- Commands (after adding Jest): `npm test` runs unit tests and reports coverage.
- Minimum: Add unit tests for `utils.ts` and integration tests around `League` methods with mocked fetch/FS.

## Commit & PR Guidelines
- Commits: Use short, imperative messages (e.g., "add keeper cost writer"). Group related changes.
- PRs: Include purpose, scope, steps to run/verify, linked issues, and sample output (paths like `keeper_costs.csv`). Add screenshots for data diffs when relevant.

## Security & Configuration
- Do not commit secrets. Move any API tokens/cookies to env vars (e.g., `SLEEPER_AUTH`) and access via `process.env`.
- `.env` is git-ignored. Document required env vars in the PR when introducing them.
