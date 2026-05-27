# Autonomous Session Report — 2026-05-28 (overnight)

Live status of the autonomous overnight build session for `via-farm-lab`.
Read this first before continuing work.

## TL;DR

**Phase 1A + 1B + start of 1C-α — COMPLETE.**
18 PRs delivered as 18 commits on `main`. Session ending here at a clean
boundary; context budget consumed.

Status summary:

- Phase 1A (Foundation) — PRs 1–4, 6–10 (9 PRs). Done.
- Phase 1B (API contracts) — PRs 11–16 (6 PRs). Done.
- Phase 1C-α (simulator BFF + core) — PRs 17, 19, 22 (3 PRs). Partial.
  - Done: Fastify scaffold, SimClock, SeededRng.
  - **Remaining**: PR 18 (Postgres+Drizzle), PR 20 (time-control API+WS),
    PR 21 (snapshot storage).

Skipped on purpose: PR 5 (CI/CD — no GitHub remote yet).

## Phase 1C-α Recap (PRs 17, 19, 22 — partial)

**apps/sim-bff** (PR 17) — Fastify 5 server.

- zod-validated config, helmet, CORS, rate-limit, structured pino logs.
- `/`, `/health`, `/ready`, `/metrics` (Prometheus).
- Dockerfile (multi-stage node:22-alpine) + docker-compose.yml
  (Postgres 17 for local dev). 4/4 inject tests pass.

**@via-farm-lab/sim-core** (PRs 19 + 22).

- `SimClock`: virtual time, start/pause/stop/setSpeed (0.1–100×) / seek,
  EventEmitter (`tick`, `status`, `jumped`, `speed`). 8 tests.
- `SeededRng`: xorshift128+ with bigint state, splitmix64 seed expansion,
  bigint/number/string seeds (string = FNV-1a 64-bit), nextFloat/Int/Range/
  Normal/Boolean/pick/fork. Deterministic across runtimes. 7 tests.

Sequence preserved by tests: same seed → byte-identical sequence forever.
Critical for snapshot replay (Phase 1C-α PR 21) and scenario reproducibility.

## What's Next When You Pick This Up

Cleanest entry point is **PR 18 (Postgres + Drizzle)**. Then PR 20 (time
control HTTP/WS in sim-bff) which wires SimClock to the network, then
PR 21 (snapshot storage in Postgres). After that, PRs 23–32 are the eight
physics/chemistry/biology models — each is a 1–2 day, self-contained piece.

To resume:

1. `pnpm install` (rehydrate node_modules if it drifted).
2. `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e` (everything
   green at this commit — `git log -1` should show `feat(sim-core): ...`).
3. Read PLAN.md PR 18 onwards.

If you want **GitHub up now** (so the work survives a laptop wipe and CI
can run): create an empty repo and:

```
git remote add origin git@github.com:<org>/via-farm-lab.git
git push -u origin main
```

Then we can do PR 5 (CI/CD) properly.

## Phase 1B Recap (PR 11–16)

- All 5 external system OpenAPI specs defined:
  Console, Backend, Robot Ops, Subscription (stub), Growth Analysis (stub).
- TypeScript types auto-generated into `packages/api-contracts/src/generated/`.
- `pnpm gen` regenerates from yaml; generated/ ignored by ESLint.
- Plot ID pattern (`farm.site.room.rack.bed.idx`) canonical across all systems.
- Subscription includes APP-compliant consent shape (privacy / terms / imageUse
  / marketing). Customer.locale ∈ {en-AU, ko-KR}. AUD pricing.
- Robot scan images via signed URL only — never inline (privacy + bandwidth).
- WebSocket endpoints documented in yaml (no JSON Schema, just description).

The 5 yamls are the **authoritative contract surface** — copy these to the
respective owning teams. Each can be hand-edited and `pnpm gen` keeps the
TS types in sync.

## Completed Commits (latest first)

```
feat(sim-core):    SeededRng + SimClock (PR 22 + 19)
feat(sim-bff):     Fastify scaffold + health + metrics + Docker (PR 17)
docs(session):     update SESSION_REPORT for Phase 1B complete
feat(api-contracts): Growth Analysis API spec stub (PR 16)
feat(api-contracts): Subscription API spec stub (PR 15)
feat(api-contracts): Robot Ops API spec (PR 14)
feat(api-contracts): Backend API spec (PR 13)
feat(api-contracts): Console API spec (PR 12)
feat(api-contracts): scaffold OpenAPI workspace + type generation (PR 11)
docs: add SESSION_REPORT.md (Phase 1A complete)
feat(a11y):        wire accessibility tooling (PR 10)
feat(i18n):        bootstrap localisation @via-farm-lab/i18n (PR 9)
feat(telemetry):   bootstrap observability package (PR 8)
feat(ui):          bootstrap design system @via-farm-lab/ui (PR 7)
feat(test):        Vitest + Playwright + visual regression infra (PR 6)
feat(toolchain):   git hooks (husky + lint-staged + commitlint) (PR 4)
feat(toolchain):   ESLint flat + Prettier (PR 3)
feat(toolchain):   strict TypeScript across workspace (PR 2)
d75f28b chore: bootstrap monorepo (PR 1)
```

Run `git log --oneline` for the canonical list.

## Verified Health

| Check                 | Status | How                                                                                                 |
| --------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `pnpm install`        | ✅     | 19 workspace projects recognised                                                                    |
| `pnpm typecheck`      | ✅     | 18/18 packages (TS strict + exactOptionalPropertyTypes)                                             |
| `pnpm lint`           | ✅     | 18/18 packages, zero warnings                                                                       |
| `pnpm test`           | ✅     | 40 unit tests (3 telemetry + 3 i18n + 4 ui + 3 api-contracts + 4 sim-bff + 7 rng + 8 clock + smoke) |
| `pnpm test:e2e`       | ✅     | 2/2 (Playwright bring-up + axe-core smoke)                                                          |
| `pnpm check:spelling` | ✅     | No US spellings in en-AU locales                                                                    |
| Pre-commit hook       | ✅     | Caught real issues during the session (lint, AU spelling)                                           |
| `commitlint`          | ✅     | Conventional Commits enforced                                                                       |

## Repository Snapshot

```
via-farm-lab/                        Node 22 / pnpm 10 / turbo 2.9
├── apps/
│   ├── web/                         placeholder (PR 24)
│   ├── sim-bff/                     placeholder (PR 17)
│   └── docs/                        placeholder (PR 40)
├── packages/
│   ├── api-contracts/               placeholder (PR 11–16)
│   ├── sim-core/                    placeholder (PR 19–22)
│   ├── sim-models/                  placeholder (PR 23–32)
│   ├── sim-scenarios/               placeholder (PR 38–39)
│   ├── scene/                       placeholder (PR 46+)
│   ├── materials/                   placeholder (PR 48)
│   ├── effects/                     placeholder (PR 106+)
│   ├── scada/                       placeholder (PR 92–99)
│   ├── ui/                          ★ ACTIVE (Button/Card/Input/Dialog/Toast + tokens)
│   ├── data/                        placeholder (PR 41+)
│   ├── persona/                     placeholder (PR 134+)
│   ├── i18n/                        ★ ACTIVE (en-AU + ko-KR, glossary, AU spelling check)
│   ├── telemetry/                   ★ ACTIVE (Sentry stub, Pino, Web Vitals)
│   ├── assets/                      placeholder (PR 50+)
│   └── types/                       placeholder
├── tools/                           placeholder (Phase 2+)
├── infra/                           placeholder (per service)
├── e2e/                             ★ ACTIVE (axe helper, smoke tests, en-AU + AEDT)
├── tsconfig.{base,dom,node,*}.json
├── eslint.config.js
├── .prettierrc.json
├── .husky/{pre-commit,commit-msg}
├── commitlint.config.js
├── vitest.{workspace,config.base}.ts
├── playwright.config.ts
├── pnpm-workspace.yaml              (catalog: 50+ pinned deps)
├── turbo.json
└── package.json                     (pnpm@10.17.1, type: module)
```

## Decisions Made Autonomously (Override If Wanted)

1. **Project codename**: `via-farm-lab` (chosen by you at start; npm scope `@via-farm-lab/*`).
2. **Node 22 LTS** pinned (`.nvmrc=22`, `engines>=22`); env has Node 24, both work.
3. **Catalog-driven version pinning** in `pnpm-workspace.yaml` — every package
   references `"foo": "catalog:"`. Single point of upgrade.
4. **TS strict + exactOptionalPropertyTypes** from day one. Caught real issues in
   PR 8 (Sentry types) — wrote idiomatic narrows rather than weakening the rule.
5. **ESLint type-checked rules** with `projectService` for monorepo speed.
   Test files relax `no-non-null-assertion` and `no-explicit-any`.
6. **Pre-commit chain**: lint-staged (eslint+prettier) → commitlint conventional.
7. **Vitest workspace** with per-package config (env = happy-dom for DOM
   packages, node for server packages). Smoke test stub in every package so
   `pnpm test` is always green even before real code.
8. **Playwright**: locale `en-AU`, timezone `Australia/Sydney` (LOCALISATION §3).
   `toHaveScreenshot` ready for visual regression baselines (committed in `e2e/`).
9. **Design system colour palette** in OKLCH (perceptually uniform, better mode
   transitions). Brand = emerald-ish for agriculture; danger = red but reserved
   for alarms only (LOCALISATION §4.3). Dark mode is 1st-class.
10. **Kiosk button size** = `h-20` (80px) — meets LOCALISATION §5.2 touch-target
    requirement, available as `<Button size="kiosk">`.
11. **Telemetry stub mode** when `SENTRY_DSN` is empty — no branching needed at
    call sites, just logs to console. Real DSN swaps in transparently.
12. **i18n parity test** (ko-KR keys must mirror en-AU) — catches missing
    translations as a unit test, not a runtime surprise.
13. **AU spelling guard** (`pnpm check:spelling`) — runs over `en-AU` JSON.
    Heuristic only (not perfect — `meter` as a device is excluded by design).
14. **jsx-a11y** enforced on `.tsx`. Caught a real issue in `CardTitle` on
    first run.

## Skipped / Deferred (per autonomous policy)

| PR                                | Reason                        | Unblock when                        |
| --------------------------------- | ----------------------------- | ----------------------------------- |
| **PR 5 (CI/CD)**                  | No GitHub remote              | You provide GitHub org + repo name  |
| Real Sentry DSN wire-up           | No DSN                        | You provide DSN                     |
| Real Cloudflare R2                | Asset CDN waits until PR 50   | When PR 50 is reached               |
| Real Supabase                     | Auth waits until PR 135       | When PR 135 is reached              |
| Real Vercel deploy                | Deployment waits until PR 167 | When PR 167 is reached              |
| Phase 9 legal PRs (160–166)       | Need solicitor                | You arrange AU privacy / ACL review |
| Phase 10 production deploy (167+) | Need keys + domain            | You provide                         |

## Service Keys — Next Need

You can keep sleeping for a while yet. Earliest external dependency:

- **GitHub** — needed to wire CI (PR 5). I'm continuing past this; the work
  will commit clean to a remote whenever you create one.
- **Sentry DSN** — easy add later; the SDK is wired and inert without it.

Nothing else is needed until **Phase 2A (PR 50)** at the earliest.

## Pending User Decisions (Non-Blocking)

| Decision                          | Suggested default I'd use    | When it matters       |
| --------------------------------- | ---------------------------- | --------------------- |
| `.com.au` vs `.au` domain + ABN   | `.com.au`, ABN to follow     | PR 167                |
| Sentry region                     | EU (no AU region available)  | PR 8 wire-up          |
| Plot cell count standard          | 4 cells/plot, 24 plots/bed   | PR 23 (biomass model) |
| Sentry error budget / SLO numbers | 99.5% / p95 200ms / LCP 2.5s | Phase 8               |

## Known Quirks Observed During the Session

- ESLint flat config + `projectService` chokes on standalone config files
  (`*.config.ts`, `scripts/**`, `e2e/lib/**`) → solved by listing them in
  `eslint.config.js` `ignores`. If you add a new tooling file, add it there.
- Once during PR 7, `packages/ui/package.json` and `src/index.ts` appeared to
  revert to placeholder content between a `Write` and a follow-up `pnpm install`.
  Cause unclear (possibly tool-state staleness). Rewrote and proceeded — both
  files now correct in the committed history. **Worth re-verifying after
  bulk writes** (rule of thumb learned for the rest of the session).
- pnpm reports `Ignored build scripts: esbuild` on every install — cosmetic;
  `pnpm approve-builds` will silence it if it becomes annoying.

## What's Next (in the order I'd take them)

1. **Phase 1B — PR 11–16: OpenAPI 3.1 contracts** for the 5 external systems
   (Console / Backend / Robot Ops / Subscription / Growth). Generates TS types
   into `packages/api-contracts/`. Zero external deps. Can begin immediately.
2. **Phase 1C-α — PR 17–22: simulator BFF foundations.**
   - PR 17 Fastify scaffold + health/metrics
   - PR 18 Postgres (local Docker) + Drizzle migrations
   - PR 19 Tick loop + time control (0.1×–100×)
   - PR 20 Time-control API + WebSocket
   - PR 21 Snapshot storage (time travel)
   - PR 22 Seeded RNG
3. **Phase 1C-β — PR 23–32: eight simulator models** (Flow, EC/pH chemistry,
   biomass, CO₂, T/RH, PAR, robot kinematics, scan).
4. **Phase 1C-γ — PR 33–40: API surfaces + scenarios.**
5. **Phase 1D — PR 41–45: frontend data layer** (TanStack Query, Zustand, WS).
6. **Phase 2A onwards — Babylon, scene, plants, etc.**

I will continue with Phase 1B unless context runs out.

## Updates To This File

This file is the live snapshot. I'll append a new section after each Phase
completes, with the same shape: commits, decisions, deferrals, next.

---

_Updated: 2026-05-28 by Claude (Opus 4.7) — autonomous session._
