#!/usr/bin/env node
// Generate TypeScript types from every OpenAPI yaml in `specs/`.
// Output: `src/generated/<name>.ts`.
//
// Run via `pnpm -F @via-farm-lab/api-contracts gen` after editing any yaml.
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = resolve(__dirname, '..');
const SPECS_DIR = join(PKG_ROOT, 'specs');
const OUT_DIR = join(PKG_ROOT, 'src/generated');

mkdirSync(OUT_DIR, { recursive: true });

const yamls = readdirSync(SPECS_DIR).filter((f) => f.endsWith('.yaml'));
if (yamls.length === 0) {
  console.error('No yaml specs found in', SPECS_DIR);
  process.exit(1);
}

for (const file of yamls) {
  const name = file.replace(/\.yaml$/, '');
  const input = join(SPECS_DIR, file);
  const output = join(OUT_DIR, `${name}.ts`);
  console.log(`→ generating ${name}.ts`);
  execSync(
    `npx --no-install openapi-typescript "${input}" --output "${output}" --immutable --properties-required`,
    { stdio: 'inherit', cwd: PKG_ROOT },
  );
}

console.log('\n✓ All types generated.');
