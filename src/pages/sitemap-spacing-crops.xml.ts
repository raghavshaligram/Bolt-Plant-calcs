// A focused sitemap covering just the /plant-spacing/ pSEO set (hub + all
// crop pages), for a separate GSC submission -- the same "narrow, trackable
// sitemap for one set of pages" idea used for the growing-zones/
// planting-calendar rollout, adapted to how this codebase's sitemapping
// actually works.
//
// Technical note: this site uses @astrojs/sitemap, which auto-generates
// sitemap-index.xml and sitemap-0.xml from the full route list at build
// time and owns those filenames completely -- there's no supported way for
// a page in src/pages to inject an extra <sitemap> entry into that
// generated index (it's rebuilt from scratch on every build, so a static
// page at the same path would either collide with it or get silently
// clobbered by it). Instead, this file is a genuinely separate, self-
// contained sitemap at its own URL, and it's referenced the other
// fully-standard way: a second `Sitemap:` line in public/robots.txt. Search
// Console (and the sitemap protocol generally) treats a sitemap listed in
// robots.txt exactly the same as one cross-referenced from a sitemap index
// -- both are just as discoverable, and this file can also be submitted to
// GSC directly by URL regardless of how it's discovered.
//
// <lastmod> per URL reflects each crop entry's own `lastUpdated` field (real
// content-change dates from src/data/crop-spacing.ts), not the build time.

import type { APIRoute } from 'astro';
import { cropSpacing } from '../data/crop-spacing';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = site?.href.replace(/\/$/, '') ?? 'https://harvestmath.com';
  const hubLastmod = cropSpacing.reduce(
    (latest, c) => (c.lastUpdated > latest ? c.lastUpdated : latest),
    cropSpacing[0]?.lastUpdated ?? '2026-09-17'
  );

  const urls = [
    { loc: `${base}/plant-spacing/`, lastmod: hubLastmod },
    ...cropSpacing.map((c) => ({
      loc: `${base}/plant-spacing/${c.slug}/`,
      lastmod: c.lastUpdated,
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>\n    <loc>${u.loc}</loc>\n    <lastmod>${u.lastmod}</lastmod>\n  </url>`).join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
