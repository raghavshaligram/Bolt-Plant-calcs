// Shared USDA Plant Hardiness Zone + frost-date estimation logic.
//
// This module is the single source of truth for zone-based frost date
// estimation, used by both the Frost Date Calculator and the Seed Starting
// Calculator so the two tools stay in sync — the seed starting calendar is
// built directly on top of these same frost date estimates, not a separate
// system with its own (possibly drifting) numbers.

// ---------------------------------------------------------------------------
// ZIP3 prefix -> state mapping. This is the standard, publicly documented USPS
// ZIP code allocation by state (the same ranges published in USPS/Wikipedia
// ZIP-prefix references) — deterministic and accurate at the state level, not
// an estimate. Territories and a handful of unused prefixes are omitted; a ZIP
// that doesn't resolve just falls through to "not found."
// ---------------------------------------------------------------------------
export interface Zip3Range {
  start: number;
  end: number;
  state: string;
}

export const ZIP3_TO_STATE: Zip3Range[] = [
  { start: 10, end: 27, state: 'MA' },
  { start: 28, end: 29, state: 'RI' },
  { start: 30, end: 38, state: 'NH' },
  { start: 39, end: 49, state: 'ME' },
  { start: 50, end: 59, state: 'VT' },
  { start: 60, end: 69, state: 'CT' },
  { start: 70, end: 89, state: 'NJ' },
  { start: 100, end: 149, state: 'NY' },
  { start: 150, end: 196, state: 'PA' },
  { start: 197, end: 199, state: 'DE' },
  { start: 200, end: 205, state: 'DC' },
  { start: 206, end: 219, state: 'MD' },
  { start: 220, end: 246, state: 'VA' },
  { start: 247, end: 268, state: 'WV' },
  { start: 270, end: 289, state: 'NC' },
  { start: 290, end: 299, state: 'SC' },
  { start: 300, end: 319, state: 'GA' },
  { start: 320, end: 349, state: 'FL' },
  { start: 350, end: 369, state: 'AL' },
  { start: 370, end: 385, state: 'TN' },
  { start: 386, end: 397, state: 'MS' },
  { start: 398, end: 399, state: 'GA' },
  { start: 400, end: 427, state: 'KY' },
  { start: 430, end: 459, state: 'OH' },
  { start: 460, end: 479, state: 'IN' },
  { start: 480, end: 499, state: 'MI' },
  { start: 500, end: 528, state: 'IA' },
  { start: 530, end: 549, state: 'WI' },
  { start: 550, end: 567, state: 'MN' },
  { start: 570, end: 577, state: 'SD' },
  { start: 580, end: 588, state: 'ND' },
  { start: 590, end: 599, state: 'MT' },
  { start: 600, end: 629, state: 'IL' },
  { start: 630, end: 658, state: 'MO' },
  { start: 660, end: 679, state: 'KS' },
  { start: 680, end: 693, state: 'NE' },
  { start: 700, end: 714, state: 'LA' },
  { start: 716, end: 729, state: 'AR' },
  { start: 730, end: 749, state: 'OK' },
  { start: 750, end: 799, state: 'TX' },
  { start: 800, end: 816, state: 'CO' },
  { start: 820, end: 831, state: 'WY' },
  { start: 832, end: 838, state: 'ID' },
  { start: 840, end: 847, state: 'UT' },
  { start: 850, end: 865, state: 'AZ' },
  { start: 870, end: 884, state: 'NM' },
  { start: 885, end: 885, state: 'TX' },
  { start: 889, end: 898, state: 'NV' },
  { start: 900, end: 966, state: 'CA' },
  { start: 967, end: 968, state: 'HI' },
  { start: 970, end: 979, state: 'OR' },
  { start: 980, end: 994, state: 'WA' },
  { start: 995, end: 999, state: 'AK' },
];

// ---------------------------------------------------------------------------
// Reference cities: one or more per state, each with a real USDA Plant
// Hardiness Zone looked up from the official zone data (verified against
// phzmapi.org, itself derived from the USDA/PRISM Climate Group hardiness
// zone map). For states with meaningful internal climate variation, multiple
// reference points are included; the ZIP entered is matched to the closest
// one *within its state* by ZIP3 numeric distance, which is a rough but real
// proxy for geographic proximity — not a precise lookup. This whole ZIP path
// is a convenience estimate; the Hardiness Zone dropdown is the exact input.
// ---------------------------------------------------------------------------
export interface RefCity {
  city: string;
  state: string;
  zip3: number;
  zone: string;
}

export const REFERENCE_CITIES: RefCity[] = [
  { city: 'Birmingham, AL', state: 'AL', zip3: 352, zone: '8a' },
  { city: 'Anchorage, AK', state: 'AK', zip3: 995, zone: '5a' },
  { city: 'Phoenix, AZ', state: 'AZ', zip3: 850, zone: '10a' },
  { city: 'Flagstaff, AZ', state: 'AZ', zip3: 860, zone: '6a' },
  { city: 'Little Rock, AR', state: 'AR', zip3: 722, zone: '8a' },
  { city: 'Los Angeles, CA', state: 'CA', zip3: 900, zone: '10b' },
  { city: 'San Diego, CA', state: 'CA', zip3: 921, zone: '11a' },
  { city: 'Fresno, CA', state: 'CA', zip3: 936, zone: '9b' },
  { city: 'San Francisco, CA', state: 'CA', zip3: 941, zone: '10b' },
  { city: 'Sacramento, CA', state: 'CA', zip3: 958, zone: '9b' },
  { city: 'Denver, CO', state: 'CO', zip3: 802, zone: '6a' },
  { city: 'Grand Junction, CO', state: 'CO', zip3: 815, zone: '7a' },
  { city: 'Hartford, CT', state: 'CT', zip3: 61, zone: '6b' },
  { city: 'Wilmington, DE', state: 'DE', zip3: 198, zone: '7b' },
  { city: 'Washington, DC', state: 'DC', zip3: 200, zone: '8a' },
  { city: 'Jacksonville, FL', state: 'FL', zip3: 322, zone: '9b' },
  { city: 'Miami, FL', state: 'FL', zip3: 331, zone: '11a' },
  { city: 'Atlanta, GA', state: 'GA', zip3: 303, zone: '8a' },
  { city: 'Honolulu, HI', state: 'HI', zip3: 968, zone: '12b' },
  { city: 'Boise, ID', state: 'ID', zip3: 837, zone: '7a' },
  { city: 'Chicago, IL', state: 'IL', zip3: 606, zone: '6b' },
  { city: 'Indianapolis, IN', state: 'IN', zip3: 462, zone: '6b' },
  { city: 'Des Moines, IA', state: 'IA', zip3: 503, zone: '5b' },
  { city: 'Wichita, KS', state: 'KS', zip3: 672, zone: '7a' },
  { city: 'Louisville, KY', state: 'KY', zip3: 402, zone: '7a' },
  { city: 'New Orleans, LA', state: 'LA', zip3: 701, zone: '9b' },
  { city: 'Portland, ME', state: 'ME', zip3: 41, zone: '6a' },
  { city: 'Baltimore, MD', state: 'MD', zip3: 212, zone: '8a' },
  { city: 'Boston, MA', state: 'MA', zip3: 21, zone: '7a' },
  { city: 'Detroit, MI', state: 'MI', zip3: 482, zone: '6b' },
  { city: 'Minneapolis, MN', state: 'MN', zip3: 554, zone: '5a' },
  { city: 'Jackson, MS', state: 'MS', zip3: 392, zone: '8b' },
  { city: 'Kansas City, MO', state: 'MO', zip3: 641, zone: '6b' },
  { city: 'Billings, MT', state: 'MT', zip3: 591, zone: '5a' },
  { city: 'Omaha, NE', state: 'NE', zip3: 681, zone: '6a' },
  { city: 'Las Vegas, NV', state: 'NV', zip3: 891, zone: '9b' },
  { city: 'Manchester, NH', state: 'NH', zip3: 31, zone: '6a' },
  { city: 'Newark, NJ', state: 'NJ', zip3: 71, zone: '7b' },
  { city: 'Albuquerque, NM', state: 'NM', zip3: 871, zone: '7b' },
  { city: 'New York, NY', state: 'NY', zip3: 100, zone: '7b' },
  { city: 'Buffalo, NY', state: 'NY', zip3: 142, zone: '6b' },
  { city: 'Charlotte, NC', state: 'NC', zip3: 282, zone: '8a' },
  { city: 'Fargo, ND', state: 'ND', zip3: 581, zone: '4a' },
  { city: 'Columbus, OH', state: 'OH', zip3: 432, zone: '6b' },
  { city: 'Oklahoma City, OK', state: 'OK', zip3: 731, zone: '7b' },
  { city: 'Portland, OR', state: 'OR', zip3: 972, zone: '8b' },
  { city: 'Bend, OR', state: 'OR', zip3: 977, zone: '6b' },
  { city: 'Philadelphia, PA', state: 'PA', zip3: 191, zone: '7b' },
  { city: 'Providence, RI', state: 'RI', zip3: 29, zone: '7a' },
  { city: 'Columbia, SC', state: 'SC', zip3: 292, zone: '8b' },
  { city: 'Sioux Falls, SD', state: 'SD', zip3: 571, zone: '5a' },
  { city: 'Nashville, TN', state: 'TN', zip3: 372, zone: '7b' },
  { city: 'Dallas, TX', state: 'TX', zip3: 752, zone: '8b' },
  { city: 'Houston, TX', state: 'TX', zip3: 770, zone: '9b' },
  { city: 'San Antonio, TX', state: 'TX', zip3: 782, zone: '9a' },
  { city: 'Amarillo, TX', state: 'TX', zip3: 791, zone: '7a' },
  { city: 'El Paso, TX', state: 'TX', zip3: 799, zone: '8b' },
  { city: 'Salt Lake City, UT', state: 'UT', zip3: 841, zone: '7b' },
  { city: 'Burlington, VT', state: 'VT', zip3: 54, zone: '5b' },
  { city: 'Richmond, VA', state: 'VA', zip3: 232, zone: '7b' },
  { city: 'Seattle, WA', state: 'WA', zip3: 981, zone: '9a' },
  { city: 'Spokane, WA', state: 'WA', zip3: 992, zone: '7a' },
  { city: 'Charleston, WV', state: 'WV', zip3: 253, zone: '7a' },
  { city: 'Milwaukee, WI', state: 'WI', zip3: 532, zone: '6a' },
  { city: 'Cheyenne, WY', state: 'WY', zip3: 820, zone: '5b' },
];

export function findZoneForZip(zip: string): { zone: string; refCity: string } | null {
  if (zip.length !== 5) return null;
  const zip3 = parseInt(zip.slice(0, 3), 10);
  if (!Number.isFinite(zip3)) return null;

  const range = ZIP3_TO_STATE.find((r) => zip3 >= r.start && zip3 <= r.end);
  if (!range) return null;

  const candidates = REFERENCE_CITIES.filter((c) => c.state === range.state);
  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestDist = Math.abs(candidates[0].zip3 - zip3);
  for (const c of candidates.slice(1)) {
    const dist = Math.abs(c.zip3 - zip3);
    if (dist < bestDist) {
      best = c;
      bestDist = dist;
    }
  }
  return { zone: best.zone, refCity: best.city };
}

// ---------------------------------------------------------------------------
// Zone -> frost date range data. Ranges (not single dates) are used
// deliberately: these are general USDA-hardiness-zone-based approximations,
// not station-level climate normals. Actual dates for any specific location
// can vary from these ranges by one to several weeks depending on elevation,
// urban heat island effect, distance from water, and other microclimate
// factors.
// ---------------------------------------------------------------------------
export interface ZoneFrostData {
  lastFrostStart: [number, number]; // [month(0-11), day]
  lastFrostEnd: [number, number];
  firstFrostStart: [number, number];
  firstFrostEnd: [number, number];
  frostFree?: boolean;
}

// Center dates for zones 3, 5, 8, 9, and 10 are anchored directly to the
// commonly-cited zone-level frost date approximations (May 15/Sep 15 for
// zone 3, Apr 15/Oct 15 for zone 5, Mar 15/Nov 15 for zone 8, Feb 15/Dec 15
// for zone 9, and ~Jan 31 for zone 10 — the same figures widely published by
// seed companies and extension-adjacent gardening references). Zones 2, 4, 6,
// and 7 are linearly interpolated between those anchors rather than copied
// flatly, since frost timing genuinely shifts zone-to-zone even where the
// coarse public tables round several zones to the same figure. Each date is
// then shown as a +/- 7 day window, not a single point, to reflect real
// year-to-year variability at the zone level.
export const ZONE_FROST_DATA: Record<string, ZoneFrostData> = {
  '2': { lastFrostStart: [4, 23], lastFrostEnd: [5, 6], firstFrostStart: [7, 24], firstFrostEnd: [8, 7] },
  '3': { lastFrostStart: [4, 8], lastFrostEnd: [4, 22], firstFrostStart: [8, 8], firstFrostEnd: [8, 22] },
  '4': { lastFrostStart: [3, 23], lastFrostEnd: [4, 7], firstFrostStart: [8, 23], firstFrostEnd: [9, 7] },
  '5': { lastFrostStart: [3, 8], lastFrostEnd: [3, 22], firstFrostStart: [9, 8], firstFrostEnd: [9, 22] },
  '6': { lastFrostStart: [2, 29], lastFrostEnd: [3, 12], firstFrostStart: [9, 18], firstFrostEnd: [10, 1] },
  '7': { lastFrostStart: [2, 18], lastFrostEnd: [3, 1], firstFrostStart: [9, 29], firstFrostEnd: [10, 12] },
  '8': { lastFrostStart: [2, 8], lastFrostEnd: [2, 22], firstFrostStart: [10, 8], firstFrostEnd: [10, 22] },
  '9': { lastFrostStart: [1, 8], lastFrostEnd: [1, 22], firstFrostStart: [11, 8], firstFrostEnd: [11, 22] },
  '10': { lastFrostStart: [0, 24], lastFrostEnd: [1, 7], firstFrostStart: [11, 24], firstFrostEnd: [0, 7], frostFree: true },
  '11': { lastFrostStart: [0, 1], lastFrostEnd: [0, 1], firstFrostStart: [11, 31], firstFrostEnd: [11, 31], frostFree: true },
  '12': { lastFrostStart: [0, 1], lastFrostEnd: [0, 1], firstFrostStart: [11, 31], firstFrostEnd: [11, 31], frostFree: true },
  '13': { lastFrostStart: [0, 1], lastFrostEnd: [0, 1], firstFrostStart: [11, 31], firstFrostEnd: [11, 31], frostFree: true },
};

export const ALL_ZONES = [
  '2a', '2b', '3a', '3b', '4a', '4b', '5a', '5b', '6a', '6b', '7a', '7b',
  '8a', '8b', '9a', '9b', '10a', '10b', '11a', '11b', '12a', '12b', '13a', '13b',
];

export const REF_YEAR = 2027; // arbitrary non-leap reference year; only month/day are ever displayed

export function mkDate(md: [number, number]): Date {
  return new Date(REF_YEAR, md[0], md[1]);
}

export function shiftWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + Math.round(weeks * 7));
  return d;
}

export function fmtDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((b.getTime() - a.getTime()) / msPerDay);
}

export function midpoint(a: Date, b: Date): Date {
  return new Date((a.getTime() + b.getTime()) / 2);
}

export function sanitizeZip(raw: string): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[^\d]/g, '').slice(0, 5);
}

export function fullZoneNumberFromZone(zone: string | null): string | null {
  if (!zone) return null;
  const match = zone.match(/^(\d+)/);
  return match ? match[1] : null;
}
