#!/usr/bin/env node
// Scan en-AU locale files (and optionally markdown docs) for US spellings.
// LOCALISATION.md §2.1 — Australian English only.
//
// Exit code 0 = clean, 1 = US spellings found.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../..');

// Each pair: [US spelling regex, AU replacement, description].
// Word boundaries ensure we only match standalone words.
const RULES = [
  [/\bcolor\b/gi, 'colour'],
  [/\bcolors\b/gi, 'colours'],
  [/\bbehavior\b/gi, 'behaviour'],
  [/\bbehaviors\b/gi, 'behaviours'],
  [/\bcenter\b/gi, 'centre'],
  [/\bcenters\b/gi, 'centres'],
  [/\bcentered\b/gi, 'centred'],
  [/\borganize\b/gi, 'organise'],
  [/\borganized\b/gi, 'organised'],
  [/\borganization\b/gi, 'organisation'],
  [/\brecognize\b/gi, 'recognise'],
  [/\brecognized\b/gi, 'recognised'],
  [/\bspecialize\b/gi, 'specialise'],
  [/\boptimize\b/gi, 'optimise'],
  [/\bcustomize\b/gi, 'customise'],
  [/\banalyze\b/gi, 'analyse'],
  [/\bfertilizer\b/gi, 'fertiliser'],
  [/\bsterilize\b/gi, 'sterilise'],
  [/\bliter\b/gi, 'litre'],
  [/\bliters\b/gi, 'litres'],
  [/\bmeter\b/gi, 'metre'], // note: meter (device) is OK in AU too — false positives possible
  [/\bkilometer\b/gi, 'kilometre'],
  [/\bcentimeter\b/gi, 'centimetre'],
  [/\bmillimeter\b/gi, 'millimetre'],
  [/\bcatalog\b/gi, 'catalogue'],
  [/\bdialog\b/gi, 'dialogue'], // exception: 'Dialog' as a UI component is allowed
  [/\baluminum\b/gi, 'aluminium'],
];

// Paths to scan. Locale files are mandatory; markdown is opt-in via CLI flag.
const LOCALE_GLOB = 'packages/i18n/src/locales/en-AU';

function walk(dir) {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

let problems = 0;
const files = walk(resolve(ROOT, LOCALE_GLOB));

for (const file of files) {
  if (!file.endsWith('.json')) continue;
  const content = readFileSync(file, 'utf-8');
  for (const [pattern, suggestion] of RULES) {
    const matches = content.match(pattern);
    if (!matches) continue;
    // Skip "dialog" hits if used as UI component identifier — heuristic.
    const filtered = matches.filter(
      (m) => !/dialog/i.test(m) || !/component|Dialog/i.test(content),
    );
    if (filtered.length === 0) continue;
    console.error(
      `${relative(ROOT, file)}: found "${filtered[0]}" — use "${suggestion}" (Australian English).`,
    );
    problems += filtered.length;
  }
}

if (problems > 0) {
  console.error(`\n✖ ${problems} US-English spelling(s) found. See LOCALISATION.md §2.1.`);
  process.exit(1);
}
console.log('✓ No US spellings detected in en-AU locales.');
