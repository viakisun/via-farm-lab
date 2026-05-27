// Helper for invoking axe-core in Playwright tests.
// Targets WCAG 2.2 AA per LOCALISATION §5 + PLAN PR 165.
import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

/**
 * Run axe on the current page and fail the test if any violations are found.
 *
 * Usage:
 *   import { expectNoA11yViolations } from './lib/axe';
 *   test('home page is accessible', async ({ page }) => {
 *     await page.goto('/');
 *     await expectNoA11yViolations(page);
 *   });
 */
export async function expectNoA11yViolations(
  page: Page,
  opts: { tags?: string[]; includeSelector?: string } = {},
): Promise<void> {
  const builder = new AxeBuilder({ page }).withTags(
    opts.tags ?? ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
  );
  if (opts.includeSelector) {
    builder.include(opts.includeSelector);
  }
  const { violations } = await builder.analyze();
  expect.soft(violations, formatViolations(violations)).toEqual([]);
}

function formatViolations(
  violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations'],
): string {
  if (violations.length === 0) return 'No accessibility violations.';
  return violations
    .map(
      (v) =>
        `${v.id} (${v.impact ?? 'unknown'}): ${v.help}\n  ${v.helpUrl}\n  affected: ${v.nodes.length} node(s)`,
    )
    .join('\n\n');
}
