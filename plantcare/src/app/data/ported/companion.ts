/*
 * GENERATED — do not edit.
 *
 * Written by scripts/port-data.mjs from the HarvestMath site source:
 *   src/components/blog/CompanionPlantingTable.tsx
 *
 * Edit it there and re-run `npm run port`. scripts/verify-data.mjs reads both
 * sides and fails if they have drifted, so a hand edit here does not survive
 * the next verification pass.
 */

export type CompanionType = 'vegetable' | 'herb'

export interface CompanionPlant {
  name: string
  type: CompanionType
  good: string[]
  avoid: string[]
}

export const COMPANION_PLANTS: CompanionPlant[] = [
  { name: 'Tomatoes', type: 'vegetable', good: ['Basil', 'Onions', 'Chives', 'Lettuce'], avoid: ['Kale', 'Dill'] },
  { name: 'Peppers', type: 'vegetable', good: ['Basil', 'Onions'], avoid: [] },
  { name: 'Cucumbers', type: 'vegetable', good: ['Beans', 'Dill'], avoid: [] },
  { name: 'Onions', type: 'vegetable', good: ['Tomatoes', 'Peppers', 'Kale', 'Lettuce'], avoid: ['Beans'] },
  { name: 'Kale', type: 'vegetable', good: ['Onions', 'Dill', 'Chives'], avoid: ['Tomatoes'] },
  { name: 'Beans', type: 'vegetable', good: ['Cucumbers'], avoid: ['Onions', 'Chives'] },
  { name: 'Lettuce', type: 'vegetable', good: ['Carrots', 'Radishes', 'Onions', 'Chives', 'Tomatoes'], avoid: [] },
  { name: 'Carrots', type: 'vegetable', good: ['Lettuce'], avoid: [] },
  { name: 'Radishes', type: 'vegetable', good: ['Lettuce'], avoid: [] },
  { name: 'Basil', type: 'herb', good: ['Tomatoes', 'Peppers'], avoid: ['Mint'] },
  { name: 'Mint', type: 'herb', good: [], avoid: ['Basil', 'Dill', 'Chives'] },
  { name: 'Dill', type: 'herb', good: ['Kale', 'Cucumbers'], avoid: ['Tomatoes', 'Mint'] },
  { name: 'Chives', type: 'herb', good: ['Tomatoes', 'Kale', 'Lettuce'], avoid: ['Beans', 'Mint'] },
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
export const COMPANION_RATIONALE = "basil-tomato pest deterrence and flavor pairing, allium (onion/chives) inhibition of bean growth, dill's attraction of predatory insects that benefit cabbage-family crops and cucumbers, dill's tendency to inhibit mature tomato plants, mint's invasiveness making it a poor open-ground neighbor for other herbs regardless of chemistry, lettuce's shallow roots pairing well with deeper-rooted carrots without competing, radishes as a fast-maturing non-competing neighbor (and flea-beetle trap crop) for lettuce, onions'/chives' pest-deterrent benefit for lettuce, and lettuce's preference for the afternoon shade a taller tomato plant provides once it sizes up."

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
