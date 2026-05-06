import Stripe from 'stripe';

const API_VERSION = '2024-06-20' as const;

function getStripeOrNull(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  const isValidPrefix = key?.startsWith('sk_') || key?.startsWith('rk_');
  if (
    !key ||
    key.trim().length === 0 ||
    !isValidPrefix ||
    key === 'sk_test_...' ||
    key.includes('your-secret-key')
  ) {
    return null;
  }
  return new Stripe(key, { apiVersion: API_VERSION });
}

const TERMINAL_SUBSCRIPTION_STATUSES = new Set(['canceled', 'incomplete_expired']);

export type CancelSubscriptionsResult =
  | { ok: true; cancelledCount: number }
  | { ok: false; error: string };

/** Cancels every non-terminal Stripe subscription for a customer (paginated). */
export async function cancelAllSubscriptionsForStripeCustomer(
  customerId: string,
): Promise<CancelSubscriptionsResult> {
  const stripe = getStripeOrNull();
  if (!stripe) {
    return { ok: false, error: 'Stripe is not configured (STRIPE_SECRET_KEY).' };
  }

  let cancelledCount = 0;
  try {
    let startingAfter: string | undefined;
    for (;;) {
      const page = await stripe.subscriptions.list({
        customer: customerId,
        limit: 100,
        starting_after: startingAfter,
      });

      for (const sub of page.data) {
        if (TERMINAL_SUBSCRIPTION_STATUSES.has(sub.status)) continue;
        await stripe.subscriptions.cancel(sub.id);
        cancelledCount += 1;
      }

      if (!page.has_more) break;
      const lastId = page.data[page.data.length - 1]?.id;
      if (!lastId) break;
      startingAfter = lastId;
    }

    return { ok: true, cancelledCount };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Stripe has no subscriptions to cancel when the customer id is unknown in this account
    // (wrong live/test keys, migrated account, or customer removed in Dashboard).
    if (/no such customer/i.test(message)) {
      console.warn(
        `[stripe] cancelSubscriptions: customer "${customerId}" not found — continuing without cancel (${message}).`,
      );
      return { ok: true, cancelledCount: 0 };
    }
    const code =
      typeof e === 'object' && e !== null && 'code' in e
        ? String((e as { code?: unknown }).code ?? '')
        : '';
    if (code === 'resource_missing') {
      console.warn(
        `[stripe] cancelSubscriptions: missing resource for customer "${customerId}" — continuing (${message}).`,
      );
      return { ok: true, cancelledCount: 0 };
    }
    return { ok: false, error: message };
  }
}
