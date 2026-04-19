// Backward compatible alias.
// Canonical webhook handler is `pages/api/webhooks/stripe.ts`.
import handler from './webhooks/stripe';
export default handler;

export const config = {
  api: {
    bodyParser: false,
  },
};