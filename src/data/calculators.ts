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
  {
    slug: 'trees-and-shrubs',
    name: 'Trees & Shrubs',
    description:
      'Tree and shrub age, size, and value calculators for estimating how old a tree is, how much it has grown, and what it is worth — without cutting it down.',
    metaDescription:
      'Free tree and shrub calculators for estimating age, growth, and value from simple trunk measurements. No cutting required.',
    blurb:
      'Understand your trees and shrubs without cutting them down. Estimate age, growth, and value from a simple trunk measurement.',
    icon: 'tree',
    accent: 'leaf',
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
      'Calculate how many pounds and 50 lb bags of grass seed you need by grass type, for a new lawn or for overseeding an existing one.',
    metaDescription:
      'Calculate exactly how much grass seed you need by grass type, in pounds, bags, and per acre or per 1,000 sq ft. Free calculator.',
    seoTitle: 'Grass Seed Calculator - Lbs & Bags Per Acre (Free)',
    cluster: 'lawn-and-landscaping',
    href: '/calculators/grass-seed-calculator/',
    status: 'live',
  },
  {
    slug: 'frost-date-calculator',
    title: 'Frost Date Calculator',
    shortTitle: 'Frost Dates',
    description:
      'Estimate your last spring frost and first fall frost date range by ZIP code or hardiness zone, then get a full planting timeline built around it.',
    metaDescription:
      'Estimate your last and first frost dates by zone, and get a full planting timeline — when to start seeds, transplant, and more.',
    seoTitle: 'Frost Date Calculator - Planting Timeline by Zone',
    cluster: 'spacing-and-planting',
    href: '/calculators/frost-date-calculator/',
    status: 'live',
  },
  {
    slug: 'tree-age-calculator',
    title: 'Tree Age Calculator',
    shortTitle: 'Tree Age',
    description:
      'Estimate how old a tree is from its trunk circumference and species — no cutting or coring required.',
    metaDescription:
      'Estimate a tree\'s age from its trunk circumference — no cutting required. Free calculator for oak, maple, pine, and more species.',
    seoTitle: 'Tree Age Calculator - Estimate Age Without Cutting',
    cluster: 'trees-and-shrubs',
    href: '/calculators/tree-age-calculator/',
    status: 'live',
  },
  {
    slug: 'npk-calculator',
    title: 'NPK Calculator',
    shortTitle: 'NPK',
    description:
      'Calculate fertilizer application rates, mix a liquid feed solution, or blend multiple fertilizers to approximate a target N-P-K ratio.',
    metaDescription:
      'Free NPK calculator and liquid fertilizer calculator. Find application rates, dilution PPM, or blend fertilizers to a target ratio.',
    seoTitle: 'NPK Calculator - Rate, Liquid & Blend (Free)',
    cluster: 'fertilizer-and-nutrients',
    href: '/calculators/npk-calculator/',
    status: 'live',
  },
  {
    slug: 'pot-size-calculator',
    title: 'Pot Size Calculator',
    shortTitle: 'Pot Size',
    description:
      'Convert pot sizes between inches, gallons, and liters, find the recommended next size up when repotting, or look up the minimum container size for a plant or vegetable.',
    metaDescription:
      'Convert pot sizes between inches, gallons, and liters, find the right container size for your plant, and know when to repot. Free.',
    seoTitle: 'Plant Pot Size Calculator - Inches, Gallons & Liters',
    cluster: 'indoor-plants',
    href: '/calculators/pot-size-calculator/',
    status: 'live',
  },
  {
    slug: 'compost-calculator',
    title: 'Compost Calculator',
    shortTitle: 'Compost',
    description:
      'Calculate how much compost you need in cubic feet, cubic yards, bags, and estimated weight — for top-dressing beds, containers, or mixing into new soil.',
    metaDescription:
      'Calculate how much compost you need in cubic feet, cubic yards, bags, and weight — for beds, containers, or top-dressing. Free.',
    seoTitle: 'Compost Calculator - Volume, Bags & Weight (Free)',
    cluster: 'soil-and-amendments',
    href: '/calculators/compost-calculator/',
    status: 'live',
  },
  {
    slug: 'seed-starting-calculator',
    title: 'Seed Starting Calendar',
    shortTitle: 'Seed Starting',
    description:
      'Get a personalized seed starting calendar based on your frost date — when to start seeds indoors, when to transplant, and when to direct sow, by crop.',
    metaDescription:
      'Get a personalized seed starting calendar based on your frost date — when to start seeds indoors, transplant, and more. Free tool.',
    seoTitle: 'Seed Starting Calendar - By Zone or Zip (Free)',
    cluster: 'spacing-and-planting',
    href: '/calculators/seed-starting-calculator/',
    status: 'live',
  },
  {
    slug: 'drip-irrigation-calculator',
    title: 'Drip Irrigation Calculator',
    shortTitle: 'Drip Irrigation',
    description:
      'Calculate drip irrigation run time and total water delivered based on your emitter count, flow rate, and target water amount per plant or over an area.',
    metaDescription:
      'Calculate your drip irrigation run time and water delivered based on emitter flow rate. Free calculator for home gardens.',
    seoTitle: 'Drip Irrigation Calculator - Flow Rate & Run Time',
    cluster: 'watering-and-irrigation',
    href: '/calculators/drip-irrigation-calculator/',
    status: 'live',
  },
  {
    slug: 'grow-light-calculator',
    title: 'DLI & Grow Light Calculator',
    shortTitle: 'Grow Light',
    description:
      'Calculate Daily Light Integral (DLI) from a PPFD reading, recommended grow light wattage and electricity cost for your growing area, or recommended hanging distance for your light and growth stage.',
    metaDescription:
      'Calculate Daily Light Integral (DLI), grow light wattage, coverage, and hanging distance for houseplants, seedlings, and vegetables. Free calculator.',
    seoTitle: 'DLI & Grow Light Calculator - Wattage & Distance',
    cluster: 'indoor-plants',
    href: '/calculators/grow-light-calculator/',
    status: 'live',
  },
  {
    slug: 'vegetable-yield-calculator',
    title: 'Vegetable Yield Calculator',
    shortTitle: 'Vegetable Yield',
    description:
      'Estimate how much food your garden will produce, by crop and either plant count or growing area, using published yield data.',
    metaDescription:
      'Estimate how much food your garden will produce, by crop and area, using published yield data. Free calculator.',
    seoTitle: 'Vegetable Yield Calculator - By Crop & Area (Free)',
    cluster: 'spacing-and-planting',
    href: '/calculators/vegetable-yield-calculator/',
    status: 'live',
  },
];

// Brevo lead-magnet listId + display label per cluster, shared by both the
// cluster landing pages and the individual calculator pages so every signup
// form on the site (regardless of which page it renders on) submits to the
// same list for a given cluster. hydroponics-and-greenhouse is intentionally
// excluded -- it has zero live calculators and no cluster page form yet.
export const leadMagnetConfig: Record<string, { listId: number; clusterName: string }> = {
  'soil-and-amendments': { listId: 5, clusterName: 'Soil & Raised Bed Mix' },
  'fertilizer-and-nutrients': { listId: 6, clusterName: 'Fertilizer & Nutrients' },
  'watering-and-irrigation': { listId: 7, clusterName: 'Watering & Irrigation' },
  'spacing-and-planting': { listId: 8, clusterName: 'Spacing & Planting' },
  'lawn-and-landscaping': { listId: 9, clusterName: 'Lawn & Landscaping' },
  'indoor-plants': { listId: 10, clusterName: 'Indoor Plants' },
  'trees-and-shrubs': { listId: 11, clusterName: 'Trees & Shrubs' },
};

export function getCluster(slug: string): Cluster | undefined {
  return clusters.find((c) => c.slug === slug);
}

export function getCalculatorsForCluster(slug: string): Calculator[] {
  return calculators.filter((c) => c.cluster === slug);
}

export function getCalculator(slug: string): Calculator | undefined {
  return calculators.find((c) => c.slug === slug);
}
