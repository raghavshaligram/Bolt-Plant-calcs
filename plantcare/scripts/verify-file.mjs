/*
 * Brief items 1, 2, 9 and 10: the file, the weather switch, and the demo.
 *
 * Item 2 is "close, reopen, all data intact". The half of that which is a
 * browser question — does the File System Access API hand back the same handle
 * after a restart — cannot be asserted from node, and the browser will not let
 * it be automated either: the picker requires a real gesture by design. What
 * CAN be asserted, and is what actually loses people's data, is everything
 * either side of the handle: does a store survive serialise → parse → serialise
 * unchanged, does an older or hand-edited file open, does a newer one get
 * refused rather than silently downgraded, and do fields this build has never
 * heard of come back out the other side. Those are checked here. The handle
 * behaviour is covered by the recovery states in data/persistence.ts and is
 * listed as a manual step in VERIFICATION.md rather than claimed.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schema = await import(resolve(root, 'src/app/data/schema.ts'))
const weather = await import(resolve(root, 'src/app/data/weather.ts'))
const demo = await import(resolve(root, 'src/app/data/demo.ts'))
const tasks = await import(resolve(root, 'src/app/calc/tasks.ts'))
const S = await import(resolve(root, 'src/app/calc/schedule.ts'))

const VERSION = 'Plant Care 1.0'
const TODAY = '2026-09-13'

let failures = 0
const fail = (m) => {
  failures++
  console.log(`  FAIL  ${m}`)
}
const pass = (m) => console.log(`  ok    ${m}`)
const check = (cond, good, bad) => (cond ? pass(good) : fail(bad ?? good))

// ---------------------------------------------------------------------------
console.log('\n  The file, written and read back\n')

const store = demo.buildDemo(TODAY, VERSION)

{
  const once = schema.serialiseStore(store, VERSION)
  const back = schema.parseStore(once)
  const twice = schema.serialiseStore(back, VERSION)
  check(once === twice, 'a store survives write → read → write byte for byte', 'the file changes shape on a round trip')

  check(
    back.plants.length === store.plants.length && back.log.length === store.log.length,
    `${back.plants.length} plants and ${back.log.length} journal entries came back`,
    'plants or journal entries were lost on the round trip'
  )

  /* The thing that matters for a file somebody keeps for years: every field of
     every plant, not just the count. */
  const diffs = []
  for (const p of store.plants) {
    const q = back.plants.find((x) => x.id === p.id)
    if (!q) {
      diffs.push(`${p.name} vanished`)
      continue
    }
    if (JSON.stringify(p) !== JSON.stringify(q)) diffs.push(`${p.name} came back different`)
  }
  check(diffs.length === 0, 'every plant came back field for field', `changed on the round trip: ${diffs.join('; ')}`)
}

{
  /* A field from a version of the app that does not exist yet. Losing this is
     how a local-file product destroys somebody's data while reporting success. */
  const withExtra = JSON.parse(schema.serialiseStore(store, VERSION))
  withExtra.plants[0].sunHoursPerDay = 4.5
  withExtra.plants[0].futureThing = { nested: ['value'] }
  withExtra.log[0].mood = 'hopeful'
  const back = schema.parseStore(JSON.stringify(withExtra))
  const out = JSON.parse(schema.serialiseStore(back, VERSION))
  check(
    out.plants[0].sunHoursPerDay === 4.5 &&
      JSON.stringify(out.plants[0].futureThing) === JSON.stringify({ nested: ['value'] }) &&
      out.log[0].mood === 'hopeful',
    'fields this build has never heard of survive being opened and saved',
    'unknown fields were dropped — a newer version would lose data on every save here'
  )
}

{
  /* Hand-edited and partial files. The format is plain JSON in somebody's
     Documents folder, so somebody will open it in a text editor. */
  const minimal = schema.parseStore(JSON.stringify({ schemaVersion: 1, plants: [{ id: 'x', speciesId: 'monstera', name: 'A' }] }))
  check(Array.isArray(minimal.log), 'a file with no journal array opens with an empty one', 'a missing log array was not filled in')
  check(
    minimal.plants[0].placement?.potDiameterIn === 6 && minimal.plants[0].placement.where === 'indoor',
    'a plant with no placement gets a sane one rather than crashing a screen',
    'a missing placement was not filled in'
  )
  check(
    tasks.tasksForPlant(minimal.plants[0], TODAY).length > 0,
    'and that plant still produces a schedule',
    'a minimal plant produced no tasks'
  )
}

{
  const newer = JSON.parse(schema.serialiseStore(store, VERSION))
  newer.schemaVersion = schema.CURRENT_SCHEMA_VERSION + 1
  let refused = false
  try {
    schema.parseStore(JSON.stringify(newer))
  } catch (e) {
    refused = e instanceof schema.FileFormatError && /newer version/i.test(e.message)
  }
  check(refused, 'a file from a newer build is refused rather than silently downgraded', 'a newer file was opened anyway')
}

{
  const cases = [
    ['not json at all', 'not a plant file'],
    ['{"hello":"world"}', 'not a plant file'],
    ['[1,2,3]', 'not a plant file'],
  ]
  const bad = []
  for (const [text, want] of cases) {
    try {
      schema.parseStore(text)
      bad.push(`${text.slice(0, 20)} was accepted`)
    } catch (e) {
      if (!new RegExp(want, 'i').test(e.message)) bad.push(`${text.slice(0, 20)} → "${e.message}"`)
    }
  }
  check(bad.length === 0, 'opening the wrong file says so in words a person can act on', bad.join('; '))
}

// ---------------------------------------------------------------------------
console.log('\n  Weather: off, and no provider\n')

check(
  weather.DEFAULT_WEATHER.enabled === false,
  'live weather is off by default',
  `live weather defaults to enabled=${weather.DEFAULT_WEATHER.enabled}`
)
check(
  weather.DEFAULT_WEATHER.endpoint === '',
  'and ships with no endpoint at all',
  `an endpoint is bundled: ${weather.DEFAULT_WEATHER.endpoint}`
)
check(
  schema.DEFAULT_SETTINGS.weather.enabled === false && schema.DEFAULT_SETTINGS.weather.endpoint === '',
  'a brand new file has it off with an empty field',
  'a new file ships with weather configured'
)
check(
  demo.buildDemo(TODAY, VERSION).settings.weather.enabled === false,
  'and so does the demo file',
  'the demo ships with weather switched on'
)

{
  /* The whole point of item 9: the app is fully usable with this off. */
  const off = demo.buildDemo(TODAY, VERSION)
  const agenda = tasks.agendaFor(off, TODAY)
  const n = agenda.late.length + agenda.today.length + agenda.soon.length + agenda.later.length
  check(n > 20, `the schedule produces ${n} jobs with weather off`, 'the app needs weather to produce a schedule')
}

{
  const src = readFileSync(resolve(root, 'src/app/data/weather.ts'), 'utf8')
  const hosts = src.match(/https?:\/\/[^\s"'`)]+/g) ?? []
  check(hosts.length === 0, 'no URL appears in the weather module at all', `URLs found: ${hosts.join(', ')}`)
}

{
  const doc = { daily: { precipitation_sum: [12.5, 0], temperature_2m_max: [31.2, 22] } }
  check(weather.readPath(doc, 'daily.precipitation_sum.0') === 12.5, 'a dotted path reads through objects and arrays')
  check(weather.readPath(doc, 'daily.nope.0') === undefined, 'and returns nothing for a path that is not there')
  check(weather.readPath(doc, 'daily.precipitation_sum.x') === undefined, 'and for a non-numeric array index')
}

{
  const hot = { rainMm: 0, maxTempC: 36, takenOn: TODAY }
  const wet = { rainMm: 12, maxTempC: 18, takenOn: TODAY }
  const dull = { rainMm: 0, maxTempC: 19, takenOn: TODAY }
  const stale = { rainMm: 30, maxTempC: 40, takenOn: '2026-09-01' }

  check(weather.weatherEffect(dull, 'outdoor', TODAY) === null, 'ordinary weather changes nothing and says nothing')
  check((weather.weatherEffect(hot, 'indoor', TODAY)?.factor ?? 1) < 1, 'a heat wave shortens the interval indoors too')
  check((weather.weatherEffect(wet, 'outdoor', TODAY)?.factor ?? 1) > 1, 'real rain pushes an outdoor plant back')
  check(weather.weatherEffect(wet, 'indoor', TODAY) === null, 'and does nothing at all to a plant indoors')
  check(weather.weatherEffect(stale, 'outdoor', TODAY) === null, "a reading older than three days is ignored, not applied")
  check(weather.weatherEffect(undefined, 'outdoor', TODAY) === null, 'and no reading means no adjustment')
}

{
  /* End to end: with a reading attached, the schedule actually moves. */
  const base = S.wateringInterval(
    { id: 'x', common: 'x', botanical: 'x', group: 'vegetable', light: 'direct', water: 'evenly-moist', baseDays: 3, humidity: 'low', size: 'x', feed: 'heavy', mist: false, repotYears: 1, notes: 'x', toxicity: { verdict: 'unknown' } },
    { potDiameterIn: 10, where: 'outdoor', zone: '6b' },
    '2026-07-15'
  )
  const wetter = S.wateringInterval(
    { id: 'x', common: 'x', botanical: 'x', group: 'vegetable', light: 'direct', water: 'evenly-moist', baseDays: 3, humidity: 'low', size: 'x', feed: 'heavy', mist: false, repotYears: 1, notes: 'x', toxicity: { verdict: 'unknown' } },
    { potDiameterIn: 10, where: 'outdoor', zone: '6b', weather: { rainMm: 14, maxTempC: 17, takenOn: '2026-07-15' } },
    '2026-07-15'
  )
  check(
    wetter.days > base.days && wetter.factors.some((f) => f.label === 'Weather'),
    `a soaking moved an outdoor watering from ${base.days} to ${wetter.days} days, and said so in the reasoning`,
    'a weather reading did not change the schedule'
  )
}

// ---------------------------------------------------------------------------
console.log('\n  The demo, across all the features\n')

{
  const d = demo.buildDemo(TODAY, VERSION)
  const all = tasks.allTasks(d, TODAY)
  const seen = new Set(all.map((t) => t.care))
  const missing = S.CARE_TYPES.filter((c) => !seen.has(c))
  check(missing.length === 0, `every care type appears: ${S.CARE_TYPES.join(', ')}`, `no plant in the demo uses: ${missing.join(', ')}`)

  const agenda = tasks.agendaFor(d, TODAY)
  check(agenda.late.length > 0, `${agenda.late.length} jobs are late, so the overdue state is visible`, 'nothing is late in the demo')
  check(agenda.today.length > 0, `${agenda.today.length} are due today`, 'nothing is due today in the demo')
  check(agenda.soon.length > 0, `${agenda.soon.length} fall in the coming week`, 'nothing falls in the coming week')

  check(d.plants.some((p) => p.overrides), "a plant carries the owner's own interval", 'no plant shows the override feature')
  check(d.plants.some((p) => p.placement.where === 'outdoor'), 'at least one plant lives outdoors', 'every demo plant is indoors')
  check(d.plants.some((p) => p.placement.humidified), 'one has a humidifier, so that factor is visible', 'no plant is humidified')
  check(d.plants.some((p) => p.placement.drainage === 'free'), 'one is in a gritty mix', 'no plant shows the drainage factor')
  check(d.plants.some((p) => p.notes), 'plants carry the owner’s own notes', 'no plant has notes')
  check(d.log.some((l) => l.kind === 'diagnosis' && l.diagnosis?.length), 'the journal holds a diagnosis with its answers', 'no diagnosis in the demo journal')
  check(d.log.some((l) => l.kind === 'care'), 'and care entries', 'no care entries in the demo journal')
  check(d.log.some((l) => l.kind === 'note'), 'and free-text notes', 'no notes in the demo journal')

  const species = new Set(d.plants.map((p) => p.speciesId))
  check(species.size === d.plants.length, `${species.size} different species`, 'the demo repeats a species')

  const toxic = d.plants.filter((p) => {
    const s = tasks.tasksForPlant(p, TODAY)[0]?.species
    return s?.toxicity.verdict === 'toxic'
  })
  check(toxic.length > 0, `${toxic.length} of them are cat-toxic, so that badge is visible`, 'no toxic plant in the demo')

  const rooms = new Set(d.plants.map((p) => p.room))
  check(rooms.size >= 4, `${rooms.size} rooms`, 'the demo plants are all in one or two rooms')
}

console.log(failures ? `\n  ${failures} failure(s).\n` : `\n  File, weather and demo: everything above passed.\n`)
process.exit(failures ? 1 : 0)
