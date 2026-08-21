# AGENTS.md

## Cursor Cloud specific instructions

This repository is a single, purely client-side app (`react-flow-demo`): a Vite + React 19 + TypeScript SPA that showcases [React Flow](https://reactflow.dev/). There is **no backend, database, or external service** — the only runnable service is the Vite dev server.

Standard commands are defined in `package.json` scripts (`dev`, `build`, `lint`, `preview`); refer to that file rather than duplicating them here.

Non-obvious notes:

- **Dev URL is namespaced.** `vite.config.ts` sets `base: '/react_flow_demo/'` (for GitHub Pages). So the dev server serves at `http://localhost:5173/react_flow_demo/`, **not** `http://localhost:5173/`. The bare root returns a 404-style blank page.
- **Run `npm run dev` as a long-running foreground process** (e.g. a tmux terminal); it is not part of the dependency-install/update step.
- **No test suite exists.** There is no `test` script and no test framework configured, so "run the tests" is a no-op. Use `npm run lint` (oxlint) and `npm run build` (`tsc -b && vite build`) for validation.
- The app is Japanese-language. Two demos via hash routing: `#/` (フローチャート) and `#/swimlane` (スイムレーン). The swimlane view has a bottom toolbar to add lanes/steps/decisions.
