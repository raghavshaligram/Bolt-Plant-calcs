#!/usr/bin/env node
/**
 * verify-sales.mjs — the sales flow and dual delivery, checked against the brief.
 *
 * Run from the site repo root:  node scripts/verify-sales.mjs
 *
 * ── WHAT THIS IS AND IS NOT ─────────────────────────────────────────────────
 *
 * This is a static check of the source. It reads the pages, the payment library,
 * the API routes and netlify.toml and asserts the properties the brief asks for.
 * It proves the code cannot do certain wrong things — it does not prove a
 * deployed site behaves, because three of the brief's eight items (a sandbox
 * purchase, a direct hit on the file's URL, an expired token) need a running
 * deployment and real money. Those are printed as MANUAL with the exact steps,
 * never as PASS. A verification script that grades its own deploy steps as
 * passing is worse than no script, because it retires a checklist item that was
 * never actually checked.
 *
 * The one thing here that is not static: the download token is signed and
 * verified for real, including a forged signature and an expired timestamp,
 * by importing the payment library itself. That needs Node's TypeScript type
 * stripping (Node 22.6+ with --experimental-strip-types, or 22.18+/23.6+ where
 * it is on by default). Where it is unavailable the sub-check reports SKIPPED
 * with the reason rather than quietly passing.
 */
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const P = (...p) => join(ROOT, ...p);
const read = (...p) => readFileSync(P(...p), 'utf8');
const has = (...p) => existsSync(P(...p));

/* ------------------------------------------------------------------ report - */

const items = [];
let current = null;

const item = (n, title, note) => {
  current = { n, title, note, checks: [] };
  items.push(current);
};
const check = (ok, label, detail) => {
  current.checks.push({ ok: ok ? 'pass' : 'fail', label, detail });
  return ok;
};
const manual = (label, detail) => current.checks.push({ ok: 'manual', label, detail });
const skip = (label, detail) => current.checks.push({ ok: 'skip', label, detail });
const noted = (label, detail) => current.checks.push({ ok: 'note', label, detail });

/* --------------------------------------------------------------- helpers --- */

/** Every source file under src/, so "is it linked from anywhere" is answerable. */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === 'dist') continue;
      walk(full, out);
    } else if (/\.(astro|ts|tsx|js|jsx|mjs|md|mdx|json|html)$/.test(e.name)) {
      out.push(full);
    }
  }
  return out;
}

const SRC_FILES = walk(P('src'));
const rel = (f) => relative(ROOT, f).split(sep).join('/');

/** Source files excluding the plant-care product itself. "The rest of the site." */
const OTHER_FILES = SRC_FILES.filter((f) => {
  const r = rel(f);
  return !r.startsWith('src/pages/plant-care/') && !r.startsWith('src/pages/api/plant-care/') && r !== 'src/data/plantCare.ts' && r !== 'src/lib/plantCarePayments.ts' && r !== 'src/components/PlantCareCrossLink.astro';
});

const grepOther = (re) =>
  OTHER_FILES.filter((f) => re.test(readFileSync(f, 'utf8'))).map(rel);

/**
 * Strip Astro/JS comments before looking for a pattern.
 *
 * Without this, every check in this file can be satisfied by a comment that
 * merely mentions the thing — which is exactly how the app's own camera check
 * produced a false failure earlier in this build. A comment explaining that a
 * page does NOT load PayPal must not read as the page loading PayPal.
 */
const decomment = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '');

const SITE = {
  marketing: has('src/pages/plant-care/index.astro') ? read('src/pages/plant-care/index.astro') : '',
  buy: has('src/pages/plant-care/buy.astro') ? read('src/pages/plant-care/buy.astro') : '',
  welcome: has('src/pages/plant-care/welcome.astro') ? read('src/pages/plant-care/welcome.astro') : '',
  updates: has('src/pages/plant-care/updates.astro') ? read('src/pages/plant-care/updates.astro') : '',
  config: has('src/data/plantCare.ts') ? read('src/data/plantCare.ts') : '',
  pay: has('src/lib/plantCarePayments.ts') ? read('src/lib/plantCarePayments.ts') : '',
  crosslink: has('src/components/PlantCareCrossLink.astro') ? read('src/components/PlantCareCrossLink.astro') : '',
  toml: has('netlify.toml') ? read('netlify.toml') : '',
};

/* ═══════════════════════════════════════════════════════════════ item 1 ═══ */
/* "Confirm /plant-care/ loads with zero third-party scripts (payment scripts
    confined to /buy/ only)." */

item(1, 'The product page loads no payment script; PayPal is confined to /buy/');
{
  const m = decomment(SITE.marketing);
  // The word "PayPal" in prose is fine — the pre-launch banner says the checkout
  // is not configured yet. What must not appear is anything that *loads* it.
  check(
    !/paypal\.com|paypalobjects|window\.paypal|sdk\/js/i.test(m),
    'the product page contains no PayPal host, SDK URL or global'
  );
  check(
    !/<script[^>]+src=/i.test(m),
    'the product page loads no external script of its own',
    'it carries JSON-LD only, which is data rather than code'
  );

  const b = decomment(SITE.buy);
  check(/paypal\.com\/sdk\/js/.test(b), 'the checkout is the page that loads the PayPal SDK');
  check(
    /configured\s*&&\s*LAUNCHED\s*&&/.test(b),
    'and loads it only when configured AND launched',
    'so an unlaunched deploy ships no payment script at all'
  );

  // Any other page reaching PayPal would silently undo the confinement.
  const strays = grepOther(/paypal/i).filter((f) => f !== 'netlify.toml');
  check(strays.length === 0, 'no other page on the site references PayPal', strays.join(', '));

  // The agreed departure, recorded rather than hidden.
  const layout = SRC_FILES.filter((f) => /layouts[\\/].*\.astro$/.test(f));
  const gaFiles = layout.filter((f) => /googletagmanager|gtag\(/.test(readFileSync(f, 'utf8'))).map(rel);
  if (layout.length === 0) {
    skip('site layout not present in this tree, so GA could not be inspected', 'run this in the full site repo');
  } else if (gaFiles.length) {
    noted(
      'Google Analytics is in the shared layout, so "zero third-party scripts" is not literally true',
      `${gaFiles.join(', ')} — kept deliberately (your decision); the brief's intent, keeping the payment SDK off the reading page, holds`
    );
  } else {
    check(true, 'the shared layout loads no third-party script either');
  }
}

/* ═══════════════════════════════════════════════════════════════ item 2 ═══ */
/* "Confirm the purchase flow reaches /plant-care/welcome/ and that BOTH the
    file download and the PWA install link are present and working." */

item(2, 'The flow lands on /plant-care/welcome/ with both the file and the app');
{
  const b = decomment(SITE.buy);
  check(/define:vars=\{\{\s*welcome:\s*PATHS\.welcome/.test(b), 'the checkout is given the welcome path from the config, not a literal');
  check(/window\.location\.href\s*=\s*welcome\s*\+\s*'\?t='/.test(b), 'and navigates there with the token on a successful capture');
  check(
    !/window\.location\.href/.test(b.split('onApprove')[0] ?? ''),
    'nothing navigates to the welcome page before capture'
  );

  const w = decomment(SITE.welcome);
  check(/\/api\/plant-care\/download\?t=/.test(w), 'the welcome page offers the file download');
  check(/href=\{downloadHref\}/.test(w), 'and the download link carries the verified token');
  check(/href=\{APP_URL\}/.test(w), 'the welcome page offers the installable app');
  check(/Add to Home Screen/.test(w), 'with iOS install steps');
  check(/Install/.test(w) && /Chrome, Edge or Brave/.test(w), 'and Android/desktop install steps');
  check(/START-HERE\.pdf/.test(w), 'and the START-HERE guide');
  check(has('public/plant-care/START-HERE.pdf'), 'START-HERE.pdf exists in public/plant-care/');
  check(/export const prerender = false/.test(SITE.welcome), 'the welcome page renders per request, so the token is checked server-side');
  check(
    /if\s*\(!result\.ok\)/.test(SITE.welcome) || /valid = result\.ok/.test(SITE.welcome),
    'and renders nothing downloadable unless the token verifies'
  );
  check(/!valid \?/.test(decomment(SITE.welcome)), 'the invalid branch is the default path through the template');
}

/* ═══════════════════════════════════════════════════════════════ item 3 ═══ */

item(3, 'A sandbox purchase completes end to end', 'needs a deployment and PayPal sandbox credentials');
{
  check(has('src/pages/api/plant-care/create-order.ts'), 'the create-order route exists');
  check(has('src/pages/api/plant-care/capture-order.ts'), 'the capture-order route exists');
  const cap = decomment(has('src/pages/api/plant-care/capture-order.ts') ? read('src/pages/api/plant-care/capture-order.ts') : '');
  check(/captureIsGood\(/.test(cap), 'capture is judged by the server, from PayPal\'s own reply');
  check(/signToken\(/.test(cap), 'and the token is minted only after that judgement');
  check(
    !/req\.json\(\)[\s\S]{0,400}amount/i.test(cap),
    'the capture route never reads an amount from the request body'
  );
  const create = decomment(has('src/pages/api/plant-care/create-order.ts') ? read('src/pages/api/plant-care/create-order.ts') : '');
  // The strongest available static proof that the browser cannot influence the
  // amount: the handler takes no arguments at all, so there is no request object
  // in scope to read a body from. (`res.json()` inside is PayPal's reply, which
  // is why matching on ".json()" alone would be wrong.)
  check(/export const POST: APIRoute = async \(\) =>/.test(create), 'the create-order handler takes no request object, so no body can reach it');
  check(/value: PRICE\.value/.test(create), 'the order amount is the server constant');
  check(/PRICE\s*=\s*\{\s*value:\s*'29\.00'/.test(SITE.pay), 'the price is hardcoded server-side at 29.00 USD');
  manual(
    'run the sandbox sale',
    'set PAYPAL_API=https://api-m.sandbox.paypal.com plus sandbox credentials, set LAUNCHED=true on a branch deploy, buy with a sandbox buyer account, and confirm you land on /plant-care/welcome/?t=… and the file downloads'
  );
}

/* ═══════════════════════════════════════════════════════════════ item 4 ═══ */

item(4, 'The paid file cannot be fetched directly', 'the static half is checked here; the 404 needs a deployment');
{
  check(has('private/PlantCare.html'), 'the paid build is in private/, outside the publish directory');
  const inPublic = walk(P('public')).filter((f) => /PlantCare\.html$/i.test(f)).map(rel);
  check(inPublic.length === 0, 'no copy of PlantCare.html exists anywhere under public/', inPublic.join(', '));
  const dl = decomment(has('src/pages/api/plant-care/download.ts') ? read('src/pages/api/plant-care/download.ts') : '');
  check(/from '\.\.\/\.\.\/\.\.\/\.\.\/private\/PlantCare\.html\?raw'/.test(dl), 'the download route inlines it from private/ at build time');
  check(/verifyToken\(/.test(dl), 'and verifies the token before returning a single byte');
  check(/prerender = false/.test(dl), 'the download route is server-rendered, not a static file');
  check(/content-disposition': 'attachment/.test(dl), 'and is served as a download rather than a page');

  // The app IS public by design. That is a different file and a deliberate decision.
  check(has('public/app/index.html'), 'the installable app is public at /app/ — deliberately, per the brief');
  const same =
    has('public/app/index.html') && has('private/PlantCare.html')
      ? statSync(P('public/app/index.html')).size === statSync(P('private/PlantCare.html')).size
      : false;
  noted(
    'the app at /app/ is the same build as the paid file',
    same
      ? 'byte sizes match — anyone with the /app/ URL has the product. Accepted deliberately: the brief rules out licence keys and accounts, and a shareable HTML file has the same exposure.'
      : 'sizes differ — check emit-pwa.mjs ran against the current build'
  );
  manual('hit the file URL directly', 'after deploying, request https://harvestmath.com/PlantCare.html and https://harvestmath.com/private/PlantCare.html — both must 404');
}

/* ═══════════════════════════════════════════════════════════════ item 5 ═══ */

item(5, 'An expired or forged download link is refused');
{
  check(/reason: 'expired'/.test(SITE.pay), 'expiry is a distinct outcome, so the page can explain it');
  check(/timingSafeEqual/.test(SITE.pay), 'signatures are compared in constant time');
  check(/given\.length !== expected\.length/.test(SITE.pay), 'with a length check first, because timingSafeEqual throws on a mismatch');
  check(/30 \* 24 \* 60 \* 60 \* 1000/.test(SITE.pay), 'links last thirty days');

  // The live test. Not a reading of the source — the real functions, run.
  try {
    const m = await import(P('src/lib/plantCarePayments.ts'));
    const good = m.signToken('secret-a', { orderId: 'ORDER-1' });
    check(m.verifyToken('secret-a', good).ok === true, 'a freshly signed token verifies');
    check(m.verifyToken('secret-b', good).ok === false, 'the same token signed with another secret is refused');
    const tampered = good.replace(/^(.{8})./, (s) => s.slice(0, 8) + (s[8] === 'A' ? 'B' : 'A'));
    check(m.verifyToken('secret-a', tampered).ok === false, 'a tampered payload is refused');
    const late = m.verifyToken('secret-a', good, Date.now() + 31 * 24 * 3600 * 1000);
    check(late.ok === false && late.reason === 'expired', 'a token 31 days old is refused as expired');
    check(m.verifyToken('secret-a', 'nonsense').ok === false, 'a malformed token is refused');
    check(m.verifyToken('secret-a', undefined).ok === false, 'a missing token is refused');

    const ok = m.captureIsGood({
      status: 'COMPLETED',
      purchase_units: [{ payments: { captures: [{ id: 'C1', status: 'COMPLETED', amount: { value: '29.00', currency_code: 'USD' } }] } }],
    });
    check(ok.ok === true, 'a completed $29.00 capture is accepted');
    const short = m.captureIsGood({
      status: 'COMPLETED',
      purchase_units: [{ payments: { captures: [{ id: 'C1', status: 'COMPLETED', amount: { value: '0.01', currency_code: 'USD' } }] } }],
    });
    check(short.ok === false, 'a completed capture for $0.01 is rejected', short.reason);
    check(m.captureIsGood({ status: 'COMPLETED', purchase_units: [] }).ok === false, 'a completed order with no capture is rejected');
    check(m.captureIsGood({ status: 'APPROVED' }).ok === false, 'an approved-but-uncaptured order is rejected');
  } catch (err) {
    skip(
      'the live token and capture tests could not run',
      `this Node (${process.version}) could not import a .ts module: ${err.message.split('\n')[0]}. Re-run with --experimental-strip-types, or on Node 22.18+.`
    );
  }
  manual('expire one for real', 'after the sandbox sale, edit the token in the welcome URL by one character and confirm the page refuses it, then confirm /api/plant-care/download with that token returns 403');
}

/* ═══════════════════════════════════════════════════════════════ item 6 ═══ */
/* "Confirm the welcome page clearly states that data does not sync between the
    file version and the PWA version." */

item(6, 'The welcome page states plainly that the two do not sync');
{
  const w = decomment(SITE.welcome);
  const sentence = /<strong>These two keep separate data and do not sync\.<\/strong>/.test(w);
  check(sentence, 'the sentence is present, in bold, in its own panel');

  // Above both buttons, not below them. Position is the whole point.
  const iSync = w.indexOf('do not sync');
  const iDownload = w.indexOf('Download PlantCare.html');
  const iInstall = w.indexOf('Install the app');
  check(iSync > -1 && iSync < iDownload && iSync < iInstall, 'and appears above both the download and the install section');
  check(/Pick one as your real\s+record/.test(w.replace(/\s+/g, ' ')) || /Pick one as your real record/.test(w.replace(/\s+/g, ' ')), 'it also tells the buyer what to do about it');
  check(/import/.test(w) && /ten seconds/.test(w), 'and that moving between them is possible');
}

/* ═══════════════════════════════════════════════════════════════ item 7 ═══ */
/* "Confirm app.harvestmath.com is NOT linked from main site navigation." */

item(7, 'The app is not linked from site navigation');
{
  const appRefs = grepOther(/app\.harvestmath\.com|["'`]\/app\//);
  check(appRefs.length === 0, 'no page, layout or component outside the product links to the app', appRefs.join(', '));

  const linkers = ['welcome', 'updates'].filter((k) => /APP_URL/.test(SITE[k]));
  check(
    linkers.length === 2 && !/APP_URL/.test(decomment(SITE.marketing)) && !/APP_URL/.test(decomment(SITE.buy)),
    'only the welcome page and the updates page link to it',
    `linked from: ${linkers.join(', ')}`
  );
  check(/X-Robots-Tag = "noindex, nofollow"/.test(SITE.toml.split('for = "/app/*"')[1] ?? ''), '/app/* is served noindex');
  check(/APP_URL = '\/app\/'/.test(SITE.config), 'the app URL is one constant, so the subdomain alias is a one-line change');

  /*
   * The demo, and the reason this check exists at all.
   *
   * A rewrite of the product page once pointed seven "Try the free demo" links
   * at /app/ — which is the complete paid build. The page was, in writing,
   * telling every visitor where to get the product for nothing. Nothing in the
   * source looked wrong; the URL was simply the wrong one.
   *
   * So: the marketing page may invite people to try it, and the URL it invites
   * them to must be the demo build.
   */
  const invites = decomment(SITE.marketing).match(/\b(demo|try it|try the)\b/gi) ?? [];
  if (invites.length) {
    check(/href=\{DEMO_URL\}/.test(SITE.marketing), 'the product page invites people to try it, and links DEMO_URL to do it');
    check(
      !/href=\{APP_URL\}/.test(decomment(SITE.marketing)),
      'and never sends them to the app itself',
      'the product page links /app/ — that is the paid build, not a demo'
    );
    check(/DEMO_URL = '\/plant-care\/demo\/'/.test(SITE.config), 'DEMO_URL is the demo path');
  }
}

/* ═══════════════════════════════════════════════════ item 8 — extra checks ═ */
/* Not in the brief's list. These are the things that would quietly break the
   four items above, and the standing instruction that nothing is wired yet. */

item(8, 'Nothing is wired up, and nothing leaks');
{
  check(/export const LAUNCHED = false/.test(SITE.config), 'LAUNCHED is false, so every gate is shut');
  check(/LAUNCHED &&/.test(SITE.crosslink), 'the cross-promotion component renders nothing until it is true');

  const placed = grepOther(/PlantCareCrossLink/);
  check(placed.length === 0, 'and it has not been placed on any page yet, as instructed', placed.join(', '));

  check(/noindex=\{!LAUNCHED\}/.test(SITE.marketing), 'the product page is noindex until launch');
  check(/noindex=\{!LAUNCHED\}/.test(SITE.updates), 'the updates page is noindex until launch');
  check(/noindex=\{true\}/.test(SITE.buy), 'the checkout is noindex permanently');
  check(/noindex=\{true\}/.test(SITE.welcome), 'the welcome page is noindex permanently');
  check(!/aggregateRating/.test(decomment(SITE.marketing)), 'no aggregateRating in the structured data — there are no reviews yet');

  /*
   * noindex and the sitemap have to agree.
   *
   * @astrojs/sitemap lists every built page unless told otherwise, so without a
   * filter the four Plant Care pages would be submitted to Google while each
   * one asks not to be indexed. Search Console reports that as an error against
   * the whole site, not just those URLs — and it would also be how an unlaunched
   * product first becomes discoverable.
   */
  if (has('astro.config.mjs')) {
    const cfg = read('astro.config.mjs');
    const filtered = /sitemap\(\{[\s\S]*?filter:/.test(cfg);
    check(filtered, 'the sitemap has a filter, so noindex pages are not submitted');
    if (filtered) {
      for (const p of ['/plant-care/buy', '/plant-care/welcome', '/plant-care/updates']) {
        check(cfg.includes(`'${p}'`) || cfg.includes(`"${p}"`), `${p}/ is excluded from the sitemap`);
      }
      check(/\/plant-care\\\/\?\$/.test(cfg) || /plant-care\\\/\?\$/.test(cfg), '/plant-care/ itself is excluded from the sitemap');
    }
  } else {
    skip('astro.config.mjs not present in this tree, so the sitemap filter was not checked', 'run this in the full site repo');
  }

  // Secrets. The one rule with no exceptions.
  const secretish = SRC_FILES.filter((f) => {
    const s = readFileSync(f, 'utf8');
    return /(PAYPAL_SECRET|DOWNLOAD_SECRET)\s*[:=]\s*['"][^'"]{6,}/.test(s);
  }).map(rel);
  check(secretish.length === 0, 'no secret is assigned a literal value anywhere in src/', secretish.join(', '));
  check(!has('.env'), 'there is no .env file in this tree');
  check(/process\.env\[name\]/.test(SITE.pay) || /process\.env\./.test(SITE.pay), 'secrets are read from the environment at call time');
  check(!/PUBLIC_PAYPAL_SECRET/.test(SITE.buy + SITE.pay), 'no secret is exposed through a PUBLIC_ variable');

  // Caching. Three of these are the difference between working and silently broken.
  const t = SITE.toml;
  check(/for = "\/api\/\*"[\s\S]{0,200}Cache-Control = "no-store"/.test(t), '/api/* is never cached');
  check(/for = "\/plant-care\/welcome\*"[\s\S]{0,200}Cache-Control = "no-store"/.test(t), 'the welcome page is never cached');
  check(/for = "\/app\/sw\.js"[\s\S]{0,300}max-age=0, must-revalidate/.test(t), 'the service worker is never cached — this is how updates reach buyers');
  check(/application\/manifest\+json/.test(t), 'the manifest has an explicit content type');
  check(/Content-Security-Policy/.test(t) && /for = "\/plant-care\/buy\/\*"/.test(t), 'the checkout has a content security policy');

  /*
   * The demo is a different artefact from the product.
   *
   * plantcare's own `npm run verify:demo` drives a browser and proves the demo
   * cannot save. This check is the cheaper half that belongs on the site side:
   * that the file published at /plant-care/demo/ is not simply a copy of the
   * paid build. If the two ever became the same file, every "try the demo" link
   * on the sales page would become a free download.
   */
  check(has('public/plant-care/demo/index.html'), 'the demo is published at /plant-care/demo/');
  if (has('public/plant-care/demo/index.html') && has('private/PlantCare.html')) {
    const demo = read('public/plant-care/demo/index.html');
    const paid = read('private/PlantCare.html');
    check(demo !== paid, 'and it is not the paid build', 'the demo IS the paid build — the product is being given away');
    check(demo.includes('This is the demo.'), 'the demo carries its own banner, so nobody can mistake it for the app');
    check(!paid.includes('This is the demo.'), 'and the paid build carries none of the demo, so there is nothing in it to unlock');
    check(!demo.includes('manifest.webmanifest'), 'the demo is not installable — no manifest, no service worker');
  }
  check(
    /for = "\/plant-care\/demo\/\*"[\s\S]{0,200}max-age=0, must-revalidate/.test(t),
    'the demo is never cached, so a first impression is never a stale build'
  );

  // The PWA half actually being present in the publish directory.
  for (const f of ['index.html', 'manifest.webmanifest', 'sw.js', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
    check(has('public/app', f), `public/app/${f} is present`);
  }
  if (has('public/app/manifest.webmanifest')) {
    const man = JSON.parse(read('public/app/manifest.webmanifest'));
    check(man.start_url === './' || man.start_url === '.', 'the manifest start_url is relative, so /app/ and a subdomain both work', man.start_url);
    check(man.display === 'standalone', 'and it installs as a standalone app');
    check((man.icons ?? []).some((i) => String(i.purpose ?? '').includes('maskable')), 'with a maskable icon for Android');
  }
}

/* ------------------------------------------------------------------ print - */

const SYM = { pass: '  ✓', fail: '  ✗', manual: '  ·', skip: '  ~', note: '  !' };
let failed = 0;
let manuals = 0;

console.log('\nHarvestMath Plant Care — sales flow and dual delivery\n');

for (const it of items) {
  const bad = it.checks.filter((c) => c.ok === 'fail').length;
  const man = it.checks.filter((c) => c.ok === 'manual').length;
  const auto = it.checks.filter((c) => c.ok === 'pass' || c.ok === 'fail').length;
  failed += bad;
  manuals += man;

  const verdict = bad ? 'FAIL' : man && auto === 0 ? 'MANUAL' : man ? 'PASS so far' : 'PASS';
  console.log(`${verdict === 'FAIL' ? 'FAIL' : verdict.padEnd(11)}  ${it.n}. ${it.title}`);
  if (it.note) console.log(`             (${it.note})`);
  for (const c of it.checks) {
    console.log(`${SYM[c.ok]} ${c.label}${c.detail ? `\n        ${c.detail}` : ''}`);
  }
  console.log('');
}

const total = items.reduce((n, i) => n + i.checks.filter((c) => c.ok === 'pass' || c.ok === 'fail').length, 0);
console.log(`${total - failed}/${total} automatic checks passed, ${manuals} steps left that only a deployment can prove.\n`);
process.exit(failed ? 1 : 0);
