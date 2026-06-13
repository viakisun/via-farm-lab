# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

VIAFARM Reinfa Digital Twin — production-grade vertical-farm digital twin for the **Australian** market. Live end-to-end: Fastify simulator BFF → WebSocket → React → Babylon WebGPU 3D scene (Room A shell, 8 plots, logistic-growth biomass).

Three authoritative docs (read these before non-trivial changes):

- [PLAN.md](PLAN.md) — 18-week execution plan (~140 PRs, 21 phases, v5).
- [ARCHITECTURE.md](ARCHITECTURE.md) — platform vision, ISA-95 mapping, 6-system context, Plot as first-class entity.
- [LOCALISATION.md](LOCALISATION.md) — Australian market rules, en-AU vocabulary, design tokens, legal. **Wins conflicts with PLAN/ARCHITECTURE.**

[SESSION_REPORT.md](SESSION_REPORT.md) is a live status log — read for current state, do not treat as spec.

## Toolchain

- Node ≥ 22 (`.nvmrc`), pnpm ≥ 10 via Corepack (`packageManager` is pinned).
- Turborepo orchestrates `apps/* packages/* tools/*` workspaces. Shared deps live in the **pnpm catalog** ([pnpm-workspace.yaml](pnpm-workspace.yaml)) — add new shared versions there, then reference as `"react": "catalog:"` in package.json.
- TypeScript strict, ESLint flat config with `recommendedTypeChecked` + `stylisticTypeChecked` + `jsx-a11y`, Prettier with `prettier-plugin-organize-imports`.
- Husky + lint-staged + commitlint (Conventional Commits, header ≤ 100, body lines ≤ 120).

## Common commands

```bash
pnpm install                                # first time
pnpm dev                                    # all apps in parallel (turbo)
pnpm -F @via-farm-lab/sim-bff dev           # Fastify BFF only (tsx watch, port 4100)
pnpm -F @via-farm-lab/web dev               # Vite dev server only (port 5173)

pnpm build                                  # production build, all packages
pnpm lint                                   # ESLint across workspace
pnpm typecheck                              # tsc --noEmit across workspace
pnpm test                                   # Vitest workspace (all packages)
pnpm test:watch                             # Vitest watch
pnpm test:e2e                               # Playwright (chromium, en-AU, Sydney TZ)
pnpm check:spelling                         # en-AU spelling guard for locale JSONs (mandatory)
pnpm format                                 # Prettier write
pnpm -F @via-farm-lab/api-contracts gen     # regenerate TS types from OpenAPI specs
```

Run a single Vitest test file: `pnpm -F <pkg> vitest run path/to/file.test.ts`. Single Playwright test: `pnpm test:e2e e2e/path.spec.ts`.

## Dev ports & data flow

- `apps/web` (Vite): **5173**. Proxies `/sim/*` (HTTP + WS) to the BFF — the browser always hits same-origin in dev.
- `apps/sim-bff` (Fastify): **4100** in dev (set by VS Code task and Vite proxy default). Note `apps/sim-bff/src/config.ts` defaults `PORT` to 4000 — start it with `PORT=4100` or run via the VS Code task, otherwise the proxy fails.
- WebSocket: client subscribes to `/sim/stream` (single topic, no per-message subscribe). Server pushes `tick` every tick, `plants` every 3 ticks (throttled snapshot), plus `status`/`jumped`/`speed`/`heartbeat`. See [apps/sim-bff/src/routes/sim.ts](apps/sim-bff/src/routes/sim.ts).
- Time control via REST: `POST /sim/clock/{start,pause,seek,speed}`. Clock supports 1× / 10× / 100×; speeds drive the demo.

## Architecture, big picture

**Six-system platform** (ARCHITECTURE.md §5): Digital Twin (this repo) plus Console (MES/L3), Backend (L1–L2), Robot Ops (L3.5 measurement), Subscription (L4 ERP / 분양), Growth Analysis (L3.5 CV/ML). Each owns its own OpenAPI contract; **no direct cross-system calls** — only domain keys (`plot_id`, `contract_id`, `scan_id`). Phase-1 BFF mocks the other 5 surfaces.

**API-first.** All five external surfaces live as OpenAPI 3.1 YAML in [packages/api-contracts/specs/](packages/api-contracts/specs/) (`console.yaml`, `backend.yaml`, `robot.yaml`, `subscription.yaml`, `growth.yaml` + shared `_components.yaml`). Editing a spec **requires** rerunning `pnpm -F @via-farm-lab/api-contracts gen` to refresh generated types under `src/generated/`. Other packages import via subpath exports (`@via-farm-lab/api-contracts/console`, etc.).

**Plot is the central entity** (ARCHITECTURE.md §4). Hierarchy: Farm → Site → Room → Rack → Bed → **Plot** → Plant. Plot is the subscription/분양 unit (4–8 cells, fixed location). Anywhere code touches plant data, expect a `plotId` key.

**Simulator** ([packages/sim-core](packages/sim-core), [packages/sim-models](packages/sim-models)): deterministic tick loop (`SimClock`, EventEmitter-based), seeded RNG, closed-form models. PR 23 added logistic biomass (`B(t) = K / (1 + ((K−B0)/B0)·exp(−r·t))`) — closed-form, not Euler, so `seek()` jumps stay exact. Environmental modulators (DLI, EC, T) layer on top later; biomass is currently environment-agnostic.

**Rendering** ([apps/web/src/babylon](apps/web/src/babylon)): WebGPU primary (`Canvas.tsx`), WebGL2 fallback. The scene is composed in `room.ts` / `lighting.ts` / `plants.ts`. Babylon Inspector is dev-only (`import.meta.env.DEV`) — hotkey **Shift+I** in the running app. The `onReady` callback into `BabylonCanvas` is memoised in `App.tsx` because Canvas's `useEffect` deps would otherwise rebuild the scene on every WS message.

**Personas** (ARCHITECTURE.md §7): operator / subscriber / visitor / researcher / admin. The BFF decides UI affordances and data filtering by persona token. Phase 1 ships operator + visitor; subscriber is the differentiator for 분양.

## Non-obvious rules

- **en-AU spelling is enforced.** Use `centre`, `colour`, `organise`, `licence` (noun), `litre`, `aluminium`, `analyse`, `fertiliser`. US spelling fails `pnpm check:spelling`. The LOCALISATION.md §2 table is the source of truth; the vocabulary table there (§2.3) defines microcopy terms (e.g. "Pilot Glasshouse", "Solution A", "Power Point" not "outlet").
- **Code is English-only** (identifiers, comments, commit subjects, PR titles). Korean is OK in PR bodies/issues for internal collaboration.
- **Conventional Commits enforced** by commitlint. Types: feat/fix/docs/style/refactor/perf/test/build/ci/chore/revert.
- **No floating promises / no misused promises** — strict. Use `void promise` when intentionally fire-and-forget.
- **No non-null assertions** outside tests. ESLint relaxes unsafe rules in `**/__tests__/**` and `*.test.*`.
- **WebGPU caveats**: Chrome 121+ / Safari 18+ required. Production bundles must not include `@babylonjs/inspector` — guard it behind `import.meta.env.DEV`.
- **Visual regression** uses Playwright's `toHaveScreenshot` with `maxDiffPixelRatio: 0.01` and `animations: 'disabled'`. Baselines live under `e2e/snapshots/`.
- **Don't commit binaries.** Large 3D assets go through Git LFS under [packages/assets](packages/assets) (`_raw/` and `_cache/` are gitignored).

## Where things live (cheat sheet)

| You need to…                      | Open                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| Change a REST/WS contract         | `packages/api-contracts/specs/*.yaml`, then `pnpm -F @via-farm-lab/api-contracts gen` |
| Tune the tick loop / time control | `packages/sim-core/src/clock.ts`                                                      |
| Add a simulator model             | `packages/sim-models/src/` (mirror `biomass.ts`)                                      |
| Wire a new BFF route              | `apps/sim-bff/src/routes/*.ts`, register in `apps/sim-bff/src/server.ts`              |
| Change the 3D scene               | `apps/web/src/babylon/{room,lighting,plants}.ts`                                      |
| Add UI primitives                 | `packages/ui/` (design-system tokens + shadcn-style primitives)                       |
| Add a string                      | `packages/i18n/` (en-AU first, ko-KR mirror); run `pnpm check:spelling`               |
| SCADA HMI symbols                 | `packages/scada/` (SVG, ISA-101)                                                      |
| Add a demo scenario               | `packages/sim-scenarios/`                                                             |
| Supabase schema/migrations        | `infra/supabase/` (Sydney region)                                                     |
