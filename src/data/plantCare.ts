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
} as const;

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

export interface Feature {
  title: string;
  body: string;
}

export const FEATURES: Feature[] = [
  {
    title: 'A schedule that is actually different per plant',
    body: `Watering, feeding, misting, pruning, dusting, repotting and turning — each worked out from the species, the pot size, whether it is indoors, the season where you live and your hardiness zone. A snake plant in a 12-inch pot in a Zone 5 January comes out at 70 days. A maidenhair fern in a 4-inch pot outdoors in a Zone 9 July comes out at 2. Same app, same afternoon.`,
  },
  {
    title: 'Every interval shows its working',
    body: `Tap the question mark on any job and the app shows what it took into account and what each thing did to the number — pot size, season, the light in that spot, the soil. If you disagree, set your own interval and it stops arguing. Most apps ask you to trust an algorithm; this one shows you the arithmetic.`,
  },
  {
    title: `${FACTS.species} plants, with the pet-safety answers sourced`,
    body: `Houseplants, herbs, vegetables and garden plants across ${FACTS.genera} genera. Every toxicity verdict comes from the ASPCA's published list of ${FACTS.aspcaRows} plants and names the exact row it read. Where a plant is not on that list it says so, rather than letting silence read as safety, and where the answer is inferred from a related species it says that too.`,
  },
  {
    title: 'Diagnosis, using the same walkthroughs as this site',
    body: `Yellow leaves, wilting, holes, brown tips, powdery mildew, blossom end rot — the ${FACTS.diagnosisTrees} decision trees from the HarvestMath problem guides, working offline. The result and every answer you gave are written to that plant's journal automatically, because six months later the question is what you decided in March and what you tried.`,
  },
  {
    title: 'A light meter that admits what it is',
    body: `Hold the phone where the plant would sit and get a reading, then ask whether a specific plant will be happy there. On Chrome and Edge it works the figure out from the exposure your camera chose, which is how a light meter does it. Everywhere else it gives a relative brightness and says so, instead of printing a lux number it cannot justify.`,
  },
  {
    title: 'Measure a pot with a bank card',
    body: `Photograph the pot with a card leaning against it, drag two markers, and get the diameter and the nearest nursery size. A bank card is 85.60 mm everywhere in the world, so the arithmetic is something you can check. Pot size moves a watering interval by about a factor of two, which is why it is worth measuring rather than guessing.`,
  },
  {
    title: 'A journal that gets more valuable every year',
    body: `Notes, photos and every completed job, searchable, per plant. It is the part of the app worth most in year three — and the reason the file keeps a history rather than only the current state.`,
  },
  {
    title: 'The calculators you already use here, offline',
    body: `Zone and frost dates, companion planting, and the gallon-to-inches pot conversions — the same data as the calculators on this site, generated from the same source so they cannot drift apart. In your pocket in a greenhouse with no signal, which is where the questions actually get asked.`,
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
