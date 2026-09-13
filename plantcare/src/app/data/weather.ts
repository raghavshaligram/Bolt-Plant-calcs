/*
 * Live weather, off by default, with no provider in the box.
 *
 * The brief is explicit about this and the reason is a licensing one, so it is
 * written here rather than only in a commit message: the free tiers weather
 * services offer are non-commercial, and this is a paid product. Shipping a
 * pre-wired call to one would make every buyer's use of this app a commercial
 * use of somebody's free tier. So the app ships the *capability* switched off
 * and an empty field. The buyer supplies their own endpoint, for their own
 * personal use, on their own machine, and at that point it is their call and
 * their licence to keep.
 *
 * There is deliberately no provider name, no default URL and no key in this
 * file or anywhere else in the build. scripts/emit.mjs fails the build if a
 * weather provider's hostname appears anywhere in the artefact, so this cannot
 * be quietly reintroduced by somebody being helpful later. That guard is blunt
 * on purpose — it caught this app's own settings copy naming a provider as an
 * example, which is why the naming lives in START-HERE.md instead, where it is
 * documentation for the buyer rather than a string inside the product.
 *
 * Nothing here ever runs on its own. There is no fetch on load, no background
 * refresh and no retry loop — a reading happens when a person presses the
 * button, because an app that promises to work offline forever must not be
 * making requests nobody asked for.
 */
import type { ISODate } from '../calc/dates.ts'
import { daysBetween } from '../calc/dates.ts'

export interface WeatherConfig {
  /** Off until the owner turns it on. Never defaults to true. */
  enabled: boolean
  /** The full URL the owner pastes in. Empty in every build we ship. */
  endpoint: string
  /**
   * Where in the response to find the two numbers, as dotted paths.
   *
   * Defaults are the shape most weather JSON uses — an array of daily values —
   * not any particular provider's URL. A path is a shape, not a service.
   */
  rainPath: string
  tempPath: string
  /** Celsius or Fahrenheit, because the owner's provider decides, not us. */
  tempUnit: 'C' | 'F'
}

export const DEFAULT_WEATHER: WeatherConfig = {
  enabled: false,
  endpoint: '',
  rainPath: 'daily.precipitation_sum.0',
  tempPath: 'daily.temperature_2m_max.0',
  tempUnit: 'C',
}

export interface WeatherReading {
  /** Rainfall in the last day, millimetres. */
  rainMm: number
  /** The day's high, always stored in Celsius whatever the provider sent. */
  maxTempC: number
  takenOn: ISODate
}

/** A reading older than this is ignored. Last Tuesday's rain is not today's. */
export const READING_MAX_AGE_DAYS = 3

export class WeatherError extends Error {}

/** `daily.precipitation_sum.0` against a parsed JSON object. */
export function readPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj
  for (const part of path.split('.')) {
    if (cur === null || cur === undefined) return undefined
    if (Array.isArray(cur)) {
      const i = Number(part)
      if (!Number.isInteger(i)) return undefined
      cur = cur[i]
      continue
    }
    if (typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

export const fToC = (f: number): number => ((f - 32) * 5) / 9

/**
 * Ask the owner's endpoint for today's numbers.
 *
 * Every failure here is reported in words the owner can act on, because they
 * configured this themselves and the app has no idea what they pasted. "Failed
 * to fetch" is what the browser says; it is not what a person needs to read.
 */
export async function fetchWeather(cfg: WeatherConfig, today: ISODate): Promise<WeatherReading> {
  if (!cfg.endpoint.trim()) throw new WeatherError('No address to ask. Paste your weather service URL first.')

  let url: URL
  try {
    url = new URL(cfg.endpoint.trim())
  } catch {
    throw new WeatherError('That does not look like a web address. It should start with https://')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new WeatherError('That address is not http or https, so nothing can be fetched from it.')
  }

  let res: Response
  try {
    res = await fetch(url.toString(), { headers: { accept: 'application/json' } })
  } catch {
    throw new WeatherError(
      'Could not reach that address. Either there is no internet connection, or the service does not allow a page ' +
        'like this one to call it directly. Everything else in the app carries on working without it.'
    )
  }
  if (!res.ok) throw new WeatherError(`That service answered with an error (${res.status}). Check the URL and any key in it.`)

  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new WeatherError('That service answered with something that is not JSON, so there are no numbers to read.')
  }

  const rain = readPath(json, cfg.rainPath)
  const temp = readPath(json, cfg.tempPath)

  if (typeof rain !== 'number' || typeof temp !== 'number') {
    throw new WeatherError(
      `Reached the service, but could not find a number at "${typeof rain !== 'number' ? cfg.rainPath : cfg.tempPath}". ` +
        'Check the field paths against what your provider actually returns.'
    )
  }

  return {
    rainMm: rain,
    maxTempC: cfg.tempUnit === 'F' ? fToC(temp) : temp,
    takenOn: today,
  }
}

export interface WeatherEffect {
  factor: number
  why: string
}

/** Rain that counts as having watered an outdoor pot, in millimetres. */
export const SOAKING_MM = 8
export const SHOWER_MM = 3
export const HOT_C = 30
export const VERY_HOT_C = 35

/**
 * What today's weather does to a watering interval.
 *
 * Rain only counts outdoors — this is the obvious one, and it is also the one
 * an app gets wrong by applying a single national number to every plant in the
 * house. Heat counts everywhere, because a 35°C day heats the room too, just
 * less.
 *
 * Returns null when the weather changes nothing, so the reasoning list does not
 * fill up with "it was 19 degrees and did not rain".
 */
export function weatherEffect(
  reading: WeatherReading | undefined,
  where: 'indoor' | 'outdoor',
  today: ISODate
): WeatherEffect | null {
  if (!reading) return null
  const age = daysBetween(reading.takenOn, today)
  if (age < 0 || age > READING_MAX_AGE_DAYS) return null

  let factor = 1
  const parts: string[] = []

  if (where === 'outdoor') {
    if (reading.rainMm >= SOAKING_MM) {
      factor *= 1.6
      parts.push(`${Math.round(reading.rainMm)} mm of rain has fallen, which is a proper soaking for a pot outdoors`)
    } else if (reading.rainMm >= SHOWER_MM) {
      factor *= 1.25
      parts.push(`${Math.round(reading.rainMm)} mm of rain has fallen, which takes the edge off`)
    }
  }

  if (reading.maxTempC >= VERY_HOT_C) {
    factor *= 0.7
    parts.push(`it reached ${Math.round(reading.maxTempC)}°C`)
  } else if (reading.maxTempC >= HOT_C) {
    factor *= where === 'outdoor' ? 0.8 : 0.9
    parts.push(`it reached ${Math.round(reading.maxTempC)}°C`)
  }

  if (!parts.length) return null
  return {
    factor,
    why: `Your weather: ${parts.join(', and ')}.${age > 0 ? ` (Reading is ${age} day${age > 1 ? 's' : ''} old.)` : ''}`,
  }
}
