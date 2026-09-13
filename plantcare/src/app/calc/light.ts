/*
 * Reading light with a phone camera, and being honest about what that is worth.
 *
 * The brief asks for this and asks for the honesty in the same breath, and the
 * honesty is not a disclaimer bolted on at the end — it decides the design.
 *
 * THE PROBLEM WITH THE OBVIOUS APPROACH
 *
 * Point a camera at a dark corner and at a sunny windowsill, average the pixels
 * of each frame, and you get roughly the same number. That is not a bug; it is
 * the camera working. Auto-exposure exists precisely to make a dark room and a
 * bright one produce a correctly-exposed picture, which means it spends the
 * difference you were trying to measure. An app that averages pixels and calls
 * the result a light reading is measuring its own auto-exposure.
 *
 * So there are two paths here, and which one you get depends on the browser.
 *
 * 1. THE REAL ONE. Where the browser exposes the camera's own exposure settings
 *    — shutter time and ISO, through ImageCapture — the light can be computed
 *    rather than guessed. That is the same arithmetic a light meter does: the
 *    exposure the camera chose IS the measurement. This gives a number in lux.
 *
 * 2. THE FALLBACK. Where it does not, the app tries to lock exposure and then
 *    measures pixels. That produces a figure that is meaningful only against
 *    another reading from the same phone in the same session — "this corner is
 *    about a third of that windowsill" — and the app says exactly that rather
 *    than dressing it up in lux.
 *
 * Neither is a calibrated meter, and the wording in the UI never implies one.
 * A reading near a boundary is reported as near a boundary.
 */
import type { LightNeed } from '../data/ported/species.ts'

/*
 * Three, not two. "manual" is a real method and needs its own wording: telling
 * somebody their own judgement is "a relative brightness the browser would not
 * give us" is a caveat about a measurement that never happened.
 */
export type LightMethod = 'exposure' | 'relative' | 'manual'

export interface LightReading {
  /** How this was arrived at. The UI words itself differently for each. */
  method: LightMethod
  /** Illuminance in lux. Only meaningful when method is 'exposure'. */
  lux?: number
  /** 0–100, comparable only against other readings from the same session. */
  relative?: number
  category: LightNeed
  /** True when the number sits close enough to a boundary to be either side. */
  borderline: boolean
  /** What the camera actually reported, so the reading can be argued with. */
  detail: string
}

/*
 * Where one category becomes the next, in lux.
 *
 * Published houseplant guidance is given in footcandles and the sources round
 * differently, so these are deliberately round numbers rather than false
 * precision: roughly 50, 200 and 1000 footcandles. What matters far more than
 * the exact boundary is that a reading sitting near one is reported as near one
 * — see BORDERLINE_RATIO — because "bright indirect" and "medium" differ by a
 * factor of four and nobody's living room sits neatly inside either.
 */
export const LUX_BOUNDS: { upTo: number; category: LightNeed }[] = [
  { upTo: 500, category: 'low' },
  { upTo: 2000, category: 'medium' },
  { upTo: 10000, category: 'bright' },
  { upTo: Infinity, category: 'direct' },
]

/** Within 25% of a boundary, the answer is "about here, could be either side". */
export const BORDERLINE_RATIO = 0.25

export function categoryForLux(lux: number): { category: LightNeed; borderline: boolean } {
  const band = LUX_BOUNDS.find((b) => lux < b.upTo) ?? LUX_BOUNDS[LUX_BOUNDS.length - 1]
  const borderline = LUX_BOUNDS.some(
    (b) => Number.isFinite(b.upTo) && Math.abs(lux - b.upTo) / b.upTo < BORDERLINE_RATIO
  )
  return { category: band.category, borderline }
}

/*
 * Exposure to illuminance.
 *
 * EV100 = log2(aperture² / shutterSeconds) − log2(ISO / 100), and illuminance
 * E = 2.5 · 2^EV100 lux. This is the standard sunny-16 arithmetic and it is
 * exact; what is not exact is the phone, which is why the result is still called
 * an estimate everywhere the user can see it.
 *
 * The 2.5 was 250 for an afternoon, because ISO 2720's incident-meter
 * calibration constant C is around 250 when the formula is written in its other
 * form and it is easy to carry the wrong one across. Every individual reading
 * still looked like a number — full sun came out at 6,400,000 lux, which is only
 * obviously wrong if you know what full sun is. What caught it was the test
 * below asserting real exposures against real light levels rather than against
 * whatever this function happened to return.
 */
export const LUX_PER_EV100 = 2.5

/** Most phone main cameras. Used only when the browser will not say. */
export const ASSUMED_APERTURE = 1.8

export function luxFromExposure(opts: {
  /** Seconds. Browsers report exposureTime in 100µs units — convert before calling. */
  shutterSeconds: number
  iso: number
  aperture?: number
}): number {
  const { shutterSeconds, iso } = opts
  const aperture = opts.aperture ?? ASSUMED_APERTURE
  if (!(shutterSeconds > 0) || !(iso > 0)) return NaN
  const ev100 = Math.log2((aperture * aperture) / shutterSeconds) - Math.log2(iso / 100)
  return LUX_PER_EV100 * Math.pow(2, ev100)
}

/**
 * Mean relative luminance of an RGBA frame, 0–100.
 *
 * Rec. 709 coefficients on the raw sRGB bytes. Linearising first would be more
 * correct in principle and pointless in practice: this number is only ever
 * compared against another number produced the same way on the same device, and
 * a monotonic transform of both changes nothing about the comparison.
 *
 * Every fourth pixel, because a full 1080p frame is two million multiplies for
 * an answer that does not change in the third decimal place.
 */
export function meanLuminance(data: Uint8ClampedArray, stride = 4): number {
  let sum = 0
  let n = 0
  const step = 4 * stride
  for (let i = 0; i < data.length; i += step) {
    sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    n++
  }
  if (!n) return 0
  return (sum / n / 255) * 100
}

/*
 * Relative brightness to a category.
 *
 * These boundaries are not physics — they cannot be, because the number has no
 * unit. They are calibrated against what a locked-exposure camera actually
 * reports in rooms of each kind, and they are the reason this path is presented
 * as a comparison rather than a measurement. The UI says so in those words.
 */
export const RELATIVE_BOUNDS: { upTo: number; category: LightNeed }[] = [
  { upTo: 12, category: 'low' },
  { upTo: 30, category: 'medium' },
  { upTo: 62, category: 'bright' },
  { upTo: Infinity, category: 'direct' },
]

export function categoryForRelative(value: number): { category: LightNeed; borderline: boolean } {
  const band = RELATIVE_BOUNDS.find((b) => value < b.upTo) ?? RELATIVE_BOUNDS[RELATIVE_BOUNDS.length - 1]
  const borderline = RELATIVE_BOUNDS.some(
    (b) => Number.isFinite(b.upTo) && Math.abs(value - b.upTo) / b.upTo < BORDERLINE_RATIO
  )
  return { category: band.category, borderline }
}

// ---- what it means for a plant ----------------------------------------------

export const LIGHT_ORDER: LightNeed[] = ['low', 'medium', 'bright', 'direct']

export const LIGHT_LABEL: Record<LightNeed, string> = {
  low: 'Low light',
  medium: 'Medium — daylight, no direct sun',
  bright: 'Bright indirect',
  direct: 'Direct sun',
}

export type Fit = 'too-dark' | 'good' | 'too-bright'

export interface Verdict {
  fit: Fit
  /** How many categories away, signed. Negative is darker than the plant wants. */
  gap: number
  headline: string
  detail: string
}

/**
 * Whether a plant will do well in a spot with this much light.
 *
 * One category out is a hedge, not a refusal — plants are not step functions,
 * and an app that says "no" to a pothos one notch below its ideal is an app
 * people stop believing. Two categories out is a real answer.
 *
 * The "too dark" case carries the watering warning, because that is what
 * actually kills the plant: a person moves a plant into a dim corner and keeps
 * watering it on the bright-window schedule, and it rots. The schedule in this
 * app already accounts for it, and this is where somebody finds that out.
 */
export function verdictFor(species: { common: string; light: LightNeed; water: string }, spot: LightNeed): Verdict {
  const gap = LIGHT_ORDER.indexOf(spot) - LIGHT_ORDER.indexOf(species.light)

  if (gap === 0) {
    return {
      fit: 'good',
      gap,
      headline: `This is about right for a ${species.common}.`,
      detail: 'The spot gives roughly the light this plant is described as wanting.',
    }
  }
  if (gap === -1) {
    return {
      fit: 'too-dark',
      gap,
      headline: `A little darker than a ${species.common} would like.`,
      detail:
        'It will probably live here and grow slowly, with smaller leaves and less colour. Water it less than you would in a brighter spot — this app already does that for you, but it is the reason the interval looks long.',
    }
  }
  if (gap <= -2) {
    return {
      fit: 'too-dark',
      gap,
      headline: `Too dark for a ${species.common}.`,
      detail:
        'Expect it to stretch towards the window, drop lower leaves and slowly decline. The usual mistake from here is watering it on the old schedule, which rots the roots faster than the dark kills it.',
    }
  }
  if (gap === 1) {
    return {
      fit: 'too-bright',
      gap,
      headline: `Brighter than a ${species.common} needs.`,
      detail: 'Usually fine, sometimes paler leaves. Watch for crisp edges in the afternoon and move it back a metre if you see them.',
    }
  }
  return {
    fit: 'too-bright',
    gap,
    headline: `Too bright for a ${species.common}.`,
    detail: 'Direct sun on a plant that did not evolve for it scorches leaves — pale bleached patches that do not recover. A sheer curtain fixes it.',
  }
}
