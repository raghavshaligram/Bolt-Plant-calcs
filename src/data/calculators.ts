export type Calculator = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  metaDescription: string;
  /** Optional SEO <title> tag override (kept under ~60 chars). Falls back to `title` if unset. */
  seoTitle?: string;
  cluster: string;
  href: string;
  status: 'live' | 'coming-soon';
};

export type Cluster = {
  slug: string;
  name: string;
  description: string;
  metaDescription: string;
  blurb: string;
  icon: string;
  accent: string;
};

export const clusters: Cluster[] = [
  {
    slug: 'soil-and-amendments',
    name: 'Soil & Amendments',
    description:
      'Calculators for figuring out how much soil, mulch, compost, and other amendments you need to fill beds, topdress lawns, and build healthy growing ground.',
    metaDescription:
      'Free soil, mulch, and compost calculators for raised beds, garden plots, and lawns. Figure out exactly how many bags or cubic yards of amendments to buy.',
    blurb:
      'Build healthy ground from the bottom up. Calculate exact volumes for raised beds, garden plots, and topdressing without overbuying.',
    icon: 'soil',
    accent: 'moss',
  },
  {
    slug: 'fertilizer-and-nutrients',
    name: 'Fertilizer & Nutrients',
    description:
      'N-P-P and feeding rate calculators for matching the right fertilizer to the right plants at the right dose.',
    metaDescription:
      'Fertilizer calculators for NPK ratios, feeding rates, and nutrient budgets. Stop guessing and feed your garden exactly what it needs.',
    blurb:
      'Match the right fertilizer to the right plant at the right dose. NPK math, feeding rates, and nutrient budgets made simple.',
    icon: 'fertilizer',
    accent: 'leaf',
  },
  {
    slug: 'watering-and-irrigation',
    name: 'Watering & Irrigation',
    description:
      'Calculators for watering schedules, drip emitter counts, and irrigation run times based on plant needs and flow rates.',
    metaDescription:
      'Watering and irrigation calculators for drip systems, sprinkler run times, and garden water budgets. Water smarter, not more.',
    blurb:
      'Water smarter, not more. Drip emitter counts, run times, and weekly water budgets tuned to your plants and climate.',
    icon: 'water',
    accent: 'moss',
  },
  {
    slug: 'spacing-and-planting',
    name: 'Spacing & Planting',
    description:
      'Plant spacing, row layout, and seed-start date calculators so you can plan beds that fit the right number of plants.',
    metaDescription:
      'Plant spacing and layout calculators for raised beds, garden rows, and square-foot gardening. Fit the right number of plants in any bed.',
    blurb:
      'Plan beds that fit. Spacing, row layout, and plant count math for raised beds, square-foot gardens, and traditional rows.',
    icon: 'spacing',
    accent: 'leaf',
  },
  {
    slug: 'lawn-and-landscaping',
    name: 'Lawn & Landscaping',
    description:
      'Grass seed, sod, mulch, and landscape material calculators for lawns, paths, and garden beds of any shape.',
    metaDescription:
      'Lawn and landscaping calculators for grass seed, sod, mulch, and landscape materials. Get the right amount the first time.',
    blurb:
      'Get the right amount the first time. Grass seed, sod, mulch, and landscape material math for lawns and paths of any shape.',
    icon: 'lawn',
    accent: 'moss',
  },
  {
    slug: 'indoor-plants',
    name: 'Indoor Plants',
    description:
      'Light, pot size, and watering calculators tuned to houseplants and container gardens grown indoors.',
    metaDescription:
      'Indoor plant calculators for pot size, watering frequency, and light levels. Keep houseplants thriving with the right numbers.',
    blurb:
      'Keep houseplants thriving. Pot size, watering frequency, and light calculators tuned to container-grown indoor plants.',
    icon: 'indoor',
    accent: 'leaf',
  },
  {
    slug: 'hydroponics-and-greenhouse',
    name: 'Hydroponics & Greenhouse',
    description:
      'Nutrient solution, EC, and greenhouse heating calculators for soil-free and controlled-environment growing.',
    metaDescription:
      'Hydroponics and greenhouse calculators for nutrient solutions, EC targets, and heating loads. Grow more in controlled environments.',
    blurb:
      'Grow more in controlled environments. Nutrient solutions, EC targets, and greenhouse heating math for soil-free growing.',
    icon: 'hydro',
    accent: 'moss',
  },
];

export const calculators: Calculator[] = [
  {
    slug: 'mulch-calculator',
    title: 'Mulch Calculator',
    shortTitle: 'Mulch',
    description:
      'Calculate how much mulch you need in cubic feet, cubic yards, and 2-cubic-foot bags for any garden bed or landscape area.',
    metaDescription:
      'Calculate exactly how much mulch you need in cubic yards, cubic feet, and bags. Free mulch calculator for beds, borders, and landscaping projects.',
    seoTitle: 'Mulch Calculator: How Much Mulch Do You Need? (Free Tool)',
    cluster: 'soil-and-amendments',
    href: '/calculators/mulch-calculator/',
    status: 'live',
  },
  {
    slug: 'topsoil-calculator',
    title: 'Topsoil Calculator',
    shortTitle: 'Topsoil',
    description:
      'Calculate how much topsoil you need in cubic yards, cubic feet, and estimated tons for raised beds, garden filling, and lawn leveling.',
    metaDescription:
      'Calculate exactly how much topsoil you need in cubic yards, cubic feet, and tons. Free topsoil calculator for lawns, beds, and landscaping.',
    seoTitle: 'Topsoil Calculator - Cubic Yards & Tons (Free Tool)',
    cluster: 'soil-and-amendments',
    href: '/calculators/topsoil-calculator/',
    status: 'live',
  },
  {
    slug: 'raised-bed-soil-calculator',
    title: 'Raised Bed Soil Calculator',
    shortTitle: 'Raised Bed Soil',
    description:
      'Calculate exactly how much soil you need for a raised bed in cubic feet, cubic yards, and bags. Includes presets for common bed sizes.',
    metaDescription:
      'Calculate exactly how much soil you need for your raised bed in cubic feet, cubic yards, and bags. Free calculator with common bed size presets.',
    seoTitle: 'Raised Bed Soil Calculator - Cubic Feet & Bags (Free)',
    cluster: 'soil-and-amendments',
    href: '/calculators/raised-bed-soil-calculator/',
    status: 'live',
  },
  {
    slug: 'soil-volume-calculator',
    title: 'Soil Volume Calculator',
    shortTitle: 'Soil Volume',
    description:
      'Calculate how much soil you need to fill a pot, container, raised bed, or any rectangular or cylindrical space — in cubic feet, cubic yards, and liters.',
    metaDescription:
      'Calculate soil volume for pots, containers, raised beds, or any shape — in cubic feet, cubic yards, or liters. Free calculator.',
    seoTitle: 'Soil Volume Calculator - Pots, Beds & Cubic Yards',
    cluster: 'soil-and-amendments',
    href: '/calculators/soil-volume-calculator/',
    status: 'live',
  },
  {
    slug: 'plant-spacing-calculator',
    title: 'Plant Spacing Calculator',
    shortTitle: 'Plant Spacing',
    description:
      'Calculate how many plants fit in any bed using proper in-row and between-row spacing. Supports row garden and square foot gardening modes with crop presets for 20+ vegetables, herbs, and flowers.',
    metaDescription:
      'Calculate exact plant spacing for vegetables, herbs, and flowers. Free calculator with a spacing chart for 20+ common crops.',
    seoTitle: 'Plant Spacing Calculator - Vegetables & Gardens (Free)',
    cluster: 'spacing-and-planting',
    href: '/calculators/plant-spacing-calculator/',
    status: 'live',
  },
  {
    slug: 'grass-seed-calculator',
    title: 'Grass Seed Calculator',
    shortTitle: 'Grass Seed',
    description:
      'Calculate how many pounds of grass seed you need for a new lawn or for overseeding an existing one.',
    metaDescription:
      'Free grass seed calculator. Enter your lawn area in square feet and choose new lawn or overseeding to get pounds of seed needed.',
    cluster: 'lawn-and-landscaping',
    href: '/calculators/grass-seed-calculator/',
    status: 'coming-soon',
  },
  {
    slug: 'frost-date-calculator',
    title: 'Frost Date Lookup',
    shortTitle: 'Frost Dates',
    description:
      'Look up estimated spring and fall frost dates for your ZIP code to plan your planting calendar.',
    metaDescription:
      'Frost date lookup by US ZIP code. Find your estimated last spring frost and first fall frost dates to plan your planting calendar.',
    cluster: 'spacing-and-planting',
    href: '/calculators/frost-date-calculator/',
    status: 'coming-soon',
  },
];

export function getCluster(slug: string): Cluster | undefined {
  return clusters.find((c) => c.slug === slug);
}

export function getCalculatorsForCluster(slug: string): Calculator[] {
  return calculators.filter((c) => c.cluster === slug);
}

export function getCalculator(slug: string): Calculator | undefined {
  return calculators.find((c) => c.slug === slug);
}
