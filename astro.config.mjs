// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';

// https://astro.build/config
export default defineConfig({
  site: 'https://harvestmath.com',
  integrations: [react(), mdx(), sitemap()],
  // Netlify adapter enables server-rendered API routes (e.g. src/pages/api/subscribe.ts)
  // alongside the rest of the site, which stays statically prerendered by default.
  // Astro 5 replaced the old output: 'hybrid' setting with this pattern: keep the
  // default 'static' output and opt individual routes into SSR with
  // `export const prerender = false` in that route file.
  adapter: netlify(),
  vite: {
    build: {
      rollupOptions: {
        // /pagefind/pagefind.js doesn't exist in source -- it's generated as a
        // postbuild step (`pagefind --site dist`, see package.json's "build"
        // script) straight into dist/pagefind/. SiteSearch.tsx dynamically
        // imports it at runtime, in the browser, only once someone opens
        // search. Marking it external stops Rollup from trying (and failing)
        // to resolve/bundle a file that won't exist until after this exact
        // build step finishes.
        external: ['/pagefind/pagefind.js'],
      },
    },
  },
});
