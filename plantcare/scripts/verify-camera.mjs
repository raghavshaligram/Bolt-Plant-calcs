/*
 * Brief item 8: the camera features, and what happens when the camera says no.
 *
 * The arithmetic is testable in node and is tested here. The permission path is
 * not — there is no camera in a node process and no way to simulate a person
 * clicking Block — so what this script checks instead is the property that makes
 * that path safe: that there is exactly ONE place in the codebase that asks for
 * a camera, that it classifies every failure the spec defines, and that both
 * tools offer a working manual path that does not depend on it.
 *
 * That is a weaker claim than "we denied permission and watched it behave", and
 * it is stated as the weaker claim in VERIFICATION.md with the manual steps
 * written out. What it is not is an untested assumption.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const L = await import(resolve(root, 'src/app/calc/light.ts'))
const P = await import(resolve(root, 'src/app/calc/potmeasure.ts'))
const { STANDARD_SIZES } = await import(resolve(root, 'src/app/data/ported/potsize.ts'))
const { speciesById } = await import(resolve(root, 'src/app/data/ported/species.ts'))

let failures = 0
const fail = (m) => {
  failures++
  console.log(`  FAIL  ${m}`)
}
const pass = (m) => console.log(`  ok    ${m}`)
const check = (c, good, bad) => (c ? pass(good) : fail(bad ?? good))

// ---------------------------------------------------------------------------
console.log('\n  Light: the exposure arithmetic\n')

/*
 * Real exposures, and the light level each one implies.
 *
 * These are not invented numbers — they are the sunny-16 relationships every
 * photographer knows, run backwards. f/16 at 1/100s and ISO 100 is full sun,
 * which is around 80,000 lux; an office at f/2.8, 1/60s, ISO 800 is a few
 * hundred. If the arithmetic here ever drifts, these stop matching what a
 * camera would actually do, which is the only external check available.
 */
const EXPOSURES = [
  { name: 'full sun (sunny 16)', shutterSeconds: 1 / 100, iso: 100, aperture: 16, min: 50000, max: 120000, want: 'direct' },
  { name: 'bright overcast', shutterSeconds: 1 / 250, iso: 100, aperture: 5.6, min: 8000, max: 30000, want: 'direct' },
  { name: 'bright windowsill', shutterSeconds: 1 / 120, iso: 100, aperture: 2.8, min: 1500, max: 7000, want: 'bright' },
  { name: 'room with good daylight', shutterSeconds: 1 / 120, iso: 100, aperture: 2.0, min: 600, max: 2000, want: 'medium' },
  { name: 'dim corner', shutterSeconds: 1 / 30, iso: 1600, aperture: 1.8, min: 4, max: 100, want: 'low' },
]

for (const e of EXPOSURES) {
  const lux = L.luxFromExposure(e)
  const { category } = L.categoryForLux(lux)
  const inRange = lux >= e.min && lux <= e.max
  if (!inRange) fail(`${e.name}: ${Math.round(lux)} lux, expected ${e.min}–${e.max}`)
  else if (category !== e.want) fail(`${e.name}: ${Math.round(lux)} lux classified as ${category}, expected ${e.want}`)
  else pass(`${e.name} → ${Math.round(lux).toLocaleString('en-US')} lux → ${category}`)
}

{
  /* Doubling the shutter time doubles the exposure, which halves the light that
     must have been there. If that relationship ever inverts, every reading is
     backwards and every individual number still looks plausible. */
  const a = L.luxFromExposure({ shutterSeconds: 1 / 100, iso: 100, aperture: 2 })
  const b = L.luxFromExposure({ shutterSeconds: 1 / 50, iso: 100, aperture: 2 })
  check(Math.abs(a / b - 2) < 0.01, 'a longer shutter means less light, by exactly the factor it was lengthened by')

  const c = L.luxFromExposure({ shutterSeconds: 1 / 100, iso: 200, aperture: 2 })
  check(Math.abs(a / c - 2) < 0.01, 'and doubling the ISO halves the light it implies')

  check(!Number.isFinite(L.luxFromExposure({ shutterSeconds: 0, iso: 100 })), 'a zero shutter gives no answer rather than infinity')
  check(!Number.isFinite(L.luxFromExposure({ shutterSeconds: 0.01, iso: 0 })), 'and neither does a zero ISO')
}

{
  const near = L.categoryForLux(1900)
  const mid = L.categoryForLux(1100)
  check(near.borderline === true, 'a reading close to a boundary is reported as borderline')
  check(mid.borderline === false, 'and one in the middle of a band is not')
}

console.log('\n  Light: the fallback, and what it refuses to claim\n')
{
  const dark = new Uint8ClampedArray(400).fill(10)
  const bright = new Uint8ClampedArray(400).fill(240)
  const d = L.meanLuminance(dark)
  const b = L.meanLuminance(bright)
  check(d < 6 && b > 90, `a dark frame reads ${d.toFixed(0)} and a bright one ${b.toFixed(0)}`)
  check(L.categoryForRelative(d).category === 'low' && L.categoryForRelative(b).category === 'direct', 'and they classify at opposite ends')
  check(L.meanLuminance(new Uint8ClampedArray(0)) === 0, 'an empty frame gives 0 rather than NaN')

  const src = readFileSync(resolve(root, 'src/app/ui/LightMeter.tsx'), 'utf8')
  check(
    /method === 'exposure'/.test(src) && /relative\s+brightness rather than a real light level/i.test(src.replace(/\s+/g, ' ')),
    'the UI words the two methods differently, so a relative reading is never shown as lux'
  )
  check(
    /not a measurement|not a lux meter|rough figure/i.test(src),
    'and every reading carries the accuracy caveat the brief asks for'
  )
}

console.log('\n  Light: the answer about a plant\n')
{
  const fern = speciesById('maidenhair-fern')
  const cactus = speciesById('echinocactus')
  const pothos = speciesById('pothos-golden')

  check(L.verdictFor(pothos, pothos.light).fit === 'good', 'a plant in the light it wants reads as a good fit')
  check(L.verdictFor(cactus, 'low').fit === 'too-dark', 'a barrel cactus in a dark corner is too dark')
  check(L.verdictFor(fern, 'direct').fit === 'too-bright', 'a maidenhair fern in direct sun is too bright')

  /* A monstera wants bright indirect, so "medium" is exactly one notch down —
     the case where the honest answer is "it will cope, water it less". */
  const monstera = speciesById('monstera')
  const oneOff = L.verdictFor(monstera, 'medium')
  check(
    oneOff.gap === -1 && oneOff.fit === 'too-dark' && /probably live/i.test(oneOff.detail),
    'one category out is a hedge, not a refusal'
  )

  const twoOff = L.verdictFor(cactus, 'low')
  check(/rot|water/i.test(twoOff.detail), 'and a too-dark verdict warns about watering, which is what actually kills it')

  /* Every species has to produce a usable sentence in every spot. */
  const bad = []
  const { SPECIES } = await import(resolve(root, 'src/app/data/ported/species.ts'))
  for (const s of SPECIES) {
    for (const spot of L.LIGHT_ORDER) {
      const v = L.verdictFor(s, spot)
      if (!v.headline || v.headline.length < 10) bad.push(`${s.id} in ${spot}: no headline`)
      if (!v.detail || v.detail.length < 20) bad.push(`${s.id} in ${spot}: no detail`)
    }
  }
  check(bad.length === 0, `all ${SPECIES.length} species × 4 light levels produce a readable answer`, bad[0])
}

// ---------------------------------------------------------------------------
console.log('\n  Pot measurement\n')

{
  /* A bank card is 85.60 mm. A span twice as long as the card in the same photo
     is 171.2 mm, which is 6.74 inches. The maths is deliberately this simple so
     that the test is checking the code rather than restating it. */
  const card = { x1: 100, y1: 500, x2: 300, y2: 500 } // 200 px
  const pot = { x1: 100, y1: 200, x2: 500, y2: 200 } // 400 px
  const inches = P.potInches(card, pot, 85.6)
  check(Math.abs(inches - 6.74) < 0.02, `twice the card's length reads as ${inches.toFixed(2)} in`)

  /* Rotation must not change a length. The marks are dragged by hand and will
     never be axis-aligned in real use. */
  const diagonal = { x1: 100, y1: 200, x2: 100 + 400 / Math.SQRT2, y2: 200 + 400 / Math.SQRT2 }
  const rotated = P.potInches(card, diagonal, 85.6)
  check(Math.abs(rotated - inches) < 0.01, 'a diagonal mark of the same length gives the same answer')

  let refused = false
  try {
    P.potInches({ x1: 0, y1: 0, x2: 5, y2: 0 }, pot, 85.6)
  } catch (e) {
    refused = e instanceof P.MeasureError && /too short/i.test(e.message)
  }
  check(refused, 'a reference mark a few pixels long is refused rather than answered')

  const tol = P.toleranceInches(card, pot, 85.6)
  check(tol > 0 && tol < inches * 0.1, `the stated tolerance is ±${tol.toFixed(2)} in, which is a real number, not zero`)

  const tighter = P.toleranceInches({ x1: 0, y1: 0, x2: 800, y2: 0 }, pot, 85.6)
  check(tighter < tol, 'and a longer reference mark tightens it')
}

{
  const m = P.nearestStandard(6.2, STANDARD_SIZES)
  check(m?.diameterIn === 6, `6.2 in snaps to the ${m?.label}`)
  const big = P.nearestStandard(14.5, STANDARD_SIZES)
  check(big?.diameterIn === 14.75, `14.5 in snaps to the ${big?.label}`)
  check(P.nearestStandard(0, STANDARD_SIZES) === null, 'a nonsense measurement snaps to nothing')
  check(P.nearestStandard(6, []) === null, 'and so does an empty size table')

  /* The table it snaps to is the ported one, not a copy. */
  const ids = new Set(STANDARD_SIZES.map((s) => s.id))
  const bad = []
  for (let i = 2; i < 20; i += 0.5) {
    const hit = P.nearestStandard(i, STANDARD_SIZES)
    if (!hit || !ids.has(hit.id)) bad.push(i)
  }
  check(bad.length === 0, `every measurement from 2 to 20 in lands on a real row of the nursery table`, `missed at ${bad[0]} in`)
}

{
  const refs = P.REFERENCES
  check(refs.length >= 5, `${refs.length} reference objects offered`)
  check(
    refs.every((r) => r.mm > 0 && r.source && r.source.length > 10),
    'and every one names the standard its size comes from',
    'a reference object has no cited source'
  )
  const card = refs.find((r) => r.id === 'card')
  check(card?.mm === 85.6, 'the bank card is 85.60 mm, as ISO/IEC 7810 defines it')
}

// ---------------------------------------------------------------------------
console.log('\n  Being told no\n')

{
  /* One place asks for a camera. This is the property that makes the permission
     behaviour reviewable at all — two copies is two behaviours, and the second
     one is always the one that forgets to handle NotAllowedError. */
  const files = ['src/app/ui/Camera.tsx', 'src/app/ui/LightMeter.tsx', 'src/app/ui/PotMeasure.tsx', 'src/app/ui/PhotoInput.tsx']
  /* An actual call site, not the word — PhotoInput's header explains that it
     deliberately does not use getUserMedia, and a check that cannot tell the
     difference between a call and a comment saying "no call here" is a check
     that punishes the documentation. */
  const CALL = /navigator\.mediaDevices\??\.?getUserMedia\s*\(|mediaDevices\.getUserMedia\s*\(/
  const asks = files.filter((f) => CALL.test(readFileSync(resolve(root, f), 'utf8')))
  check(
    asks.length === 1 && asks[0] === 'src/app/ui/Camera.tsx',
    'exactly one file in the app asks for a camera',
    `getUserMedia appears in: ${asks.join(', ')}`
  )

  const cam = readFileSync(resolve(root, 'src/app/ui/Camera.tsx'), 'utf8')
  for (const name of ['NotAllowedError', 'NotFoundError', 'NotReadableError', 'OverconstrainedError', 'SecurityError', 'AbortError']) {
    check(cam.includes(name), `${name} is handled by name`, `${name} falls through to a generic message`)
  }
  check(/isSecureContext/.test(cam), 'and a page without a secure context is told that, rather than "camera failed"')

  /* Every failure has a message a person can act on. */
  const messages = [...cam.matchAll(/^\s{2}(denied|none|insecure|busy|unsupported|other):\s*\n?\s*'([\s\S]*?)',\s*$/gm)]
  check(messages.length >= 4, `${messages.length} failure kinds carry their own explanation`)

  /* And both tools work without one. */
  const lm = readFileSync(resolve(root, 'src/app/ui/LightMeter.tsx'), 'utf8')
  const pm = readFileSync(resolve(root, 'src/app/ui/PotMeasure.tsx'), 'utf8')
  check(/ManualPicker/.test(lm), 'the light meter offers the four categories as buttons when there is no camera')
  check(/fallback=\{<FilePick/.test(pm), 'the pot tool takes an existing photo when there is no camera')
  check(/fallback=\{<ManualPicker/.test(lm), 'and both pass that fallback into the camera pane, so it shows on failure too')
}

console.log(failures ? `\n  ${failures} failure(s).\n` : `\n  Camera tools: everything above passed.\n`)
process.exit(failures ? 1 : 0)
