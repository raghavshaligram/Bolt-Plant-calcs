/*
 * Moves the build out of build-tmp into dist/PlantCare.html, then runs the two
 * guards the product promise depends on: nothing is fetched at runtime, and the
 * file stays inside its size budget.
 *
 * The network guard is the important one. "Works offline, forever" is the whole
 * pitch, and a single <link> to a font or an icon sprite breaks it silently —
 * the page still looks right on the machine that built it, and wrong on a
 * kitchen table with the wifi off.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = resolve(root, 'build-tmp', 'index.html')
const outDir = resolve(root, 'dist')
const out = resolve(outDir, 'PlantCare.html')

if (!existsSync(src)) {
  console.error(`  no build at ${src} — run \`npm run build\``)
  process.exit(1)
}

let html = readFileSync(src, 'utf8')
html = html.replace(/<link[^>]+rel="(modulepreload|prefetch|preload)"[^>]*>/g, '')

mkdirSync(outDir, { recursive: true })
writeFileSync(out, html)
rmSync(resolve(root, 'build-tmp'), { recursive: true, force: true })

// ---- guard 1: nothing is fetched --------------------------------------------
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1])
const styles = [...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1])
const markup = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '<script></script>')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '<style></style>')

const offenders = []
const externalRef =
  /(?:src|href|srcset|action|poster|formaction)\s*=\s*["'](?!#|data:|mailto:|tel:|javascript:|about:)([^"']*)["']/gi
let m
while ((m = externalRef.exec(markup))) {
  const url = m[1].trim()
  if (url) offenders.push(url)
}

for (const css of styles) {
  for (const rx of [/@import\s+(?:url\()?["']?([^"')\s]+)/gi, /url\(\s*["']?(?!data:|#)([^"')]+)/gi]) {
    let c
    while ((c = rx.exec(css))) offenders.push(c[1])
  }
}

/*
 * URLs inside the JavaScript.
 *
 * Three things are sentences rather than requests, and only three.
 *
 * The app names harvestmath.com in its own copy — the diagnosis screen says
 * where the full write-up lives. XML namespace URIs are identifiers, not
 * addresses. And `.example` is the TLD RFC 2606 reserves so that documentation
 * can show a URL that is guaranteed never to resolve to anything: the weather
 * settings screen uses one as the placeholder in an empty field, which is the
 * opposite of a bundled endpoint.
 *
 * Everything else is a failure, including a real hostname sitting unused in a
 * string. A URL nobody calls today is a URL somebody calls next month.
 */
const TEXT_OK =
  /^https?:\/\/(www\.)?(w3\.org|reactjs\.org|react\.dev|harvestmath\.com|[a-z0-9-]+\.example(\/|$|\?))/i
for (const js of scripts) {
  for (const u of js.match(/https?:\/\/[^\s"'`)\\]+/g) ?? []) {
    if (TEXT_OK.test(u)) continue
    offenders.push(u)
  }
}

/*
 * Guard 1b: no weather provider, anywhere in the artefact.
 *
 * The brief is explicit that no provider endpoint may be pre-wired or bundled,
 * and the reason is a licensing one — free weather tiers are non-commercial and
 * this is a paid product. That is a rule about the shipped file, so it is
 * checked against the shipped file rather than trusted to a comment somewhere.
 *
 * It matches hostnames, not the word "weather": the app talks about weather all
 * over the settings screen and should. What it must never contain is somewhere
 * to send a request.
 */
const PROVIDERS =
  /\b(open-meteo|openweathermap|weatherapi|tomorrow\.io|visualcrossing|accuweather|weatherbit|climacell|met\.no|pirateweather|darksky|weatherstack)\b/gi
const providerHits = [...new Set(html.match(PROVIDERS) ?? [])]
if (providerHits.length) {
  console.error(
    `\n  FAIL  a weather provider appears in the build: ${providerHits.join(', ')}\n` +
      '        The app must ship with the capability off and no endpoint. See src/app/data/weather.ts.'
  )
  process.exit(1)
}

const bytes = Buffer.byteLength(html)
const kb = (bytes / 1024).toFixed(1)

if (offenders.length) {
  console.error(`\n  FAIL  ${offenders.length} external reference(s):`)
  for (const o of [...new Set(offenders)]) console.error('        ' + o)
  process.exit(1)
}

// ---- guard 2: size ----------------------------------------------------------
//
// The brief budgets 500 KB for the app before data. Measured rather than
// chosen: React and the app code are about 190 KB, and the ported datasets —
// 303 species, the 981-row ASPCA list, the zone tables and six diagnosis trees —
// are most of the rest. 900 KB leaves room for the catalogue to grow without
// leaving room for a dependency to arrive unnoticed, which is what this guard
// is actually for.
const LIMIT_KB = 900
const over = bytes / 1024 > LIMIT_KB

console.log(`  ${over ? 'WARN' : 'ok  '}  dist/PlantCare.html  ${kb} KB  (budget ${LIMIT_KB} KB)  nothing fetched, no provider`)
if (over) process.exit(1)
