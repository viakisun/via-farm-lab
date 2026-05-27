import { expect, test } from '@playwright/test';
import { expectNoA11yViolations } from './lib/axe';

// Placeholder e2e — replaced when apps/web boots (PR 24).
// Today: just verify Playwright + browser bring-up + axe wiring.
test('Playwright bring-up smoke', async ({ page }) => {
  await page.goto('data:text/html,<title>via-farm-lab</title><h1>OK</h1>');
  await expect(page).toHaveTitle('via-farm-lab');
  await expect(page.locator('h1')).toHaveText('OK');
});

test('axe-core smoke (well-formed page passes WCAG 2.2 AA)', async ({ page }) => {
  await page.goto(
    'data:text/html,<!doctype html><html lang="en-AU"><head><title>OK</title></head><body><h1>via-farm-lab</h1><p>Smoke.</p></body></html>',
  );
  await expectNoA11yViolations(page);
});
