/**
 * POST /api/plant-care/capture-order — takes the money, then mints the token.
 *
 * The order of those two is the whole point. The token that opens the welcome
 * page and the download is created only after PayPal has told this server, in
 * its own reply, that the capture completed for the right amount in the right
 * currency. The browser's opinion is not consulted at any stage.
 */
import type { APIRoute } from 'astro';
import {
  accessToken,
  captureIsGood,
  failure,
  json,
  logEvent,
  readConfig,
  signToken,
} from '../../../lib/plantCarePayments';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let cfg;
  try {
    cfg = readConfig();
  } catch (err) {
    logEvent('plantcare.config.missing', { missing: (err as { missing?: string[] }).missing });
    return failure(500, 'Checkout is not configured yet.');
  }

  let orderId: string;
  try {
    const body = (await request.json()) as { orderId?: unknown };
    if (typeof body.orderId !== 'string' || !/^[A-Z0-9]{5,40}$/i.test(body.orderId)) {
      return failure(400, 'That is not an order id.');
    }
    orderId = body.orderId;
  } catch {
    return failure(400, 'No order id was sent.');
  }

  try {
    const token = await accessToken(cfg);
    const res = await fetch(`${cfg.api}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `cap-${orderId}`,
      },
    });

    const order = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      logEvent('plantcare.capture.failed', { orderId, status: res.status, name: order.name });
      return failure(502, 'PayPal would not complete the payment. You have not been charged.');
    }

    const good = captureIsGood(order);
    if (!good.ok) {
      /* Reached PayPal, got an answer, and the answer is not a completed sale
         for the right amount. Loudly, because this is either a genuine failure
         or somebody trying something. */
      logEvent('plantcare.capture.rejected', { orderId, reason: good.reason });
      return failure(402, 'That payment did not complete. Nothing has been unlocked.');
    }

    logEvent('plantcare.sale', { orderId, captureId: good.captureId });
    return json(200, { token: signToken(cfg.downloadSecret, { orderId }) });
  } catch (err) {
    logEvent('plantcare.capture.error', { orderId, message: String((err as Error)?.message) });
    return failure(502, 'Could not reach PayPal to complete the payment.');
  }
};
