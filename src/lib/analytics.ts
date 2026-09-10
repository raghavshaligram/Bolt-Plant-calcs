/**
 * Thin, dependency-free wrapper around GA4's gtag.
 *
 * Why this exists rather than calling gtag() inline at each call site:
 *
 * 1. Resilience. Astro bundles a bare <script> as `type="module"` and
 *    minifies it, which means a module-scoped `function gtag()` never lands
 *    on `window` -- exactly the bug this site shipped with. Layout.astro now
 *    marks the GA snippet `is:inline` so `window.gtag` is a real global, but
 *    `trackEvent` still falls back to pushing onto `window.dataLayer` in
 *    gtag's own argument shape. gtag.js drains that queue on load, so events
 *    survive both a missing global and a not-yet-loaded tag.
 *
 * 2. Safety. Analytics must never break a page. Every send is wrapped in
 *    try/catch and no-ops during SSR (`typeof window === 'undefined'`),
 *    since these helpers are imported by components Astro renders on the
 *    server as well as the client.
 *
 * 3. Consistency. Event names and parameter keys live in one place, so
 *    GA4's Admin -> Events list stays a fixed, greppable vocabulary instead
 *    of drifting per call site.
 */

type EventParams = Record<string, string | number | boolean | undefined | null>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

/**
 * Send a GA4 custom event. Silently does nothing during SSR or if GA is
 * blocked/absent -- callers never need to guard.
 */
export function trackEvent(name: string, params: EventParams = {}): void {
  if (typeof window === 'undefined') return;

  // Drop empty/undefined params so GA4 doesn't record blank dimensions.
  const payload: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      payload[key] = value as string | number | boolean;
    }
  }

  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', name, payload);
    } else if (Array.isArray(window.dataLayer)) {
      // gtag's shim pushes its `arguments` object; an array is read the same
      // way by index, so this queues correctly for gtag.js to pick up.
      window.dataLayer.push(['event', name, payload]);
    }
  } catch {
    /* never let analytics throw into the page */
  }
}

function currentPath(): string {
  return typeof window === 'undefined' ? '' : window.location.pathname;
}

/**
 * '/calculators/tree-age-calculator/' -> 'tree-age-calculator'
 *
 * Derived from the URL rather than threaded through as a prop: every
 * calculator component is mounted with no props at all, so a prop would mean
 * touching 25 page files and 25 component signatures to learn something the
 * pathname already states unambiguously.
 */
export function getCalculatorName(pathname: string = currentPath()): string {
  const match = pathname.match(/\/calculators\/([^/]+)/);
  return match ? match[1] : 'unknown';
}

/** '/blog/why-is-my-plant-wilting/' -> 'why-is-my-plant-wilting' */
export function getArticleSlug(pathname: string = currentPath()): string {
  const match = pathname.match(/\/blog\/([^/]+)/);
  return match ? match[1] : 'unknown';
}
