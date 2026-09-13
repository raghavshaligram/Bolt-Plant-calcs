/*
 * Builds dist/app/ — the installable copy.
 *
 * Identical HTML to dist/PlantCare.html. That is the brief's constraint and it
 * is checked below rather than trusted: a byte comparison, because "no separate
 * codebase" is the kind of promise that decays into "almost the same" the first
 * time somebody patches one side in a hurry.
 *
 * Everything else here is the wrapping an installable app needs and a
 * downloaded file must not have: a manifest, three icons, and a service worker.
 * None of it is referenced from the HTML — the app adds what it needs at
 * runtime once it sees it is running over https (src/app/pwa.ts explains why).
 *
 *   npm run build:pwa     after npm run build
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(root, 'dist', 'PlantCare.html')
const OUT = resolve(root, 'dist', 'app')
const PWA = resolve(root, 'scripts', 'pwa')

if (!existsSync(SRC)) {
  console.error('  no dist/PlantCare.html — run `npm run build` first')
  process.exit(1)
}

/* The version string the app shows, taken from the app rather than typed here,
   so the cache name and the About line can never disagree. */
const appSource = readFileSync(resolve(root, 'src/app/ui/App.tsx'), 'utf8')
const versionMatch = appSource.match(/export const VERSION = '([^']+)'/)
if (!versionMatch) {
  console.error('  cannot find VERSION in src/app/ui/App.tsx — the cache name would be wrong')
  process.exit(1)
}
const VERSION = versionMatch[1]
const CACHE_VERSION = VERSION.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

// ---- the app, unchanged ------------------------------------------------------
const html = readFileSync(SRC)
writeFileSync(resolve(OUT, 'index.html'), html)

// ---- icons -------------------------------------------------------------------
//
// Drawn by scripts/pwa/icon.mjs, in JavaScript, with no native dependency. The
// header of that file explains why — the short version is that the first
// version of this shelled out to ImageMagick, which silently produced nothing
// because its SVG delegate was missing, and a build that reports success while
// writing no icons is worse than one that fails.

const { iconPNG, MOSS } = await import(new URL('./pwa/icon.mjs', import.meta.url))

writeFileSync(resolve(OUT, 'icon-192.png'), iconPNG(192))
writeFileSync(resolve(OUT, 'icon-512.png'), iconPNG(512))
writeFileSync(resolve(OUT, 'icon-maskable-512.png'), iconPNG(512, { maskable: true }))

// ---- manifest ----------------------------------------------------------------
//
// `start_url` and `scope` are "./" so the same build works at /app/ today and
// at the root of a subdomain later with no rebuild. An absolute path would pin
// it to one and break silently on the other — the app would still load and the
// install would still happen, and then the launcher icon would open the wrong
// URL, which is the kind of bug that is reported as "it opens a blank page".

const manifest = {
  name: 'HarvestMath Plant Care',
  short_name: 'Plant Care',
  description:
    'Care schedules, a 303-plant reference, symptom diagnosis and a light meter. Buy once, works offline, no account.',
  id: '/app/',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'any',
  theme_color: MOSS,
  background_color: '#faf8f3',
  categories: ['lifestyle', 'utilities', 'productivity'],
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
writeFileSync(resolve(OUT, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2))

// ---- service worker ----------------------------------------------------------
const sw = readFileSync(resolve(PWA, 'sw.js'), 'utf8').replace('__VERSION__', CACHE_VERSION)
if (sw.includes('__VERSION__')) {
  console.error('  the service worker still contains __VERSION__ — the cache name would never change')
  process.exit(1)
}
writeFileSync(resolve(OUT, 'sw.js'), sw)

// ---- prove it is the same app ------------------------------------------------
{
  const a = readFileSync(SRC)
  const b = readFileSync(resolve(OUT, 'index.html'))
  if (!a.equals(b)) {
    console.error('  dist/app/index.html differs from dist/PlantCare.html — these must be the same build')
    process.exit(1)
  }
}

const kb = (n) => (n / 1024).toFixed(1)
const total =
  html.length +
  ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'manifest.webmanifest', 'sw.js'].reduce(
    (n, f) => n + readFileSync(resolve(OUT, f)).length,
    0
  )

console.log(
  `  ok    dist/app/  ${kb(total)} KB  identical app + manifest + 3 icons + service worker (cache plantcare-${CACHE_VERSION})`
)
