import rss from '@astrojs/rss';
import { blogPosts } from '../data/blogPosts';

export async function GET(context) {
  return rss({
    title: 'HarvestMath Blog',
    description:
      'Gardening guides and how-tos that pair with our calculators — mulch, soil, fertilizer, watering, spacing, and more.',
    site: context.site,
    items: blogPosts
      .slice()
      .sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf())
      .map((post) => ({
        title: post.title,
        description: post.description,
        pubDate: post.pubDate,
        link: `/blog/${post.slug}/`,
      })),
    customData: '<language>en-us</language>',
  });
}
