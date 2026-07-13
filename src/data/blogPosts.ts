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
    slug: 'topsoil-vs-garden-soil',
    title: 'Topsoil vs. Garden Soil: What’s the Difference?',
    description:
      "Topsoil and garden soil aren't the same thing. Here's the real difference, and which one your project actually needs.",
    pubDate: new Date('2026-07-10'),
  },
];
