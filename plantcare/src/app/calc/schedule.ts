/*
 * When each plant next needs something, and why.
 *
 * The whole product rests on this file. An app that tells everyone to water
 * everything every seven days is a calendar reminder with plant pictures on it,
 * and the buyer works that out in a fortnight. So nothing here is a flat
 * default: a snake plant in a 14-inch pot in a Zone 5 January and a maidenhair
 * fern in a 4-inch pot in a Zone 9 July are three weeks apart, and they get
 * there through factors a person can read back.
 *
 * Every interval comes out with its reasoning attached — `factors` below — and
 * the UI shows it. That is not decoration. A schedule nobody can interrogate is
 * a schedule nobody trusts, and the first time it says something surprising
 * ("this one goes 24 days?") the answer has to be on the same screen.
 *
 * The season comes from the ported USDA frost data, not from month numbers.
 * That is a proxy and is documented as one: frost dates describe the outdoor
 * growing window at that latitude, and indoors the thing that actually slows a
 * plant down is daylight. The two track each other closely enough to be worth
 * far more than hardcoding "winter is December to February", which is wrong for
 * most of the country and wrong in both directions.
 */
// Imported by relative path, not through the `@ported` alias, so that the
// verification scripts can `import()` this module in plain node — the engine
// has to be testable without a bundler standing between it and the test.
import { ZONE_FROST_DATA, type ZoneFrostData } from '../data/ported/zones.ts'
import type { Species, LightNeed } from '../data/ported/species.ts'
import { addDays, dayOfYear, dayOfYearMD, parseISO, type ISODate } from './dates.ts'
import { weatherEffect, type WeatherReading } from '../data/weather.ts'

/*
 * The six jobs the brief names, plus turning.
 *
 * Turning is not in the brief. It is here because it costs one line of code and
 * it is the reason half the houseplants in the world lean — and because it is
 * the one job on this list that is genuinely the same for every plant, which
 * makes it the cheapest honest thing the app can offer.
 */
export type CareType = 'water' | 'feed' | 'mist' | 'prune' | 'clean' | 'repot' | 'rotate'

export const CARE_TYPES: CareType[] = ['water', 'feed', 'mist', 'prune', 'clean', 'repot', 'rotate']

export const CARE_LABEL: Record<CareType, string> = {
  water: 'Water',
  feed: 'Feed',
  mist: 'Mist',
  prune: 'Prune',
  clean: 'Dust',
  repot: 'Repot',
  rotate: 'Turn',
}

export type Season = 'growing' | 'shoulder' | 'dormant'

export const SEASON_LABEL: Record<Season, string> = {
  growing: 'growing season',
  shoulder: 'shoulder season',
  dormant: 'dormant season',
}

export type Where = 'indoor' | 'outdoor'
export type Drainage = 'free' | 'standard' | 'slow'

export interface Placement {
  /** Pot diameter in inches. 6 in is the reference the species baseDays assume. */
  potDiameterIn: number
  where: Where
  /** USDA zone as the ported data writes it: "6b", or "6". */
  zone: string
  /** The light the spot actually gets, when the owner has said. Not what the plant wants. */
  light?: LightNeed
  drainage?: Drainage
  /** A humidifier, a pebble tray, a bathroom. Slows drying and removes the case for misting. */
  humidified?: boolean
  /**
   * The owner's own weather reading, when they have switched that on.
   *
   * Undefined in every default build. Nothing in this file knows where it came
   * from, and nothing here can fetch it — see data/weather.ts for why that
   * separation is deliberate rather than tidy.
   */
  weather?: WeatherReading
}

export interface Factor {
  /** What was taken into account. */
  label: string
  /** The multiplier applied. 1 means it was considered and changed nothing. */
  factor: number
  /** The sentence the app shows. Plain English, no jargon, no hedging. */
  why: string
}

export interface Interval {
  /** Whole days. Null means this care type does not apply to this plant right now. */
  days: number | null
  season: Season
  factors: Factor[]
  /** Set when `days` is null, saying why rather than showing nothing. */
  skipped?: string
}

// ---- season ------------------------------------------------------------------

const LIGHT_ORDER: LightNeed[] = ['low', 'medium', 'bright', 'direct']

/** "6b" -> "6". The frost table is keyed by the whole zone. */
export function zoneNumber(zone: string): string {
  const m = /^(\d{1,2})/.exec(zone.trim())
  return m ? m[1] : '6'
}

export function frostDataFor(zone: string): ZoneFrostData {
  return ZONE_FROST_DATA[zoneNumber(zone)] ?? ZONE_FROST_DATA['6']
}

/** How many days either side of the frost window count as the shoulder. */
export const SHOULDER_DAYS = 28

/**
 * Growing, shoulder or dormant, for this zone on this date.
 *
 * Frost-free zones never get a dormant season — a plant in Zone 11 does not
 * stop — but they do get a shoulder through the darkest eight weeks, because
 * day length falls everywhere and a plant in Miami in January is still taking
 * up less water than the same plant in June.
 */
export function seasonFor(zone: string, date: ISODate): Season {
  const f = frostDataFor(zone)
  const { y } = parseISO(date)
  const n = dayOfYear(date)

  if (f.frostFree) {
    const decStart = dayOfYearMD([11, 1], y)
    const janEnd = dayOfYearMD([0, 31], y)
    return n >= decStart || n <= janEnd ? 'shoulder' : 'growing'
  }

  const start = dayOfYearMD(f.lastFrostEnd, y)
  const end = dayOfYearMD(f.firstFrostStart, y)
  if (n >= start && n <= end) return 'growing'
  if (n >= start - SHOULDER_DAYS && n <= end + SHOULDER_DAYS) return 'shoulder'
  return 'dormant'
}

/** The first day of the next growing season — where a spring-only job lands. */
export function nextGrowingSeasonStart(zone: string, from: ISODate): ISODate {
  const f = frostDataFor(zone)
  if (f.frostFree) return from
  const { y } = parseISO(from)
  for (let year = y; year <= y + 1; year++) {
    const n = dayOfYearMD(f.lastFrostEnd, year)
    const target = addDays(`${year}-01-01`, n - 1)
    if (target >= from) return target
  }
  return from
}

// ---- watering ----------------------------------------------------------------

/** The pot size the species table's baseDays are written for. */
export const REFERENCE_POT_IN = 6

/**
 * How much slower a bigger pot dries.
 *
 * Water loss scales with surface area and with how much root is in there;
 * volume scales with the cube. Neither exponent is right on its own, and the
 * honest answer is somewhere between — 0.6 puts a 4-inch pot at about 0.78 and
 * a 12-inch at about 1.5, which matches what happens on a windowsill. Clamped
 * at both ends so a 2-inch propagation pot and a half-barrel stay sane.
 */
function potFactor(diameterIn: number): Factor {
  const d = Math.max(1.5, Math.min(30, diameterIn))
  const raw = Math.pow(d / REFERENCE_POT_IN, 0.6)
  const factor = Math.max(0.5, Math.min(2.2, raw))
  const why =
    d < REFERENCE_POT_IN
      ? `A ${round(d)} in pot holds less soil than the ${REFERENCE_POT_IN} in this figure assumes, so it dries sooner.`
      : d > REFERENCE_POT_IN
        ? `A ${round(d)} in pot holds more soil, so it stays damp longer.`
        : `A ${REFERENCE_POT_IN} in pot, which is what the base figure assumes.`
  return { label: 'Pot size', factor, why }
}

/**
 * Winter is not one number.
 *
 * A plant that wants its soil arid is the one that dies in a dormant season —
 * cold wet compost and no growth is how every snake plant and jade is killed —
 * so it gets the largest stretch. A bog plant barely changes, because it still
 * cannot be allowed to dry out in January.
 */
const DORMANT_BY_WATER: Record<Species['water'], number> = {
  arid: 2.2,
  'dry-between': 1.6,
  'evenly-moist': 1.4,
  wet: 1.15,
}

function seasonFactor(species: Species, season: Season): Factor {
  if (season === 'growing') {
    return { label: 'Season', factor: 1, why: 'It is the growing season here, so the plant is drinking normally.' }
  }
  if (season === 'shoulder') {
    return {
      label: 'Season',
      factor: 1.2,
      why: 'Growth is slowing with the light, so it needs a little less than at midsummer.',
    }
  }
  const factor = DORMANT_BY_WATER[species.water]
  return {
    label: 'Season',
    factor,
    why:
      species.water === 'arid'
        ? 'It is resting, and cold wet soil in winter is what actually kills this kind of plant.'
        : 'It is resting, so it takes up water more slowly than in summer.',
  }
}

function placeFactor(where: Where, season: Season, zone: string): Factor {
  if (where === 'indoor') {
    return { label: 'Indoors', factor: 1, why: 'Indoors, out of wind and direct weather.' }
  }
  const n = Number(zoneNumber(zone))
  if (season === 'dormant') {
    return { label: 'Outdoors', factor: 1.5, why: 'Outdoors in the cold, with rain doing some of the work.' }
  }
  const heat = n >= 9 ? 0.85 : n <= 4 ? 1.1 : 1
  const base = season === 'growing' ? 0.7 : 0.9
  return {
    label: 'Outdoors',
    factor: base * heat,
    why:
      n >= 9
        ? `Outdoors in zone ${zone}, where sun and wind pull water out faster than indoors, and the summers are hot.`
        : `Outdoors, where sun and wind pull water out faster than indoors.`,
  }
}

/**
 * The spot's light against what the species wants.
 *
 * A pothos in a dark hallway needs less water than the same pothos in a bright
 * window, and watering it as though it were in the window is the single most
 * common way a houseplant dies. So a dim spot lengthens the interval — which
 * feels backwards to most people, and is exactly why the sentence is shown.
 */
function lightFactor(species: Species, light?: LightNeed): Factor | null {
  if (!light) return null
  const delta = LIGHT_ORDER.indexOf(light) - LIGHT_ORDER.indexOf(species.light)
  if (delta === 0) {
    return { label: 'Light', factor: 1, why: 'The spot gives about the light this plant wants.' }
  }
  const factor = Math.max(0.75, Math.min(1.45, 1 - delta * 0.14))
  return {
    label: 'Light',
    factor,
    why:
      delta < 0
        ? 'The spot is dimmer than this plant would like, so it grows slower and drinks less. Watering it on a bright-window schedule is what rots the roots.'
        : 'The spot is brighter than this plant needs, so it is working harder and drying faster.',
  }
}

const DRAINAGE_FACTOR: Record<Drainage, number> = { free: 0.85, standard: 1, slow: 1.25 }

function drainageFactor(d?: Drainage): Factor | null {
  if (!d || d === 'standard') return null
  return {
    label: 'Soil',
    factor: DRAINAGE_FACTOR[d],
    why:
      d === 'free'
        ? 'A gritty, free-draining mix lets water through quickly.'
        : 'Dense compost or a pot with no drainage hole holds water far longer than it looks.',
  }
}

function humidityFactor(species: Species, p: Placement): Factor | null {
  if (!p.humidified) return null
  if (species.humidity === 'low') return null
  return { label: 'Humidity', factor: 1.1, why: 'Damp air around it means the pot dries more slowly.' }
}

const round = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/**
 * Days between waterings for this plant, in this pot, in this place, on this date.
 *
 * Bounded at 1 and 90: not because the maths cannot produce 0.4 or 140, but
 * because either would be the app confidently instructing somebody to do
 * something wrong, and a bound is cheaper than finding out which factor drifted.
 */
export function wateringInterval(species: Species, p: Placement, date: ISODate): Interval {
  const season = seasonFor(p.zone, date)
  const factors: Factor[] = [
    potFactor(p.potDiameterIn),
    seasonFactor(species, season),
    placeFactor(p.where, season, p.zone),
  ]
  for (const f of [lightFactor(species, p.light), drainageFactor(p.drainage), humidityFactor(species, p)]) {
    if (f) factors.push(f)
  }

  /* Last, so it reads last: the weather is a correction to a considered figure,
     not the thing the figure is built from. */
  const weather = weatherEffect(p.weather, p.where, date)
  if (weather) factors.push({ label: 'Weather', factor: weather.factor, why: weather.why })

  const days = factors.reduce((n, f) => n * f.factor, species.baseDays)
  return { days: Math.max(1, Math.min(90, Math.round(days))), season, factors }
}

// ---- everything else ---------------------------------------------------------

const FEED_DAYS: Record<Species['feed'], number | null> = {
  none: null,
  light: 42,
  average: 28,
  heavy: 14,
}

export function feedInterval(species: Species, p: Placement, date: ISODate): Interval {
  const season = seasonFor(p.zone, date)
  const base = FEED_DAYS[species.feed]
  if (base === null) {
    return {
      days: null,
      season,
      factors: [],
      skipped: 'This one does not want feeding. Most succulents and cacti do better hungry than fed.',
    }
  }
  if (season === 'dormant') {
    return {
      days: null,
      season,
      factors: [],
      skipped:
        'Not while it is resting. Fertiliser a plant cannot use builds up as salts in the compost and burns the roots.',
    }
  }
  const factor = season === 'shoulder' ? 1.5 : 1
  return {
    days: Math.round(base * factor),
    season,
    factors: [
      {
        label: 'Season',
        factor,
        why:
          season === 'shoulder'
            ? 'Growth is slowing, so feed at half strength or half as often — this figure is the second one.'
            : 'In full growth, which is the only time feeding does much.',
      },
    ],
  }
}

export function mistInterval(species: Species, p: Placement, date: ISODate): Interval {
  const season = seasonFor(p.zone, date)
  if (!species.mist) {
    return {
      days: null,
      season,
      factors: [],
      skipped:
        'Misting does nothing useful for this plant. The water evaporates in minutes, and on furry or succulent leaves it causes marks and rot.',
    }
  }
  if (p.where === 'outdoor') {
    return { days: null, season, factors: [], skipped: 'Outdoors, the weather handles this.' }
  }
  if (p.humidified) {
    return {
      days: null,
      season,
      factors: [],
      skipped: 'You have already sorted the humidity, which works far better than misting ever does.',
    }
  }
  return {
    days: season === 'growing' ? 2 : 3,
    season,
    factors: [
      {
        label: 'Honest note',
        factor: 1,
        why: 'Misting raises humidity for about twenty minutes. It helps a little, every day, or not at all — a humidifier or a pebble tray is the real fix.',
      },
    ],
  }
}

/*
 * Pruning and dusting, derived from the plant's group rather than from a column.
 *
 * This is the honest compromise, and it is written down rather than hidden: the
 * species table has no "leaf texture" or "growth habit" field, and adding two
 * more columns across three hundred rows would produce three hundred guesses
 * typed quickly, which is worse data than a rule that is right about a whole
 * group. What a group can carry is the thing that actually decides these two
 * jobs — a vine goes bare at the top and wants cutting back, a palm grows from
 * one crown and dies if you cut it, a fern's fronds are the plant.
 *
 * Where the rule would give bad advice, the answer is "don't", with the reason.
 * An app that schedules a monthly prune for a kentia palm is worse than one that
 * says nothing at all.
 */
const PRUNE_DAYS: Partial<Record<Species['group'], number>> = {
  vine: 56,
  herb: 21,
  flowering: 21,
  vegetable: 14,
  foliage: 120,
  tree: 180,
  other: 180,
}

const PRUNE_SKIP: Partial<Record<Species['group'], string>> = {
  palm: 'Palms grow from a single crown. Cutting the top kills the plant — the only thing to remove is a frond that has already gone fully brown.',
  fern: 'The fronds are the plant. Cut out the dead ones as they appear and leave the rest alone.',
  succulent: 'Nothing to prune on a schedule. Take an offset or behead a stretched rosette when you want to, not when a calendar says so.',
  prayer: 'Just remove a leaf once it has browned off. There is no shape to keep.',
  carnivore: 'Trim a trap once it is fully black, and no sooner — it is still feeding the plant while any green remains.',
}

export function pruneInterval(species: Species, p: Placement, date: ISODate): Interval {
  const season = seasonFor(p.zone, date)
  const skip = PRUNE_SKIP[species.group]
  if (skip) return { days: null, season, factors: [], skipped: skip }

  const base = PRUNE_DAYS[species.group]
  if (!base) return { days: null, season, factors: [], skipped: 'Nothing here needs cutting back on a schedule.' }

  if (season === 'dormant') {
    return {
      days: null,
      season,
      factors: [],
      skipped:
        'Not while it is resting. A cut made now sits open through the darkest months, and the plant cannot grow away from it.',
    }
  }
  const factor = season === 'shoulder' ? 1.5 : 1
  return {
    days: Math.round(base * factor),
    season,
    factors: [
      {
        label: 'Why',
        factor,
        why:
          species.group === 'vine'
            ? 'Pinch the tips, or it goes bare at the top and long at the bottom. Cut just above a leaf and it branches from there.'
            : species.group === 'herb'
              ? 'Keep pinching the growing tips. The moment it flowers the leaves go coarse, and that is the end of the useful crop.'
              : species.group === 'flowering'
                ? 'Deadhead as the flowers go over. A plant allowed to set seed stops making new flowers.'
                : species.group === 'vegetable'
                  ? 'Take off the side shoots and anything yellowing at the base, so the plant is feeding fruit rather than leaves.'
                  : 'A light shape-up in growth, cutting above a node so it branches rather than scarring.',
      },
    ],
  }
}

/** Dusting. Groups where a cloth does damage get told why instead. */
const CLEAN_DAYS: Partial<Record<Species['group'], number>> = {
  tree: 28,
  foliage: 28,
  prayer: 35,
  vine: 42,
  palm: 42,
  flowering: 56,
  succulent: 60,
  other: 60,
}

export function cleanInterval(species: Species, p: Placement, date: ISODate): Interval {
  const season = seasonFor(p.zone, date)
  if (p.where === 'outdoor') {
    return { days: null, season, factors: [], skipped: 'Outdoors the rain does this.' }
  }
  const base = CLEAN_DAYS[species.group]
  if (!base) {
    return {
      days: null,
      season,
      factors: [],
      skipped:
        species.group === 'fern'
          ? 'Fern fronds tear. Rinse it in the shower or under a tap instead of wiping anything.'
          : species.group === 'carnivore'
            ? 'Do not wipe the traps. A rinse with rainwater is all they want.'
            : 'Not worth wiping. Rinse it if it looks dusty.',
    }
  }
  return {
    days: base,
    season,
    factors: [
      {
        label: 'Why',
        factor: 1,
        why: 'Dust on a leaf is shade on a leaf. A wipe with a damp cloth, supporting the leaf from underneath, is most of what leaf-shine products claim to do.',
      },
      ...(species.group === 'succulent'
        ? [
            {
              label: 'Careful',
              factor: 1,
              why: 'Many succulents carry a powdery bloom that rubs off permanently and does not grow back. Use a soft brush, not a cloth.',
            },
          ]
        : []),
    ],
  }
}

export function repotInterval(species: Species, p: Placement, date: ISODate): Interval {
  const season = seasonFor(p.zone, date)
  if (species.repotYears === 0) {
    return {
      days: null,
      season,
      factors: [],
      skipped: 'This one is not grown in compost, so there is nothing to repot.',
    }
  }
  return {
    days: Math.round(species.repotYears * 365),
    season,
    factors: [
      {
        label: 'Timing',
        factor: 1,
        why: 'Repotting is a spring job. A plant moved in autumn has to recover through the darkest months with damaged roots.',
      },
    ],
  }
}

export const ROTATE_DAYS = 14

export function rotateInterval(_species: Species, p: Placement, date: ISODate): Interval {
  const season = seasonFor(p.zone, date)
  if (p.where === 'outdoor') {
    return { days: null, season, factors: [], skipped: 'Outdoors the light comes from everywhere. Nothing to turn.' }
  }
  return {
    days: ROTATE_DAYS,
    season,
    factors: [
      {
        label: 'Why',
        factor: 1,
        why: 'A quarter turn every couple of weeks keeps it growing straight instead of leaning into the window.',
      },
    ],
  }
}

export function intervalFor(care: CareType, species: Species, p: Placement, date: ISODate): Interval {
  switch (care) {
    case 'water':
      return wateringInterval(species, p, date)
    case 'feed':
      return feedInterval(species, p, date)
    case 'mist':
      return mistInterval(species, p, date)
    case 'prune':
      return pruneInterval(species, p, date)
    case 'clean':
      return cleanInterval(species, p, date)
    case 'repot':
      return repotInterval(species, p, date)
    case 'rotate':
      return rotateInterval(species, p, date)
  }
}

export interface Due {
  care: CareType
  /** Null when this care type does not apply to this plant. */
  due: ISODate | null
  interval: Interval
  /** True when the date was pushed to spring rather than being interval + last. */
  heldForSpring?: boolean
}

/**
 * When this care is next due.
 *
 * The interval is worked out as of the day the job was last done, because that
 * is the span being measured — a plant watered on 1 September is spanning
 * September, not today. `intervalFor` is exported separately so a screen can
 * also show what the figure would be starting today, which is the number a
 * person actually wants when they are deciding where to put a plant.
 *
 * Repotting is the one job that gets moved rather than counted: if the date
 * lands outside the growing season it is held until spring, because repotting
 * in November is worse than repotting late.
 */
export function nextDue(
  care: CareType,
  species: Species,
  p: Placement,
  lastDone: ISODate,
  today: ISODate
): Due {
  const interval = intervalFor(care, species, p, lastDone)
  if (interval.days === null) return { care, due: null, interval }

  const plain = addDays(lastDone, interval.days)
  if (care !== 'repot') return { care, due: plain, interval }

  const season = seasonFor(p.zone, plain)
  if (season === 'growing') return { care, due: plain, interval }

  const spring = nextGrowingSeasonStart(p.zone, plain > today ? plain : today)
  return { care, due: spring, interval, heldForSpring: spring !== plain }
}
