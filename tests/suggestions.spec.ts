import { expect, test } from '@playwright/test';

test.describe('Landing suggestions form', () => {
  test('section and fields render', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByTestId('landing-suggestions-section')).toBeVisible();
    await expect(page.getByTestId('suggestion-body')).toBeVisible();
    await expect(page.getByTestId('suggestion-submit')).toBeVisible();
  });

  test('API rejects suggestions shorter than 10 characters', async ({ request }) => {
    const res = await request.post('/api/suggestions', {
      data: { suggestion: 'tooshort', category: 'Other' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json().catch(() => ({}));
    expect(String((body as { error?: string }).error).toLowerCase()).toMatch(/10/);
  });

  test('valid submission shows thank-you state', async ({ page }) => {
    await page.goto('/home');
    await page.getByTestId('landing-suggestions-section').scrollIntoViewIfNeeded();
    const text = `Playwright compliance idea ${Date.now()} — need printable audit trail export.`;
    await page.getByTestId('suggestion-body').fill(text);
    const posted = page.waitForResponse(
      (res) => res.url().includes('/api/suggestions') && res.request().method() === 'POST',
    );
    await page.getByTestId('suggestion-submit').click();
    const res = await posted;
    expect(res.ok(), await res.text()).toBeTruthy();
    await expect(page.getByTestId('suggestions-thank-you')).toBeVisible({ timeout: 15000 });
  });
});

test.describe('Suggestions API rate limit', () => {
  test.describe.configure({ mode: 'serial' });

  test('fourth POST from same IP in one hour returns 429', async ({ request }) => {
    const ipOctet = 10 + Math.floor(Math.random() * 200);
    const forwarded = `198.51.100.${ipOctet}`;
    const headers = { 'x-forwarded-for': forwarded };
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const base = {
      suggestion: `Rate limit probe ${suffix} — enough characters for validation.`,
      category: 'Other',
    };
    for (let i = 0; i < 3; i++) {
      const res = await request.post('/api/suggestions', {
        headers,
        data: { ...base, suggestion: `${base.suggestion} (${i})` },
      });
      expect(res.ok(), await res.text()).toBeTruthy();
    }
    const fourth = await request.post('/api/suggestions', {
      headers,
      data: { ...base, suggestion: `${base.suggestion} (3)` },
    });
    expect(fourth.status()).toBe(429);
    const body = await fourth.json().catch(() => ({}));
    expect(typeof (body as { error?: string }).error).toBe('string');
  });
});
