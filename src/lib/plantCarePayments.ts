/**
 * The checkout's server half.
 *
 * ── THE RULE THIS FILE EXISTS TO ENFORCE ────────────────────────────────────
 *
 * The browser is never the authority on whether payment happened.
 *
 * PayPal's JS SDK calls `onApprove` in the buyer's browser. That callback can be
 * invoked by hand from the console in about ten seconds, so a download link
 * handed out on `onApprove` makes the product free to anybody who opens
 * devtools. The only thing that decides a sale happened is this server calling
 * PayPal's capture endpoint and reading `status: "COMPLETED"` out of PayPal's
 * own reply — and then checking the amount captured is the amount asked for,
 * because an order created for $29 can be captured for less if the figure ever
 * comes from the client.
 *
 * So: the price is a constant here, the client never sends it, and the token
 * that unlocks the file is minted only after PayPal has confirmed the money.
 *
 * This is the same design already running on ownyourledger.com. It is repeated
 * rather than shared because the two are separate deployments with separate
 * PayPal apps — and a payment path that is "mostly the same as the one over
 * there" is the kind of thing that silently diverges into a bug about money.
 */
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

/**
 * Hardcoded, server-side, never read from a request body.
 *
 * If the client sends the amount, somebody sends `0.01`. That is not a
 * hypothetical — it is the most common way a checkout built from an SDK
 * tutorial loses money.
 */
export const PRICE = { value: '29.00', currency_code: 'USD' } as const;
export const PRODUCT = 'HarvestMath Plant Care';

export interface PayConfig {
  clientId: string;
  secret: string;
  api: string;
  downloadSecret: string;
}

/**
 * Read at call time, not at import time, so a missing variable produces a clear
 * 500 from the route that needed it rather than a blank failure at cold start.
 */
export function readConfig(): PayConfig {
  const missing: string[] = [];
  const need = (name: string) => {
    const v = process.env[name];
    if (!v) missing.push(name);
    return v as string;
  };
  const cfg: PayConfig = {
    clientId: need('PAYPAL_CLIENT_ID'),
    secret: need('PAYPAL_SECRET'),
    api: process.env.PAYPAL_API || 'https://api-m.paypal.com',
    downloadSecret: need('DOWNLOAD_SECRET'),
  };
  if (missing.length) {
    const err = new Error(`Missing environment variables: ${missing.join(', ')}`) as Error & { missing?: string[] };
    err.missing = missing;
    throw err;
  }
  return cfg;
}

export const isSandbox = () => (process.env.PAYPAL_API || '').includes('sandbox');

/* ---------------------------------------------------------- paypal oauth --- */

let cached: { token: string; expires: number } | null = null;

export async function accessToken(cfg: PayConfig): Promise<string> {
  if (cached && cached.expires > Date.now()) return cached.token;

  const res = await fetch(`${cfg.api}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${cfg.clientId}:${cfg.secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal refused the credentials (${res.status})`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  // 60 seconds of margin so a token never expires mid-request.
  cached = { token: body.access_token, expires: Date.now() + (body.expires_in - 60) * 1000 };
  return cached.token;
}

/* --------------------------------------------------------------- tokens --- */

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');

/**
 * Thirty days, not twenty-four hours.
 *
 * Own Your Ledger uses a day because its file is the whole product and a buyer
 * downloads it immediately. Here the same token also opens the welcome page,
 * which carries the install instructions for the app — and somebody who buys on
 * a laptop and installs on a phone the following week is a normal buyer, not an
 * edge case. The updates page is the permanent route back; this is the grace
 * period before they need it.
 */
export function signToken(secret: string, opts: { orderId: string; ttlMs?: number; now?: number }): string {
  const { orderId, ttlMs = TOKEN_TTL_MS, now = Date.now() } = opts;
  const payload = b64url(JSON.stringify({ o: orderId, x: now + ttlMs, n: randomUUID().slice(0, 8) }));
  const sig = b64url(createHmac('sha256', secret).update(payload).digest());
  return `${payload}.${sig}`;
}

export type TokenResult =
  | { ok: true; orderId: string; expires: number }
  | { ok: false; reason: 'malformed' | 'bad signature' | 'expired' };

/**
 * Verify in the order that gives away the least: shape, then signature, then
 * expiry. Checking expiry first would let somebody learn whether a forged
 * token's payload was well-formed without having to forge the signature.
 */
export function verifyToken(secret: string, token: unknown, now = Date.now()): TokenResult {
  if (typeof token !== 'string' || !token.includes('.')) return { ok: false, reason: 'malformed' };
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return { ok: false, reason: 'malformed' };

  const expected = createHmac('sha256', secret).update(payload).digest();
  let given: Buffer;
  try {
    given = Buffer.from(sig, 'base64url');
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  // Length first: timingSafeEqual throws on a mismatch, and that throw is
  // itself a timing signal.
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'bad signature' };
  }

  let data: { o?: string; x?: number };
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (typeof data.x !== 'number' || data.x < now) return { ok: false, reason: 'expired' };
  return { ok: true, orderId: String(data.o ?? ''), expires: data.x };
}

/* ----------------------------------------------------------- the sale ----- */

export interface CaptureCheck {
  ok: boolean;
  reason?: string;
  captureId?: string;
}

/**
 * `status === 'COMPLETED'` is necessary and not sufficient.
 *
 * The capture inside the order carries the amount, and that is what the money
 * actually was. Both are checked against the constant at the top of this file.
 */
export function captureIsGood(order: unknown): CaptureCheck {
  const o = order as {
    status?: string;
    purchase_units?: { payments?: { captures?: { id?: string; status?: string; amount?: { value?: string; currency_code?: string } }[] } }[];
  };
  if (!o || o.status !== 'COMPLETED') return { ok: false, reason: `order status is ${o?.status ?? 'missing'}` };

  const capture = o.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture) return { ok: false, reason: 'no capture on the order' };
  if (capture.status !== 'COMPLETED') return { ok: false, reason: `capture status is ${capture.status}` };

  const paid = capture.amount?.value;
  const currency = capture.amount?.currency_code;
  if (paid !== PRICE.value || currency !== PRICE.currency_code) {
    return { ok: false, reason: `captured ${paid} ${currency}, expected ${PRICE.value} ${PRICE.currency_code}` };
  }
  return { ok: true, captureId: capture.id };
}

/* ------------------------------------------------------------- plumbing --- */

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const failure = (status: number, message: string) => json(status, { error: message });

/**
 * One line per event, to the function log.
 *
 * Never the secret, never the token, never a full PayPal payload — an order id
 * and a status is enough to reconstruct what happened from PayPal's own
 * dashboard, and anything more is a log that must itself be protected.
 */
export function logEvent(event: string, data: Record<string, unknown> = {}): void {
  try {
    console.log(JSON.stringify({ at: new Date().toISOString(), event, ...data }));
  } catch {
    console.log(event);
  }
}
