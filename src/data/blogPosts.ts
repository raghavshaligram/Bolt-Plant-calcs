// Single source of truth for published blog articles, used by both the
// blog index page's listing and the /rss.xml feed, so the two can never
// drift out of sync. Add a new entry here whenever a new article is
// published under src/pages/blog/.
//
// pubDate uses the same "last updated" date each article already tracks
// in its own frontmatter-style consts (see e.g. topsoil-vs-garden-soil.astro's
// `lastUpdated`).

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  pubDate: Date;
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'what-can-you-compost',
    title: "What Can (and Can't) You Compost? The Complete List",
    description:
      "What you can and can't put in your compost bin -- including surprising yeses like bread, and the real reasons behind the no's.",
    pubDate: new Date('2026-07-18'),
  },
  {
    slug: '15-homemade-fertilizers-you-can-make-at-home',
    title: '15 Homemade Fertilizers You Can Make at Home (and How to Mix Them)',
    description:
      'Real homemade fertilizers that work, with honest cautions on wood ash and fresh manure -- not just vague "use carefully" warnings.',
    pubDate: new Date('2026-07-18'),
  },
  {
    slug: 'companion-planting-chart',
    title: 'Companion Planting Chart: What to Grow Together (and What to Avoid)',
    description:
      'A complete companion planting chart for vegetables and herbs — plus which pairings to avoid and why.',
    pubDate: new Date('2026-07-17'),
  },
  {
    slug: 'organic-vs-inorganic-mulch',
    title: 'Organic vs. Inorganic Mulch: Which Is Right for Your Garden?',
    description:
      "Organic and inorganic mulch solve different problems. Here's the real difference, and which one your garden actually needs.",
    pubDate: new Date('2026-07-16'),
  },
  {
    slug: 'how-to-read-soil-test-results',
    title: 'How to Read and Understand Your Soil Test Results',
    description:
      'Soil test numbers explained — pH, organic matter, N-P-K, and how to turn them into an actual fertilizer plan.',
    pubDate: new Date('2026-07-16'),
  },
  {
    slug: 'succession-planting',
    title: 'Succession Planting: How to Get More Harvests From the Same Space',
    description:
      'Succession planting means more harvests from the same garden space. Here are the three real methods, with examples.',
    pubDate: new Date('2026-07-16'),
  },
  {
    slug: '8-fertilizing-mistakes-hurting-your-garden-and-lawn',
    title: '8 Fertilizing Mistakes That Are Hurting Your Garden and Lawn',
    description:
      'The most common fertilizing mistakes — from over-application to bad timing — and exactly how to avoid and fix each one.',
    pubDate: new Date('2026-07-16'),
  },
  {
    slug: 'rainwater-collection-system',
    title: 'How to Build a Rainwater Collection System for Your Garden',
    description:
      'A step-by-step guide to setting up a rain barrel system — downspout connection, first-flush filtering, and overflow, done right.',
    pubDate: new Date('2026-07-16'),
  },
  {
    slug: '8-mulch-mistakes-hurting-your-plants',
    title: '8 Mulch Mistakes That Are Secretly Hurting Your Plants',
    description:
      'The most common mulching mistakes — from volcano mulching to guessing the amount — and exactly how to avoid each one.',
    pubDate: new Date('2026-07-15'),
  },
  {
    slug: 'cool-season-vs-warm-season-grass',
    title: 'Cool-Season vs. Warm-Season Grass: Which Type Do You Have?',
    description:
      "The real difference between cool-season and warm-season grass — including what to plant if you're in the transition zone.",
    pubDate: new Date('2026-07-15'),
  },
  {
    slug: 'topsoil-vs-garden-soil',
    title: 'Topsoil vs. Garden Soil: What’s the Difference?',
    description:
      "Topsoil and garden soil aren't the same thing. Here's the real difference, and which one your project actually needs.",
    pubDate: new Date('2026-07-10'),
  },
];
