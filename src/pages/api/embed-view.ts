import type { APIRoute } from 'astro';

// Required on Astro 5 with an adapter installed -- see the identical note in
// api/subscribe.ts. Without this the route only runs once at build time.
export const prerender = false;

// Lightweight referrer log for embedded calculator widgets. This is the
// backlink-engine's success metric: every embed placed on someone else's
// site pings this endpoint once on load with the referring domain, so those
// domains can be reviewed periodically as both live backlinks and outreach
// leads (garden blogs, extension sites, etc. worth a direct "we noticed you
// embedded X, want to write about it?" email).
//
// Deliberately NOT wired into GA4: loading gtag.js on someone else's page is
// exactly the "analytics bloat" the embed pages are built to avoid. This
// just logs a structured line that shows up in Netlify's function log
// viewer (Site -> Logs -> Functions -> embed-view), filterable by referrer
// domain. If GA4 reporting is wanted later, this is the one place to add a
// Measurement Protocol call -- it needs a GA4 "Measurement Protocol API
// secret" (Admin -> Data Streams -> your stream -> Measurement Protocol API
// secrets) that isn't available here.
export const POST: APIRoute = async ({ request }) => {
  let body: { calculator?: string; referrer?: string; path?: string } = {};
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 204 });
  }

  const calculator = typeof body.calculator === 'string' ? body.calculator.slice(0, 100) : 'unknown';
  const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 500) : '';

  let referrerDomain = '(direct/none)';
  if (referrer) {
    try {
      referrerDomain = new URL(referrer).hostname;
    } catch {
      referrerDomain = '(unparsed)';
    }
  }

  // Structured, greppable log line -- intentionally simple rather than a
  // database, per the "lightweight" requirement.
  console.log(
    JSON.stringify({
      event: 'embed_view',
      calculator,
      referrerDomain,
      referrer,
      timestamp: new Date().toISOString(),
    })
  );

  return new Response(null, { status: 204 });
};
