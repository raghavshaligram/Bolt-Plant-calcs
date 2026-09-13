/*
 * The PWA distribution, tested rather than asserted.
 *
 * The brief's items 3, 4 and 5 are the ones that would otherwise be claimed on
 * the strength of having written a manifest. They are not the same thing: a
 * manifest with the wrong start_url installs and then opens a blank page, a
 * service worker that caches the document forever installs and then never
 * updates, and "camera works over https" is exactly the belief that made
 * shipping the light meter on file:// look reasonable in the first place.
 *
 * So this serves dist/app/ over http://localhost — which browsers treat as a
 * secure context, the same as https, precisely so that this kind of thing can
 * be tested — and drives a real Chromium through it.
 *
 * What it can prove here: the manifest parses and its fields are usable, the
 * service worker registers and activates, the app still loads with the network
 * switched off, the camera API is reachable, and the app chooses browser
 * storage rather than file storage. What it cannot prove from here is a real
 * install on a real iPhone; that stays a manual step in VERIFICATION.md rather
 * than becoming a claim.
 *
 *   npm run verify:pwa        (after npm run build)
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { existsSync, readdirSync } from 'node:fs'
import { resolve, dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = resolve(root, 'dist', 'app')

let failures = 0
const fail = (m) => {
  failures++
  console.log(`  FAIL  ${m}`)
}
const pass = (m) => console.log(`  ok    ${m}`)
const check = (c, good, bad) => (c ? pass(good) : fail(bad ?? good))

if (!existsSync(resolve(DIR, 'index.html'))) {
  console.error('\n  No dist/app — run `npm run build` first.\n')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// A server that behaves like Netlify: correct content types, and no caching of
// the two files whose staleness would be invisible.
// ---------------------------------------------------------------------------
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
}

let offline = false
let served = 0

const server = createServer(async (req, res) => {
  if (offline) {
    /* Destroying the socket is a closer simulation of no network than a 503:
       a 503 is a response, and a service worker that only falls back on a
       failed fetch would still pass against one. */
    res.socket?.destroy()
    return
  }
  const url = new URL(req.url, 'http://localhost')
  let path = url.pathname === '/' ? '/index.html' : url.pathname
  const file = join(DIR, path.replace(/^\/+/, ''))
  try {
    const s = await stat(file)
    if (!s.isFile()) throw new Error('not a file')
    const body = await readFile(file)
    served++
    res.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
      'service-worker-allowed': '/',
    })
    res.end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' })
    res.end('not found')
  }
})

const port = await new Promise((r) => server.listen(0, '127.0.0.1', () => r(server.address().port)))
const ORIGIN = `http://127.0.0.1:${port}`

// ---------------------------------------------------------------------------
console.log('\n  What the build produced\n')

{
  const files = readdirSync(DIR).sort()
  const want = ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'index.html', 'manifest.webmanifest', 'sw.js']
  const missing = want.filter((f) => !files.includes(f))
  check(missing.length === 0, `all six files present: ${want.join(', ')}`, `missing: ${missing.join(', ')}`)

  const a = await readFile(resolve(root, 'dist', 'PlantCare.html'))
  const b = await readFile(resolve(DIR, 'index.html'))
  check(a.equals(b), 'the installed app is byte-identical to the downloaded file', 'the two distributions have diverged')
}

{
  const manifest = JSON.parse(await readFile(resolve(DIR, 'manifest.webmanifest'), 'utf8'))
  check(manifest.display === 'standalone', 'display is standalone, so it launches without browser chrome')
  check(manifest.start_url === './' && manifest.scope === './', 'start_url and scope are relative, so /app/ and a subdomain both work')
  check(/^#[0-9a-f]{6}$/i.test(manifest.theme_color), `theme_color is ${manifest.theme_color}`)
  check(manifest.background_color === '#faf8f3', 'background_color matches the app\'s own page colour, so the splash does not flash white')

  const sizes = manifest.icons.map((i) => i.sizes)
  check(sizes.includes('192x192') && sizes.includes('512x512'), 'both required icon sizes are declared')
  check(
    manifest.icons.some((i) => i.purpose === 'maskable'),
    'a maskable icon is declared, so Android does not crop the mark',
    'no maskable icon — Android launchers will shave the edges off'
  )

  /* Every icon the manifest names has to exist and be a real PNG of the size it
     claims. A manifest naming a missing icon still installs, with no icon. */
  const bad = []
  for (const icon of manifest.icons) {
    const file = resolve(DIR, icon.src)
    if (!existsSync(file)) {
      bad.push(`${icon.src} is named but not present`)
      continue
    }
    const buf = await readFile(file)
    if (buf.readUInt32BE(0) !== 0x89504e47) bad.push(`${icon.src} is not a PNG`)
    const w = buf.readUInt32BE(16)
    const h = buf.readUInt32BE(20)
    const [dw, dh] = icon.sizes.split('x').map(Number)
    if (w !== dw || h !== dh) bad.push(`${icon.src} is ${w}×${h}, declared ${icon.sizes}`)
  }
  check(bad.length === 0, `all ${manifest.icons.length} icons exist at the sizes they declare`, bad.join('; '))
}

{
  const sw = await readFile(resolve(DIR, 'sw.js'), 'utf8')
  check(!sw.includes('__VERSION__'), 'the service worker cache name was stamped with a real version')
  check(
    /request\.mode === 'navigate'/.test(sw) && /fetch\(request\)\s*\n?\s*\.then/.test(sw),
    'the document is fetched network-first, so "free updates forever" survives the cache',
    'the document looks cache-first — buyers would be stuck on the build they installed'
  )
  check(/request\.method !== 'GET'/.test(sw), 'non-GET requests are left alone')
  check(/origin !== self\.location\.origin/.test(sw), 'cross-origin requests are left alone, so a weather endpoint is never answered from cache')
}

// ---------------------------------------------------------------------------
console.log('\n  Driving it in a real browser\n')

const EXECUTABLE = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(
  (p) => {
    try {
      readdirSync(dirname(p))
      return true
    } catch {
      return false
    }
  }
)

const browser = await chromium.launch({
  executablePath: EXECUTABLE,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
})

try {
  const context = await browser.newContext({ serviceWorkers: 'allow' })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))

  await page.goto(ORIGIN, { waitUntil: 'load' })
  await page.waitForSelector('.masthead')

  check(await page.evaluate(() => window.isSecureContext), 'localhost is a secure context, the same as https would be')

  /* ── the first visit must not reload itself ──────────────────────────────
     The worker claims the page as it activates, so that a first visit works
     offline without being opened twice. That claim fires `controllerchange`,
     and a naive "reload on controllerchange" therefore refreshes the page
     underneath somebody who has just arrived — at whatever moment activation
     finishes, which is a race, which is why this passed twice before failing.
     The marker below is destroyed by a reload, so its survival is the proof. */
  await page.evaluate(() => {
    window.__stillTheSameDocument = true
  })
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForTimeout(600)
  let sameDocument = false
  try {
    sameDocument = await page.evaluate(() => window.__stillTheSameDocument === true)
  } catch {
    sameDocument = false // the context was destroyed: it navigated
  }
  check(sameDocument, 'the worker claiming the first visit does not reload the page underneath the person')

  /* The manifest is injected at runtime, because the downloaded copy must not
     carry a link to a file it does not have. */
  const manifestHref = await page.evaluate(() => document.querySelector('link[rel="manifest"]')?.getAttribute('href'))
  check(manifestHref === 'manifest.webmanifest', 'the app added its own manifest link once it saw it was hosted')

  const themed = await page.evaluate(() => document.querySelector('meta[name="theme-color"]')?.getAttribute('content'))
  check(Boolean(themed), `a theme-color meta was added (${themed})`)
  check(
    await page.evaluate(() => Boolean(document.querySelector('link[rel="apple-touch-icon"]'))),
    'and an apple-touch-icon, without which iOS installs a Safari shortcut rather than an app'
  )

  /* The storage decision. This is the one the brief calls out, and it is the
     one a buyer notices when it is wrong. */
  const summary = await page.evaluate(() => document.querySelector('.masthead .filename')?.textContent ?? '')
  const welcomeText = await page.textContent('body')
  check(
    /do not share data|does not sync/i.test(welcomeText ?? ''),
    'the welcome screen states that this copy and the downloaded file do not share data',
    'nothing on the first screen warns that the two copies are separate'
  )

  const reg = await page.evaluate(async () => {
    const r = await navigator.serviceWorker.ready
    return { scope: r.scope, active: Boolean(r.active) }
  })
  check(reg.active, `a service worker is active, scoped to ${reg.scope}`)

  // -- it stores in the browser, not in a file -------------------------------
  await page.getByRole('button', { name: /start with an empty list/i }).click()
  await page.waitForSelector('.nav')
  await page.waitForTimeout(400)

  const stored = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.open('plantcare', 2)
        req.onsuccess = () => {
          const db = req.result
          if (!db.objectStoreNames.contains('docs')) return resolve(false)
          const get = db.transaction('docs', 'readonly').objectStore('docs').get('current')
          get.onsuccess = () => resolve(Boolean(get.result && get.result.text))
          get.onerror = () => resolve(false)
        }
        req.onerror = () => resolve(false)
      })
  )
  check(stored, 'starting a list wrote the document into IndexedDB, not to a file handle')

  const mastheadNow = await page.textContent('.masthead')
  check(/Saved in this browser/.test(mastheadNow ?? ''), 'and the masthead says where the data is')
  check(
    /Download a copy/.test(mastheadNow ?? ''),
    'with a download button, so the data is still exportable as the same .plants file'
  )

  // -- the camera --------------------------------------------------------------
  await page.getByRole('button', { name: 'Tools' }).click()
  await page.waitForTimeout(200)
  const camera = await page.evaluate(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return 'absent'
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true })
      const live = s.getVideoTracks().length > 0
      s.getTracks().forEach((t) => t.stop())
      return live ? 'granted' : 'empty'
    } catch (e) {
      return `refused: ${e.name}`
    }
  })
  check(
    camera === 'granted',
    'getUserMedia is available and returns a track — this is what the PWA distribution exists to fix',
    `the camera was ${camera} in a secure context`
  )

  // -- offline -----------------------------------------------------------------
  const before = served
  offline = true
  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('.masthead', { timeout: 10000 })
  const heading = await page.textContent('.masthead')
  check(
    /Plant Care/.test(heading ?? ''),
    `the app reloaded and rendered with the server refusing every connection (${served - before} requests reached it)`,
    'the app did not come back offline'
  )

  const survived = await page.evaluate(() => Boolean(document.querySelector('.nav')))
  check(survived, 'and came back to the plant list rather than the welcome screen — the data survived too')

  offline = false

  check(errors.length === 0, 'no page errors throughout', `page errors: ${errors.slice(0, 2).join(' | ')}`)
  await context.close()
} finally {
  await browser.close()
  server.close()
}

console.log(failures ? `\n  ${failures} failure(s).\n` : `\n  PWA distribution: everything above passed.\n`)
process.exit(failures ? 1 : 0)
