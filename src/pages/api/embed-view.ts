import type { APIRoute } from 'astro';

// Required on Astro 5 with an adapter installed -- see the identical note in
// api/subscribe.ts. Without this the route only runs once at build time.
export const prerender = false;

// Relay endpoint for the embed widgets' analytics. Started as a referrer-only
// log (see git history); now also forwards `embed_loaded` and
// `embed_result_generated` to GA4 via the Measurement Protocol.
//
// Why a server relay instead of loading gtag.js inside the embed page:
//
//  1. Page weight. EmbedLayout.astro is deliberately bare -- no header,
//     footer, nav, or site-wide GA4 tag -- because it renders inside
//     someone else's page. gtag.js is real weight to hand a stranger's site.
//  2. Cookies. gtag.js running inside a cross-origin iframe is exactly the
//     "third-party cookie" pattern Safari ITP blocks outright and Chrome is
//     phasing out -- it would silently stop working for a growing share of
//     visitors even if we shipped it. A server-to-server Measurement
//     Protocol call has no browser cookie story to break: this relay mints a
//     disposable client_id per request and never persists or returns it, so
//     the embed itself sets zero cookies.
//  3. It sidesteps GA4's cross-domain/third-party-iframe measurement
//     settings entirely -- there's no iframe-hosted script measuring
//     anything, just a plain HTTPS POST from this function to Google's
//     collect endpoint, which works the same regardless of the embedder's
//     cookie or referrer policy.
//
// Requires a GA4 "Measurement Protocol API secret" (GA4 Admin -> Data
// Streams -> your web stream -> Measurement Protocol API secrets -> Create),
// set as the GA4_MP_API_SECRET environment variable in Netlify's site
// config (Site configuration -> Environment variables). That secret can't be
// created or set from here -- without it, this function still logs every
// event (unchanged from the original referrer-log behavior) but does not
// forward to GA4; see `ga4Forwarded` in the log line to tell which mode is
// active.
const GA4_MEASUREMENT_ID = 'G-L7SK0FES3Q'; // same public stream ID as Layout.astro's gtag snippet
const GA4_MP_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

// Only these are accepted from the embed -- never let client input choose an
// arbitrary GA4 event name.
const ALLOWED_EVENTS = new Set(['embed_loaded', 'embed_result_generated']);

function randomClientId(): string {
  // Measurement Protocol just needs *a* client_id string; a fresh random one
  // per request keeps this un-linkable to any real visitor, at the
  // deliberate cost of GA4 seeing every hit as a "new" client rather than
  // stitching sessions together -- fine for this metric, which counts
  // distinct referring domains, not individual visitors.
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}.${Math.random().toString(36).slice(2)}`;
  }
}

export const POST: APIRoute = async ({ request }) => {
  let body: {
    event?: string;
    calculator?: string;
    referrer?: string; // resolved by the client: a hostname, or the literal 'unknown'
    path?: string;
  } = {};
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const eventName = ALLOWED_EVENTS.has(body.event ?? '') ? (body.event as string) : 'embed_loaded';
  const calculator = typeof body.calculator === 'string' ? body.calculator.slice(0, 100) : 'unknown';
  const embedReferrer =
    typeof body.referrer === 'string' && body.referrer.trim() ? body.referrer.slice(0, 255) : 'unknown';

  const apiSecret = import.meta.env.GA4_MP_API_SECRET as string | undefined;
  let ga4Forwarded = false;

  if (apiSecret) {
    try {
      const params: Record<string, string> =
        eventName === 'embed_loaded'
          ? { calculator_name: calculator, embed_referrer: embedReferrer }
          : { calculator_name: calculator, context: 'embed' };

      const res = await fetch(`${GA4_MP_ENDPOINT}?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${apiSecret}`, {
        method: 'POST',
        body: JSON.stringify({
          client_id: randomClientId(),
          // Anonymous iframe hit with a disposable id -- don't let GA4 try
          // to build an ads/remarketing profile out of it.
          non_personalized_ads: true,
          events: [{ name: eventName, params }],
        }),
      });
      ga4Forwarded = res.ok;
    } catch {
      // Never let a GA4 relay failure affect the embed's own response.
    }
  }

  // Structured, greppable log line -- still the fastest way to eyeball new
  // embedding domains in Netlify's log viewer (Site -> Logs -> Functions ->
  // embed-view) without waiting on GA4's reporting lag.
  console.log(
    JSON.stringify({
      event: eventName,
      calculator,
      embedReferrer,
      path: typeof body.path === 'string' ? body.path.slice(0, 200) : '',
      ga4Forwarded,
      timestamp: new Date().toISOString(),
    })
  );

  return new Response(null, { status: 204 });
};
