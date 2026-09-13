/*
 * The demo build, proved rather than promised.
 *
 * ── WHAT IS AT STAKE ────────────────────────────────────────────────────────
 *
 * The sales page invites everybody to try the demo. If the demo turns out to be
 * the product, the product is free. So this file's job is to prove three things
 * about dist/demo/index.html:
 *
 *   1. it is not the paid build (they must differ, and the paid build must not
 *      contain a line of the demo's copy),
 *   2. it cannot keep anything — no file, no IndexedDB, nothing that survives a
 *      reload,
 *   3. it is still worth trying: every screen works and the schedules are real,
 *      because a crippled demo sells nothing.
 *
 * Checked by driving a real Chromium over http://localhost, which browsers
 * treat as a secure context — the same rig as verify:pwa, for the same reason:
 * "the demo does not save" is a claim about a running browser, and reading the
 * source cannot settle it.
 *
 *   npm run verify:demo        (after npm run build)
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { existsSync, readdirSync } from 'node:fs'
import { resolve, dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = resolve(root, 'dist', 'demo')
const PAID = resolve(root, 'dist', 'PlantCare.html')

let failures = 0
const fail = (m) => {
  failures++
  console.log(`  FAIL  ${m}`)
}
const pass = (m) => console.log(`  ok    ${m}`)
const check = (c, good, bad) => (c ? pass(good) : fail(bad ?? good))

if (!existsSync(resolve(DIR, 'index.html'))) {
  console.error('\n  No dist/demo — run `npm run build` first.\n')
  process.exit(1)
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' }

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const path = url.pathname === '/' ? '/index.html' : url.pathname
  const file = join(DIR, path.replace(/^\/+/, ''))
  try {
    const s = await stat(file)
    if (!s.isFile()) throw new Error('not a file')
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' })
    res.end(await readFile(file))
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('not found')
  }
})

const port = await new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)))
const ORIGIN = `http://127.0.0.1:${port}`

// ---------------------------------------------------------------------------
console.log('\n  The demo is a different artefact\n')

const demoHtml = await readFile(resolve(DIR, 'index.html'), 'utf8')
const paidHtml = existsSync(PAID) ? await readFile(PAID, 'utf8') : ''

check(demoHtml !== paidHtml, 'the demo build is not the paid build', 'the demo and the paid file are identical — the product is being given away')
check(demoHtml.includes('This is the demo.'), 'the demo carries its own banner copy')
check(demoHtml.includes('harvestmath.com/plant-care/'), 'and a buy link back to the product page')

/* The other direction matters just as much: the paid build must not carry the
   demo's dead code, because a lock that ships inside the product is a lock
   somebody can eventually flip. Vite folds the constant at build time and drops
   the branch; this asserts that it actually happened. */
check(
  paidHtml === '' || !paidHtml.includes('This is the demo.'),
  'and the paid build carries none of the demo, so there is nothing in it to unlock',
  'the paid build still contains the demo copy — the lock was not folded out'
)
check(!demoHtml.includes('manifest.webmanifest'), 'the demo is not installable — no manifest, no service worker')

// ---------------------------------------------------------------------------
console.log('\n  Driving it in a real browser\n')

const EXECUTABLE = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(
  (p) => existsSync(p)
)

const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {})

try {
  const context = await browser.newContext({ serviceWorkers: 'allow' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto(ORIGIN, { waitUntil: 'load' })
  await page.waitForSelector('.nav')

  // -- it opens in the demo, not on a welcome screen -------------------------
  check(
    (await page.getByRole('button', { name: /look around the demo first/i }).count()) === 0,
    'it opens straight into the demo household, with no welcome screen to get past'
  )
  const filename = await page.evaluate(() => document.querySelector('.masthead .filename')?.textContent ?? '')
  check(/nothing is being saved/i.test(filename), `the masthead says where the data is not going — "${filename}"`)

  const buy = page.locator('.masthead a.btn')
  check((await buy.count()) === 1, 'the masthead has one button, and it is the buy button')
  check(
    /harvestmath\.com\/plant-care\//.test((await buy.getAttribute('href')) ?? ''),
    'which points at the product page'
  )

  check(
    (await page.evaluate(() => Boolean(document.querySelector('link[rel="manifest"]')))) === false,
    'no manifest is injected, so no browser offers to install the demo'
  )
  check(
    (await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)) === 0,
    'and no service worker is registered'
  )

  // -- it is worth trying ----------------------------------------------------
  const plants = await page.evaluate(() => document.body.textContent ?? '')
  check(/\d+ plants/.test(plants), 'the demo household is loaded and counted on the Today screen')

  for (const [label, selector] of [
    ['My plants', /^My plants$/],
    ['Plants A–Z', /^Plants A–Z$/],
    ['Diagnose', /^Diagnose$/],
    ['Tools', /^Tools$/],
    ['Journal', /^Journal$/],
  ]) {
    await page.getByRole('button', { name: selector }).click()
    await page.waitForTimeout(150)
    const empty = (await page.locator('main').textContent()) ?? ''
    check(empty.trim().length > 80, `${label} renders with content`, `${label} rendered almost nothing`)
  }
  // "Today 13" — the nav button carries its own due-count badge in its name.
  await page.getByRole('button', { name: /^Today\b/ }).click()
  await page.waitForSelector('.care')

  // -- and it cannot keep anything -------------------------------------------
  const before = await page.locator('.care').count()
  const done = page.getByRole('button', { name: /^Mark .* done for / }).first()
  const doneLabel = await done.getAttribute('aria-label')
  await done.click()
  await page.waitForTimeout(400)
  const after = await page.locator('.care').count()
  check(after !== before, `marking a job done changes the list (${before} → ${after}) — the app really works`)

  const dbs = await page.evaluate(async () => {
    if (!indexedDB.databases) return ['unknown']
    return (await indexedDB.databases()).map((d) => d.name)
  })
  check(
    dbs.length === 0,
    'and wrote nothing to IndexedDB — the browser has no database for this origin at all',
    `the demo created a database: ${dbs.join(', ')}`
  )

  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('.care')
  const restored = await page.locator('.care').count()
  check(
    restored === before,
    `a reload puts the demo back exactly as it was (${restored} jobs), so nothing survived`,
    `after a reload the list was ${restored}, not the original ${before} — something persisted`
  )
  const stillThere = await page.getByRole('button', { name: doneLabel ?? '' }).count()
  check(stillThere === 1, 'including the job that was marked done')

  check(errors.length === 0, 'no page errors throughout', `page errors: ${errors.join(' | ')}`)
} finally {
  await browser.close()
  server.close()
}

console.log(
  failures
    ? `\n  ${failures} check(s) failed.\n`
    : '\n  The demo: everything works, nothing is kept, and it is not the paid build.\n'
)
process.exit(failures ? 1 : 0)
