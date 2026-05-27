# e2e

Playwright end-to-end tests + visual regression baselines.

- Locale: `en-AU`, timezone `Australia/Sydney` (per [LOCALISATION.md](../LOCALISATION.md))
- Baselines: `e2e/**/*-snapshots/` (committed to git)
- Run: `pnpm test:e2e` (from repo root)
- Update baselines: `pnpm test:e2e --update-snapshots`

`apps/web` is wired up at PR 24 (Babylon bootstrap). Until then this directory
contains only a bring-up smoke test against a data URL.
