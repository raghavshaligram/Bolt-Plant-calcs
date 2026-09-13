/*
 * The species catalogue, checked against the sources it was built from.
 *
 * build-species.mjs already refuses to emit a bad row, so most of this would
 * pass by construction if the generated file and the .tsv were always in step.
 * The point is that they are not: species.ts is a committed build artefact, and
 * a hand edit to it — or a .tsv change with no rebuild — leaves a file that
 * compiles, runs, and is wrong. This script reads both sides.
 *
 * The toxicity pass is the one that matters. Every verdict in species.ts is
 * re-derived from the ASPCA module and compared, because that field is the only
 * place this app makes a claim somebody might act on with a cat in the house.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { SPECIES, speciesById, searchSpecies } = await import(resolve(root, 'src/app/data/ported/species.ts'))
const { toxicityFor, toxicityNote, ASPCA_ROWS } = await import(resolve(root, 'src/app/data/ported/toxicity.ts'))
const { COMPANION_PLANTS } = await import(resolve(root, 'src/app/data/ported/companion.ts'))

let failures = 0
const fail = (msg) => {
  failures++
  console.log(`  FAIL  ${msg}`)
}
const pass = (msg) => console.log(`  ok    ${msg}`)

// ---------------------------------------------------------------------------
// 1. species.ts still matches species.tsv, row for row.
// ---------------------------------------------------------------------------
console.log('\n  Generated file against its source\n')
{
  const COLUMNS = 'id common botanical group light water baseDays humidity size feed mist repotYears notes'.split(' ')
  const rows = []
  for (const line of readFileSync(resolve(root, 'src/app/data/sources/species.tsv'), 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue
    const cells = line.split('\t')
    if (cells[0] === 'id') continue
    rows.push(Object.fromEntries(COLUMNS.map((c, i) => [c, cells[i]?.trim()])))
  }

  const bad = []
  if (rows.length !== SPECIES.length) {
    bad.push(`the .tsv has ${rows.length} species, species.ts has ${SPECIES.length} — run \`npm run build:species\``)
  }
  for (const r of rows) {
    const s = speciesById(r.id)
    if (!s) {
      bad.push(`${r.id} is in the .tsv and not in species.ts`)
      continue
    }
    for (const c of COLUMNS) {
      const want = c === 'mist' ? r.mist === 'y' : c === 'baseDays' || c === 'repotYears' ? Number(r[c]) : r[c]
      if (s[c] !== want) bad.push(`${r.id}.${c}: file says ${JSON.stringify(s[c])}, .tsv says ${JSON.stringify(want)}`)
    }
  }
  if (bad.length) {
    fail(`${bad.length} difference(s) between the .tsv and the generated file:`)
    for (const b of bad.slice(0, 8)) console.log('        ' + b)
  } else pass(`all ${SPECIES.length} species match the .tsv field for field`)
}

// ---------------------------------------------------------------------------
// 2. Every toxicity verdict re-derives from the ASPCA list.
// ---------------------------------------------------------------------------
console.log('\n  Toxicity, re-derived\n')
{
  const bad = []
  for (const s of SPECIES) {
    const direct = toxicityFor(s.botanical, s.common)
    let expected = direct
    if (direct.verdict === 'unknown' && s.toxicity.cultivarOf) {
      expected = { ...toxicityFor(s.toxicity.cultivarOf), cultivarOf: s.toxicity.cultivarOf }
    }
    if (JSON.stringify(expected) !== JSON.stringify(s.toxicity)) {
      bad.push(`${s.id}: file says ${JSON.stringify(s.toxicity)}, the list says ${JSON.stringify(expected)}`)
    }
    /* A cultivar fallback is only legitimate when the stripped name really is
       the parent species of the name in the file. Anything else is a fuzzy
       match wearing a respectable coat. */
    if (s.toxicity.cultivarOf && !s.botanical.startsWith(s.toxicity.cultivarOf)) {
      bad.push(`${s.id}: claims to inherit from "${s.toxicity.cultivarOf}", which is not its parent name`)
    }
    if (!['toxic', 'non-toxic', 'unknown'].includes(s.toxicity.verdict)) {
      bad.push(`${s.id}: verdict "${s.toxicity.verdict}" is not one of the three`)
    }
    /* An answer with no provenance is an answer nobody can check. */
    if (s.toxicity.verdict !== 'unknown' && !s.toxicity.matched) {
      bad.push(`${s.id}: says ${s.toxicity.verdict} but names no ASPCA row`)
    }
  }
  if (bad.length) {
    fail(`${bad.length} verdict(s) do not re-derive:`)
    for (const b of bad.slice(0, 8)) console.log('        ' + b)
  } else pass(`all ${SPECIES.length} verdicts re-derive from the ${ASPCA_ROWS.length}-row ASPCA list`)
}

// ---------------------------------------------------------------------------
// 3. Every matched row is a real row on the list, quoted exactly.
// ---------------------------------------------------------------------------
{
  const names = new Set()
  for (const r of ASPCA_ROWS) {
    names.add(r.botanical)
    names.add(r.common)
  }
  const bad = SPECIES.filter((s) => s.toxicity.matched && !names.has(s.toxicity.matched))
  if (bad.length) {
    fail(`${bad.length} species cite an ASPCA row that is not on the list:`)
    for (const s of bad.slice(0, 8)) console.log(`        ${s.id} cites "${s.toxicity.matched}"`)
  } else pass('every cited ASPCA row exists on the list, spelled the way ASPCA spells it')
}

// ---------------------------------------------------------------------------
// 4. The sentence shown to a pet owner says which kind of answer it is.
// ---------------------------------------------------------------------------
{
  const bad = []
  for (const s of SPECIES) {
    const note = toxicityNote(s.toxicity)
    if (!note || note.length < 20) bad.push(`${s.id}: no readable note`)
    /* An inference must never read as a fact about this plant. */
    if (s.toxicity.via === 'genus-sibling' && !/other |some /i.test(note)) {
      bad.push(`${s.id}: inferred from a sibling species but worded as a direct finding`)
    }
    if (s.toxicity.verdict === 'unknown' && /non-toxic|safe/i.test(note)) {
      bad.push(`${s.id}: not on the list, but the note reads as reassurance`)
    }
  }
  if (bad.length) {
    fail(`${bad.length} note(s) word the answer wrongly:`)
    for (const b of bad.slice(0, 8)) console.log('        ' + b)
  } else {
    const inferred = SPECIES.filter((s) => s.toxicity.via === 'genus-sibling').length
    const unknown = SPECIES.filter((s) => s.toxicity.verdict === 'unknown').length
    pass(`every note states its own confidence (${inferred} inferred from siblings, ${unknown} not on the list)`)
  }
}

// ---------------------------------------------------------------------------
// 5. The companion-planting table and the catalogue agree.
// ---------------------------------------------------------------------------
console.log('\n  Cross-links\n')
{
  const linked = new Map(SPECIES.filter((s) => s.companion).map((s) => [s.companion, s]))
  const bad = []
  for (const c of COMPANION_PLANTS) {
    if (!linked.has(c.name)) bad.push(`"${c.name}" is in the companion table with no species behind it`)
  }
  for (const [name] of linked) {
    if (!COMPANION_PLANTS.some((c) => c.name === name)) bad.push(`a species links to "${name}", which left the table`)
  }
  /* Every plant named as a good or bad neighbour has to be a plant in the
     table too, or the companion screen offers a dead end. */
  const inTable = new Set(COMPANION_PLANTS.map((c) => c.name))
  for (const c of COMPANION_PLANTS) {
    for (const n of [...c.good, ...c.avoid]) {
      if (!inTable.has(n)) bad.push(`"${c.name}" names "${n}", which is not itself in the table`)
    }
  }
  if (bad.length) {
    fail(`${bad.length} broken cross-link(s):`)
    for (const b of bad.slice(0, 8)) console.log('        ' + b)
  } else pass(`all ${COMPANION_PLANTS.length} companion entries resolve to a species in both directions`)
}

// ---------------------------------------------------------------------------
// 6. Breadth. "A few hundred", and not three hundred pothos cultivars.
// ---------------------------------------------------------------------------
console.log('\n  Breadth\n')
{
  if (SPECIES.length < 250) fail(`${SPECIES.length} species — the brief asked for a few hundred`)
  else pass(`${SPECIES.length} species`)

  const byGroup = {}
  for (const s of SPECIES) byGroup[s.group] = (byGroup[s.group] ?? 0) + 1
  const thin = Object.entries(byGroup).filter(([, n]) => n < 3)
  if (thin.length > 1) fail(`groups with almost nothing in them: ${thin.map(([g, n]) => `${g} (${n})`).join(', ')}`)
  else pass(Object.entries(byGroup).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g} ${n}`).join(', '))

  const genera = new Set(SPECIES.map((s) => s.botanical.split(/\s+/)[0]))
  if (genera.size < 120) fail(`only ${genera.size} genera across ${SPECIES.length} species — too narrow`)
  else pass(`${genera.size} distinct genera`)
}

// ---------------------------------------------------------------------------
// 7. Search does what a person typing into it expects.
// ---------------------------------------------------------------------------
{
  const bad = []
  const expect = (q, wantId) => {
    if (!searchSpecies(q).some((s) => s.id === wantId)) bad.push(`"${q}" did not find ${wantId}`)
  }
  expect('monstera', 'monstera')
  expect('Swiss cheese', 'monstera')
  expect('Epipremnum', 'pothos-golden')
  expect('fern', 'boston-fern')
  expect('TOMATO', 'tomato')
  if (searchSpecies('zzzzz').length) bad.push('a nonsense query returned results')
  if (bad.length) for (const b of bad) fail(b)
  else pass('search finds plants by common name, botanical name, part-name and group, and finds nothing for nonsense')
}

console.log(failures ? `\n  ${failures} failure(s).\n` : `\n  Species catalogue: everything above passed.\n`)
process.exit(failures ? 1 : 0)
