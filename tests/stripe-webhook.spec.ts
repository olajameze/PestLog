import { expect, test } from '@playwright/test';

test.describe('Stripe webhook smoke', () => {
  test('rejects requests without Stripe-Signature', async ({ request }) => {
    const res = await request.post('/api/webhooks/stripe', {
      data: '{}',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(400);
    const text = await res.text();
    expect(text.toLowerCase()).toMatch(/stripe-signature|webhook error/i);
  });
});
