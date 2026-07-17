// Per-cluster icon (lucide-react export name), keyed by the same
// "<name>-cluster" tag as leadMagnetCopy.ts and leadMagnetConfig's `tag`
// field. LeadMagnetForm.jsx (calculator pages) already gets its icon
// directly from leadMagnetConfig[cluster.slug].icon -- this mapping exists
// only because LeadMagnet.astro (blog articles) has no equivalent cluster
// object to read an icon off of, just the clusterTag string.
//
// blog/companion-planting-chart.mdx's tag ("companion-planting-chart")
// deliberately has no entry here -- it's not a cluster, so it renders
// without an icon badge rather than borrowing one that doesn't fit.

export const leadMagnetIcon: Record<string, string> = {
  'soil-cluster': 'Shovel',
  'fertilizer-cluster': 'FlaskConical',
  'irrigation-cluster': 'Droplets',
  'spacing-cluster': 'Ruler',
  'lawn-cluster': 'Sprout',
  'indoor-plants-cluster': 'Flower2',
  'hydroponics-cluster': 'Thermometer',
  'trees-cluster': 'TreeDeciduous',
};
