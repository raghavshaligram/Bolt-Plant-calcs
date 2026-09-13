/*
 * Every change to the file goes through a function in here.
 *
 * Screens do not reach into the store and splice arrays. They call these, and
 * these return a new store. It keeps two things true that are easy to lose: a
 * care event always writes both the plant's lastDone and a journal line — those
 * two disagreeing is a bug nobody notices for months — and nothing is ever
 * mutated in place, so React sees the change and the autosave has something
 * concrete to write.
 */
import type { ISODate } from '../calc/dates.ts'
import type { CareType, Placement } from '../calc/schedule.ts'
import { newId, type LogEntry, type LogKind, type Plant, type Store } from './schema.ts'

const withPlants = (s: Store, plants: Plant[]): Store => ({ ...s, plants })

export type NewPlant = Omit<Plant, 'id' | 'lastDone'> & { lastDone?: Plant['lastDone'] }

export function addPlant(s: Store, plant: NewPlant): Store {
  const added: Plant = { ...plant, id: newId('p'), lastDone: plant.lastDone ?? {} }
  return withPlants(s, [...s.plants, added])
}

export function updatePlant(s: Store, id: string, fn: (p: Plant) => Plant): Store {
  return withPlants(
    s,
    s.plants.map((p) => (p.id === id ? fn({ ...p }) : p))
  )
}

export function setPlacement(s: Store, id: string, placement: Placement): Store {
  return updatePlant(s, id, (p) => ({ ...p, placement }))
}

export function archivePlant(s: Store, id: string, archived = true): Store {
  return updatePlant(s, id, (p) => ({ ...p, archived }))
}

/**
 * Really delete a plant, and its journal with it.
 *
 * Offered beside archiving rather than instead of it, because "I bought this by
 * mistake" and "this one died" are different events and flattening them into
 * one button loses the history somebody paid for the app to keep.
 */
export function deletePlant(s: Store, id: string): Store {
  return { ...s, plants: s.plants.filter((p) => p.id !== id), log: s.log.filter((l) => l.plantId !== id) }
}

export function logEntry(s: Store, entry: Omit<LogEntry, 'id'>): Store {
  const added: LogEntry = { ...entry, id: newId('l') }
  return { ...s, log: [added, ...s.log] }
}

export function removeLogEntry(s: Store, id: string): Store {
  return { ...s, log: s.log.filter((l) => l.id !== id) }
}

/**
 * Mark a job done today.
 *
 * `on` is a parameter rather than always being today because people record
 * things after the fact — "I watered it on Sunday" is the common case on a
 * Tuesday evening, and an app that can only say "now" quietly teaches people
 * that the dates in it are approximate.
 */
export function markDone(s: Store, plantId: string, care: CareType, on: ISODate, note?: string): Store {
  const next = updatePlant(s, plantId, (p) => ({ ...p, lastDone: { ...p.lastDone, [care]: on } }))
  return logEntry(next, { plantId, date: on, kind: 'care', care, ...(note ? { text: note } : {}) })
}

export function undoLastDone(s: Store, plantId: string, care: CareType, previous?: ISODate): Store {
  const next = updatePlant(s, plantId, (p) => {
    const lastDone = { ...p.lastDone }
    if (previous) lastDone[care] = previous
    else delete lastDone[care]
    return { ...p, lastDone }
  })
  /* Drop the most recent matching care line, so undo does not leave a phantom
     entry in the journal claiming the job happened. */
  const idx = next.log.findIndex((l) => l.plantId === plantId && l.kind === 'care' && l.care === care)
  if (idx === -1) return next
  return { ...next, log: next.log.filter((_, i) => i !== idx) }
}

export function setOverride(s: Store, plantId: string, care: CareType, days: number | null): Store {
  return updatePlant(s, plantId, (p) => {
    const overrides = { ...(p.overrides ?? {}) }
    if (days === null) delete overrides[care]
    else overrides[care] = days
    return Object.keys(overrides).length ? { ...p, overrides } : { ...p, overrides: undefined }
  })
}

export function toggleMuted(s: Store, plantId: string, care: CareType): Store {
  return updatePlant(s, plantId, (p) => {
    const muted = new Set(p.muted ?? [])
    if (muted.has(care)) muted.delete(care)
    else muted.add(care)
    return { ...p, muted: muted.size ? [...muted] : undefined }
  })
}

export function addNote(s: Store, plantId: string, date: ISODate, text: string, kind: LogKind = 'note'): Store {
  return logEntry(s, { plantId, date, kind, text })
}

export function setSettings(s: Store, patch: Partial<Store['settings']>): Store {
  return { ...s, settings: { ...s.settings, ...patch } }
}
