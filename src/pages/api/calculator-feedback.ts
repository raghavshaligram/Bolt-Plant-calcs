import type { APIRoute } from 'astro';
import { getStore } from '@netlify/blobs';

// Required on Astro 5 with an adapter installed -- see the identical note in
// api/subscribe.ts and api/embed-view.ts. Without this the route only runs
// once at build time.
export const prerender = false;

// Backs the pilot's "Was this helpful?" Yes/No panel and its real helpful
// count (Build Prompt part 2). This is the one part of that prompt that
// needs actual persistence, not just an analytics event: the count has to
// survive across visitors and page loads, and per the site's no-fake-stats
// policy it must never show a seeded or invented number.
//
// Storage: Netlify Blobs (@astrojs/netlify already pulls this in -- the dev
// server's "Enabling sessions with Netlify Blobs" log line is Astro's own
// session feature using the same underlying store). One JSON document per
// calculator, keyed by slug, holding { yes, no } counts. No visitor
// identifiers are stored -- this is a pure aggregate counter, not
// per-user tracking.
//
// HIDE_BELOW_COUNT mirrors the "hard rule: no invented social proof" from
// the build prompt -- the count is only ever real, but a real count of 1 or
// 2 reads as suspicious/thin rather than as genuine social proof, so the
// client-side UI (CalculatorActionPanel.tsx) hides the number below this
// threshold and shows it once it's genuinely a real, presentable count.
// That threshold lives here as the single source of truth so the GET
// response and the UI can't drift apart on what "real enough to show" means.
export const HIDE_BELOW_COUNT = 5;

const STORE_NAME = 'calculator-feedback';

interface FeedbackCounts {
  yes: number;
  no: number;
}

function isKnownCalculator(slug: string): boolean {
  // Deliberately narrow allowlist for the pilot -- this is a single-calculator
  // rollout, and an open-ended slug would let anyone write arbitrary blob
  // keys through this endpoint.
  return slug === 'raised-bed-soil-calculator';
}

export const GET: APIRoute = async ({ url }) => {
  const calculator = url.searchParams.get('calculator') ?? '';
  if (!isKnownCalculator(calculator)) {
    return new Response(JSON.stringify({ yes: 0, no: 0, showCount: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const store = getStore(STORE_NAME);
    const counts = ((await store.get(calculator, { type: 'json' })) as FeedbackCounts | null) ?? { yes: 0, no: 0 };
    return new Response(
      JSON.stringify({ yes: counts.yes, no: counts.no, showCount: counts.yes >= HIDE_BELOW_COUNT }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    // Blob store unavailable (e.g. running outside Netlify) -- degrade to
    // "no count yet" rather than error the page.
    return new Response(JSON.stringify({ yes: 0, no: 0, showCount: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  let body: { calculator?: string; sentiment?: string } = {};
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const calculator = body.calculator ?? '';
  const sentiment = body.sentiment === 'no' ? 'no' : 'yes';

  if (!isKnownCalculator(calculator)) {
    return new Response(null, { status: 400 });
  }

  try {
    const store = getStore(STORE_NAME);
    const counts = ((await store.get(calculator, { type: 'json' })) as FeedbackCounts | null) ?? { yes: 0, no: 0 };
    counts[sentiment] += 1;
    await store.setJSON(calculator, counts);
    return new Response(
      JSON.stringify({ yes: counts.yes, no: counts.no, showCount: counts.yes >= HIDE_BELOW_COUNT }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch {
    // Never let a storage hiccup break the feedback click for the visitor --
    // the click still visually registers client-side even if this write
    // failed; it just won't move the persisted count this time.
    return new Response(JSON.stringify({ yes: 0, no: 0, showCount: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
