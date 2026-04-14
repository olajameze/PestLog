import { expect, test } from '@playwright/test';

test.describe('PestTrek E2E smoke', () => {
  test('loads public pages, signs up, and protects dashboard endpoints', async ({ page, request }) => {
    const baseEmail = `playwright+${Date.now()}@example.com`;
    const password = 'Password123!';

    await page.goto('/auth/signup');
    await expect(page.locator('text=Create your account')).toBeVisible();

    await page.fill('#business-name', 'Playwright Pest Co');
    await page.fill('#full-name', 'E2E Tester');
    await page.fill('#email', baseEmail);
    await page.fill('#password', password);
    await page.fill('#confirm-password', password);
    await page.click('button:has-text("Create Account")');

    await page.waitForURL('**/auth/signin', { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Welcome back to PestTrek' })).toBeVisible();

    await page.goto('/dashboard');
    expect(page.url()).toMatch(/\/(auth\/signin|dashboard)$/);

    await page.goto('/upgrade');
    expect(page.url()).toMatch(/\/(auth\/signin|upgrade)$/);

    const subscriptionResponse = await request.get('/api/subscription');
    expect(subscriptionResponse.status()).toBe(401);

    const checkoutResponse = await request.post('/api/create-checkout-session', {
      data: { plan: 'pro' },
    });
    expect(checkoutResponse.status()).toBe(401);

    const certificationResponse = await request.post('/api/technicians/certifications', {
      data: {
        technicianId: 'fake-id',
        expiryDate: '2026-12-31',
        fileUrl: 'fake-id/sample.pdf',
      },
    });
    expect(certificationResponse.status()).toBe(401);
  });
});
