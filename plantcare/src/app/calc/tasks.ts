/*
 * The list of things to do today, derived from the file.
 *
 * Nothing here is stored. A task is not a record that gets created and ticked
 * off — it is what falls out of "this plant, this placement, this date, and
 * when the job was last done". That matters because the alternative, writing
 * task rows into the file, means a file full of stale tasks the moment somebody
 * moves a plant to a different window, and two sources of truth about whether
 * the fern needs water.
 */
import type { Plant, Store } from '../data/schema.ts'
import { speciesById, type Species } from '../data/ported/species.ts'
import { addDays, daysBetween, type ISODate } from './dates.ts'
import { CARE_TYPES, intervalFor, nextDue, type CareType, type Due, type Interval } from './schedule.ts'

export interface Task {
  plant: Plant
  species: Species
  care: CareType
  /** Null when the job has never been done — a new plant is not overdue. */
  due: ISODate | null
  /** Negative is late. Null when never done. */
  daysUntil: number | null
  interval: Interval
  /** The interval the owner set by hand, when they have overridden it. */
  overridden: boolean
  heldForSpring: boolean
  neverDone: boolean
}

export type Bucket = 'late' | 'today' | 'soon' | 'later' | 'never'

export function bucketOf(t: Task, lookAhead: number): Bucket {
  if (t.neverDone) return 'never'
  if (t.daysUntil === null) return 'never'
  if (t.daysUntil < 0) return 'late'
  if (t.daysUntil === 0) return 'today'
  if (t.daysUntil <= lookAhead) return 'soon'
  return 'later'
}

/**
 * Every job for one plant.
 *
 * An override replaces the computed interval but keeps the computed factors, so
 * the app can still show its working beside the person's own number — "you set
 * this to 5 days; left alone it would say 7, because…" is far more useful than
 * silently obeying and explaining nothing.
 */
export function tasksForPlant(plant: Plant, today: ISODate): Task[] {
  const species = speciesById(plant.speciesId)
  if (!species) return []
  const out: Task[] = []

  for (const care of CARE_TYPES) {
    if (plant.muted?.includes(care)) continue

    const override = plant.overrides?.[care]
    const last = plant.lastDone[care]

    let due: Due
    if (override && last) {
      due = {
        care,
        due: addDays(last, override),
        interval: { ...intervalFor(care, species, plant.placement, last), days: override },
      }
    } else {
      due = last
        ? nextDue(care, species, plant.placement, last, today)
        : { care, due: null, interval: intervalFor(care, species, plant.placement, today) }
    }

    // A care type that does not apply to this plant is not a task at all.
    if (due.interval.days === null && !override) continue

    out.push({
      plant,
      species,
      care,
      due: due.due,
      daysUntil: due.due ? daysBetween(today, due.due) : null,
      interval: due.interval,
      overridden: Boolean(override),
      heldForSpring: Boolean(due.heldForSpring),
      neverDone: !last,
    })
  }
  return out
}

/**
 * Every job across the file.
 *
 * The weather reading is attached to each plant's placement here rather than
 * being stored on the plant, because it is a property of today and not of the
 * plant — writing it into the record would mean a file full of last week's
 * weather, and a schedule that changed when you opened it.
 */
export function allTasks(store: Store, today: ISODate): Task[] {
  const weather = store.settings.weather?.enabled ? store.settings.lastWeather : undefined
  return store.plants
    .filter((p) => !p.archived)
    .flatMap((p) => tasksForPlant(weather ? { ...p, placement: { ...p.placement, weather } } : p, today))
}

const CARE_ORDER: Record<CareType, number> = { water: 0, mist: 1, feed: 2, prune: 3, clean: 4, rotate: 5, repot: 6 }

/** Late first, then soonest. Watering breaks ties, because it is the one that kills. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const av = a.daysUntil ?? Number.POSITIVE_INFINITY
    const bv = b.daysUntil ?? Number.POSITIVE_INFINITY
    if (av !== bv) return av - bv
    if (CARE_ORDER[a.care] !== CARE_ORDER[b.care]) return CARE_ORDER[a.care] - CARE_ORDER[b.care]
    return a.plant.name.localeCompare(b.plant.name)
  })
}

export interface Agenda {
  late: Task[]
  today: Task[]
  soon: Task[]
  never: Task[]
  later: Task[]
}

export function agendaFor(store: Store, today: ISODate): Agenda {
  const look = store.settings.lookAheadDays ?? 7
  const agenda: Agenda = { late: [], today: [], soon: [], never: [], later: [] }
  for (const t of sortTasks(allTasks(store, today))) agenda[bucketOf(t, look)].push(t)
  return agenda
}

/** How many things actually want doing now. The number on the nav badge. */
export function dueCount(agenda: Agenda): number {
  return agenda.late.length + agenda.today.length
}
