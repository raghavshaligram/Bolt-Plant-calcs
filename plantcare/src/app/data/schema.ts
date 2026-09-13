/*
 * What the file on disk contains.
 *
 * The buyer owns a .plants file sitting in their Documents folder. There is no
 * account, no server and no export button — the file IS the data, and this app
 * is a reader for it. That has one consequence worth stating plainly: somebody
 * will open a file written by a version of this app that no longer exists, and
 * it has to work. So every shape change goes through a numbered migration, the
 * migrations run in order, and nothing is ever deleted from a file we cannot
 * re-create.
 *
 * Unknown fields survive. If a future version adds `plant.sunHours` and the
 * file is opened in this one, that field is carried through untouched rather
 * than being dropped on the next save — losing somebody's data because we did
 * not recognise it is the worst thing a local-file app can do.
 *
 * That survival is a property of how the code is written, not of the types
 * below: every change in data/actions.ts spreads the record it is changing
 * rather than rebuilding it field by field, and JSON.parse keeps what it finds.
 * The two interfaces once carried an index signature to say so in the type
 * system, which was removed because `Omit<Plant, 'id'>` against an index
 * signature quietly erases every named property and takes the type checking
 * with it. The rule is therefore written here, and enforced by never
 * reconstructing a Plant or a LogEntry from its parts.
 */
import type { ISODate } from '../calc/dates.ts'
import type { CareType, Placement } from '../calc/schedule.ts'
import { DEFAULT_WEATHER, type WeatherConfig, type WeatherReading } from './weather.ts'

export const CURRENT_SCHEMA_VERSION = 1

/** The extension the save dialog offers. Plain JSON inside, deliberately. */
export const FILE_EXT = '.plants'
export const FILE_TYPE = 'application/json'

export interface Plant {
  id: string
  /** Points into SPECIES. A plant whose species has left the catalogue still opens. */
  speciesId: string
  /** What the owner calls it. "Big Monstera", "Mum's fern". */
  name: string
  room?: string
  acquired?: ISODate
  placement: Placement
  /** When each job was last done. Missing means never, which is not the same as overdue. */
  lastDone: Partial<Record<CareType, ISODate>>
  /**
   * The owner's own interval for a job, in days, overriding the computed one.
   *
   * This exists because the engine is a good guess and the person standing in
   * the room is not guessing. A plant that visibly wants water every four days
   * gets watered every four days, and the app stops arguing.
   */
  overrides?: Partial<Record<CareType, number>>
  /** Care types the owner has switched off for this plant entirely. */
  muted?: CareType[]
  notes?: string
  photo?: string
  archived?: boolean
}

export type LogKind = 'care' | 'note' | 'photo' | 'diagnosis'

export interface LogEntry {
  id: string
  plantId: string
  date: ISODate
  kind: LogKind
  /** Set when kind is 'care'. */
  care?: CareType
  text?: string
  photo?: string
  /** The questions and answers, in order, when this came from the diagnosis tool. */
  diagnosis?: { question: string; answer: string }[]
}

export interface Settings {
  /** Default zone for new plants. The only thing the app asks for on first run. */
  zone: string
  /** Default placement for new plants, so adding the twelfth plant is three taps. */
  defaultWhere: Placement['where']
  /** Shown on the today screen: how many days ahead counts as "coming up". */
  lookAheadDays: number
  /**
   * Live weather. Ships disabled with an empty endpoint, always.
   *
   * See data/weather.ts. This is in settings rather than hardcoded because the
   * buyer supplies the service; the product ships a capability, not a
   * dependency on somebody else's free tier.
   */
  weather: WeatherConfig
  /** The last reading the owner asked for. Never fetched on its own. */
  lastWeather?: WeatherReading
}

export interface Store {
  schemaVersion: number
  /** Written by whichever build last saved. Only ever shown to a person. */
  writtenBy: string
  createdAt: ISODate
  plants: Plant[]
  log: LogEntry[]
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = {
  zone: '6b',
  defaultWhere: 'indoor',
  lookAheadDays: 7,
  weather: { ...DEFAULT_WEATHER },
}

export function emptyStore(today: ISODate, version: string): Store {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    writtenBy: version,
    createdAt: today,
    plants: [],
    log: [],
    settings: { ...DEFAULT_SETTINGS },
  }
}

/**
 * A new id.
 *
 * crypto.randomUUID where it exists, and a time-ordered fallback where it does
 * not — an id only has to be unique inside one person's file, and the fallback
 * is never the source of a collision in a single-user, single-tab document.
 */
export function newId(prefix: string): string {
  const c = globalThis.crypto
  if (c && 'randomUUID' in c) return `${prefix}_${c.randomUUID().slice(0, 13)}`
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

// ---- reading a file ----------------------------------------------------------

export class FileFormatError extends Error {}

/**
 * Turn the bytes of a file into a Store, or explain why not.
 *
 * The failure messages here are read by somebody who has just double-clicked
 * the wrong file, so they say what was found rather than "invalid JSON". A
 * person who opened last year's tax return by mistake should be told that, not
 * shown a parser error.
 */
export function parseStore(text: string): Store {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new FileFormatError('That file is not a plant file — it does not contain readable data at all.')
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new FileFormatError('That file is not a plant file.')
  }
  const o = raw as Record<string, unknown>
  if (typeof o.schemaVersion !== 'number' || !Array.isArray(o.plants)) {
    throw new FileFormatError('That file is readable, but it is not a plant file — no plants in it.')
  }
  if (o.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new FileFormatError(
      `That file was written by a newer version of Plant Care (file version ${o.schemaVersion}, this app reads ${CURRENT_SCHEMA_VERSION}). ` +
        'Opening it here could lose whatever the newer version added, so it has been left alone.'
    )
  }
  return migrate(o as unknown as Store)
}

/**
 * Bring an older file up to the current shape.
 *
 * One function per version step, applied in order, each one small enough to be
 * obviously correct. There is only one version today and therefore nothing to
 * do — the machinery is here because adding it after the first buyer has a file
 * is far harder than having it from the start.
 */
const MIGRATIONS: Record<number, (s: Store) => Store> = {}

export function migrate(store: Store): Store {
  let s = store
  while (s.schemaVersion < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[s.schemaVersion]
    if (!step) {
      throw new FileFormatError(
        `This file is version ${s.schemaVersion} and there is no way to read it in this build. Keep the file; do not overwrite it.`
      )
    }
    s = step(s)
  }
  return normalise(s)
}

/**
 * Fill in what a hand-edited or partial file is missing, without inventing data.
 *
 * The file is plain JSON in somebody's Documents folder, so somebody will edit
 * it in a text editor, and a missing `log` array should not be a crash on a
 * screen they cannot get past.
 */
function normalise(s: Store): Store {
  s.plants = Array.isArray(s.plants) ? s.plants : []
  s.log = Array.isArray(s.log) ? s.log : []
  s.settings = { ...DEFAULT_SETTINGS, ...(s.settings ?? {}) }
  /* A file written before weather existed has no weather block, and a file
     hand-edited to `"weather": {}` has half of one. Either way it comes out
     disabled with an empty endpoint, which is the only safe default. */
  s.settings.weather = { ...DEFAULT_WEATHER, ...(s.settings.weather ?? {}) }
  for (const p of s.plants) {
    p.lastDone = p.lastDone ?? {}
    const given = (p.placement ?? {}) as Partial<Plant['placement']>
    p.placement = {
      ...given,
      potDiameterIn: given.potDiameterIn ?? 6,
      where: given.where ?? 'indoor',
      zone: given.zone ?? s.settings.zone,
    }
  }
  return s
}

export function serialiseStore(store: Store, version: string): string {
  // Two-space JSON, because the buyer can open this in a text editor and that
  // is a feature of owning the file rather than an accident.
  return JSON.stringify({ ...store, writtenBy: version, schemaVersion: CURRENT_SCHEMA_VERSION }, null, 2)
}
