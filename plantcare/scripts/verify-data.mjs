/**
 * Verification items 3, 4, 5 and 6: the ported data matches the live site.
 *
 * Four of the brief's eleven checks are the same sentence with a different
 * noun — companion planting, zone and frost, pot size, diagnosis branching,
 * each "matches the live X exactly". They are one check, because they have one
 * failure mode: somebody edits one copy and not the other, and the app and the
 * site start giving different answers to the same question. The buyer who
 * notices has caught the whole operation being careless.
 *
 * So this does not compare the app's data against a number typed into a test.
 * It reads the HarvestMath source and the app's copy, side by side, and
 * asserts they agree — which means the check keeps working when the site
 * changes, and fails at exactly the moment somebody needs to know.
 *
 * Run after `npm run port`, and any time either side moves.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const siteArg = args.includes('--site') ? args[args.indexOf('--site') + 1] : null
const CANDIDATES = [
  siteArg,
  process.env.HARVESTMATH_SITE,
  /* The app lives inside the HarvestMath repo, so the site source is its
     parent. The sibling path is kept as a fallback for a checkout that puts
     them side by side instead. */
  resolve(root, '..'),
  resolve(root, '..', 'Bolt-Plant-calcs'),
  '/mnt/user-data/uploads/Bolt-Plant-calcs',
].filter(Boolean)
const site = CANDIDATES.find((p) => existsSync(resolve(p, 'src', 'design', 'tokens.ts')))

const results = []
let current = null
function check(n, title, fn) {
  current = { n, title, notes: [], failures: [] }
  try {
    fn()
  } catch (err) {
    current.failures.push(`threw: ${err.message}`)
  }
  results.push(current)
  current = null
}
const note = (s) => current.notes.push(s)
const eq = (a, b, what) => {
  if (a !== b) current.failures.push(`${what}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`)
}
const ok = (c, what) => {
  if (!c) current.failures.push(what)
}

/**
 * Compare two whole files and report *where* they differ.
 *
 * `eq` on two 2 KB strings prints both of them and leaves the reader to spot
 * the difference by eye, which is how the first run of this check produced
 * eighty lines of output for a one-line discrepancy. A failing check that
 * cannot be read is a failing check nobody acts on.
 */
function sameFile(name, got, want) {
  if (got === want) return
  const a = got.split('\n')
  const b = want.split('\n')
  const at = a.findIndex((line, i) => line !== b[i])
  if (at === -1) {
    current.failures.push(
      `${name}: identical for ${Math.min(a.length, b.length)} lines, then one side ends ` +
        `(app ${a.length} lines, site ${b.length})`
    )
    return
  }
  current.failures.push(
    `${name}: first difference at line ${at + 1}\n` +
      `             app:  ${JSON.stringify(a[at] ?? '(end of file)')}\n` +
      `             site: ${JSON.stringify(b[at] ?? '(end of file)')}`
  )
}

if (!site) {
  console.log('\n  The HarvestMath site source is not available here.\n')
  console.log('  These four checks compare the app against the site, so without the site')
  console.log('  there is nothing to compare against. This is reported rather than skipped')
  console.log('  quietly: a suite that passes because it did not run is worse than one that')
  console.log('  fails.\n')
  console.log('    node scripts/verify-data.mjs --site ..\n')
  process.exit(1)
}

const siteRead = (rel) => readFileSync(resolve(site, rel), 'utf8')
const appRead = (rel) => readFileSync(resolve(root, 'src', 'app', 'data', 'ported', rel), 'utf8')

const app = await import(resolve(root, 'src', 'app', 'data', 'ported', 'index.ts'))

/* ------------------------------------------- 3. companion planting -------- */

check(3, 'Companion planting matches the live article', () => {
  const src = siteRead('src/components/blog/CompanionPlantingTable.tsx')
  const m = src.match(/const PLANTS: PlantRelations\[\] = \[([\s\S]*?)\n\]/)
  ok(!!m, 'the site still declares PLANTS the way the port expects')
  if (!m) return

  /* Parse the site's literal rather than trusting the port's copy of it: if the
     port silently produced an empty array, comparing the port against itself
     would pass. */
  const rows = [...m[1].matchAll(/\{\s*name:\s*'([^']+)',\s*type:\s*'([^']+)',\s*good:\s*\[([^\]]*)\],\s*avoid:\s*\[([^\]]*)\]\s*\}/g)]
  const parseList = (s) => [...s.matchAll(/'([^']+)'/g)].map((x) => x[1])
  const fromSite = rows.map((r) => ({
    name: r[1],
    type: r[2],
    good: parseList(r[3]),
    avoid: parseList(r[4]),
  }))

  ok(fromSite.length > 0, 'the site table parsed to at least one row')
  eq(app.COMPANION_PLANTS.length, fromSite.length, 'number of plants')
  eq(
    JSON.stringify(app.COMPANION_PLANTS),
    JSON.stringify(fromSite),
    'every row, in order, field for field'
  )

  /* The reasoning the app quotes is the article's own sentence, ported. Checked
     against the site file here so that a reworded article fails the build rather
     than leaving the app quoting last year's explanation as if it were current. */
  const rationale = src.match(/\/\/ Underlying facts represented here[^\n]*\n([\s\S]*?)\r?\n\s*\r?\ntype PlantType/)
  ok(!!rationale, 'the site still states its reasoning where the port reads it')
  if (rationale) {
    const fromSite = rationale[1]
      .split('\n')
      .map((l) => l.replace(/\r/g, '').replace(/^\s*\/\/\s?/, '').trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    eq(app.COMPANION_RATIONALE, fromSite, "the article's stated reasoning, word for word")
  }

  /* Every reason the checker can show has to be a substring of that text — not
     similar to it, part of it. This is the check that makes "the reasons are the
     article's" a fact rather than an intention: a hand-written reason added to
     the app later would fail here immediately. */
  const invented = []
  let sourced = 0
  for (const p of app.COMPANION_PLANTS) {
    for (const other of [...p.good, ...p.avoid]) {
      const reason = app.companionReason(p.name, other)
      if (reason === null) continue
      sourced++
      if (!app.COMPANION_RATIONALE.includes(reason)) {
        invented.push(`${p.name} + ${other}: "${reason.slice(0, 50)}…" is not in the article`)
      }
    }
  }
  eq(invented.length, 0, `every reason shown is quoted from the article (${sourced} of them)${invented.length ? ': ' + invented[0] : ''}`)

  /* And the verdicts themselves agree with the table in both directions. */
  const wrong = []
  for (const p of app.COMPANION_PLANTS) {
    for (const q of app.COMPANION_PLANTS) {
      if (p.name === q.name) continue
      const want = p.good.includes(q.name) ? 'good' : p.avoid.includes(q.name) ? 'avoid' : 'neutral'
      const got = app.companionVerdict(p.name, q.name)
      if (got !== want) wrong.push(`${p.name} + ${q.name}: said ${got}, table says ${want}`)
    }
  }
  eq(wrong.length, 0, `companionVerdict agrees with the table for all ${app.COMPANION_PLANTS.length ** 2 - app.COMPANION_PLANTS.length} ordered pairs`)

  /* The site's own stated invariant: "Relationships are symmetric: if A lists B
     as good/avoid, B lists A the same way." Worth asserting on the copy the app
     ships, because an asymmetric pair is a checker that answers "good" one way
     round and "neutral" the other, which is worse than either answer alone. */
  const asymmetric = []
  for (const p of app.COMPANION_PLANTS) {
    for (const kind of ['good', 'avoid']) {
      for (const other of p[kind]) {
        const back = app.COMPANION_PLANTS.find((x) => x.name === other)
        if (!back) {
          asymmetric.push(`${p.name} names ${other}, which is not in the table`)
        } else if (!back[kind].includes(p.name)) {
          asymmetric.push(`${p.name} → ${other} is ${kind}, but ${other} → ${p.name} is not`)
        }
      }
    }
  }
  eq(asymmetric.length, 0, asymmetric.join('; '))

  const pairs = app.COMPANION_PLANTS.reduce((a, p) => a + p.good.length + p.avoid.length, 0)
  note(
    `${fromSite.length} plants and ${pairs} directed relationships, identical to the article, ` +
      `symmetric in both directions, and ${sourced} of them carrying the article's own sentence as the reason`
  )
})

/* ----------------------------------------------- 4. zone and frost -------- */

check(4, 'Zone and frost data matches the live calculators', () => {
  const src = siteRead('src/lib/frostZones.ts')
  const copy = appRead('zones.ts')

  /* The whole module comes across, so the comparison is the whole module. The
     generated banner is the only thing the port adds, and removing it is the
     only normalisation allowed — anything else and the check starts excusing
     differences instead of reporting them. */
  const strip = (s) => s.replace(/^\/\*[\s\S]*?\*\/\n/, '').trim()
  sameFile('frostZones.ts', strip(copy), strip(src))

  const temps = siteRead('src/lib/hardinessZoneTemps.ts')
  sameFile('hardinessZoneTemps.ts', strip(appRead('zoneTemps.ts')), strip(temps))

  /* And that it still answers: a module that matches and exports nothing usable
     would pass the comparison above and fail the user. */
  const zone = app.findZoneForZip('60601')
  ok(!!zone, 'a Chicago ZIP resolves to a zone')
  ok(!!app.ZONE_TEMP_BANDS['6a'], 'the temperature bands are readable')
  note(
    `both modules identical to the site; 60601 → zone ${zone?.zone ?? '?'}, ` +
      `${Object.keys(app.ZONE_TEMP_BANDS).length} temperature bands`
  )
})

/* --------------------------------------------------- 5. pot sizes --------- */

check(5, 'Pot size conversions match the live calculator', () => {
  const src = siteRead('src/components/calculators/PotSizeCalculator.tsx')
  const sizes = src.match(/const STANDARD_SIZES: StandardSize\[\] = \[([\s\S]*?)\n\]/)
  const guide = src.match(/const PLANT_GUIDE: PlantEntry\[\] = \[([\s\S]*?)\n\]/)
  ok(!!sizes && !!guide, 'the site still declares both tables the way the port expects')
  if (!sizes || !guide) return

  const norm = (s) => s.replace(/\s+/g, ' ').trim()
  const copy = appRead('potsize.ts')
  const copySizes = copy.match(/export const STANDARD_SIZES: StandardSize\[\] = \[([\s\S]*?)\n\]/)
  const copyGuide = copy.match(/export const POT_PLANT_GUIDE: PotPlantEntry\[\] = \[([\s\S]*?)\n\]/)
  ok(!!copySizes && !!copyGuide, 'the port produced both tables')
  if (!copySizes || !copyGuide) return

  eq(norm(copySizes[1]), norm(sizes[1]), 'the gallon-to-inches table')
  eq(norm(copyGuide[1]), norm(guide[1]), 'the plant-to-pot guide')

  const siteIds = [...guide[1].matchAll(/id: '([^']+)'/g)].map((m) => m[1])
  eq(app.POT_PLANT_GUIDE.length, siteIds.length, 'plants in the guide')
  eq(app.STANDARD_SIZES.length > 0, true, 'and at least one standard size')

  /* The third table. It was missed for a while because the port looked for a
     name the site does not use and was allowed to find nothing, which left the
     app able to list "Dwarf fruit tree" and unable to say it wants 25 gallons.
     Checked here by name so the same silence cannot happen twice. */
  const info = src.match(/const CATEGORY_INFO: Record<PlantCategory, CategoryInfo> = \{([\s\S]*?)\n\};/)
  ok(!!info, 'the site still declares CATEGORY_INFO')
  const copyInfo = copy.match(/export const CATEGORY_INFO: Record<PlantCategory, CategoryInfo> = \{([\s\S]*?)\n\};/)
  ok(!!copyInfo, 'the port produced CATEGORY_INFO')
  if (info && copyInfo) eq(norm(copyInfo[1]), norm(info[1]), 'the size guidance for each category')

  /* Every category a plant claims has to have guidance behind it. */
  const missing = [...new Set(app.POT_PLANT_GUIDE.map((p) => p.cat))].filter((c) => !app.CATEGORY_INFO?.[c])
  eq(missing.length, 0, `every plant category has sizing guidance${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`)

  note(
    `${app.STANDARD_SIZES.length} standard sizes, ${app.POT_PLANT_GUIDE.length} plants and ` +
      `${Object.keys(app.CATEGORY_INFO ?? {}).length} category guides, identical to the calculator`
  )
})

/* --------------------------------------------- 6. diagnosis branching ----- */

check(6, 'The diagnosis trees match the live DiagnosticQuiz logic', () => {
  const EXPECTED = [
    ['yellow-leaves', 'why-are-my-plant-leaves-turning-yellow'],
    ['wilting', 'why-is-my-plant-wilting'],
    ['holes', 'why-are-there-holes-in-my-plant-leaves'],
    ['brown-tips', 'why-are-my-plant-leaf-tips-turning-brown'],
    ['powdery-mildew', 'powdery-mildew'],
    ['blossom-end-rot', 'blossom-end-rot'],
  ]
  eq(app.DIAGNOSIS_TREES.length, EXPECTED.length, 'trees ported')

  let questions = 0
  let leaves = 0
  for (const [id, slug] of EXPECTED) {
    const tree = app.DIAGNOSIS_TREES.find((t) => t.id === id)
    ok(!!tree, `${id} is present`)
    if (!tree) continue

    const src = siteRead(`src/pages/blog/${slug}.mdx`)

    /* Every prompt and every option label, as strings, present in the article
       that publishes them. Comparing the text rather than re-parsing the JSX a
       second way: a second parser that agreed with the first would prove the
       parser consistent, not the data correct. */
    for (const q of tree.questions) {
      questions++
      ok(src.includes(q.prompt), `${id}: the article still asks "${q.prompt.slice(0, 48)}…"`)
      for (const o of q.options) {
        ok(src.includes(o.label), `${id}: the article still offers "${o.label.slice(0, 40)}…"`)
      }
    }
    for (const [key, r] of Object.entries(tree.results)) {
      leaves++
      ok(src.includes(r.label), `${id}: the article still names the result "${r.label}"`)
      ok(src.includes(r.anchor), `${id}: the anchor ${r.anchor} is still in the article`)
    }

    /* The site's own contract, from DiagnosticQuiz.tsx: every `next` resolves
       either to a question or to a result, and the two namespaces do not
       collide. A dangling `next` is a dead end in a diagnosis tool — the user
       answers a question and the app has nothing to say. */
    for (const q of tree.questions) {
      for (const o of q.options) {
        const step = app.stepFor(tree, o.next)
        ok(!!step, `${id}: "${o.label}" leads to ${o.next}, which does not exist`)
      }
    }
    const ids = new Set(tree.questions.map((q) => q.id))
    const collide = Object.keys(tree.results).filter((k) => ids.has(k))
    eq(collide.length, 0, `${id}: ${collide.join(', ')} is both a question and a result`)

    /* Reachability. A question nothing points at is a branch the user can never
       be asked, which means either the tree lost an edge in the port or the
       article has one nobody can reach. */
    const reachable = new Set([tree.questions[0]?.id])
    let grew = true
    while (grew) {
      grew = false
      for (const q of tree.questions) {
        if (!reachable.has(q.id)) continue
        for (const o of q.options) {
          if (!reachable.has(o.next)) {
            reachable.add(o.next)
            grew = true
          }
        }
      }
    }
    const orphanQ = tree.questions.filter((q) => !reachable.has(q.id)).map((q) => q.id)
    const orphanR = Object.keys(tree.results).filter((k) => !reachable.has(k))
    eq(orphanQ.length, 0, `${id}: unreachable questions ${orphanQ.join(', ')}`)
    eq(orphanR.length, 0, `${id}: unreachable results ${orphanR.join(', ')}`)
  }

  note(
    `${EXPECTED.length} trees, ${questions} questions and ${leaves} outcomes, every prompt and ` +
      `option still present in its article, every branch reachable and every branch terminating`
  )
})

/* ------------------------------------------------------------- report ---- */

let failed = 0
console.log('\n  \x1b[1mThe ported data, against the live site\x1b[0m')
console.log(`  source: ${site}\n`)
for (const r of results) {
  const bad = r.failures.length > 0
  if (bad) failed++
  console.log(`  ${bad ? '\x1b[31mFAIL\x1b[0m' : ' \x1b[32mok\x1b[0m '}  ${r.n}. ${r.title}`)
  for (const n of r.notes) console.log(`        ${n}`)
  for (const f of r.failures) console.log(`        \x1b[31m✗\x1b[0m ${f}`)
}
console.log(
  failed === 0
    ? `\n  \x1b[32m${results.length}/${results.length} passed\x1b[0m — brief items 3, 4, 5 and 6\n`
    : `\n  \x1b[31m${failed} of ${results.length} failed\x1b[0m\n`
)
process.exit(failed ? 1 : 0)
