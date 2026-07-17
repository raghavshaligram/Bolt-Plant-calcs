// Shared per-cluster lead-magnet headline copy, keyed by the same short
// "<name>-cluster" tag used both as the clusterTag prop on blog articles'
// <LeadMagnet> calls and as the `tag` field on each entry in
// leadMagnetConfig (src/data/calculators.ts). Both LeadMagnetForm.jsx
// (calculator pages) and LeadMagnet.astro (blog articles) look up their
// displayed headline here instead of showing a generic "get the cheat
// sheet" message, so every signup form on the site says something
// specific to the cluster it's actually for.
//
// One article -- blog/companion-planting-chart.mdx -- passes its own
// explicit `headline` prop instead of relying on this mapping, since it
// has its own dedicated PDF and Brevo list (13), not a cluster-shared one.
// Both components treat an explicit `headline` prop as taking precedence
// over this lookup.

export const leadMagnetCopy: Record<string, string> = {
  'soil-cluster':
    'Get the Soil & Amendments Cheat Sheet — bag counts, mix ratios, and mulch depths for every project, in one page.',
  'fertilizer-cluster':
    'Get the Fertilizer Cheat Sheet — application rates and dilution ratios for every common fertilizer type, in one page.',
  'irrigation-cluster':
    'Get the Watering & Irrigation Cheat Sheet — flow rates, run times, and rainwater collection math, in one page.',
  'spacing-cluster':
    'Get the Spacing & Planting Cheat Sheet — frost dates, seed-starting timing, and spacing charts for your favorite crops, in one page.',
  'lawn-cluster':
    'Get the Lawn Cheat Sheet — seeding rates for new lawns and overseeding, by grass type, in one page.',
  'indoor-plants-cluster':
    'Get the Indoor Plants Cheat Sheet — light requirements and pot sizing for common houseplants, in one page.',
  'hydroponics-cluster':
    'Get the Hydroponics & Greenhouse Cheat Sheet — heater sizing and nutrient dosing basics, in one page.',
  'trees-cluster':
    'Get the Trees & Shrubs Cheat Sheet — mulching, watering, and feeding schedules by tree age, in one page.',
};
