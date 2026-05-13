import { expect, test } from '@playwright/test';

async function loginBusinessOwner(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/auth/signin?role=admin');
  await page.fill('#email', email);
  await page.locator('#password').pressSequentially(password, { delay: 10 });
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
}

test.describe('Account deletion (settings)', () => {
  test('delete modal lists reasons', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_OWNER_EMAIL;
    const password = process.env.PLAYWRIGHT_OWNER_PASSWORD;
    test.skip(!email || !password, 'Set PLAYWRIGHT_OWNER_EMAIL and PLAYWRIGHT_OWNER_PASSWORD for this UI test');

    await loginBusinessOwner(page, email!, password!);
    await page.goto('/dashboard?tab=settings');
    await page.getByRole('button', { name: /^delete account$/i }).click();
    await expect(page.getByTestId('delete-account-modal')).toBeVisible();
    await expect(page.getByText('Too expensive')).toBeVisible();
  });

  test('destructive delete completes when explicitly enabled', async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_ACCOUNT_DELETE_E2E !== '1', 'Set PLAYWRIGHT_ACCOUNT_DELETE_E2E=1 only with a disposable account');
    const email = process.env.PLAYWRIGHT_OWNER_EMAIL;
    const password = process.env.PLAYWRIGHT_OWNER_PASSWORD;
    test.skip(!email || !password);

    await loginBusinessOwner(page, email!, password!);
    await page.goto('/dashboard?tab=settings');
    await page.getByRole('button', { name: /^delete account$/i }).click();
    await page.getByRole('radio', { name: /^Technical issues$/ }).check();
    await page.getByTestId('delete-account-comment').fill('Playwright disposable teardown');
    await page.getByRole('button', { name: /^confirm delete$/i }).click();
    await page.waitForURL(/\?accountDeleted=1/, { timeout: 120000 });

    await page.goto('/auth/signin?role=admin');
    await page.fill('#email', email!);
    await page.locator('#password').pressSequentially(password!, { delay: 10 });
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 20000 });
  });
});
