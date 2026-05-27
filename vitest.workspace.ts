// Vitest workspace — picks up every package's vitest.config.ts.
// Run `pnpm test` at root to run them all.
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace(['apps/*/vitest.config.ts', 'packages/*/vitest.config.ts']);
