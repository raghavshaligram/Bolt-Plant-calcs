/*
 * Measuring a pot from a photograph, with something of known size beside it.
 *
 * WHY THERE IS A CARD IN THE PICTURE
 *
 * A camera cannot tell how big anything is. A photograph of a pot is a
 * photograph of an angle, and the same angle is a small pot held close or a
 * large one across the room. Depth-sensing hardware solves this; a web page
 * does not have it. Guessing from context — "that looks like a windowsill, so
 * the pot is probably eight inches" — is a model inventing a number, and this
 * codebase has a rule about that.
 *
 * So the app asks for a ruler it can trust, and the best one is already in
 * everybody's pocket. A bank card is 85.60 mm wide, everywhere in the world,
 * because ISO/IEC 7810 says so and the machines that read them do not tolerate
 * variation. Lay it against the pot, mark its width and the pot's width in the
 * photo, and the ratio does the rest. That is not clever, and that is the point:
 * it is arithmetic anybody can check.
 *
 * WHAT THIS CANNOT DO
 *
 * The card has to sit in the same plane as the thing being measured, at the same
 * distance from the lens. A card flat on the table beside a tall pot measures
 * the table, not the rim. Phone lenses are wide, so anything near the edge of
 * the frame is stretched. And a pot rim photographed from above is an ellipse
 * whose widest axis is its true diameter, which is why the app says to measure
 * across the widest part rather than "across the top".
 *
 * All three are stated in the UI. A measurement whose limits are hidden is worse
 * than no measurement, because the person acts on it with confidence.
 */

/** ISO/IEC 7810 ID-1, ANSI/ISO coin and paper standards. Millimetres. */
export interface ReferenceObject {
  id: string
  label: string
  mm: number
  /** What the number is, so somebody can check it rather than trust it. */
  source: string
}

export const REFERENCES: ReferenceObject[] = [
  { id: 'card', label: 'Bank or ID card (long edge)', mm: 85.6, source: 'ISO/IEC 7810 ID-1 — 85.60 × 53.98 mm' },
  { id: 'card-short', label: 'Bank or ID card (short edge)', mm: 53.98, source: 'ISO/IEC 7810 ID-1 — the short edge of the same card' },
  { id: 'quarter', label: 'US quarter', mm: 24.26, source: 'US Mint published coin specification' },
  { id: 'penny-us', label: 'US penny', mm: 19.05, source: 'US Mint published coin specification' },
  { id: 'euro2', label: '2 euro coin', mm: 25.75, source: 'European Central Bank published coin specification' },
  { id: 'gbp2', label: 'UK £2 coin', mm: 28.4, source: 'Royal Mint published coin specification' },
  { id: 'a4', label: 'A4 paper (short edge)', mm: 210, source: 'ISO 216 — A4 is 210 × 297 mm' },
  { id: 'letter', label: 'US Letter paper (short edge)', mm: 215.9, source: 'ANSI/ASME Y14.1 — 8.5 in' },
]

export const MM_PER_INCH = 25.4

export interface Segment {
  x1: number
  y1: number
  x2: number
  y2: number
}

export function lengthOf(s: Segment): number {
  return Math.hypot(s.x2 - s.x1, s.y2 - s.y1)
}

export class MeasureError extends Error {}

/**
 * Pot diameter in inches, from the two marked spans and the reference size.
 *
 * Throws rather than returning a number when the input cannot produce a
 * meaningful answer: a reference mark a few pixels long makes every pixel of
 * imprecision a large error in the result, and returning "31.4 inches" from a
 * six-pixel line is worse than saying the mark is too short.
 */
export function potInches(reference: Segment, pot: Segment, referenceMm: number): number {
  const refPx = lengthOf(reference)
  const potPx = lengthOf(pot)
  if (!(referenceMm > 0)) throw new MeasureError('The reference object has no size.')
  if (refPx < 20) {
    throw new MeasureError(
      'The mark on the reference object is too short to measure from. Move closer, or drag its ends further apart.'
    )
  }
  if (potPx < 20) throw new MeasureError('The mark across the pot is too short to measure from.')

  const mm = (potPx / refPx) * referenceMm
  return mm / MM_PER_INCH
}

/**
 * How much a one-pixel slip in each mark moves the answer.
 *
 * Shown beside the result, because it is the honest width of the answer and
 * because it makes the "get closer to the card" advice concrete: at a 40-pixel
 * reference mark the uncertainty is around five percent, and at 200 pixels it is
 * one. A person can see that and act on it.
 */
export function toleranceInches(reference: Segment, pot: Segment, referenceMm: number): number {
  const refPx = lengthOf(reference)
  const potPx = lengthOf(pot)
  if (refPx < 1 || potPx < 1) return NaN
  const inches = (potPx / refPx) * (referenceMm / MM_PER_INCH)
  /* Relative error adds: one pixel on each of the two marks. */
  return inches * (1 / refPx + 1 / potPx)
}

export interface StandardMatch {
  id: string
  label: string
  diameterIn: number
  volGal: number
  /** Inches away from the measurement. */
  off: number
}

/**
 * The nearest nursery pot size, from the ported conversion table.
 *
 * This is the whole reason the brief asks for the tool: nobody buys a "9.4 inch
 * pot". They buy a #3, or a 10-inch, and the point of measuring is to find out
 * which one they are holding — and then to get that number into the watering
 * schedule, where it is worth about a factor of two.
 */
export function nearestStandard(
  inches: number,
  sizes: { id: string; label: string; diameterIn: number; volGal: number }[]
): StandardMatch | null {
  if (!Number.isFinite(inches) || inches <= 0 || !sizes.length) return null
  let best = sizes[0]
  for (const s of sizes) {
    if (Math.abs(s.diameterIn - inches) < Math.abs(best.diameterIn - inches)) best = s
  }
  return { id: best.id, label: best.label, diameterIn: best.diameterIn, volGal: best.volGal, off: inches - best.diameterIn }
}

export function formatInches(inches: number): string {
  return `${inches.toFixed(1)} in (${Math.round(inches * MM_PER_INCH)} mm)`
}
