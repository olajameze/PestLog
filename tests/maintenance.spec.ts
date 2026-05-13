import { expect, test } from '@playwright/test';

async function loginSuperAdmin(page: import('@playwright/test').Page) {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const secret = process.env.SUPER_ADMIN_SESSION_SECRET;
  test.skip(!email || !password || !secret || secret.length < 16, 'Super admin env vars not configured');

  await page.goto('/auth/super-admin');
  await page.fill('#super-admin-email', email!);
  await page.fill('#super-admin-password', password!);
  await page.getByRole('button', { name: /sign in as super admin/i }).click();
  await page.waitForURL(/\/super-admin(\/|$)/, { timeout: 20000 });
}

test.describe('Super admin maintenance', () => {
  test('redirects guests away from /super-admin/maintenance', async ({ page }) => {
    await page.goto('/super-admin/maintenance');
    await expect(page).toHaveURL(/\/auth\/super-admin/);
  });

  test('admin sees maintenance sections and vacuum POST succeeds', async ({ page }) => {
    await loginSuperAdmin(page);
    await page.goto('/super-admin/maintenance');
    await expect(page.getByTestId('maintenance-section-health')).toBeVisible();
    await expect(page.getByTestId('maintenance-section-database')).toBeVisible();
    await expect(page.getByTestId('maintenance-section-webhooks')).toBeVisible();
    await expect(page.getByTestId('maintenance-section-error-logs')).toBeVisible();
    await expect(page.getByTestId('maintenance-section-actions')).toBeVisible();

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/super-admin/maintenance/action') &&
        res.request().method() === 'POST',
    );
    await page.getByTestId('maintenance-button-vacuum').click();
    const res = await responsePromise;
    expect(res.ok()).toBeTruthy();
    const body = await res.json().catch(() => ({}));
    expect(body).toMatchObject({ ok: true });
  });

  test('database section shows error copy when snapshot DB is mocked unavailable', async ({ page }) => {
    test.skip(process.env.PLAYWRIGHT_MAINTENANCE_MOCK_DB_FAILURE !== '1', 'Set PLAYWRIGHT_MAINTENANCE_MOCK_DB_FAILURE=1 for this case');

    await loginSuperAdmin(page);
    await page.goto('/super-admin/maintenance');
    await expect(page.getByText(/Failed to load database section/i)).toBeVisible();
  });

  test('delete user by email returns 404 for unknown user', async ({ page }) => {
    await loginSuperAdmin(page);
    await page.goto('/super-admin/maintenance');
    await page.getByTestId('maintenance-delete-email-input').locator('input').fill('playwright-nonexistent-user@example.com');
    page.once('dialog', (d) => d.accept());
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/super-admin/maintenance/action') &&
        res.request().method() === 'POST',
    );
    await page.getByTestId('maintenance-delete-user').click();
    const res = await responsePromise;
    expect(res.status()).toBe(404);
  });
});
