/**
 * POST /api/plant-care/create-order — opens a PayPal order for exactly one thing.
 *
 * Nothing in the request body is read. Not the price, not the product, not a
 * quantity, not a coupon. The client's only job is to ask; everything the order
 * contains comes from constants in src/lib/plantCarePayments.ts.
 */
import type { APIRoute } from 'astro';
import { PRICE, PRODUCT, accessToken, failure, json, logEvent, readConfig } from '../../../lib/plantCarePayments';

export const prerender = false;

export const POST: APIRoute = async () => {
  let cfg;
  try {
    cfg = readConfig();
  } catch (err) {
    logEvent('plantcare.config.missing', { missing: (err as { missing?: string[] }).missing });
    return failure(500, 'Checkout is not configured yet.');
  }

  try {
    const token = await accessToken(cfg);
    const res = await fetch(`${cfg.api}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        // Lets a retried request re-use the same order instead of opening a
        // second one, which is what a double-click otherwise produces.
        'PayPal-Request-Id': crypto.randomUUID(),
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: { currency_code: PRICE.currency_code, value: PRICE.value },
            description: `${PRODUCT} — one app, bought once`,
            // Shown on the buyer's card statement. 22 characters, uppercase.
            soft_descriptor: 'HARVESTMATH PLANTS',
          },
        ],
        application_context: {
          brand_name: PRODUCT,
          user_action: 'PAY_NOW',
          shipping_preference: 'NO_SHIPPING',
        },
      }),
    });

    const body = (await res.json().catch(() => ({}))) as { id?: string; name?: string; details?: unknown };
    if (!res.ok || !body.id) {
      logEvent('plantcare.order.create.failed', { status: res.status, name: body.name });
      return failure(502, 'PayPal would not open an order. Nothing has been charged.');
    }

    logEvent('plantcare.order.created', { orderId: body.id, value: PRICE.value });
    // The id, and nothing else. The client needs it to hand back on capture.
    return json(200, { id: body.id });
  } catch (err) {
    logEvent('plantcare.order.create.error', { message: String((err as Error)?.message) });
    return failure(502, 'Could not reach PayPal. Nothing has been charged.');
  }
};
