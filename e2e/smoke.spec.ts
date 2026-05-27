import { expect, test } from '@playwright/test';

// Placeholder e2e — replaced when apps/web boots (PR 24).
// Today: just verify Playwright + browser bring-up.
test('Playwright bring-up smoke', async ({ page }) => {
  await page.goto('data:text/html,<title>via-farm-lab</title><h1>OK</h1>');
  await expect(page).toHaveTitle('via-farm-lab');
  await expect(page.locator('h1')).toHaveText('OK');
});
