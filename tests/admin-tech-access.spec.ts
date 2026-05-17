import { expect, test } from '@playwright/test';

async function loginBusinessAdmin(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/auth/signin?role=admin');
  await page.fill('#email', email);
  await page.locator('#password').pressSequentially(password, { delay: 10 });
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45000 });
}

test.describe('Admin technician access (plan gated)', () => {
  test('starter plan admin does not see technician logging link', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_STARTER_ADMIN_EMAIL;
    const password = process.env.PLAYWRIGHT_STARTER_ADMIN_PASSWORD;
    test.skip(!email || !password, 'Set PLAYWRIGHT_STARTER_ADMIN_EMAIL and PLAYWRIGHT_STARTER_ADMIN_PASSWORD');

    await loginBusinessAdmin(page, email!, password!);
    await page.goto('/dashboard?tab=technicians');
    await expect(page.getByTestId('admin-log-reports-link')).toHaveCount(0);
  });

  test('pro plan admin sees technician link and can navigate there', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_PRO_ADMIN_EMAIL;
    const password = process.env.PLAYWRIGHT_PRO_ADMIN_PASSWORD;
    test.skip(!email || !password, 'Set PLAYWRIGHT_PRO_ADMIN_EMAIL and PLAYWRIGHT_PRO_ADMIN_PASSWORD');

    await loginBusinessAdmin(page, email!, password!);
    await page.goto('/dashboard?tab=technicians');
    await expect(page.getByTestId('admin-log-reports-link')).toBeVisible();
    await page.getByTestId('admin-log-reports-link').click();
    await page.waitForURL(/\/technician/, { timeout: 30000 });
    await expect(page.getByTestId('back-to-admin-dashboard-link')).toBeVisible();
    await page.getByTestId('back-to-admin-dashboard-link').click();
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
  });

  test('business and enterprise admins both see technician link', async ({ page }) => {
    const businessEmail = process.env.PLAYWRIGHT_BUSINESS_ADMIN_EMAIL;
    const businessPassword = process.env.PLAYWRIGHT_BUSINESS_ADMIN_PASSWORD;
    const enterpriseEmail = process.env.PLAYWRIGHT_ENTERPRISE_ADMIN_EMAIL;
    const enterprisePassword = process.env.PLAYWRIGHT_ENTERPRISE_ADMIN_PASSWORD;
    test.skip(
      !businessEmail || !businessPassword || !enterpriseEmail || !enterprisePassword,
      'Set PLAYWRIGHT_BUSINESS_ADMIN_* and PLAYWRIGHT_ENTERPRISE_ADMIN_* credentials',
    );

    await loginBusinessAdmin(page, businessEmail!, businessPassword!);
    await page.goto('/dashboard?tab=technicians');
    await expect(page.getByTestId('admin-log-reports-link')).toBeVisible();
    await page.goto('/auth/signin?role=admin');
    await page.fill('#email', enterpriseEmail!);
    await page.locator('#password').pressSequentially(enterprisePassword!, { delay: 10 });
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 45000 });
    await page.goto('/dashboard?tab=technicians');
    await expect(page.getByTestId('admin-log-reports-link')).toBeVisible();
  });
});

test.describe('Dashboard chrome + onboarding', () => {
  test('sign out button is visible near top area without scrolling', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_OWNER_EMAIL;
    const password = process.env.PLAYWRIGHT_OWNER_PASSWORD;
    test.skip(!email || !password, 'Set PLAYWRIGHT_OWNER_EMAIL and PLAYWRIGHT_OWNER_PASSWORD');

    await loginBusinessAdmin(page, email!, password!);
    await page.goto('/dashboard?tab=technicians');
    const signOut = page.getByTestId('sidebar-signout-top');
    await expect(signOut).toBeVisible();
    const box = await signOut.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.y ?? 999)).toBeLessThan(220);
  });

  test('onboarding popup appears near top of viewport for first-time users', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_OWNER_EMAIL;
    const password = process.env.PLAYWRIGHT_OWNER_PASSWORD;
    test.skip(!email || !password, 'Set PLAYWRIGHT_OWNER_EMAIL and PLAYWRIGHT_OWNER_PASSWORD');

    await page.addInitScript(() => window.localStorage.removeItem('pesttrace-tour-seen'));
    await loginBusinessAdmin(page, email!, password!);
    await page.goto('/dashboard?tab=technicians');
    const stepLabel = page.getByText(/Step 1 of/i);
    await expect(stepLabel).toBeVisible();
    const box = await stepLabel.boundingBox();
    expect(box).not.toBeNull();
    expect((box?.y ?? 999)).toBeLessThan(180);
  });
});

test.describe('One-time admin guidance message', () => {
  test('eligible admin gets localStorage marker and message is one-time', async ({ page }) => {
    const email = process.env.PLAYWRIGHT_PRO_ADMIN_EMAIL;
    const password = process.env.PLAYWRIGHT_PRO_ADMIN_PASSWORD;
    test.skip(!email || !password, 'Set PLAYWRIGHT_PRO_ADMIN_EMAIL and PLAYWRIGHT_PRO_ADMIN_PASSWORD');

    await page.addInitScript(() => window.localStorage.removeItem('admin_tech_message_shown'));
    await loginBusinessAdmin(page, email!, password!);
    await page.goto('/dashboard?tab=technicians');

    await expect(
      page.getByText(
        /As a business admin, you can also log your own technician reports\./i,
      ),
    ).toBeVisible({ timeout: 12000 });

    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem('admin_tech_message_shown')))
      .toBe('true');

    await page.reload();
    await expect
      .poll(async () => page.evaluate(() => window.localStorage.getItem('admin_tech_message_shown')))
      .toBe('true');
  });
});
