/**
 * HarvestMath Plant Care — the product, and the switch that launches it.
 *
 * ── LAUNCHED ────────────────────────────────────────────────────────────────
 *
 * Everything about this product ships dark until payments are live. The pages
 * exist, they build, they can be opened by anybody who knows the URL — and
 * nothing on the rest of the site points at them, and search engines are told
 * not to index them.
 *
 * That is deliberate rather than unfinished. A sales page that is discoverable
 * before its checkout works converts a visitor into a bounce and, if it is
 * indexed in that state, keeps doing so for weeks after the fix. So the link
 * and the indexing are one boolean, flipped once, in one place.
 *
 * WHAT FLIPPING IT DOES
 *
 *   - /plant-care/ and /plant-care/updates/ become indexable
 *   - <PlantCareCrossLink /> starts rendering wherever it has been placed
 *
 * WHAT IT DOES NOT DO
 *
 *   - /plant-care/buy/ and /plant-care/welcome/ stay noindex forever. One is a
 *     card form and the other is a post-purchase page; neither is a search
 *     result anybody should ever land on.
 *   - app.harvestmath.com (and /app/ until that alias exists) is never linked
 *     from site navigation, launched or not. It is reached from the welcome
 *     page and the updates page. The URL is public and that is accepted —
 *     the honour-system exposure of a shareable file — but it is not
 *     advertised.
 *
 * BEFORE FLIPPING IT, the four things in DEPLOY-PLANT-CARE.md have to be true:
 * the PayPal app exists, the four environment variables are set in Netlify, a
 * sandbox sale has completed end to end, and one real sale has been made and
 * refunded.
 */
export const LAUNCHED = false;

/** Hardcoded here for display only. The charged amount lives server-side. */
export const PRICE_DISPLAY = '$29';
export const PRICE_VALUE = '29.00';
export const CURRENCY = 'USD';

export const PRODUCT_NAME = 'HarvestMath Plant Care';

export const PATHS = {
  marketing: '/plant-care/',
  buy: '/plant-care/buy/',
  welcome: '/plant-care/welcome/',
  updates: '/plant-care/updates/',
  demo: '/plant-care/demo/',
} as const;

/**
 * The demo, and why it is not the app.
 *
 * ── THE DISTINCTION THAT KEEPS THIS PRODUCT SALEABLE ────────────────────────
 *
 * `/app/` is the product: byte-identical to the file a buyer downloads, with
 * nothing disabled. It is public because the brief rules out licence keys and
 * accounts, and it is never advertised — welcome page and updates page only.
 *
 * `/plant-care/demo/` is a different build, produced by `npm run build:demo`
 * in plantcare with VITE_DEMO_LOCK=1. Every screen works and every schedule is
 * real, but it opens on the demo household and cannot keep anything: no file,
 * no IndexedDB, no export, nothing that survives a reload. `npm run verify:demo`
 * proves that by driving a browser rather than by reading the source.
 *
 * So this is the URL that sales copy may point at, and the one that "try it
 * first" means. Linking a trial at /app/ instead would be handing the product
 * away to everybody who reads the page — which is exactly what a rewrite of
 * this page did before this constant existed.
 */
export const DEMO_URL = '/plant-care/demo/';

/**
 * Where the installable app lives.
 *
 * `/app/` today, because it ships in this repo and works the moment the site
 * deploys. When app.harvestmath.com is aliased to the same deploy, change this
 * one string — the manifest and service worker are already scoped relatively,
 * so nothing else moves.
 */
export const APP_URL = '/app/';

/** The real numbers, from the app's own verification output. Not rounded up. */
export const FACTS = {
  species: 303,
  genera: 193,
  careTypes: 7,
  diagnosisTrees: 6,
  aspcaRows: 981,
  fileSizeKB: 586,
} as const;

export interface SpreadRow {
  plant: string;
  species: string;
  days: number;
  note: string;
}

/**
 * Ten plants, ten watering intervals, from the app's own engine.
 *
 * ── WHY REAL NUMBERS AND A STATED BASIS ─────────────────────────────────────
 *
 * The central claim of this product is that the schedule is genuinely worked
 * out per plant rather than a flat weekly reminder with a plant's name on it.
 * That claim is a number, so the page shows the numbers — and these are the
 * actual output of `wateringInterval()` for the ten plants in the demo, not a
 * designer's idea of a convincing spread.
 *
 * They are also a snapshot. Season is one of the factors, so the ZZ plant's 25
 * days is a September figure and will not be a January one. Hence `BASIS`,
 * printed under the chart: a number without its conditions is the thing this
 * app exists to argue against.
 *
 * To refresh, in plantcare:
 *   node --experimental-strip-types -e "…wateringInterval(...)…"   (see VERIFICATION.md)
 */
export const SPREAD_BASIS = 'Zone 6b, mid-September, indoors unless noted — the ten plants in the demo, as the app works them out.';

export const SPREAD: SpreadRow[] = [
  { plant: 'Office ZZ', species: 'ZZ Plant', days: 25, note: '8 in pot, low light' },
  { plant: 'Hallway snake plant', species: 'Snake Plant', days: 24, note: '10 in pot, low light' },
  { plant: 'Big Monstera', species: 'Swiss Cheese Plant', days: 14, note: '12 in pot, bright indirect' },
  { plant: 'Windowsill echeveria', species: 'Echeveria', days: 11, note: '4 in pot, direct sun' },
  { plant: 'Shelf pothos', species: 'Golden Pothos', days: 9, note: '6 in pot, medium light' },
  { plant: 'Rosemary by the door', species: 'Rosemary', days: 9, note: '10 in pot, outdoors' },
  { plant: 'Peace lily', species: 'Peace Lily', days: 7, note: '8 in pot, medium light' },
  { plant: 'Pinstripe', species: 'Pinstripe Calathea', days: 7, note: '6 in pot, medium light' },
  { plant: 'The difficult fern', species: 'Maidenhair Fern', days: 4, note: '5 in pot, medium light' },
  { plant: 'Patio tomato', species: 'Tomato', days: 2, note: '15 in pot, outdoors' },
];

export interface Feature {
  title: string;
  body: string;
  /**
   * The same claim in one sentence, for the compact grid on the product page.
   *
   * Written rather than truncated. A page that takes the first sentence of a
   * longer paragraph produces copy that stops mid-argument — which is what a
   * rewrite of that page did, turning "no AI identification, because doing it
   * properly needs a paid API call every time" into a sentence that read as an
   * apology. Both versions are here and both are edited.
   */
  short?: string;
}

export const FEATURES: Feature[] = [
  {
    title: 'A schedule that is actually different per plant',
    body: `Watering, feeding, misting, pruning, dusting, repotting and turning — each worked out from the species, the pot size, whether it is indoors, the season where you live and your hardiness zone. A snake plant in a 12-inch pot in a Zone 5 January comes out at 70 days. A maidenhair fern in a 4-inch pot outdoors in a Zone 9 July comes out at 2. Same app, same afternoon.`,
    short: `Seven care types, each worked out from the species, the pot, the season, your zone and the light in that spot.`,
  },
  {
    title: 'Every interval shows its working',
    body: `Tap the question mark on any job and the app shows what it took into account and what each thing did to the number — pot size, season, the light in that spot, the soil. If you disagree, set your own interval and it stops arguing. Most apps ask you to trust an algorithm; this one shows you the arithmetic.`,
    short: `Tap the question mark on any job and the app shows the arithmetic, factor by factor. Disagree, and set your own.`,
  },
  {
    title: `${FACTS.species} plants, with the pet-safety answers sourced`,
    body: `Houseplants, herbs, vegetables and garden plants across ${FACTS.genera} genera. Every toxicity verdict comes from the ASPCA's published list of ${FACTS.aspcaRows} plants and names the exact row it read. Where a plant is not on that list it says so, rather than letting silence read as safety, and where the answer is inferred from a related species it says that too.`,
    short: `Houseplants, herbs, vegetables and garden plants across ${FACTS.genera} genera, every toxicity verdict traced to its ASPCA row.`,
  },
  {
    title: 'Diagnosis, using the same walkthroughs as this site',
    body: `Yellow leaves, wilting, holes, brown tips, powdery mildew, blossom end rot — the ${FACTS.diagnosisTrees} decision trees from the HarvestMath problem guides, working offline. The result and every answer you gave are written to that plant's journal automatically, because six months later the question is what you decided in March and what you tried.`,
    short: `The six decision trees from the problem guides on this site, offline, writing what you decided into that plant’s journal.`,
  },
  {
    title: 'A light meter that admits what it is',
    body: `Hold the phone where the plant would sit and get a reading, then ask whether a specific plant will be happy there. On Chrome and Edge it works the figure out from the exposure your camera chose, which is how a light meter does it. Everywhere else it gives a relative brightness and says so, instead of printing a lux number it cannot justify.`,
    short: `Hold the phone where the plant would sit. It gives a reading, and a sentence saying how much to trust it.`,
  },
  {
    title: 'Measure a pot with a bank card',
    body: `Photograph the pot with a card leaning against it, drag two markers, and get the diameter and the nearest nursery size. A bank card is 85.60 mm everywhere in the world, so the arithmetic is something you can check. Pot size moves a watering interval by about a factor of two, which is why it is worth measuring rather than guessing.`,
    short: `Photograph the pot with a card against it, drag two markers, get the diameter. A card is 85.60 mm everywhere.`,
  },
  {
    title: 'A journal that gets more valuable every year',
    body: `Notes, photos and every completed job, searchable, per plant. It is the part of the app worth most in year three — and the reason the file keeps a history rather than only the current state.`,
    short: `Notes, photos and every completed job, per plant, searchable. The part worth most in year three.`,
  },
  {
    title: 'The calculators you already use here, offline',
    body: `Zone and frost dates, companion planting, and the gallon-to-inches pot conversions — the same data as the calculators on this site, generated from the same source so they cannot drift apart. In your pocket in a greenhouse with no signal, which is where the questions actually get asked.`,
    short: `Zone and frost dates, companion planting, pot size conversions — the same data as this site, in your pocket.`,
  },
];

/**
 * What it does not do.
 *
 * On the page, at the same size as the features. Overclaiming against Planta
 * produces refunds and one-star reviews, and every one of these has a real
 * reason that is more convincing than a silence would be.
 */
export const NOT_INCLUDED: Feature[] = [
  {
    title: 'No AI plant identification from a photo',
    body: `Doing it properly means either a paid API call every time somebody uses it — which breaks "works offline forever" and costs money per use — or shipping a vision model inside the file. The good versions of this are built on years of proprietary photo data we do not have. Planta's identification is genuinely better than anything we could ship, and if that is the feature you want, buy Planta.`,
  },
  {
    title: 'No notifications when the app is closed',
    body: `A local file and an installed web app genuinely cannot do this reliably. On iOS it needs a push server, which means a subscription, which is the thing this product is the absence of. The due and overdue lists work; background alerts do not exist. A recurring calendar reminder to open the app works well and costs nothing.`,
  },
  {
    title: 'No cloud sync, no account, no community',
    body: `Those need servers. Servers need a subscription. The absence of one is the entire point — nothing about this product can stop working because a company went away.`,
  },
];

export interface ComparisonRow {
  what: string;
  ours: string;
  theirs: string;
  /** True when the honest answer favours the subscription apps. */
  againstUs?: boolean;
}

/**
 * Against the subscription apps.
 *
 * Three of these rows go against us, and they stay in. A comparison table where
 * every row is a win is an advertisement, and readers discount the whole thing.
 * The pricing claims are deliberately vague about the competitors' exact
 * figures — those change, and a stale number on our page is our problem.
 */
export const COMPARISON: ComparisonRow[] = [
  { what: 'Cost', ours: `${PRICE_DISPLAY} once`, theirs: 'A yearly subscription, typically around $30–40' },
  { what: 'If you stop paying', ours: 'Nothing happens. It is yours.', theirs: 'Access ends' },
  { what: 'If the company disappears', ours: 'Nothing happens. No server is involved.', theirs: 'The app stops working' },
  { what: 'Account required', ours: 'No', theirs: 'Yes' },
  { what: 'Works with no internet', ours: 'Yes, always', theirs: 'Partly — most need a connection' },
  { what: 'Where your data lives', ours: 'A file on your disk, or this browser', theirs: 'Their servers' },
  { what: 'Plants in the reference', ours: `${FACTS.species}, chosen and checked`, theirs: 'Thousands to tens of thousands', againstUs: true },
  { what: 'Identify a plant from a photo', ours: 'No', theirs: 'Yes, and it works well', againstUs: true },
  { what: 'Reminders when the app is closed', ours: 'No', theirs: 'Yes', againstUs: true },
  { what: 'Shows how it reached a schedule', ours: 'Every interval, with the factors', theirs: 'No' },
];

export interface Shot {
  file: string;
  alt: string;
  caption: string;
}

/** Real captures of the built app, produced by its own `npm run shots`. */
export const SHOTS: Shot[] = [
  {
    file: 'today.png',
    alt: 'The Today screen listing late and due jobs for ten plants',
    caption: 'Today. Late first, then due, then the week — and the week folds away when something is actually late.',
  },
  {
    file: 'plant.png',
    alt: 'A plant detail screen showing care intervals and species notes',
    caption: 'One plant. Its jobs, its species notes, and the ASPCA row behind the pet-safety badge.',
  },
  {
    file: 'light.png',
    alt: 'The light meter showing a reading and whether a plant suits the spot',
    caption: 'The light meter, and the sentence that says how much to trust it.',
  },
  {
    file: 'species.png',
    alt: 'A species page for Boston fern with care requirements and schedule',
    caption: 'The reference book. What it wants, and what that means as a schedule in your zone.',
  },
  {
    file: 'companion.png',
    alt: 'The companion planting checker comparing two plants',
    caption: 'Companion planting, quoting the same article this site publishes.',
  },
  {
    file: 'journal.png',
    alt: 'The journal screen with dated notes and care entries',
    caption: 'The journal. Care entries write themselves; notes and photos are yours.',
  },
];
