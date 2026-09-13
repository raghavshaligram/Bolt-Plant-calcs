/*
 * The demo file.
 *
 * Built relative to today rather than shipped as fixed dates. A demo with dates
 * baked in looks right for a fortnight and then looks abandoned: every plant
 * four months overdue, the journal stopping last spring, and the first
 * impression of the product being that it does not work. This one is always a
 * household that has been running for about eight months, whenever it is opened.
 *
 * What it shows is chosen, not random. Two plants are late — one of them the
 * fern, because a fern is what actually goes late — one is a snake plant on a
 * seventy-day winter interval so the range is visible, one is outdoors, one has
 * an owner override, one is a cat-toxic plant sitting in a room with a cat in
 * it, and the journal has a diagnosis in it. Somebody opening the demo should
 * meet the features rather than a list of plant names.
 */
import { addDays, type ISODate } from '../calc/dates.ts'
import { speciesById } from './ported/species.ts'
import { DEFAULT_SETTINGS, newId, type LogEntry, type Plant, type Store } from './schema.ts'
import { CURRENT_SCHEMA_VERSION } from './schema.ts'
import type { CareType, Placement } from '../calc/schedule.ts'

interface Seed {
  speciesId: string
  name: string
  room: string
  place: Partial<Placement>
  /** Days ago each job was last done. Negative would be the future, so it is not allowed. */
  done: Partial<Record<CareType, number>>
  acquiredDaysAgo: number
  overrides?: Partial<Record<CareType, number>>
  notes?: string
}

const SEEDS: Seed[] = [
  {
    speciesId: 'monstera',
    name: 'Big Monstera',
    room: 'Living room',
    place: { potDiameterIn: 12, where: 'indoor', light: 'bright' },
    done: { water: 6, feed: 20, rotate: 9, repot: 500, clean: 18, prune: 70 },
    acquiredDaysAgo: 240,
    notes: 'Came from the garden centre on the ring road. Third new leaf this year.',
  },
  {
    speciesId: 'maidenhair-fern',
    name: 'The difficult fern',
    room: 'Bathroom',
    place: { potDiameterIn: 5, where: 'indoor', light: 'medium', humidified: true },
    done: { water: 9, mist: 9, feed: 30, rotate: 9, repot: 90 },
    acquiredDaysAgo: 95,
    notes: 'Crisped up badly in August. Moved it to the bathroom and it is coming back.',
  },
  {
    speciesId: 'snake-plant',
    name: 'Hallway snake plant',
    room: 'Hallway',
    place: { potDiameterIn: 10, where: 'indoor', light: 'low', drainage: 'free' },
    done: { water: 24, rotate: 12, feed: 60, repot: 60, clean: 22 },
    acquiredDaysAgo: 610,
  },
  {
    speciesId: 'pothos-golden',
    name: 'Shelf pothos',
    room: 'Kitchen',
    place: { potDiameterIn: 6, where: 'indoor', light: 'medium' },
    done: { water: 4, feed: 12, rotate: 3, repot: 380, clean: 30, prune: 40 },
    acquiredDaysAgo: 400,
  },
  {
    speciesId: 'peace-lily',
    name: 'Peace lily',
    room: 'Bedroom',
    place: { potDiameterIn: 8, where: 'indoor', light: 'medium' },
    done: { water: 8, feed: 30, rotate: 6, mist: 4, repot: 145, clean: 25, prune: 16 },
    acquiredDaysAgo: 150,
    notes: 'Wilts every time. Watering it before the droop now rather than after.',
  },
  {
    speciesId: 'echeveria',
    name: 'Windowsill echeveria',
    room: 'Kitchen',
    place: { potDiameterIn: 4, where: 'indoor', light: 'direct', drainage: 'free' },
    done: { water: 11, rotate: 6, repot: 320, clean: 50 },
    acquiredDaysAgo: 330,
  },
  {
    speciesId: 'rosemary',
    name: 'Rosemary by the door',
    room: 'Outside',
    place: { potDiameterIn: 10, where: 'outdoor', light: 'direct' },
    done: { water: 5, feed: 30, repot: 240, prune: 24 },
    acquiredDaysAgo: 500,
  },
  {
    speciesId: 'calathea-ornata',
    name: 'Pinstripe',
    room: 'Living room',
    place: { potDiameterIn: 6, where: 'indoor', light: 'medium' },
    done: { water: 5, mist: 2, feed: 25, rotate: 8, repot: 65, clean: 20 },
    acquiredDaysAgo: 70,
    overrides: { water: 5 },
    notes: 'The app said 7 days and it was always bone dry by day 5. Set it to 5.',
  },
  {
    speciesId: 'zz-plant',
    name: 'Office ZZ',
    room: 'Study',
    place: { potDiameterIn: 8, where: 'indoor', light: 'low' },
    done: { water: 19, rotate: 20, feed: 46, repot: 275, clean: 26 },
    acquiredDaysAgo: 280,
  },
  {
    speciesId: 'tomato',
    name: 'Patio tomato',
    room: 'Outside',
    place: { potDiameterIn: 15, where: 'outdoor', light: 'direct' },
    done: { water: 2, feed: 6, repot: 118, prune: 10 },
    acquiredDaysAgo: 120,
  },
]

interface JournalSeed {
  plant: string
  daysAgo: number
  kind: LogEntry['kind']
  care?: CareType
  text?: string
  diagnosis?: { question: string; answer: string }[]
}

const JOURNAL: JournalSeed[] = [
  {
    plant: 'The difficult fern',
    daysAgo: 34,
    kind: 'diagnosis',
    text: 'Crispy brown edges on most fronds. Ended at: air too dry.',
    diagnosis: [
      { question: 'Where on the plant is the problem?', answer: 'Leaf edges and tips' },
      { question: 'What does the damage look like?', answer: 'Dry, brown and crisp' },
      { question: 'Is the soil dry when you check it?', answer: 'No, it is damp' },
    ],
  },
  { plant: 'The difficult fern', daysAgo: 33, kind: 'note', text: 'Moved to the bathroom windowsill. Cut off the worst fronds.' },
  { plant: 'The difficult fern', daysAgo: 12, kind: 'note', text: 'Three new fronds unfurling. The bathroom was the answer.' },
  { plant: 'Big Monstera', daysAgo: 48, kind: 'note', text: 'New leaf opened with six holes. Moved the pole a bit straighter.' },
  { plant: 'Big Monstera', daysAgo: 20, kind: 'care', care: 'feed', text: 'Half-strength feed.' },
  { plant: 'Peace lily', daysAgo: 26, kind: 'note', text: 'Wilted again on day 9. Not waiting that long next time.' },
  { plant: 'Pinstripe', daysAgo: 18, kind: 'note', text: 'Switched to filtered water — the brown tips had stopped spreading by the end of the week.' },
  { plant: 'Hallway snake plant', daysAgo: 60, kind: 'care', care: 'repot', text: 'Into a 10 in terracotta with a gritty mix. Roots had filled the old one completely.' },
  { plant: 'Patio tomato', daysAgo: 9, kind: 'note', text: 'First truss setting. Feeding weekly now.' },
  { plant: 'Windowsill echeveria', daysAgo: 41, kind: 'note', text: 'Stretching towards the glass. Turning it every week instead of every fortnight.' },
]

export const DEMO_FILE_NAME = 'Demo household.plants'

export function buildDemo(today: ISODate, version: string): Store {
  const plants: Plant[] = []
  const byName = new Map<string, string>()

  for (const s of SEEDS) {
    const species = speciesById(s.speciesId)
    if (!species) continue // a species left the catalogue; the demo is not worth a crash
    const id = newId('p')
    byName.set(s.name, id)
    const lastDone: Plant['lastDone'] = {}
    for (const [care, daysAgo] of Object.entries(s.done)) {
      lastDone[care as CareType] = addDays(today, -Math.abs(daysAgo as number))
    }
    plants.push({
      id,
      speciesId: s.speciesId,
      name: s.name,
      room: s.room,
      acquired: addDays(today, -s.acquiredDaysAgo),
      placement: {
        potDiameterIn: 6,
        where: 'indoor',
        zone: DEFAULT_SETTINGS.zone,
        ...s.place,
      },
      lastDone,
      ...(s.overrides ? { overrides: s.overrides } : {}),
      ...(s.notes ? { notes: s.notes } : {}),
    })
  }

  const log: LogEntry[] = []
  for (const j of JOURNAL) {
    const plantId = byName.get(j.plant)
    if (!plantId) continue
    log.push({
      id: newId('l'),
      plantId,
      date: addDays(today, -j.daysAgo),
      kind: j.kind,
      ...(j.care ? { care: j.care } : {}),
      ...(j.text ? { text: j.text } : {}),
      ...(j.diagnosis ? { diagnosis: j.diagnosis } : {}),
    })
  }
  log.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    writtenBy: version,
    createdAt: addDays(today, -620),
    plants,
    log,
    settings: { ...DEFAULT_SETTINGS, zone: '6b' },
  }
}
