/*
 * Builds src/app/data/ported/species.ts from src/app/data/sources/species.tsv.
 *
 * Two things happen here that are worth understanding before changing anything.
 *
 * 1. The vocabulary is closed. Every light / water / humidity / feed value has
 *    to be one of a fixed set, because the scheduler switches on them. A typo
 *    like "med" instead of "medium" would not throw at runtime — it would fall
 *    through a switch to a default and quietly give that plant the wrong
 *    watering interval forever. So the typo fails the build instead.
 *
 * 2. Toxicity is joined here, at build time, by calling the real toxicityFor()
 *    from the generated ASPCA module. It is NOT a column in the .tsv and must
 *    never become one. The moment a person can type "non-toxic" next to a plant
 *    name, the app is making a pet-safety claim that nothing checked. Every
 *    verdict in the output traces back to a row on the ASPCA list, and a plant
 *    that is not on that list says so rather than being assumed safe.
 *
 * Run with `npm run build:species`.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(root, 'src/app/data/sources/species.tsv')
const OUT = resolve(root, 'src/app/data/ported/species.ts')
const TOX = resolve(root, 'src/app/data/ported/toxicity.ts')
const COMPANION = resolve(root, 'src/app/data/ported/companion.ts')

// ---- the closed vocabulary ---------------------------------------------------
const LIGHT = ['low', 'medium', 'bright', 'direct']
const WATER = ['arid', 'dry-between', 'evenly-moist', 'wet']
const HUMIDITY = ['low', 'average', 'high']
const FEED = ['none', 'light', 'average', 'heavy']
const GROUP = [
  'vine', 'foliage', 'succulent', 'tree', 'palm', 'fern',
  'prayer', 'flowering', 'herb', 'vegetable', 'carnivore', 'other',
]
const COLUMNS = [
  'id', 'common', 'botanical', 'group', 'light', 'water', 'baseDays',
  'humidity', 'size', 'feed', 'mist', 'repotYears', 'notes',
]

/*
 * Species whose common name differs from the name the companion-planting table
 * uses. Singular/plural mostly, and "Bush Beans" for "Beans".
 *
 * Written out rather than guessed with a stemmer, because a stemmer that gets
 * it wrong links the wrong two plants and nothing complains. Every entry here
 * is checked against both sides below, so renaming either end fails the build.
 */
const COMPANION_ALIAS = {
  tomato: 'Tomatoes',
  pepper: 'Peppers',
  cucumber: 'Cucumbers',
  onion: 'Onions',
  carrot: 'Carrots',
  radish: 'Radishes',
  'beans-bush': 'Beans',
}

// ---- parse -------------------------------------------------------------------
const lines = readFileSync(SRC, 'utf8').split('\n')
const rows = []
const fail = []

let header = null
lines.forEach((raw, i) => {
  const lineNo = i + 1
  if (!raw.trim() || raw.startsWith('#')) return
  const cells = raw.split('\t')
  if (!header) {
    header = cells
    if (header.join(',') !== COLUMNS.join(',')) {
      fail.push(`line ${lineNo}: header is ${header.join(',')}, expected ${COLUMNS.join(',')}`)
    }
    return
  }
  if (cells.length !== COLUMNS.length) {
    fail.push(`line ${lineNo}: ${cells.length} columns, expected ${COLUMNS.length} — a stray tab in the notes?`)
    return
  }
  const r = Object.fromEntries(COLUMNS.map((c, n) => [c, cells[n].trim()]))
  r.__line = lineNo
  rows.push(r)
})

const at = (r, msg) => fail.push(`line ${r.__line} (${r.id || '?'}): ${msg}`)
const oneOf = (r, field, allowed) => {
  if (!allowed.includes(r[field])) at(r, `${field} is "${r[field]}", expected one of ${allowed.join(' | ')}`)
}

const seenId = new Map()
const seenBotanical = new Map()

for (const r of rows) {
  if (!/^[a-z0-9-]+$/.test(r.id)) at(r, `id "${r.id}" must be lowercase letters, digits and hyphens`)
  if (seenId.has(r.id)) at(r, `duplicate id, first used on line ${seenId.get(r.id)}`)
  seenId.set(r.id, r.__line)

  for (const field of ['common', 'botanical', 'size', 'notes']) {
    if (!r[field]) at(r, `${field} is empty`)
  }

  /* Cultivars share a botanical name with their parent species on purpose
     (Epipremnum aureum and 'Neon'), so only an exact duplicate of the whole
     string is a mistake — that means a row was copied and not finished. */
  if (seenBotanical.has(r.botanical)) {
    at(r, `botanical name "${r.botanical}" is identical to line ${seenBotanical.get(r.botanical)}`)
  }
  seenBotanical.set(r.botanical, r.__line)

  oneOf(r, 'group', GROUP)
  oneOf(r, 'light', LIGHT)
  oneOf(r, 'water', WATER)
  oneOf(r, 'humidity', HUMIDITY)
  oneOf(r, 'feed', FEED)
  if (r.mist !== 'y' && r.mist !== 'n') at(r, `mist is "${r.mist}", expected y or n`)

  const days = Number(r.baseDays)
  if (!Number.isInteger(days) || days < 1 || days > 60) at(r, `baseDays is "${r.baseDays}", expected 1–60`)

  /* 0 means "not grown in compost at all" — air plants, bromeliads, lucky
     bamboo. The upper bound is 5 because anything longer is not a slow plant,
     it is a plant that should have been 0 and was typed wrong: an air plant sat
     in this table with repotYears 9 and produced a nine-year repotting reminder
     for a plant with no pot, which is the kind of answer that gets a refund. */
  const years = Number(r.repotYears)
  if (!Number.isInteger(years) || years < 0 || years > 5) {
    at(r, `repotYears is "${r.repotYears}", expected 0–5 (0 = not grown in compost)`)
  }

  /* A plant that wants arid soil and gets watered weekly is a dead plant, so
     the two fields have to agree. These bounds are wide — they catch a column
     shifted by one, not a debatable judgement about a particular species. */
  const WINDOW = { arid: [10, 40], 'dry-between': [5, 20], 'evenly-moist': [2, 10], wet: [1, 8] }
  const [lo, hi] = WINDOW[r.water] ?? [1, 60]
  if (Number.isInteger(days) && (days < lo || days > hi)) {
    at(r, `water "${r.water}" with baseDays ${days} — expected ${lo}–${hi}. One of the two is wrong.`)
  }

  /* Misting a succulent is how people rot them. */
  if (r.mist === 'y' && r.water === 'arid') at(r, `mist=y on an arid plant — misting is wrong advice here`)
}

if (fail.length) {
  console.error(`\n  species.tsv — ${fail.length} problem(s):\n` + fail.map((f) => '    ' + f).join('\n') + '\n')
  process.exit(1)
}

// ---- join: toxicity ----------------------------------------------------------
// Imported, not reimplemented. There is one lookup in this codebase and this
// calls it; a second copy here would be a second thing to keep correct.
const { toxicityFor } = await import(TOX)

const tox = new Map()
const counts = { toxic: 0, 'non-toxic': 0, unknown: 0 }
for (const r of rows) {
  const a = toxicityFor(r.botanical, r.common)
  tox.set(r.id, a)
  counts[a.verdict]++
}

/*
 * A cultivar carries its species' verdict.
 *
 * ASPCA lists "Epipremnum aureum", not "Epipremnum aureum 'Neon'", and the
 * botanical lookup is exact by design — so the cultivar falls through to the
 * genus step and, where the genus disagrees with itself, to unknown. Stripping
 * the quoted cultivar epithet and asking again is not fuzzy matching: the
 * cultivar IS that species, taxonomically, and answering "unknown" for a golden
 * pothos because somebody typed 'Neon' after it would be a worse answer, not a
 * safer one.
 */
let viaCultivar = 0
for (const r of rows) {
  const a = tox.get(r.id)
  if (a.verdict !== 'unknown') continue
  const base = r.botanical.replace(/\s*['"].*$/, '').replace(/\s+var\.\s+.*$/, '').trim()
  if (base === r.botanical) continue
  const b = toxicityFor(base)
  if (b.verdict === 'unknown') continue
  counts.unknown--
  counts[b.verdict]++
  tox.set(r.id, { ...b, cultivarOf: base })
  viaCultivar++
}

// ---- join: companion planting ------------------------------------------------
const companionSrc = readFileSync(COMPANION, 'utf8')
const companionNames = new Set([...companionSrc.matchAll(/name:\s*'([^']+)'/g)].map((m) => m[1]))
const companionOf = new Map()

for (const [id, name] of Object.entries(COMPANION_ALIAS)) {
  if (!seenId.has(id)) fail.push(`COMPANION_ALIAS: no species with id "${id}"`)
  if (!companionNames.has(name)) fail.push(`COMPANION_ALIAS: "${name}" is not in COMPANION_PLANTS`)
  companionOf.set(id, name)
}
for (const r of rows) {
  if (companionOf.has(r.id)) continue
  if (companionNames.has(r.common)) companionOf.set(r.id, r.common)
}

/* Every entry in the companion table should reach a species, or the companion
   screen has a plant the encyclopedia cannot open. */
const reached = new Set(companionOf.values())
for (const n of companionNames) {
  if (!reached.has(n)) fail.push(`COMPANION_PLANTS has "${n}" with no species row — add one, or add an alias`)
}

if (fail.length) {
  console.error(`\n  species build — ${fail.length} problem(s):\n` + fail.map((f) => '    ' + f).join('\n') + '\n')
  process.exit(1)
}

// ---- emit --------------------------------------------------------------------
const lit = (s) => JSON.stringify(s)
const union = (vals) => vals.map((v) => `'${v}'`).join(' | ')

const body = `/*
 * GENERATED — do not edit.
 *
 * Written by scripts/build-species.mjs from src/app/data/sources/species.tsv.
 * Edit the .tsv and re-run \`npm run build:species\`.
 *
 * The \`toxicity\` field on every species is not written by hand anywhere. It is
 * the return value of toxicityFor() against the ASPCA list, resolved at build
 * time, and it carries \`via\` so the app can word an inference as an inference
 * rather than as a fact about this plant. scripts/verify-species.mjs re-runs
 * every lookup and fails if this file disagrees with the list.
 */
import type { ToxicityAnswer } from './toxicity.ts'

export type LightNeed = ${union(LIGHT)}
export type WaterNeed = ${union(WATER)}
export type HumidityNeed = ${union(HUMIDITY)}
export type FeedNeed = ${union(FEED)}
export type SpeciesGroup = ${union(GROUP)}

export interface Species {
  id: string
  common: string
  botanical: string
  group: SpeciesGroup
  light: LightNeed
  /** How the plant wants the soil kept — the scheduler reads this, not baseDays alone. */
  water: WaterNeed
  /** Days between waterings for a mid-size pot indoors in the growing season. A
   *  starting point that calc/schedule.ts moves by pot size, season and place. */
  baseDays: number
  humidity: HumidityNeed
  /** Mature size in plain words, as a person would describe it. */
  size: string
  feed: FeedNeed
  /** Whether misting does anything useful for this plant, rather than whether it survives it. */
  mist: boolean
  /** 0 means it does not want repotting at all — air plants, bromeliads, lucky bamboo. */
  repotYears: number
  notes: string
  /** What ASPCA says, and how the answer was reached. Never assumed. */
  toxicity: ToxicityAnswer & { cultivarOf?: string }
  /** The name this plant goes by in COMPANION_PLANTS, when it is in that table. */
  companion?: string
}

export const SPECIES: Species[] = [
${rows
  .map((r) => {
    const a = tox.get(r.id)
    const c = companionOf.get(r.id)
    return (
      '  { ' +
      `id: ${lit(r.id)}, common: ${lit(r.common)}, botanical: ${lit(r.botanical)}, ` +
      `group: ${lit(r.group)}, light: ${lit(r.light)}, water: ${lit(r.water)}, ` +
      `baseDays: ${Number(r.baseDays)}, humidity: ${lit(r.humidity)}, size: ${lit(r.size)}, ` +
      `feed: ${lit(r.feed)}, mist: ${r.mist === 'y'}, repotYears: ${Number(r.repotYears)}, ` +
      `notes: ${lit(r.notes)}, toxicity: ${JSON.stringify(a)}` +
      (c ? `, companion: ${lit(c)}` : '') +
      ' },'
    )
  })
  .join('\n')}
]

const BY_ID = new Map(SPECIES.map((s) => [s.id, s]))

export function speciesById(id: string): Species | undefined {
  return BY_ID.get(id)
}

/**
 * Substring search over common name, botanical name and group.
 *
 * Deliberately dumb: no fuzzy matching, no scoring. Someone typing "fern" wants
 * every fern, and someone typing "Monstera" wants both monsteras — a ranked
 * matcher that decided which one they meant would be worse at both.
 */
export function searchSpecies(q: string): Species[] {
  const needle = q.trim().toLowerCase()
  if (!needle) return SPECIES
  return SPECIES.filter(
    (s) =>
      s.common.toLowerCase().includes(needle) ||
      s.botanical.toLowerCase().includes(needle) ||
      s.group.includes(needle)
  )
}
`

writeFileSync(OUT, body)

// ---- prove the file works before claiming it was written ---------------------
{
  const m = await import(OUT + '?t=' + Date.now())
  const bad = []
  if (m.SPECIES.length !== rows.length) bad.push(`emitted ${m.SPECIES.length} species, parsed ${rows.length}`)
  if (!m.speciesById('monstera')) bad.push('speciesById("monstera") found nothing')
  if (m.searchSpecies('fern').length < 5) bad.push('searchSpecies("fern") found fewer than five ferns')
  if (m.searchSpecies('').length !== m.SPECIES.length) bad.push('an empty search should return everything')
  for (const s of m.SPECIES) {
    if (typeof s.mist !== 'boolean') bad.push(`${s.id}: mist did not survive as a boolean`)
    if (!s.toxicity || !s.toxicity.verdict) bad.push(`${s.id}: no toxicity answer`)
  }
  if (bad.length) {
    console.error('\n  The generated module does not behave:\n' + bad.map((b) => '    ' + b).join('\n') + '\n')
    process.exit(1)
  }
}

const groups = {}
for (const r of rows) groups[r.group] = (groups[r.group] ?? 0) + 1

console.log(
  `\n  species.ts — ${rows.length} species\n` +
    `    groups     ${Object.entries(groups).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(', ')}\n` +
    `    toxicity   ${counts.toxic} toxic, ${counts['non-toxic']} non-toxic, ${counts.unknown} not on the list` +
    (viaCultivar ? ` (${viaCultivar} resolved through the parent species)` : '') +
    `\n    companion  ${companionOf.size} linked to the companion-planting table\n`
)
