# spikes/

Throwaway measurement apps. Each has its **own** `package.json` and
`node_modules`, is excluded from the app's lint / typecheck / tests
(`eslint.config.js`, `tsconfig.json`, `jest.config.js`), and may install
things the app is forbidden — that is the point of a spike. Nothing under
`src/` may import from here (asserted in `architecture-boundaries.test.ts`).

| Spike | Question | Status |
|---|---|---|
| [`charts-harness/`](./charts-harness) | Which chart renderer — ECharts (SVG / Skia) or Victory Native (Skia) — for People In Stall and its siblings? Requirements §6a; catalogue in `src/charts/PEOPLE_IN_STALL.md`. | Building |

When a spike concludes, its decision is recorded in the requirements doc and the
losing implementation is deleted; the winner moves into `src/components/charts`.
