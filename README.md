# via-farm-lab

VIAFARM Reinfa Digital Twin — production-grade vertical farm digital twin for the Australian market.

## Status

🚧 Phase 1 in progress (~140 PRs / 18 weeks). Currently at **PR 1 — monorepo bootstrap**.

## Documentation

- [PLAN.md](PLAN.md) — 18-week execution plan, ~140 PRs, 21 phases
- [ARCHITECTURE.md](ARCHITECTURE.md) — platform vision, ISA-95 mapping, 6-system context
- [LOCALISATION.md](LOCALISATION.md) — Australian market, en-AU primary, design tokens, legal

## Requirements

- Node.js ≥ 22 (LTS — see `.nvmrc`)
- pnpm ≥ 10 (via Corepack)

```bash
corepack enable
nvm use   # or: fnm use
pnpm install
```

## Commands

```bash
pnpm dev          # run all apps in dev mode (orchestrated by turbo)
pnpm build        # production build of all apps and packages
pnpm lint         # ESLint across the workspace
pnpm typecheck    # tsc --noEmit across the workspace
pnpm test         # unit tests (Vitest)
pnpm test:e2e     # end-to-end tests (Playwright)
pnpm clean        # remove build outputs and node_modules
```

Most subcommands will be no-ops until their respective packages are scaffolded in later PRs.

## Workspace Layout

```
apps/
  web/             # Vite + React + Babylon (3D + SCADA dual view)
  sim-bff/         # Fastify + simulator + 5 API surfaces
  docs/            # VitePress documentation site

packages/
  api-contracts/   # OpenAPI 3.1 × 5 + generated TypeScript types
  sim-core/        # Simulator core (tick loop, time control, state store)
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
