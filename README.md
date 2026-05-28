# via-farm-lab

VIAFARM Reinfa Digital Twin — production-grade vertical farm digital twin for the Australian market.

## Status

🚧 Phase 1 in progress. Live milestone: simulator → BFF → WebSocket → React → Babylon WebGPU end-to-end. Room shell, 8 plots with logistic-growth biomass, cinematic lighting.

## Documentation

- [PLAN.md](PLAN.md) — 18-week execution plan, ~140 PRs, 21 phases
- [ARCHITECTURE.md](ARCHITECTURE.md) — platform vision, ISA-95 mapping, 6-system context
- [LOCALISATION.md](LOCALISATION.md) — Australian market, en-AU primary, design tokens, legal
- [SESSION_REPORT.md](SESSION_REPORT.md) — live build status

## Requirements

- Node.js ≥ 22 (LTS — see `.nvmrc`)
- pnpm ≥ 10 (via Corepack)
- Chrome 121+ or Safari 18+ recommended (WebGPU)

```bash
corepack enable
nvm use   # or: fnm use
pnpm install
```

## Quick start

Two terminals (or one VS Code "Run Build Task" — see below):

```bash
# Terminal 1
pnpm -F @via-farm-lab/sim-bff dev

# Terminal 2
pnpm -F @via-farm-lab/web dev
```

Then open **http://localhost:5173/**.

## Commands

```bash
pnpm dev               # turbo run dev (all apps in parallel)
pnpm build             # production build
pnpm lint              # ESLint across the workspace
pnpm typecheck         # tsc --noEmit across the workspace
pnpm test              # Vitest unit tests
pnpm test:e2e          # Playwright end-to-end
pnpm check:spelling    # en-AU spelling guard for locale JSONs
pnpm format            # Prettier write
```

## Working in VS Code (recommended)

Open the workspace:

```bash
code /Users/adminvia/devwork/_VIAFARM/DigitalTwin
```

First open: VS Code prompts to install the recommended extensions (see `.vscode/extensions.json`):
ESLint · Prettier · Tailwind IntelliSense · YAML · OpenAPI (42Crunch) · GitLens · Playwright · Vitest Explorer · Babylon Snippets · pretty-ts-errors.

**One-click tasks** (Cmd+Shift+P → "Run Task"):

- **dev: both (sim-bff + web)** — boots both servers; this is the default build task (Cmd+Shift+B).
- **test: all (unit)** — Vitest run.
- **lint + typecheck + spelling** — pre-PR safety net.
- **openapi: regenerate types** — re-runs `pnpm gen` after editing any yaml in `packages/api-contracts/specs/`.

**Debug** (`Run and Debug` panel):

- **sim-bff (tsx, watch)** — breakpoints in the Fastify server.
- **Web (Chrome → http://localhost:5173)** — Chrome attached with WebGPU enabled and DevTools auto-open.
- **Full stack** — compound that launches both above.

**Live tuning** — Babylon Inspector is wired into the web app in dev only:

> In the browser, press **Shift + I** to open the Babylon Inspector. Tweak camera, lights, materials, mesh transforms live — when you find values you like, paste them back into the source (`apps/web/src/babylon/`).

The inspector is dynamically imported only in `import.meta.env.DEV` so production bundles stay slim.

## Workflow split — Claude vs you in VS Code

| Work                                         | Owner                       | Why                                    |
| -------------------------------------------- | --------------------------- | -------------------------------------- |
| Visual tuning (camera, colours, lights)      | **You / Babylon Inspector** | HMR ~0.5 s loop; nobody beats that     |
| Single-file 3–5 line edits                   | You                         | Context-switch cost lower than asking  |
| Reading & learning the codebase              | You                         | —                                      |
| Brand/copy content additions                 | You                         | —                                      |
| Multi-file PR scaffolds (e.g. `feat(racks)`) | **Claude**                  | 8 files in 30 s                        |
| Simulator models (logistic, ODEs, etc.)      | Claude                      | Math + tests + integration in one shot |
| OpenAPI extensions + type regen              | Claude                      | Boilerplate                            |
| Test suite additions                         | Claude                      | Boilerplate                            |
| Cross-file refactors / debugging             | Claude                      | Simultaneous grep + edit               |
| CI / infra / Docker                          | Claude                      | Single-pass                            |

Rule of thumb: **"tweak this small thing" → you · "build me this feature" → Claude**.

## Workspace Layout

```
apps/
  web/             # Vite + React + Babylon (3D + SCADA dual view)
  sim-bff/         # Fastify + simulator + 5 API surfaces
  docs/            # VitePress documentation site

packages/
  api-contracts/   # OpenAPI 3.1 × 5 + generated TypeScript types
  sim-core/        # Simulator core (tick loop, time control, seeded RNG)
  sim-models/      # 8 physics/chemistry/biology models
  sim-scenarios/   # 5 demo scenarios
  scene/           # Babylon scene composition
  materials/       # PBR materials + shaders
  effects/         # GPU particles + volumetric
  scada/           # SVG HMI components (ISA-101)
  ui/              # Design system (shadcn + tokens)
  data/            # BFF client + hooks + stores
  persona/         # Persona + authorisation + auth
  i18n/            # en-AU + ko-KR localisation
  telemetry/       # Error + metrics + structured logs
  assets/          # glTF + HDR + KTX2 (Git LFS)
  types/           # Shared TypeScript types

tools/
  asset-pipeline/  # Blender + KTX2 + lightmap baking
  sim-bench/       # Simulator benchmarks
  perf-bench/      # GPU benchmarks
  compliance/      # Privacy / accessibility automation

infra/
  supabase/        # Schema, migrations, RLS, seeds (Sydney region)
  cloudflare/      # R2 buckets, Workers, Pages config
  vercel/          # Deployment config
```

## License

UNLICENSED — proprietary. © VIAFARM. All rights reserved.
