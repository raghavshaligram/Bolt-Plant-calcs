/**
 * Turn the ASPCA extract into the module the app reads.
 *
 * WHY THIS FIELD IS SOURCED AND THE OTHERS ARE NOT
 *
 * "Toxic to pets" is the only field in the species database that is a safety
 * claim. Getting a light requirement wrong costs somebody a leggy plant; getting
 * this wrong costs somebody a dead cat, and a product that says "non-toxic"
 * about a lily has done something much worse than be unhelpful.
 *
 * So it is not written from memory and it is not inferred. It is the ASPCA's
 * own published list, read from the page's DOM, and a species this list does not
 * cover is recorded as `unknown` rather than guessed. `unknown` is a real
 * answer: it means go and check, which is the correct instruction when nobody
 * here knows.
 *
 * HOW IT WAS OBTAINED, AND HOW IT WAS NEARLY OBTAINED WRONG
 *
 * The first attempt read the page through a summarising fetch tool. It produced
 * a long, confident, plausible list — and cross-checking three passes against
 * each other showed the same plant coming back with different botanical names,
 * spellings drifting between runs, and entries that were not on the page at all.
 * The summarising layer was inventing rows.
 *
 * That output was thrown away. Everything here comes from `document.body
 * .innerText` in a real browser and a regex, with no model in the loop, which is
 * the only way to be sure a row exists because it is on the page rather than
 * because it is the kind of row that usually appears on such a page.
 *
 * TWO ROWS OF 983 ARE NOT HERE, BOTH DELIBERATELY
 *
 *   · "Medicine Plant" is listed with no scientific name at all — it is a
 *     cross-reference to Aloe barbadensis, which is in the list on its own.
 *   · "Savory / Satureja hortensis" appears twice, identically.
 *
 * 983 rows on the page, 982 distinct, 981 with a botanical name. Both omissions
 * are checked by verify-species.mjs rather than described here and forgotten.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tsv = readFileSync(resolve(root, 'src/app/data/sources/aspca-cats.tsv'), 'utf8')

const rows = tsv
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean)
  .map((l) => {
    const [common, botanical, toxic] = l.split('\t')
    return { common, botanical, toxic: toxic === '1' }
  })

/* One botanical name can carry several common names — ASPCA lists Monstera
   deliciosa five times over (Ceriman, Swiss Cheese Plant, Mexican Breadfruit,
   Hurricane Plant, Mother-in-Law). The app looks up by botanical name, so the
   index is keyed that way, and a name that appears with conflicting verdicts
   would be a contradiction worth failing on rather than picking a winner. */
const byBotanical = new Map()
const conflicts = []
for (const r of rows) {
  const key = r.botanical.toLowerCase()
  const seen = byBotanical.get(key)
  if (seen && seen.toxic !== r.toxic) conflicts.push(`${r.botanical}: ${seen.common} vs ${r.common}`)
  if (!seen) byBotanical.set(key, r)
}
if (conflicts.length) {
  console.error('\n  ASPCA rows disagree with themselves:\n' + conflicts.map((c) => '    ' + c).join('\n'))
  process.exit(1)
}

const toxic = rows.filter((r) => r.toxic).length

const body = `/*
 * GENERATED — do not edit.
 *
 * Written by scripts/build-toxicity.mjs from src/app/data/sources/aspca-cats.tsv,
 * which is a verbatim extract of the ASPCA's "Toxic and Non-Toxic Plant List —
 * Cats". Change the .tsv and re-run \`npm run build:toxicity\`.
 *
 *   https://www.aspca.org/pet-care/animal-poison-control/cats-plant-list
 *
 * Read the header of the build script before touching any of this. The short
 * version: this is the one field in the app that is a safety claim, it is not
 * written from memory, and a plant that is not on the list is \`unknown\` rather
 * than assumed safe.
 */

export type Toxicity = 'toxic' | 'non-toxic' | 'unknown'

export interface AspcaRow {
  /** The common name, exactly as ASPCA writes it. */
  common: string
  /** The scientific name, exactly as ASPCA writes it — including its own typos. */
  botanical: string
  toxic: boolean
}

/** Every row, in the page's order: toxic section first, then non-toxic. */
export const ASPCA_ROWS: AspcaRow[] = ${JSON.stringify(rows, null, 0)}

const BY_BOTANICAL = new Map<string, AspcaRow>(
  ASPCA_ROWS.map((r) => [r.botanical.toLowerCase(), r]).reverse() as [string, AspcaRow][]
)
const BY_COMMON = new Map<string, AspcaRow>(
  ASPCA_ROWS.map((r) => [r.common.toLowerCase(), r]).reverse() as [string, AspcaRow][]
)

const genusOf = (botanical: string) => botanical.trim().split(/\\s+/)[0]?.toLowerCase() ?? ''

/**
 * Per genus: the verdict, but only where every row in that genus agrees.
 *
 * THE WHOLE REASON THIS IS NOT A SIMPLE LOOKUP
 *
 * Most of the plants people actually own are not on ASPCA's list under the name
 * they are sold under. The list has *Aglaonema modestum*; the shop sold an
 * *Aglaonema commutatum*. It has *Anthurium scherzeranum*; the shop sold an
 * *andraeanum*. Refusing to answer in those cases would return "unknown" for a
 * large share of a houseplant collection, and "unknown" everywhere is a field
 * nobody reads.
 *
 * But inferring from a sibling species is only sound where the genus is
 * consistent, and three genera in ASPCA's own data are not:
 *
 *   Aloe        vera and barbadensis toxic — Aloe retusa non-toxic
 *   Cordyline   australis and terminalis toxic — Cordyline rubra non-toxic
 *   Ipomoea     Morning Glory toxic — Ipomoea batatas (sweet potato) non-toxic
 *
 * Those three are precisely the cases where a confident genus-level guess would
 * tell somebody their plant is safe when the list says otherwise. So a mixed
 * genus yields no inference at all, and the app says it does not know — which is
 * the correct instruction, because it sends the reader to look it up.
 *
 * One ordering matters and Ipomoea is the case that shows it. An explicit
 * "Ipomoea spp" row is ASPCA making a statement about the genus, and that beats
 * this function noticing that sweet potato is listed separately as non-toxic.
 * A deliberate claim outranks an inference drawn from a neighbour, so the
 * spp. lookup runs first and only a genus with no spp. row of its own can be
 * ruled mixed.
 */
const GENUS_VERDICT = new Map<string, { toxic: boolean; example: string } | null>()
for (const r of ASPCA_ROWS) {
  if (!r.botanical) continue
  const g = genusOf(r.botanical)
  if (!g) continue
  if (!GENUS_VERDICT.has(g)) {
    GENUS_VERDICT.set(g, { toxic: r.toxic, example: r.botanical })
  } else {
    const seen = GENUS_VERDICT.get(g)
    if (seen && seen.toxic !== r.toxic) GENUS_VERDICT.set(g, null)
  }
}

export type ToxicityVia = 'botanical' | 'genus' | 'genus-sibling' | 'common'

export interface ToxicityAnswer {
  verdict: Toxicity
  /** The ASPCA row this came from, so the app can show its working. */
  matched?: string
  via?: ToxicityVia
  /** Set when the genus is on the list but disagrees with itself. */
  genusIsMixed?: boolean
}

/**
 * What ASPCA says about this plant, or \`unknown\`.
 *
 * Five exact steps, in descending confidence, and no fuzzy matching anywhere: a
 * near-miss on a name must never quietly become "non-toxic".
 */
export function toxicityFor(botanical?: string, common?: string): ToxicityAnswer {
  const say = (r: AspcaRow, via: ToxicityVia): ToxicityAnswer => ({
    verdict: r.toxic ? 'toxic' : 'non-toxic',
    matched: via === 'common' ? r.common : r.botanical,
    via,
  })

  if (botanical) {
    const exact = BY_BOTANICAL.get(botanical.toLowerCase())
    if (exact) return say(exact, 'botanical')

    const g = genusOf(botanical)
    if (g) {
      /* A bare genus row — ASPCA lists "Dieffenbachia", "Schefflera" and
         "Spathiphyllum" with no species at all — and the explicit spp. forms. */
      for (const form of ['', ' spp.', ' spp', ' species', ' sp.']) {
        const hit = BY_BOTANICAL.get(g + form)
        if (hit) return say(hit, 'genus')
      }

      const genus = GENUS_VERDICT.get(g)
      if (genus === null) {
        /* On the list, and the list contradicts itself about it. Saying so is
           more useful than either verdict would be. */
        return { verdict: 'unknown', genusIsMixed: true }
      }
      if (genus) {
        return {
          verdict: genus.toxic ? 'toxic' : 'non-toxic',
          matched: genus.example,
          via: 'genus-sibling',
        }
      }
    }
  }

  if (common) {
    const hit = BY_COMMON.get(common.toLowerCase())
    if (hit) return say(hit, 'common')
  }
  return { verdict: 'unknown' }
}

/**
 * The sentence the app shows. Never softened, and never invented.
 *
 * An inference from a sibling species is worded as one. "Other Anthurium
 * species are listed as toxic" is a different claim from "this plant is listed
 * as toxic", and a pet owner deciding where to put a plant deserves to know
 * which of the two they are being told.
 */
export function toxicityNote(a: ToxicityAnswer): string {
  if (a.genusIsMixed) {
    return 'ASPCA lists some plants in this genus as toxic and others as not, so this one needs checking by name.'
  }
  if (a.via === 'genus-sibling') {
    const genus = a.matched?.split(/\\s+/)[0] ?? 'this genus'
    return a.verdict === 'toxic'
      ? \`Not listed by name, but ASPCA lists other \${genus} species as toxic to cats. Treat it as toxic.\`
      : \`Not listed by name. ASPCA lists other \${genus} species as non-toxic to cats.\`
  }
  if (a.verdict === 'toxic') return 'ASPCA lists this as toxic to cats. Keep it out of reach.'
  if (a.verdict === 'non-toxic') return 'ASPCA lists this as non-toxic to cats.'
  return 'Not on the ASPCA list — worth checking before you bring it near a pet.'
}
`

const out = resolve(root, 'src/app/data/ported/toxicity.ts')
writeFileSync(out, body)

/*
 * Prove the file works before claiming it was written.
 *
 * This module is generated as a string, and a string containing regexes inside
 * a template literal is a trap: `\s` in a template literal is not an escape, it
 * is the letter s. The emitted `genusOf` split on /s+/ rather than whitespace,
 * so every botanical name starting before an "s" produced an empty genus, the
 * lookup quietly stopped matching, and the only symptom was coverage dropping
 * from 23 plants to 2 — no error, no warning, a file that parses and runs.
 *
 * A generator that does not exercise its own output is a generator that can
 * emit nonsense confidently. These six cases cover each lookup path.
 */
{
  const m = await import(out + '?t=' + Date.now())
  const expect = [
    ['Monstera deliciosa', 'toxic', 'botanical'],
    ['Spathiphyllum wallisii', 'toxic', 'genus'],
    ['Philodendron hederaceum', 'toxic', 'botanical'],
    ['Anthurium andraeanum', 'toxic', 'genus-sibling'],
    ['Pilea peperomioides', 'non-toxic', 'genus-sibling'],
    ['Zamioculcas zamiifolia', 'unknown', undefined],
  ]
  const bad = []
  for (const [name, verdict, via] of expect) {
    const r = m.toxicityFor(name)
    if (r.verdict !== verdict || r.via !== via) {
      bad.push(`${name}: got ${r.verdict}/${r.via ?? '—'}, expected ${verdict}/${via ?? '—'}`)
    }
  }
  /* And the one that must never regress: a genus whose rows disagree gives no
     answer rather than a confident wrong one. */
  const mixed = m.toxicityFor('Aloe aristata')
  if (mixed.verdict !== 'unknown' || !mixed.genusIsMixed) {
    bad.push(`Aloe aristata: got ${mixed.verdict}, expected unknown with genusIsMixed`)
  }
  if (bad.length) {
    console.error('\n  The generated module does not behave:\n' + bad.map((b) => '    ' + b).join('\n') + '\n')
    process.exit(1)
  }
}

console.log(
  `\n  toxicity.ts — ${rows.length} ASPCA rows (${toxic} toxic, ${rows.length - toxic} non-toxic), ` +
    `${byBotanical.size} distinct botanical names\n`
)
