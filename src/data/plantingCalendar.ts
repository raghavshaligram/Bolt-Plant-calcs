// Data + calculation logic for the programmatic /planting-calendar/[state]/ pages.
//
// This module deliberately holds NO per-state frost data of its own. Every
// state's average last-frost and first-frost date is derived here from the
// coldestBand/warmestBand fields already established in src/data/states.ts
// (which in turn come from this site's own ZONE_FROST_DATA table in
// src/lib/frostZones.ts) -- never re-entered or re-derived from scratch.
//
// The only new data introduced in this file is the set of crop-level
// planting-offset rules below (weeks before/after last frost, and
// days-to-maturity + safety-margin for fall crops). These rules were
// verified against real US extension-service sources before being finalized
// here -- see the `source` field on each crop. Where extension sources
// disagreed or gave a fixed trigger (like a soil-temperature threshold)
// rather than a clean week-based offset, that nuance is preserved in the
// crop's `note` field rather than flattened into a falsely precise number.
//
// Given a state's two derived frost dates, applying these same fixed rules
// produces a genuinely different calculated calendar for every state --
// the offset rules are constant, the frost dates are not.

import type { LiveState } from './states';

export type FrostReference = 'lastFrost' | 'firstFrost';
export type OffsetDirection = 'before' | 'after';

export interface SpringOffset {
  reference: FrostReference;
  direction: OffsetDirection;
  minWeeks: number;
  maxWeeks: number | null; // null = open-ended ("2+ weeks after")
}

export interface FallOffset {
  daysToMaturityMin: number;
  daysToMaturityMax: number;
  safetyMarginDays: number;
  source: string;
  sourceUrl: string;
}

export interface CropLinkedGuide {
  label: string;
  url: string;
}

export interface Crop {
  slug: string;
  name: string;
  /** e.g. "Start indoors", "Direct sow", "Direct sow or transplant" */
  method: string;
  /** The primary spring-planting offset (start-indoors OR direct-sow/transplant) */
  springStart?: SpringOffset;
  /** A second spring offset, e.g. tomatoes: start indoors AND transplant */
  springSecondary?: SpringOffset;
  fall?: FallOffset;
  note?: string;
  source: string;
  sourceUrl: string;
  guide?: CropLinkedGuide;
}

// ---------------------------------------------------------------------------
// Crop offset rules
//
// Verified against real US Cooperative Extension sources before finalizing.
// Where a source gave a fixed trigger (soil temperature, "after all frost
// risk") rather than a clean week-based figure, that's captured in `note`
// rather than forced into a false week-range.
// ---------------------------------------------------------------------------

export const CROPS: Crop[] = [
  {
    slug: 'tomatoes',
    name: 'Tomatoes',
    method: 'Start indoors',
    springStart: { reference: 'lastFrost', direction: 'before', minWeeks: 6, maxWeeks: 8 },
    springSecondary: { reference: 'lastFrost', direction: 'after', minWeeks: 1, maxWeeks: 2 },
    note: 'Transplant once nighttime lows are reliably above 50°F, not just after the calendar frost date.',
    source: 'UGA Extension',
    sourceUrl: 'https://site.extension.uga.edu/fultonag/2020/02/seed-starting/',
    guide: { label: 'How to Grow Tomatoes from Seed', url: '/blog/how-to-grow-tomatoes-from-seed/' },
  },
  {
    slug: 'peppers',
    name: 'Peppers',
    method: 'Start indoors',
    springStart: { reference: 'lastFrost', direction: 'before', minWeeks: 8, maxWeeks: 10 },
    springSecondary: { reference: 'lastFrost', direction: 'after', minWeeks: 2, maxWeeks: null },
    note: 'Peppers want warmer soil than tomatoes -- when in doubt, wait the extra week.',
    source: 'UMN Extension / UNH Extension',
    sourceUrl: 'https://extension.umn.edu/vegetables/growing-peppers',
    guide: { label: 'How to Grow Peppers from Seed', url: '/blog/how-to-grow-peppers-from-seed/' },
  },
  {
    slug: 'cucumbers',
    name: 'Cucumbers',
    method: 'Direct sow or transplant',
    springStart: { reference: 'lastFrost', direction: 'after', minWeeks: 1, maxWeeks: 2 },
    note: 'The real trigger is soil temperature (70°F+ at 1 inch deep), not the calendar -- this window is a practical estimate of when that soil temperature typically arrives after the last frost.',
    source: 'Utah State University Extension / University of Illinois Extension',
    sourceUrl: 'https://extension.usu.edu/yardandgarden/research/cucumber-in-the-garden',
    guide: { label: 'How to Grow Cucumbers from Seed', url: '/blog/how-to-grow-cucumbers-from-seed/' },
  },
  {
    slug: 'beans',
    name: 'Beans',
    method: 'Direct sow',
    springStart: { reference: 'lastFrost', direction: 'after', minWeeks: 0, maxWeeks: 1 },
    note: 'Bean seed rots in cold, wet soil -- wait until the soil has warmed to at least 60°F.',
    source: 'Utah State University Extension',
    sourceUrl: 'https://extension.usu.edu/yardandgarden/research/beans-in-the-garden',
    guide: { label: 'How to Grow Beans from Seed', url: '/blog/how-to-grow-beans-from-seed/' },
  },
  {
    slug: 'lettuce',
    name: 'Lettuce',
    method: 'Direct sow',
    springStart: { reference: 'lastFrost', direction: 'before', minWeeks: 2, maxWeeks: 4 },
    fall: {
      daysToMaturityMin: 40,
      daysToMaturityMax: 50,
      safetyMarginDays: 14,
      source: 'NC State Extension',
      sourceUrl: 'https://content.ces.ncsu.edu/growing-a-fall-vegetable-garden',
    },
    note: 'Cold-tolerant -- a good candidate for succession sowing every 2-3 weeks through spring.',
    source: 'Michigan State University Extension / Utah State University Extension',
    sourceUrl: 'https://www.canr.msu.edu/resources/how_to_grow_lettuce',
    guide: { label: 'How to Grow Lettuce from Seed', url: '/blog/how-to-grow-lettuce-from-seed/' },
  },
  {
    slug: 'carrots',
    name: 'Carrots',
    method: 'Direct sow',
    springStart: { reference: 'lastFrost', direction: 'before', minWeeks: 2, maxWeeks: 5 },
    source: 'NC State Extension',
    sourceUrl: 'https://stem.plantsforhumanhealth.ncsu.edu/school-gardens/crop-guides/crop-guide-carrot/',
    guide: { label: 'How to Grow Carrots from Seed', url: '/blog/how-to-grow-carrots-from-seed/' },
  },
  {
    slug: 'squash-zucchini',
    name: 'Squash / zucchini',
    method: 'Direct sow or transplant',
    springStart: { reference: 'lastFrost', direction: 'after', minWeeks: 0, maxWeeks: 1 },
    note: 'Squash doesn’t tolerate cold -- wait for soil to reach about 70°F.',
    source: 'University of Maryland Extension',
    sourceUrl: 'https://extension.umd.edu/resource/growing-summer-squash-zucchini-home-garden',
  },
  {
    slug: 'broccoli',
    name: 'Broccoli',
    method: 'Start indoors',
    springStart: { reference: 'lastFrost', direction: 'before', minWeeks: 6, maxWeeks: 8 },
    fall: {
      daysToMaturityMin: 70,
      daysToMaturityMax: 80,
      safetyMarginDays: 14,
      source: 'NC State Extension',
      sourceUrl: 'https://content.ces.ncsu.edu/growing-a-fall-vegetable-garden',
    },
    source: 'NC State Extension',
    sourceUrl: 'https://stem.plantsforhumanhealth.ncsu.edu/school-gardens/crop-guides/crop-guide-broccoli/',
  },
  {
    slug: 'spinach',
    name: 'Spinach',
    method: 'Direct sow',
    springStart: { reference: 'lastFrost', direction: 'before', minWeeks: 4, maxWeeks: 6 },
    fall: {
      daysToMaturityMin: 50,
      daysToMaturityMax: 60,
      safetyMarginDays: 14,
      source: 'NC State Extension',
      sourceUrl: 'https://content.ces.ncsu.edu/growing-a-fall-vegetable-garden',
    },
    note: 'Sow as soon as the soil can be worked -- extension sources cite anywhere from 2-8 weeks before last frost depending on region; this is a middle estimate.',
    source: 'Penn State Extension / Utah State University Extension',
    sourceUrl: 'https://extension.psu.edu/growing-spinach-a-cool-season-vegetable',
  },
  {
    slug: 'peas',
    name: 'Peas',
    method: 'Direct sow',
    springStart: { reference: 'lastFrost', direction: 'before', minWeeks: 4, maxWeeks: 6 },
    note: 'Cold-tolerant -- sow as soon as the soil can be worked.',
    source: 'UConn Home & Garden Education Center',
    sourceUrl: 'https://homegarden.cahnr.uconn.edu/peas/',
  },
  {
    slug: 'onions',
    name: 'Onions (sets or transplants)',
    method: 'Plant sets/transplants',
    springStart: { reference: 'lastFrost', direction: 'before', minWeeks: 2, maxWeeks: 4 },
    note: 'This window is for long-day onion varieties, the standard choice across most of the US. Gardeners in the Deep South growing short-day varieties follow a different fall/winter planting schedule.',
    source: 'Iowa State University Extension',
    sourceUrl: 'https://yardandgarden.extension.iastate.edu/article/2018/01/planting-onions-home-garden',
  },
  {
    slug: 'radishes',
    name: 'Radishes',
    method: 'Direct sow',
    springStart: { reference: 'lastFrost', direction: 'before', minWeeks: 4, maxWeeks: 6 },
    note: 'Fast-maturing -- a reliable succession crop every 1-2 weeks through spring.',
    source: 'Michigan State University Extension',
    sourceUrl: 'https://www.canr.msu.edu/resources/how_to_grow_radishes',
  },
  {
    slug: 'corn',
    name: 'Corn',
    method: 'Direct sow',
    springStart: { reference: 'lastFrost', direction: 'after', minWeeks: 0, maxWeeks: 1 },
    note: 'Needs soil temperature of at least 50°F to germinate, with 65-75°F optimal for even germination.',
    source: 'University of Maryland Extension / Iowa State University Extension',
    sourceUrl: 'https://extension.umd.edu/resource/growing-sweet-corn-home-garden',
  },
  {
    slug: 'pumpkins',
    name: 'Pumpkins',
    method: 'Direct sow',
    springStart: { reference: 'lastFrost', direction: 'after', minWeeks: 0, maxWeeks: 1 },
    note: 'Soil should reach about 65-70°F. If timing for a fall harvest target, count backward from your target date using the variety’s days-to-maturity instead of using this spring window.',
    source: 'University of Maryland Extension / WVU Extension',
    sourceUrl: 'https://extension.umd.edu/resource/growing-pumpkins-home-garden',
  },
  {
    slug: 'beets',
    name: 'Beets',
    method: 'Direct sow',
    springStart: { reference: 'lastFrost', direction: 'before', minWeeks: 2, maxWeeks: 4 },
    source: 'Utah State University Extension',
    sourceUrl: 'https://extension.usu.edu/yardandgarden/research/beets-in-the-garden.php',
  },
  {
    slug: 'cabbage',
    name: 'Cabbage',
    method: 'Start indoors',
    springStart: { reference: 'lastFrost', direction: 'before', minWeeks: 6, maxWeeks: 8 },
    source: 'Utah State University Extension',
    sourceUrl: 'https://extension.usu.edu/yardandgarden/research/cabbage-in-the-garden',
  },
  {
    slug: 'cauliflower',
    name: 'Cauliflower',
    method: 'Start indoors',
    springStart: { reference: 'lastFrost', direction: 'before', minWeeks: 6, maxWeeks: 8 },
    note: 'Extension sources vary more on this crop than most (some cite as few as 4 weeks, others up to 10) -- this range is a defensible middle estimate, usually grown on the same schedule as cabbage.',
    source: 'Iowa State University Extension',
    sourceUrl: 'https://yardandgarden.extension.iastate.edu/how-to/growing-cauliflower-home-garden',
  },
  {
    slug: 'kale',
    name: 'Kale',
    method: 'Direct sow',
    springStart: { reference: 'lastFrost', direction: 'before', minWeeks: 4, maxWeeks: 6 },
    fall: {
      daysToMaturityMin: 40,
      daysToMaturityMax: 50,
      safetyMarginDays: 14,
      source: 'NC State Extension',
      sourceUrl: 'https://content.ces.ncsu.edu/growing-a-fall-vegetable-garden',
    },
    source: 'UMN Extension',
    sourceUrl: 'https://extension.umn.edu/planting-and-growing-guides/planting-vegetables-midsummer-fall-harvest',
  },
  {
    slug: 'basil',
    name: 'Basil',
    method: 'Start indoors',
    springStart: { reference: 'lastFrost', direction: 'before', minWeeks: 6, maxWeeks: 8 },
    springSecondary: { reference: 'lastFrost', direction: 'after', minWeeks: 2, maxWeeks: null },
    note: 'Frost-sensitive, unlike the cold-tolerant crops above -- transplant only after ALL frost risk has passed and soil has warmed to 60°F or more.',
    source: 'UF/IFAS Extension / Penn State Extension',
    sourceUrl: 'https://blogs.ifas.ufl.edu/pascoco/2024/03/08/spice-up-your-life-a-beginners-guide-to-growing-basil/',
  },
];

// ---------------------------------------------------------------------------
// Frost-date parsing and derivation
//
// A state's coldestBand/warmestBand each carry their own "Mon D - Mon D"
// range (or "Effectively frost-free"). To get ONE representative average
// last-frost / first-frost date for the state -- the number the spec calls
// for -- we take the midpoint of each band's own range, then average the
// two bands together. If one band is frost-free and the other isn't (true
// for California and Florida, whose warmest band is coastal/Keys and
// genuinely frost-free), we use only the non-frost-free band and flag it,
// rather than average a real date with "no date." If BOTH bands are
// frost-free (true only for Hawaii), the state has no meaningful last/first
// frost date at all, and the page renders a frost-free variant instead of a
// calculated table.
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const REFERENCE_YEAR = 2025; // non-leap, arbitrary -- only used for day-of-year math

function parseMonthDay(str: string): Date {
  const [monAbbr, dayStr] = str.trim().split(/\s+/);
  const month = MONTHS.indexOf(monAbbr);
  return new Date(REFERENCE_YEAR, month, parseInt(dayStr, 10));
}

function parseRange(range: string): { start: Date; end: Date } | null {
  if (range === 'Effectively frost-free') return null;
  const [startStr, endStr] = range.split(' - ');
  return { start: parseMonthDay(startStr), end: parseMonthDay(endStr) };
}

function midpoint(a: Date, b: Date): Date {
  return new Date((a.getTime() + b.getTime()) / 2);
}

function bandMidpoint(rangeStr: string): Date | null {
  const range = parseRange(rangeStr);
  if (!range) return null;
  return midpoint(range.start, range.end);
}

export function formatDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

function addWeeks(d: Date, weeks: number): Date {
  return addDays(d, weeks * 7);
}

export interface StateFrostAverages {
  lastFrost: Date | null;
  firstFrost: Date | null;
  hasFrostFreeRegion: boolean; // one band (not both) is frost-free
  fullyFrostFree: boolean; // both bands frost-free (Hawaii)
}

export function getStateFrostAverages(state: LiveState): StateFrostAverages {
  const coldestLast = bandMidpoint(state.coldestBand.lastFrostRange);
  const warmestLast = bandMidpoint(state.warmestBand.lastFrostRange);
  const coldestFirst = bandMidpoint(state.coldestBand.firstFrostRange);
  const warmestFirst = bandMidpoint(state.warmestBand.firstFrostRange);

  const fullyFrostFree = coldestLast === null && warmestLast === null;

  const lastFrost =
    coldestLast && warmestLast ? midpoint(coldestLast, warmestLast) : coldestLast || warmestLast;
  const firstFrost =
    coldestFirst && warmestFirst ? midpoint(coldestFirst, warmestFirst) : coldestFirst || warmestFirst;

  const hasFrostFreeRegion = !fullyFrostFree && (coldestLast === null || warmestLast === null);

  return { lastFrost, firstFrost, hasFrostFreeRegion, fullyFrostFree };
}

// ---------------------------------------------------------------------------
// Per-crop calendar computation
// ---------------------------------------------------------------------------

export interface CropWindow {
  label: string; // e.g. "Start indoors" or "Transplant / direct sow"
  rangeText: string; // e.g. "Feb 15 - Mar 1"
}

export interface CropCalendarEntry {
  crop: Crop;
  windows: CropWindow[];
  fallWindowText: string | null;
}

function computeSpringWindow(offset: SpringOffset, lastFrost: Date, firstFrost: Date): string {
  const referenceDate = offset.reference === 'lastFrost' ? lastFrost : firstFrost;
  if (offset.direction === 'before') {
    const earlier = addWeeks(referenceDate, -offset.maxWeeks!);
    const later = addWeeks(referenceDate, -offset.minWeeks);
    return `${formatDate(earlier)} - ${formatDate(later)}`;
  }
  // after
  const earlier = addWeeks(referenceDate, offset.minWeeks);
  if (offset.maxWeeks === null) {
    return `${formatDate(earlier)} and later`;
  }
  const later = addWeeks(referenceDate, offset.maxWeeks);
  return `${formatDate(earlier)} - ${formatDate(later)}`;
}

function computeFallWindow(fall: FallOffset, firstFrost: Date): string {
  // Latest safe sow date = firstFrost - (daysToMaturity + safetyMargin)
  const earliestCutoff = addDays(firstFrost, -(fall.daysToMaturityMax + fall.safetyMarginDays));
  const latestCutoff = addDays(firstFrost, -(fall.daysToMaturityMin + fall.safetyMarginDays));
  return `Sow by ${formatDate(earliestCutoff)} - ${formatDate(latestCutoff)}`;
}

export function buildStateCalendar(state: LiveState): CropCalendarEntry[] | null {
  const { lastFrost, firstFrost, fullyFrostFree } = getStateFrostAverages(state);
  if (fullyFrostFree || !lastFrost || !firstFrost) return null;

  return CROPS.map((crop) => {
    const windows: CropWindow[] = [];
    if (crop.springStart) {
      windows.push({
        label: crop.method,
        rangeText: computeSpringWindow(crop.springStart, lastFrost, firstFrost),
      });
    }
    if (crop.springSecondary) {
      windows.push({
        label: crop.springStart?.direction === 'before' ? 'Transplant outdoors' : 'Direct sow / transplant',
        rangeText: computeSpringWindow(crop.springSecondary, lastFrost, firstFrost),
      });
    }
    const fallWindowText = crop.fall ? computeFallWindow(crop.fall, firstFrost) : null;
    return { crop, windows, fallWindowText };
  });
}
