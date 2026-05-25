import { expect, test } from '@playwright/test';
import {
  MIN_TRIAL_END_LEAD_MS,
  resolveCheckoutTrialAlignment,
} from '../lib/stripe/checkoutTrial';

test.describe('checkout trial alignment', () => {
  test('defers billing when trialEndsAt is in the future', () => {
    const now = new Date('2026-05-20T12:00:00Z').getTime();
    const trialEnd = new Date('2026-05-27T00:00:00Z');
    const result = resolveCheckoutTrialAlignment(trialEnd, now);

    expect(result.shouldDeferFirstCharge).toBe(true);
    expect(result.trialEndUnix).toBe(Math.floor(trialEnd.getTime() / 1000));
    expect(result.trialEndsAt?.toISOString()).toBe(trialEnd.toISOString());
  });

  test('charges immediately when trial has expired', () => {
    const now = new Date('2026-05-28T00:00:00Z').getTime();
    const result = resolveCheckoutTrialAlignment(new Date('2026-05-27T00:00:00Z'), now);

    expect(result.shouldDeferFirstCharge).toBe(false);
    expect(result.trialEndUnix).toBeNull();
  });

  test('charges immediately when trial end is within minimum lead window', () => {
    const now = Date.now();
    const tooSoon = new Date(now + MIN_TRIAL_END_LEAD_MS - 60_000);
    const result = resolveCheckoutTrialAlignment(tooSoon, now);

    expect(result.shouldDeferFirstCharge).toBe(false);
    expect(result.trialEndUnix).toBeNull();
  });
});
