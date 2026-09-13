/*
 * Dates as `YYYY-MM-DD` strings, and arithmetic that never touches a Date.
 *
 * A care schedule is a calendar-day question, not an instant-in-time question.
 * "Water this in 9 days" means the ninth morning, in the room the plant is in —
 * it does not mean 216 hours later, and it does not change meaning because the
 * laptop is on holiday in another timezone. `new Date('2026-03-29')` parses as
 * midnight UTC, prints as the 28th west of Greenwich, and shifts by an hour
 * across a DST boundary; every one of those is a wrong answer here.
 *
 * So the plain string is the value, and everything below is integer maths on
 * it. Date objects appear in exactly one function — `today()` — which is the
 * only place the question is genuinely "what time is it".
 */

export type ISODate = string // YYYY-MM-DD

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0
}

export function daysInMonth(y: number, m: number): number {
  return m === 2 && isLeap(y) ? 29 : DAYS_IN_MONTH[m - 1]
}

export function parseISO(d: ISODate): { y: number; m: number; d: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d)
  if (!m) throw new Error(`not a YYYY-MM-DD date: ${JSON.stringify(d)}`)
  const y = +m[1]
  const mo = +m[2]
  const day = +m[3]
  if (mo < 1 || mo > 12 || day < 1 || day > daysInMonth(y, mo)) {
    throw new Error(`not a real date: ${d}`)
  }
  return { y, m: mo, d: day }
}

export function isISODate(d: unknown): d is ISODate {
  if (typeof d !== 'string') return false
  try {
    parseISO(d)
    return true
  } catch {
    return false
  }
}

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(y: number, m: number, d: number): ISODate {
  return `${y}-${pad(m)}-${pad(d)}`
}

/** Days since 1970-01-01, as an integer. The basis for every comparison below. */
export function dayNumber(date: ISODate): number {
  const { y, m, d } = parseISO(date)
  // Howard Hinnant's civil-days algorithm: integer only, no floating point,
  // correct for every proleptic Gregorian date rather than for a range.
  const yy = m <= 2 ? y - 1 : y
  const era = Math.floor(yy / 400)
  const yoe = yy - era * 400
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe - 719468
}

export function fromDayNumber(n: number): ISODate {
  let z = n + 719468
  const era = Math.floor(z / 146097)
  const doe = z - era * 146097
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365)
  const y = yoe + era * 400
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1
  const m = mp + (mp < 10 ? 3 : -9)
  return toISO(m <= 2 ? y + 1 : y, m, d)
}

export function addDays(date: ISODate, n: number): ISODate {
  return fromDayNumber(dayNumber(date) + n)
}

export function daysBetween(a: ISODate, b: ISODate): number {
  return dayNumber(b) - dayNumber(a)
}

/** 1–366. Used to place a date inside the frost window, which has no year. */
export function dayOfYear(date: ISODate): number {
  const { y, m, d } = parseISO(date)
  let n = d
  for (let i = 1; i < m; i++) n += daysInMonth(y, i)
  return n
}

/** Day-of-year for a `[month0, day]` pair as the ported zone data writes them. */
export function dayOfYearMD(md: readonly [number, number], year: number): number {
  let n = md[1]
  for (let i = 1; i <= md[0]; i++) n += daysInMonth(year, i)
  return n
}

export function today(): ISODate {
  const now = new Date()
  return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function formatDate(date: ISODate): string {
  const { y, m, d } = parseISO(date)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export function formatShort(date: ISODate): string {
  const { m, d } = parseISO(date)
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`
}

/**
 * The date, with the year only when it is not this year.
 *
 * "due 26 August 2026" wraps onto two lines on a phone and the year is the part
 * nobody was reading. Next April's repotting date keeps its year, because there
 * the year is the whole point.
 */
export function formatDateSmart(date: ISODate, from: ISODate): string {
  const a = parseISO(date)
  const b = parseISO(from)
  return a.y === b.y ? `${a.d} ${MONTHS[a.m - 1]}` : formatDate(date)
}

/**
 * "Today", "Tomorrow", "3 days late" — the phrasing a task list needs.
 *
 * Overdue reads as overdue. A plant that should have been watered on Tuesday
 * does not say "due 2 days ago" in small grey text; it says it is late, because
 * that is the only number on the screen the person can still act on.
 */
export function relativeDay(due: ISODate, from: ISODate): string {
  const n = daysBetween(from, due)
  if (n === 0) return 'Today'
  if (n === 1) return 'Tomorrow'
  if (n === -1) return '1 day late'
  if (n < 0) return `${-n} days late`
  if (n < 7) return `In ${n} days`
  if (n < 14) return 'Next week'
  return `In ${Math.round(n / 7)} weeks`
}

/**
 * An interval in the units a person would use.
 *
 * "Every 1460 days" is arithmetically correct and reads as a machine talking.
 * Nobody repots on day 1460; they repot every four years. The unit switches at
 * the point where counting stops being how anyone thinks about the gap.
 */
export function humanInterval(days: number): string {
  if (days <= 1) return 'every day'
  if (days < 21) return `every ${days} days`
  if (days < 70) {
    const w = Math.round(days / 7)
    return w === 1 ? 'every week' : `every ${w} weeks`
  }
  if (days < 365) {
    const m = Math.round(days / 30.4)
    return m === 1 ? 'every month' : `every ${m} months`
  }
  const y = days / 365
  const rounded = Math.round(y * 2) / 2
  if (rounded === 1) return 'every year'
  return `every ${rounded % 1 === 0 ? rounded : rounded.toFixed(1)} years`
}
