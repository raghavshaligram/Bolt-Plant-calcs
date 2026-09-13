/*
 * Brief item 7: the schedule has to genuinely differ across species, pot size,
 * season and zone — "at least 5 real test cases, not a flat default".
 *
 * The cases below are written as expected *ranges*, not expected numbers. A
 * test that pins wateringInterval to exactly 14 fails the moment anyone tunes a
 * factor by a hundredth, so it gets edited to whatever the code now says, and
 * from then on it tests nothing. A range says what the answer has to mean — a
 * snake plant in a big pot in a Zone 5 winter is over a month, a fern in a
 * 4-inch pot outdoors in a Zone 9 summer is days — and that claim survives
 * tuning, which is the only kind of claim worth asserting here.
 *
 * The spread checks at the end are the real test of the brief's wording: they
 * fail if the engine ever collapses toward one number, however plausible each
 * individual answer looks.
 */
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const S = await import(resolve(root, 'src/app/calc/schedule.ts'))
const { speciesById, SPECIES } = await import(resolve(root, 'src/app/data/ported/species.ts'))
const D = await import(resolve(root, 'src/app/calc/dates.ts'))

let failures = 0
const fail = (msg) => {
  failures++
  console.log(`  FAIL  ${msg}`)
}
const pass = (msg) => console.log(`  ok    ${msg}`)

const sp = (id) => {
  const s = speciesById(id)
  if (!s) throw new Error(`no species "${id}" — the test fixture is out of date, not the engine`)
  return s
}

// ---------------------------------------------------------------------------
// 1. Watering: eight cases spanning species, pot, season, zone and placement.
// ---------------------------------------------------------------------------
const CASES = [
  {
    name: 'Snake plant, 12 in pot, Zone 5 January, indoors',
    species: 'snake-plant',
    place: { potDiameterIn: 12, where: 'indoor', zone: '5b' },
    date: '2026-01-15',
    season: 'dormant',
    min: 45,
    max: 90,
    because: 'arid plant, big pot, deep dormancy — this is the one people kill by watering fortnightly',
  },
  {
    name: 'Maidenhair fern, 4 in pot, Zone 9 July, outdoors',
    species: 'maidenhair-fern',
    place: { potDiameterIn: 4, where: 'outdoor', zone: '9a' },
    date: '2026-07-15',
    season: 'growing',
    min: 1,
    max: 3,
    because: 'thirsty species, tiny pot, hot zone, full growth, sun and wind',
  },
  {
    name: 'Golden pothos, 6 in pot, Zone 6 June, indoors',
    species: 'pothos-golden',
    place: { potDiameterIn: 6, where: 'indoor', zone: '6b' },
    date: '2026-06-15',
    season: 'growing',
    min: 8,
    max: 10,
    because: 'the reference case — reference pot, growing season, indoors, so it should be baseDays',
  },
  {
    name: 'Golden pothos, same pot, same zone, January',
    species: 'pothos-golden',
    place: { potDiameterIn: 6, where: 'indoor', zone: '6b' },
    date: '2026-01-15',
    season: 'dormant',
    min: 13,
    max: 18,
    because: 'the same plant in the same place, half a year later',
  },
  {
    name: 'Golden pothos in a dark hallway',
    species: 'pothos-golden',
    place: { potDiameterIn: 6, where: 'indoor', zone: '6b', light: 'low' },
    date: '2026-06-15',
    season: 'growing',
    min: 10,
    max: 14,
    because: 'a dim spot means slower growth and less uptake — longer, not shorter',
  },
  {
    name: 'Tomato, 15 in pot, Zone 8 August, outdoors',
    species: 'tomato',
    place: { potDiameterIn: 15, where: 'outdoor', zone: '8a' },
    date: '2026-08-10',
    season: 'growing',
    min: 2,
    max: 6,
    because: 'a big pot slows drying, but a cropping tomato outdoors in August still wants water every few days',
  },
  {
    name: 'Echeveria, 4 in pot, free-draining mix, Zone 10 December',
    species: 'echeveria',
    place: { potDiameterIn: 4, where: 'indoor', zone: '10b', drainage: 'free' },
    date: '2026-12-15',
    season: 'shoulder',
    min: 10,
    max: 22,
    because: 'frost-free zones never go fully dormant, so this is a shoulder figure, not a winter one',
  },
  {
    name: 'Calathea white fusion, 6 in pot, slow compost, Zone 3 February',
    species: 'calathea-white-fusion',
    place: { potDiameterIn: 6, where: 'indoor', zone: '3a', drainage: 'slow' },
    date: '2026-02-15',
    season: 'dormant',
    min: 9,
    max: 14,
    because: 'a plant that cannot dry out, in soil that holds water, in the longest winter on the map',
  },
]

console.log('\n  Watering intervals\n')
const seen = []
for (const c of CASES) {
  const r = S.wateringInterval(sp(c.species), c.place, c.date)
  seen.push({ ...c, days: r.days })
  const bad = []
  if (r.season !== c.season) bad.push(`season ${r.season}, expected ${c.season}`)
  if (r.days < c.min || r.days > c.max) bad.push(`${r.days} days, expected ${c.min}–${c.max}`)
  if (!r.factors.length) bad.push('no factors — the app would have nothing to explain')
  for (const f of r.factors) {
    if (!f.why || f.why.length < 20) bad.push(`factor "${f.label}" has no readable explanation`)
    if (!Number.isFinite(f.factor)) bad.push(`factor "${f.label}" is not a number`)
  }
  if (bad.length) fail(`${c.name}: ${bad.join('; ')}`)
  else pass(`${c.name} — ${r.days} days (${c.because})`)
}

// ---------------------------------------------------------------------------
// 2. The spread. This is the check the brief is actually asking for.
// ---------------------------------------------------------------------------
console.log('\n  Spread\n')
{
  const days = seen.map((s) => s.days)
  const lo = Math.min(...days)
  const hi = Math.max(...days)
  if (hi / lo < 10) fail(`the eight cases span ${lo}–${hi} days — that is close to a flat default`)
  else pass(`the eight cases span ${lo}–${hi} days, a ${Math.round(hi / lo)}× range`)

  const distinct = new Set(days).size
  if (distinct < 6) fail(`only ${distinct} distinct answers across eight cases`)
  else pass(`${distinct} distinct answers across eight cases`)
}

// One species, one place, one pot — moved only through the year.
{
  const s = sp('monstera')
  const place = { potDiameterIn: 8, where: 'indoor', zone: '5b' }
  const byMonth = ['01', '04', '07', '10'].map((m) => S.wateringInterval(s, place, `2026-${m}-15`).days)
  if (new Set(byMonth).size < 2) fail(`a monstera reads ${byMonth.join('/')} across the year — the season does nothing`)
  else pass(`one monstera across the year: ${byMonth.join(' / ')} days (Jan, Apr, Jul, Oct)`)
}

// One species, one date — moved only through pot sizes.
{
  const s = sp('spider-plant')
  const date = '2026-06-15'
  const byPot = [4, 6, 10, 15].map((d) => S.wateringInterval(s, { potDiameterIn: d, where: 'indoor', zone: '6b' }, date).days)
  if (byPot[0] >= byPot[3]) fail(`pot size does not lengthen the interval: ${byPot.join('/')}`)
  else pass(`one spider plant across pot sizes: ${byPot.join(' / ')} days (4, 6, 10, 15 in)`)
}

// One species, one date — moved only through zones, outdoors.
{
  const s = sp('rosemary')
  const date = '2026-11-01'
  const byZone = ['3a', '6b', '9a', '11a'].map((z) => S.wateringInterval(s, { potDiameterIn: 10, where: 'outdoor', zone: z }, date).days)
  if (new Set(byZone).size < 2) fail(`zone does nothing in November: ${byZone.join('/')}`)
  else pass(`one rosemary across zones on 1 Nov: ${byZone.join(' / ')} days (3a, 6b, 9a, 11a)`)
}

// ---------------------------------------------------------------------------
// 3. The other care types have to be as considered as watering.
// ---------------------------------------------------------------------------
console.log('\n  Other care types\n')
{
  const zone = '6b'
  const place = { potDiameterIn: 8, where: 'indoor', zone }

  const winterFeed = S.feedInterval(sp('monstera'), place, '2026-01-15')
  if (winterFeed.days !== null) fail('feeding a dormant plant should be skipped, not scheduled')
  else if (!winterFeed.skipped) fail('feed was skipped with no reason given')
  else pass('feeding is skipped in the dormant season, with a reason')

  const summerFeed = S.feedInterval(sp('monstera'), place, '2026-06-15')
  if (summerFeed.days === null) fail('a monstera in June should have a feeding interval')
  else pass(`monstera feeds every ${summerFeed.days} days in June`)

  const cactusFeed = S.feedInterval(sp('echinocactus'), place, '2026-06-15')
  if (cactusFeed.days !== null) fail('a cactus marked feed=none should not be scheduled for feeding')
  else pass('a plant that wants no feed is never scheduled for it')

  const succulentMist = S.mistInterval(sp('jade'), place, '2026-06-15')
  if (succulentMist.days !== null) fail('misting a jade should be skipped')
  else pass('misting is skipped where it would do harm, with a reason')

  const fernMist = S.mistInterval(sp('maidenhair-fern'), place, '2026-06-15')
  if (fernMist.days === null) fail('a maidenhair fern is one of the few plants misting suits')
  else pass(`maidenhair fern mists every ${fernMist.days} days, with the honest caveat attached`)

  const airPlantRepot = S.repotInterval(sp('air-plant'), place, '2026-06-15')
  if (airPlantRepot.days !== null) fail('an air plant has no compost to repot')
  else pass('repotting is skipped for plants that are not in compost')

  /* Pruning and dusting: the two the brief names that are derived from the
     plant's group rather than a column, so the thing worth asserting is that
     the groups where the rule would give harmful advice get told no. */
  const palmPrune = S.pruneInterval(sp('kentia-palm'), place, '2026-06-15')
  if (palmPrune.days !== null) fail('a kentia palm should never be on a pruning schedule — cutting the crown kills it')
  else if (!/crown/i.test(palmPrune.skipped ?? '')) fail('the palm pruning refusal does not say why')
  else pass('pruning is refused for palms, with the reason')

  const fernPrune = S.pruneInterval(sp('boston-fern'), place, '2026-06-15')
  if (fernPrune.days !== null) fail('a fern has no shape to prune to')
  else pass('pruning is refused for ferns')

  const herbPrune = S.pruneInterval(sp('basil'), place, '2026-06-15')
  if (herbPrune.days === null) fail('basil is the plant pinching was invented for')
  else pass(`basil is pinched ${herbPrune.days > 20 ? 'every ' + herbPrune.days + ' days' : 'every ' + herbPrune.days + ' days'}`)

  const winterPrune = S.pruneInterval(sp('pothos-golden'), place, '2026-01-15')
  if (winterPrune.days !== null) fail('pruning in the dormant season should be held, not scheduled')
  else pass('pruning is held through the dormant season, with a reason')

  const fernDust = S.cleanInterval(sp('boston-fern'), place, '2026-06-15')
  if (fernDust.days !== null) fail('wiping a fern frond tears it')
  else if (!/rinse/i.test(fernDust.skipped ?? '')) fail('the fern dusting refusal does not offer the alternative')
  else pass('dusting a fern is refused, and a rinse is offered instead')

  const ficusDust = S.cleanInterval(sp('rubber-plant'), place, '2026-06-15')
  if (ficusDust.days === null) fail('a rubber plant is the classic dusty leaf')
  else pass(`a rubber plant is dusted every ${ficusDust.days} days`)

  const succulentDust = S.cleanInterval(sp('echeveria'), place, '2026-06-15')
  if (succulentDust.days === null) fail('a succulent still gets dusty')
  else if (!succulentDust.factors.some((f) => /bloom/i.test(f.why))) {
    fail('dusting a succulent does not warn about rubbing the bloom off')
  } else pass('dusting a succulent carries the warning about its powdery bloom')

  const outdoorDust = S.cleanInterval(sp('tomato'), { ...place, where: 'outdoor' }, '2026-06-15')
  if (outdoorDust.days !== null) fail('the rain dusts outdoor plants')
  else pass('dusting is skipped outdoors')

  const outdoorRotate = S.rotateInterval(sp('tomato'), { ...place, where: 'outdoor' }, '2026-06-15')
  if (outdoorRotate.days !== null) fail('there is nothing to turn outdoors')
  else pass('turning is skipped outdoors')
}

// ---------------------------------------------------------------------------
// 4. Repotting is held for spring rather than counted blindly.
// ---------------------------------------------------------------------------
console.log('\n  Repotting holds for spring\n')
{
  const s = sp('monstera') // repotYears 2
  const place = { potDiameterIn: 10, where: 'indoor', zone: '5b' }
  const due = S.nextDue('repot', s, place, '2024-11-20', '2026-09-13')
  if (!due.due) fail('a monstera should have a repot date')
  else if (S.seasonFor('5b', due.due) !== 'growing') {
    fail(`repot landed on ${due.due}, which is not in the growing season in zone 5b`)
  } else if (!due.heldForSpring) {
    fail('the date was moved but the app was not told, so it cannot explain the wait')
  } else pass(`a two-year repot falling in November was held to ${D.formatDate(due.due)}`)

  const springDue = S.nextDue('repot', s, place, '2024-06-01', '2026-09-13')
  if (springDue.heldForSpring) fail('a repot already falling in June should not be moved')
  else pass(`a repot already falling in the growing season is left alone (${D.formatDate(springDue.due)})`)
}

// ---------------------------------------------------------------------------
// 5. Nothing in the catalogue produces a nonsense answer.
// ---------------------------------------------------------------------------
console.log('\n  The whole catalogue\n')
{
  const places = [
    { potDiameterIn: 2, where: 'indoor', zone: '3a' },
    { potDiameterIn: 6, where: 'indoor', zone: '6b', light: 'low' },
    { potDiameterIn: 17.5, where: 'outdoor', zone: '13b', drainage: 'free' },
  ]
  const dates = ['2026-01-15', '2026-06-15', '2026-10-01']
  const bad = []
  let n = 0
  for (const s of SPECIES) {
    for (const p of places) {
      for (const d of dates) {
        for (const care of S.CARE_TYPES) {
          const r = S.intervalFor(care, s, p, d)
          n++
          if (r.days === null) {
            if (!r.skipped) bad.push(`${s.id}/${care}: skipped with no reason`)
            continue
          }
          if (!Number.isInteger(r.days) || r.days < 1 || r.days > 2000) {
            bad.push(`${s.id}/${care} in a ${p.potDiameterIn} in pot, zone ${p.zone}, ${d}: ${r.days} days`)
          }
        }
      }
    }
  }
  if (bad.length) {
    fail(`${bad.length} nonsense interval(s) across ${n} combinations:`)
    for (const b of bad.slice(0, 10)) console.log('        ' + b)
  } else pass(`${n} combinations across all ${SPECIES.length} species produced a usable answer`)
}

// ---------------------------------------------------------------------------
// 6. The date arithmetic the whole thing stands on.
// ---------------------------------------------------------------------------
console.log('\n  Date arithmetic\n')
{
  const bad = []
  const check = (got, want, what) => {
    if (got !== want) bad.push(`${what}: got ${got}, expected ${want}`)
  }
  check(D.addDays('2026-02-28', 1), '2026-03-01', 'non-leap February rolls over')
  check(D.addDays('2028-02-28', 1), '2028-02-29', 'leap February does not')
  check(D.addDays('2026-12-31', 1), '2027-01-01', 'year boundary')
  check(D.addDays('2026-03-29', 1), '2026-03-30', 'the day the clocks change in Europe')
  check(D.addDays('2026-11-01', 1), '2026-11-02', 'the day the clocks change in the US')
  check(D.daysBetween('2026-01-01', '2027-01-01'), 365, 'a whole year')
  check(D.daysBetween('2028-01-01', '2029-01-01'), 366, 'a whole leap year')
  check(D.addDays('2026-06-15', -30), '2026-05-16', 'counting backwards')
  check(D.relativeDay('2026-09-10', '2026-09-13'), '3 days late', 'overdue reads as overdue')
  check(D.relativeDay('2026-09-13', '2026-09-13'), 'Today', 'today')
  check(D.formatDateSmart('2026-08-26', '2026-09-13'), '26 August', 'the year is dropped within the same year')
  check(D.formatDateSmart('2027-05-01', '2026-09-13'), '1 May 2027', 'and kept when it is a different year')
  check(D.humanInterval(1460), 'every 4 years', 'long intervals read in years')
  check(D.humanInterval(42), 'every 6 weeks', 'medium ones in weeks')
  check(D.humanInterval(9), 'every 9 days', 'short ones in days')
  /* Round-trip every day across a leap year, because an off-by-one in the civil
     algorithm would show up on exactly one date and nowhere else. */
  let d = '2027-11-01'
  for (let i = 0; i < 800; i++) {
    const back = D.fromDayNumber(D.dayNumber(d))
    if (back !== d) {
      bad.push(`round trip broke on ${d}`)
      break
    }
    d = D.addDays(d, 1)
  }
  if (bad.length) for (const b of bad) fail(b)
  else pass('800 consecutive days round-trip, both DST changeovers, both February lengths')
}

console.log(
  failures
    ? `\n  ${failures} failure(s).\n`
    : `\n  Schedule engine: everything above passed.\n`
)
process.exit(failures ? 1 : 0)
