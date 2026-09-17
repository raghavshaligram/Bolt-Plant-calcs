// Geographic adjacency for the programmatic /growing-zones/[state]/ and
// /planting-calendar/[state]/ page sets.
//
// Why this exists: both pSEO sets shipped as leaf pages -- each state linked
// "up" to its hub and "across" to its counterpart in the other set, but never
// sideways to a neighbouring state. With the hubs themselves unlinked from the
// footer and nav, that left Googlebot no path to traverse from one state page
// to the next, and all 102 pages sat in "Discovered -- currently not indexed".
// These lateral links give the crawler a real graph to walk.
//
// STATE_ADJACENCY is the plain geographic fact: which states share a border.
// It is deliberately just that -- no editorial ordering, no per-page tuning --
// so it stays correct and maintainable. Everything else (how many to show,
// which to prioritise, what to do for the two non-contiguous states) is
// derived from it by getNeighborSlugs() below.

/**
 * True shared borders, keyed by the same slugs used in `states.ts`.
 * Delaware/New Jersey are included as neighbours: they meet across the
 * Delaware River and the Twelve-Mile Circle, and are conventionally listed
 * as adjacent. DC is treated as a state-equivalent throughout this file,
 * matching how it is handled in `states.ts`.
 */
export const STATE_ADJACENCY: Record<string, string[]> = {
  alabama: ['florida', 'georgia', 'mississippi', 'tennessee'],
  alaska: [],
  arizona: ['california', 'colorado', 'nevada', 'new-mexico', 'utah'],
  arkansas: ['louisiana', 'mississippi', 'missouri', 'oklahoma', 'tennessee', 'texas'],
  california: ['arizona', 'nevada', 'oregon'],
  colorado: ['arizona', 'kansas', 'nebraska', 'new-mexico', 'oklahoma', 'utah', 'wyoming'],
  connecticut: ['massachusetts', 'new-york', 'rhode-island'],
  delaware: ['maryland', 'new-jersey', 'pennsylvania'],
  'district-of-columbia': ['maryland', 'virginia'],
  florida: ['alabama', 'georgia'],
  georgia: ['alabama', 'florida', 'north-carolina', 'south-carolina', 'tennessee'],
  hawaii: [],
  idaho: ['montana', 'nevada', 'oregon', 'utah', 'washington', 'wyoming'],
  illinois: ['indiana', 'iowa', 'kentucky', 'missouri', 'wisconsin'],
  indiana: ['illinois', 'kentucky', 'michigan', 'ohio'],
  iowa: ['illinois', 'minnesota', 'missouri', 'nebraska', 'south-dakota', 'wisconsin'],
  kansas: ['colorado', 'missouri', 'nebraska', 'oklahoma'],
  kentucky: ['illinois', 'indiana', 'missouri', 'ohio', 'tennessee', 'virginia', 'west-virginia'],
  louisiana: ['arkansas', 'mississippi', 'texas'],
  maine: ['new-hampshire'],
  maryland: ['delaware', 'district-of-columbia', 'pennsylvania', 'virginia', 'west-virginia'],
  massachusetts: ['connecticut', 'new-hampshire', 'new-york', 'rhode-island', 'vermont'],
  michigan: ['indiana', 'ohio', 'wisconsin'],
  minnesota: ['iowa', 'north-dakota', 'south-dakota', 'wisconsin'],
  mississippi: ['alabama', 'arkansas', 'louisiana', 'tennessee'],
  missouri: ['arkansas', 'illinois', 'iowa', 'kansas', 'kentucky', 'nebraska', 'oklahoma', 'tennessee'],
  montana: ['idaho', 'north-dakota', 'south-dakota', 'wyoming'],
  nebraska: ['colorado', 'iowa', 'kansas', 'missouri', 'south-dakota', 'wyoming'],
  nevada: ['arizona', 'california', 'idaho', 'oregon', 'utah'],
  'new-hampshire': ['maine', 'massachusetts', 'vermont'],
  'new-jersey': ['delaware', 'new-york', 'pennsylvania'],
  'new-mexico': ['arizona', 'colorado', 'oklahoma', 'texas', 'utah'],
  'new-york': ['connecticut', 'massachusetts', 'new-jersey', 'pennsylvania', 'vermont'],
  'north-carolina': ['georgia', 'south-carolina', 'tennessee', 'virginia'],
  'north-dakota': ['minnesota', 'montana', 'south-dakota'],
  ohio: ['indiana', 'kentucky', 'michigan', 'pennsylvania', 'west-virginia'],
  oklahoma: ['arkansas', 'colorado', 'kansas', 'missouri', 'new-mexico', 'texas'],
  oregon: ['california', 'idaho', 'nevada', 'washington'],
  pennsylvania: ['delaware', 'maryland', 'new-jersey', 'new-york', 'ohio', 'west-virginia'],
  'rhode-island': ['connecticut', 'massachusetts'],
  'south-carolina': ['georgia', 'north-carolina'],
  'south-dakota': ['iowa', 'minnesota', 'montana', 'nebraska', 'north-dakota', 'wyoming'],
  tennessee: [
    'alabama',
    'arkansas',
    'georgia',
    'kentucky',
    'mississippi',
    'missouri',
    'north-carolina',
    'virginia',
  ],
  texas: ['arkansas', 'louisiana', 'new-mexico', 'oklahoma'],
  utah: ['arizona', 'colorado', 'idaho', 'nevada', 'new-mexico', 'wyoming'],
  vermont: ['massachusetts', 'new-hampshire', 'new-york'],
  virginia: [
    'district-of-columbia',
    'kentucky',
    'maryland',
    'north-carolina',
    'tennessee',
    'west-virginia',
  ],
  washington: ['idaho', 'oregon'],
  'west-virginia': ['kentucky', 'maryland', 'ohio', 'pennsylvania', 'virginia'],
  wisconsin: ['illinois', 'iowa', 'michigan', 'minnesota'],
  wyoming: ['colorado', 'idaho', 'montana', 'nebraska', 'south-dakota', 'utah'],
};

/**
 * Rough population order (1 = most populous), used only to decide WHICH
 * neighbours to show when a state has more than we want to list -- Tennessee
 * borders eight states, and the four or five people actually search for are
 * the big ones. Not used for anything factual on the page.
 */
export const POPULATION_RANK: Record<string, number> = {
  california: 1, texas: 2, florida: 3, 'new-york': 4, pennsylvania: 5,
  illinois: 6, ohio: 7, georgia: 8, 'north-carolina': 9, michigan: 10,
  'new-jersey': 11, virginia: 12, washington: 13, arizona: 14, massachusetts: 15,
  tennessee: 16, indiana: 17, missouri: 18, maryland: 19, wisconsin: 20,
  colorado: 21, minnesota: 22, 'south-carolina': 23, alabama: 24, louisiana: 25,
  kentucky: 26, oregon: 27, oklahoma: 28, connecticut: 29, utah: 30,
  iowa: 31, nevada: 32, arkansas: 33, mississippi: 34, kansas: 35,
  'new-mexico': 36, nebraska: 37, idaho: 38, 'west-virginia': 39, hawaii: 40,
  'new-hampshire': 41, maine: 42, montana: 43, 'rhode-island': 44, delaware: 45,
  'south-dakota': 46, 'north-dakota': 47, alaska: 48, 'district-of-columbia': 49,
  vermont: 50, wyoming: 51,
};

/**
 * Alaska and Hawaii border nothing, so "neighbouring states" has to mean
 * something else for them. These are the closest useful comparisons a
 * gardener there would actually make: for Alaska, the coldest-zone states on
 * the mainland (plus Washington, the nearest mainland state); for Hawaii, the
 * warmest, most frost-free ones. Without this these two pages would render an
 * empty section -- the exact leaf-node problem this file exists to fix.
 */
export const CLIMATE_PROXIES: Record<string, string[]> = {
  alaska: ['washington', 'montana', 'minnesota', 'north-dakota', 'maine'],
  hawaii: ['california', 'florida', 'texas', 'louisiana', 'arizona'],
};

const byPopulation = (a: string, b: string) =>
  (POPULATION_RANK[a] ?? 99) - (POPULATION_RANK[b] ?? 99);

/**
 * The neighbour list a state page should link to.
 *
 * Direct borders first, most populous first, since those are the ones people
 * actually search for -- Tennessee borders eight states and we only want to
 * show five or six.
 *
 * Some states don't have `min` direct borders: Maine touches only New
 * Hampshire, DC only Maryland and Virginia, and Rhode Island, South Carolina,
 * Florida and Washington have two apiece. For those we widen the ring
 * outward -- neighbours of neighbours, then their neighbours -- taking the
 * most populous at each distance until we have enough. That keeps every link
 * geographically justifiable (each one is reachable by land from the state in
 * question) instead of padding the list with arbitrary high-traffic states.
 *
 * Alaska and Hawaii border nothing at all, so they fall back to
 * CLIMATE_PROXIES rather than rendering an empty section.
 */
export function getNeighborSlugs(slug: string, min = 4, max = 6): string[] {
  const direct = (STATE_ADJACENCY[slug] ?? []).slice().sort(byPopulation);

  if (direct.length === 0) {
    return (CLIMATE_PROXIES[slug] ?? []).slice(0, max);
  }

  const picked = direct.slice(0, max);
  if (picked.length >= min) return picked;

  // Widen the ring one hop at a time until we reach `min` (or run out of
  // reachable states, which can't happen on the contiguous mainland).
  const seen = new Set<string>([slug, ...picked]);
  let frontier = direct;

  while (picked.length < min && frontier.length > 0) {
    const next = frontier
      .flatMap((n) => STATE_ADJACENCY[n] ?? [])
      .filter((s) => {
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      })
      .sort(byPopulation);

    for (const s of next) {
      if (picked.length >= min) break;
      picked.push(s);
    }
    frontier = next;
  }

  return picked;
}
