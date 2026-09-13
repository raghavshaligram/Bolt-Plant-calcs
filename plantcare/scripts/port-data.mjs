/**
 * Generate the app's copies of the four HarvestMath datasets, from the site's
 * own source.
 *
 * WHY THIS IS A SCRIPT AND NOT A COPY-PASTE
 *
 * The brief asks four separate times for data that "matches the live X
 * exactly", and names the reason: the same facts are sold three ways — on the
 * site, in the Etsy PDF, and now in this app — and three copies of a number
 * that must agree is two chances to disagree. A person who reads one answer on
 * the site and a different one in the app they paid for has caught the whole
 * operation being careless, and will not distinguish between "the app is wrong"
 * and "these people do not know what they are talking about".
 *
 * Retyping cannot be checked. Generating can: this script reads the site's
 * files and writes `src/app/data/ported/`, and `verify-data.mjs` re-reads both
 * sides and fails if they have drifted. Editing either copy by hand breaks the
 * suite, which is the point.
 *
 *   node scripts/port-data.mjs [--site <path to the HarvestMath repo>]
 *
 * The default is the parent directory, because this app lives inside the
 * HarvestMath repo. There is no network here and no scraping of the live site:
 * the repo is the source, because the repo is what builds the live site.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
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
if (!site) {
  console.error(
    '\n  Cannot find the HarvestMath site source. Looked in:\n' +
      CANDIDATES.map((c) => `    ${c}`).join('\n') +
      '\n\n  Pass it explicitly:  node scripts/port-data.mjs --site ..\n'
  )
  process.exit(1)
}

const read = (rel) => readFileSync(resolve(site, rel), 'utf8')
const outDir = resolve(root, 'src', 'app', 'data', 'ported')
mkdirSync(outDir, { recursive: true })

const BANNER = (from) => `/*
 * GENERATED — do not edit.
 *
 * Written by scripts/port-data.mjs from the HarvestMath site source:
 *   ${from}
 *
 * Edit it there and re-run \`npm run port\`. scripts/verify-data.mjs reads both
 * sides and fails if they have drifted, so a hand edit here does not survive
 * the next verification pass.
 */
`

const written = []
function emit(name, from, body) {
  const file = resolve(outDir, name)
  writeFileSync(file, BANNER(from) + body)
  written.push({ name, from, bytes: Buffer.byteLength(body) })
}

/*
 * Prove every emitted module actually loads, before saying the port succeeded.
 *
 * This exists because of a backtick. The bodies above are written as template
 * literals, and a comment inside one of them said the word "type" in backticks,
 * which closed the literal early. The script then died with "missing ) after
 * argument list" pointing at a line that was perfectly correct — and because
 * that run's output was being discarded, the port appeared to succeed while the
 * generated file sat unchanged from the run before.
 *
 * A syntax error in this script is loud on its own. What is not loud is a
 * generated file that is stale, or that parses and exports nothing. So the port
 * imports what it just wrote and checks the exports are there. It is the same
 * discipline as build-toxicity.mjs exercising its own output, for the same
 * reason: a generator that never reads its own work can fail confidently.
 */
async function proveLoads() {
  const EXPECTED = {
    'companion.ts': ['COMPANION_PLANTS', 'companionVerdict', 'companionReason', 'COMPANION_RATIONALE'],
    'zones.ts': ['ZONE_FROST_DATA', 'ALL_ZONES', 'findZoneForZip'],
    'zoneTemps.ts': ['ZONE_TEMP_BANDS'],
    'potsize.ts': ['STANDARD_SIZES', 'POT_PLANT_GUIDE', 'CATEGORY_INFO'],
    'diagnosis.ts': ['DIAGNOSIS_TREES'],
  }
  const bad = []
  for (const { name } of written) {
    const wanted = EXPECTED[name]
    if (!wanted) {
      bad.push(`${name}: emitted but not in the expected-exports list, so nothing checked it`)
      continue
    }
    let mod
    try {
      mod = await import(resolve(outDir, name) + '?t=' + Date.now())
    } catch (e) {
      bad.push(`${name}: does not load — ${e.message}`)
      continue
    }
    for (const key of wanted) {
      if (mod[key] === undefined) bad.push(`${name}: exports no ${key}`)
    }
  }
  for (const name of Object.keys(EXPECTED)) {
    if (!written.some((w) => w.name === name)) bad.push(`${name}: expected but never written`)
  }
  if (bad.length) {
    console.error('\n  The port wrote files that do not work:\n' + bad.map((b) => '    ' + b).join('\n') + '\n')
    process.exit(1)
  }
}

/* ----------------------------------------------- 1. companion planting --- */

/**
 * The 13-plant relation table, lifted whole.
 *
 * Taken as the literal array rather than re-expressed: the relations are
 * symmetric by hand in the source (if A lists B, B lists A), and re-deriving
 * that symmetry here would be a second implementation of a fact that is already
 * written down. `verify-data.mjs` checks the symmetry holds on both sides.
 */
{
  const src = read('src/components/blog/CompanionPlantingTable.tsx')
  const m = src.match(/const PLANTS: PlantRelations\[\] = \[([\s\S]*?)\n\]/)
  if (!m) throw new Error('companion planting: PLANTS array not found in the site source')

  /*
   * The article's own statement of WHY each pairing is what it is.
   *
   * It lives in the source file as a header comment — "basil-tomato pest
   * deterrence and flavor pairing, allium inhibition of bean growth, …" — and
   * the brief asks the app's checker to give the real reason for a pair. There
   * are two ways to do that and only one of them is safe: write reasons by hand
   * into the app, and have them drift from the article the day either changes;
   * or carry the article's sentence across verbatim and match against it. This
   * is the second. Nothing below is authored here.
   */
  /* The site's files are checked in with CRLF line endings, so every pattern
     here has to tolerate the \r. The first version of this regex did not, found
     nothing, and threw — which is the right way round: the port stopping is a
     thing somebody fixes, and a port quietly emitting no reasons is not. */
  const rationale = src.match(/\/\/ Underlying facts represented here[^\n]*\n([\s\S]*?)\r?\n\s*\r?\ntype PlantType/)
  if (!rationale) {
    throw new Error(
      'companion planting: the article no longer states its reasoning where the port expects it. ' +
        'Do not write replacement reasons into the app — find where the site says it now.'
    )
  }
  const facts = rationale[1]
    .split('\n')
    .map((l) => l.replace(/\r/g, '').replace(/^\s*\/\/\s?/, '').trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  emit(
    'companion.ts',
    'src/components/blog/CompanionPlantingTable.tsx',
    `
export type CompanionType = 'vegetable' | 'herb'

export interface CompanionPlant {
  name: string
  type: CompanionType
  good: string[]
  avoid: string[]
}

export const COMPANION_PLANTS: CompanionPlant[] = [${m[1]}
]

/**
 * good / avoid / neutral for any ordered pair, which is what the app's checker
 * asks and the site's table shows a row at a time.
 *
 * Neutral is a real answer and not a failure to find one: most pairs of plants
 * simply have no documented relationship, and inventing a reason for those is
 * how a companion planting chart becomes folklore. The site's table says the
 * same thing with an em dash.
 */
export type CompanionVerdict = 'good' | 'avoid' | 'neutral'

export function companionVerdict(a: string, b: string): CompanionVerdict {
  const row = COMPANION_PLANTS.find((p) => p.name === a)
  if (!row) return 'neutral'
  if (row.good.includes(b)) return 'good'
  if (row.avoid.includes(b)) return 'avoid'
  return 'neutral'
}

/**
 * The article's own words about why, copied across rather than rewritten.
 *
 * This string is the header comment from CompanionPlantingTable.tsx. It is the
 * site's statement of the horticulture behind the table, and it is here so that
 * the app can quote it instead of carrying a second, hand-written set of reasons
 * that would drift the first time either side was edited.
 */
export const COMPANION_RATIONALE = ${JSON.stringify(facts)}

/*
 * The words the article uses for a plant, where they are not the plant's name.
 *
 * The article writes about alliums and the cabbage family; the table says
 * "Onions" and "Kale". Matching needs to know that, and there is nowhere else
 * to put it. Every entry is a word that appears in COMPANION_RATIONALE above —
 * companionReason() would simply find nothing for a wrong one, rather than
 * inventing a reason, which is the failure mode worth having.
 */
const ALIASES: Record<string, string[]> = {
  Tomatoes: ['tomato'],
  Peppers: ['pepper'],
  Cucumbers: ['cucumber'],
  Onions: ['onion', 'allium'],
  Kale: ['kale', 'cabbage-family', 'cole'],
  Beans: ['bean'],
  Lettuce: ['lettuce'],
  Carrots: ['carrot', 'deeper-rooted'],
  Radishes: ['radish'],
  Basil: ['basil'],
  Mint: ['mint'],
  Dill: ['dill'],
  Chives: ['chive', 'allium'],
}

function mentions(clause: string, name: string): boolean {
  const words = [name.toLowerCase().replace(/s$/, ''), ...(ALIASES[name] ?? [])]
  if (words.some((w) => clause.includes(w))) return true
  /* The article says "a poor open-ground neighbor for other herbs" rather than
     naming basil, dill and chives one at a time. Which plants are herbs is not
     a judgement — it is the "type" column of the same table. */
  const type = COMPANION_PLANTS.find((p) => p.name === name)?.type
  return type === 'herb' && clause.includes('other herbs')
}

/**
 * The sentence from the article that covers this pair, or null.
 *
 * Null is a legitimate and common answer: the table records a relationship for
 * far more pairs than the article explains individually. Saying "the table says
 * so, the article does not say why for this pair" is honest; assembling a
 * plausible reason out of the two plant names is how a chart becomes folklore.
 */
export function companionReason(a: string, b: string): string | null {
  for (const raw of clauses(COMPANION_RATIONALE)) {
    const clause = raw.toLowerCase()
    if (mentions(clause, a) && mentions(clause, b)) return raw.trim().replace(/[.]$/, '')
  }
  return null
}

/*
 * Split the article's sentence on commas and semicolons, ignoring any inside
 * brackets — "(and flea-beetle trap crop)" must not become its own clause.
 *
 * Written as a scanner rather than a regex on purpose, and this is the second
 * time in this codebase that the reason has been a backslash. This file writes
 * TypeScript out as a JavaScript template literal, and a backslash inside one is
 * not an escape — it is eaten. A lookahead like the obvious one here emitted an
 * unbalanced bracket into the generated file, which at least failed loudly; the
 * earlier instance emitted a regex that split on the letter "s" and failed
 * silently for days. A scanner has no escapes to lose.
 */
function clauses(text: string): string[] {
  const out: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '(') depth++
    else if (c === ')') depth = Math.max(0, depth - 1)
    else if ((c === ',' || c === ';') && depth === 0) {
      out.push(text.slice(start, i))
      start = i + 1
    }
  }
  out.push(text.slice(start))
  return out.filter((s) => s.trim())
}
`
  )
}

/* --------------------------------------------------- 2. zone and frost --- */

/**
 * ZIP → state → zone → frost dates, taken as the whole module.
 *
 * This one is copied rather than picked apart. It is 65 KB of tables plus the
 * lookup functions that read them, it is already the single source of truth
 * shared by the Frost Date Calculator and the Seed Starting Calculator on the
 * site, and splitting the data from the functions that interpret it is exactly
 * how two tools end up agreeing about the table and disagreeing about the
 * answer. The site solved this; the app inherits the solution.
 */
{
  /* Verbatim, including the site's own leading comment. An earlier version
     dropped that first line "because the banner says the same thing", which
     made the app's copy and the site's differ by one line and cost an hour
     proving the difference was cosmetic. A copy is a copy. */
  const src = read('src/lib/frostZones.ts')
  emit('zones.ts', 'src/lib/frostZones.ts', '\n' + src)

  const temps = read('src/lib/hardinessZoneTemps.ts')
  emit('zoneTemps.ts', 'src/lib/hardinessZoneTemps.ts', '\n' + temps)
}

/* -------------------------------------------------------- 3. pot sizes --- */

/**
 * The conversion table and the plant-to-pot guide.
 *
 * `STANDARD_SIZES` is the gallon-to-inches dataset the brief names. The
 * `PLANT_GUIDE` beside it is what the site uses to answer "what size pot does
 * this need", and it comes across too — it is the same question the app's pot
 * tool asks, and a second table of the same advice is the drift this file
 * exists to prevent.
 */
{
  const src = read('src/components/calculators/PotSizeCalculator.tsx')
  const types = src.match(/(type PlantCategory =[\s\S]*?\n)\n/)
  const sizes = src.match(/(interface StandardSize \{[\s\S]*?\n\})\s*\n\s*const STANDARD_SIZES: StandardSize\[\] = \[([\s\S]*?)\n\]/)
  /* This was written as CATEGORY_GUIDE and the site calls it CATEGORY_INFO, so
     the optional match quietly found nothing and the app shipped a pot tool
     that could list the categories and not say what size any of them wants.
     Nothing failed: the regex was allowed to miss. It is required now, along
     with its interface, because a port that silently drops a table is worse
     than one that does not run. */
  const catInfo = src.match(/(interface CategoryInfo \{[\s\S]*?\n\})\s*\n\s*const CATEGORY_INFO: Record<PlantCategory, CategoryInfo> = \{([\s\S]*?)\n\};/)
  const guide = src.match(/const PLANT_GUIDE: PlantEntry\[\] = \[([\s\S]*?)\n\]/)
  if (!sizes || !guide) throw new Error('pot size: STANDARD_SIZES or PLANT_GUIDE not found in the site source')
  if (!catInfo) throw new Error('pot size: CATEGORY_INFO not found in the site source')

  emit(
    'potsize.ts',
    'src/components/calculators/PotSizeCalculator.tsx',
    `
${types ? types[1] : "type PlantCategory = string"}
${sizes[1]}

export const STANDARD_SIZES: StandardSize[] = [${sizes[2]}
]

export ${catInfo[1]}

export const CATEGORY_INFO: Record<PlantCategory, CategoryInfo> = {${catInfo[2]}
};

export interface PotPlantEntry {
  id: string
  name: string
  cat: PlantCategory
}

export const POT_PLANT_GUIDE: PotPlantEntry[] = [${guide[1]}
]
`
  )
}

/* ---------------------------------------------------- 4. the diagnosis --- */

/**
 * Six decision trees, read out of the articles that publish them.
 *
 * The trees are not in a data file on the site — each one is written inline as
 * props on a `<DiagnosticQuiz>` in its own MDX article, which is the right
 * place for them there (the article and its quiz are one thing, and the
 * standing rule in DiagnosticQuiz.tsx is that a new article ships with its own
 * config rather than being retrofitted).
 *
 * So this reads the JSX props and converts them to data. `anchor` is rewritten
 * from a page fragment to the article path plus fragment, because in the app
 * there is no surrounding article to scroll within — the result has to be able
 * to say where the full explanation lives, and "#soil-is-dry" alone cannot.
 */
{
  const ARTICLES = [
    ['yellow-leaves', 'why-are-my-plant-leaves-turning-yellow', 'Yellow leaves'],
    ['wilting', 'why-is-my-plant-wilting', 'Wilting'],
    ['holes', 'why-are-there-holes-in-my-plant-leaves', 'Holes in leaves'],
    ['brown-tips', 'why-are-my-plant-leaf-tips-turning-brown', 'Brown leaf tips'],
    ['powdery-mildew', 'powdery-mildew', 'Powdery mildew'],
    ['blossom-end-rot', 'blossom-end-rot', 'Blossom end rot'],
  ]

  /**
   * Pull one balanced bracketed expression starting at `open`.
   *
   * A regex cannot do this: the props contain nested arrays and objects and
   * strings with brackets in them, and the first `]` is not the end. Counting
   * depth while skipping string literals is the whole job.
   */
  function balanced(text, from, open, close) {
    let i = text.indexOf(open, from)
    if (i === -1) return null
    const start = i
    let depth = 0
    let quote = null
    for (; i < text.length; i++) {
      const c = text[i]
      if (quote) {
        if (c === '\\') i++
        else if (c === quote) quote = null
        continue
      }
      if (c === '"' || c === "'" || c === '`') quote = c
      else if (c === open) depth++
      else if (c === close) {
        depth--
        if (depth === 0) return { text: text.slice(start, i + 1), end: i + 1 }
      }
    }
    return null
  }

  const trees = []
  for (const [id, slug, label] of ARTICLES) {
    const src = read(`src/pages/blog/${slug}.mdx`)
    const at = src.indexOf('<DiagnosticQuiz')
    if (at === -1) throw new Error(`diagnosis: no <DiagnosticQuiz> in ${slug}.mdx`)

    const qAt = src.indexOf('questions={', at)
    const rAt = src.indexOf('results={', at)
    if (qAt === -1 || rAt === -1) throw new Error(`diagnosis: ${slug}.mdx has a quiz with no questions or results`)

    /*
     * `questions={[...]}` and `results={{...}}`.
     *
     * The first is a JSX expression containing an array, so scanning for `[`
     * from the `{` lands on the array. The second is a JSX expression
     * containing an object, so scanning for `{` from the `{` lands on the
     * expression brace itself and captures `{{...}}` — valid to read and not
     * valid to write back out. Start after it.
     */
    const questions = balanced(src, qAt + 'questions={'.length - 1, '[', ']')
    const results = balanced(src, rAt + 'results={'.length, '{', '}')
    if (!questions || !results) throw new Error(`diagnosis: could not read the props in ${slug}.mdx`)

    trees.push({ id, slug, label, questions: questions.text, results: results.text })
  }

  const body = trees
    .map(
      (t) => `  {
    id: '${t.id}',
    label: ${JSON.stringify(t.label)},
    article: '/blog/${t.slug}/',
    questions: ${t.questions.replace(/\n/g, '\n  ')},
    results: ${t.results.replace(/\n/g, '\n  ')},
  },`
    )
    .join('\n')

  emit(
    'diagnosis.ts',
    'src/pages/blog/*.mdx (the <DiagnosticQuiz> props)',
    `
export interface DiagnosisOption {
  label: string
  /** Either another question's id, or a key in \`results\`. */
  next: string
}

export interface DiagnosisQuestion {
  id: string
  prompt: string
  options: DiagnosisOption[]
}

export interface DiagnosisResult {
  label: string
  blurb: string
  /**
   * Where the full explanation lives. On the site this is a fragment within the
   * article the quiz sits in; here it is resolved against \`article\` so the app
   * can name the page as well as the section.
   */
  anchor: string
  ctaLabel?: string
}

export interface DiagnosisTree {
  id: string
  label: string
  article: string
  questions: DiagnosisQuestion[]
  results: Record<string, DiagnosisResult>
}

export const DIAGNOSIS_TREES: DiagnosisTree[] = [
${body}
]

/**
 * Resolve one step. The two namespaces do not collide by construction — the
 * site's own contract, stated in DiagnosticQuiz.tsx — so a \`next\` is a
 * question if a question has that id, and a result otherwise.
 */
export function stepFor(tree: DiagnosisTree, next: string):
  | { kind: 'question'; question: DiagnosisQuestion }
  | { kind: 'result'; key: string; result: DiagnosisResult }
  | null {
  const q = tree.questions.find((x) => x.id === next)
  if (q) return { kind: 'question', question: q }
  const r = tree.results[next]
  if (r) return { kind: 'result', key: next, result: r }
  return null
}

/** The article and fragment a result points at, as one URL. */
export function resultUrl(tree: DiagnosisTree, result: DiagnosisResult): string {
  if (result.anchor.startsWith('#')) return tree.article + result.anchor
  return result.anchor
}
`
  )
}

/* ------------------------------------------------------------- report --- */

console.log(`\n  Ported from ${site}\n`)
for (const w of written) {
  console.log(`    ${w.name.padEnd(16)} ${String((w.bytes / 1024).toFixed(1)).padStart(6)} KB   ${w.from}`)
}
await proveLoads()

console.log(`\n  ${written.length} files. Run \`npm run verify:data\` to prove they still match.\n`)
