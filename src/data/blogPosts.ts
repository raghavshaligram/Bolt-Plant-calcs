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
    slug: 'why-are-my-plant-leaves-turning-yellow',
    title: 'Why Are My Plant Leaves Turning Yellow? A Diagnostic Guide',
    description:
      'Why are my plant leaves turning yellow? Diagnose by pattern -- old leaves vs. new, whole-leaf vs. between the veins -- to find the real cause and fix.',
    pubDate: new Date('2026-08-17'),
  },
  {
    slug: 'how-to-start-a-vegetable-garden',
    title: "How to Start a Vegetable Garden: A Complete Beginner's Guide",
    description:
      "Start your first vegetable garden -- how to pick the spot, size it right, prep the soil, and choose what to plant first.",
    pubDate: new Date('2026-08-08'),
  },
  {
    slug: 'why-are-my-tomato-leaves-turning-yellow',
    title: 'Why Are My Tomato Leaves Turning Yellow? A Diagnostic Guide',
    description:
      "Diagnose yellowing tomato leaves by symptom -- bottom-up yellowing, spots, or curling each point to a different cause and fix.",
    pubDate: new Date('2026-08-07'),
  },
  {
    slug: 'growing-tomatoes-in-raised-beds',
    title: 'Growing Tomatoes in Raised Beds: Spacing, Depth, and Blossom End Rot',
    description:
      "Tomato spacing and bed depth for raised beds -- plus why raised beds get blossom end rot more often, and how to prevent it.",
    pubDate: new Date('2026-08-07'),
  },
  {
    slug: 'how-to-grow-beans-from-seed',
    title: 'How to Grow Beans from Seed (Bush, Pole, and the Nitrogen Myth)',
    description:
      "Beans are easy to germinate. Here's bush vs. pole, and an honest correction on what beans really do for soil nitrogen.",
    pubDate: new Date('2026-08-07'),
  },
  {
    slug: 'how-to-grow-cucumbers-from-seed',
    title: "How to Grow Cucumbers from Seed (and Why Yours Aren't Fruiting)",
    description:
      "Cucumbers are easy to germinate. The real problem is pollination -- here's why they flower without fruiting, and the fix.",
    pubDate: new Date('2026-08-07'),
  },
  {
    slug: 'how-to-grow-carrots-from-seed',
    title: 'How to Grow Carrots from Seed (and Actually Get Them to Germinate)',
    description:
      "Carrot seeds are slow and finicky. Here's the board method that fixes germination, plus how to avoid forked carrots.",
    pubDate: new Date('2026-08-07'),
  },
  {
    slug: 'how-to-grow-lettuce-from-seed',
    title: 'How to Grow Lettuce from Seed: The Cool-Season Crop That Breaks the Rules',
    description:
      "Lettuce seeds need light to germinate and refuse to sprout in heat. Here's how to actually grow lettuce from seed.",
    pubDate: new Date('2026-08-07'),
  },
  {
    slug: 'how-to-grow-peppers-from-seed',
    title: 'How to Grow Peppers from Seed: Bell, Hot, and Sweet Varieties',
    description:
      'Start peppers from seed -- germination temps, why peppers need longer than tomatoes, and the transplant mistake to avoid.',
    pubDate: new Date('2026-08-06'),
  },
  {
    slug: 'how-to-grow-tomatoes-from-seed',
    title: 'How to Grow Tomatoes from Seed: A Complete Guide',
    description:
      'Start tomatoes from seed successfully -- germination temps, the heat mat mistake to avoid, and when to transplant.',
    pubDate: new Date('2026-08-06'),
  },
  {
    slug: 'led-vs-fluorescent-grow-lights',
    title: 'LED vs. Fluorescent Grow Lights: Which Should You Use?',
    description:
      'LED and fluorescent grow lights compared -- efficiency, cost, lifespan, and which is actually right for houseplants and seedlings.',
    pubDate: new Date('2026-07-19'),
  },
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
