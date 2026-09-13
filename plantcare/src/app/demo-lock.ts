/**
 * The demo build.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 *
 * The installable app at /app/ is the product. It is byte-identical to the file
 * a buyer downloads, and the sales page must not send anybody there, because a
 * page that says "try the free demo" over a link to the complete paid app is a
 * page that gives the product away.
 *
 * So the demo is a different build. `npm run build:demo` — which is
 * `vite build --mode demo`, and vite.config.ts turns that mode into the constant
 * below — produces an app that
 * opens straight into the demo household, keeps every screen and every
 * calculation working, and cannot write anything anywhere: no file, no
 * IndexedDB, no export. Close the tab and it is gone.
 *
 * The lock is a build-time constant rather than a runtime flag or a query
 * parameter, so it cannot be turned off from the browser. `?demo=0` is not a
 * thing, and neither is deleting a cookie. The demo build simply has no code
 * path that saves.
 *
 * What it deliberately does NOT do is cripple the app. Every screen works, all
 * 303 species are there, the schedules are real, the diagnosis trees run. The
 * demo has to be convincing to be worth building — the missing part is keeping
 * what you did, which is exactly what the purchase buys.
 */
export const DEMO_LOCK = import.meta.env.VITE_DEMO_LOCK === '1'

/**
 * Where the demo's buy button goes. Configurable so the same build can be
 * pointed at a staging URL, defaulting to the product page.
 */
export const BUY_URL = (import.meta.env.VITE_BUY_URL as string | undefined) || 'https://harvestmath.com/plant-care/'
