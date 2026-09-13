import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { fileURLToPath } from 'node:url'

/**
 * One HTML file, and nothing fetched at runtime.
 *
 * `base: './'` so the built file works from a double-click as well as from a
 * server — the product is a file somebody keeps in Documents, not a deployment.
 * `assetsInlineLimit` is absurdly high on purpose: every image, font and script
 * has to end up inside the document, because the buyer is promised it works
 * with no internet and a single missing asset breaks that promise silently.
 */
export default defineConfig(({ mode }) => ({
  base: './',

  /*
   * The demo lock, set here rather than in a .env file.
   *
   *   npm run build        the product
   *   npm run build:demo   `--mode demo`, which lands here as mode === 'demo'
   *
   * A `.env.demo` would be the usual way to do this, and it was the first way:
   * it turns out tooling that syncs this repository refuses to write any file
   * called `.env*`, which is a good rule that would have left the build silently
   * producing a demo with no lock in it. One line of config cannot go missing
   * the same way — and the value is compiled into the bundle either way, which
   * is the point: the lock is the artefact, not a setting.
   */
  define: {
    'import.meta.env.VITE_DEMO_LOCK': JSON.stringify(mode === 'demo' ? '1' : ''),
  },
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: {
    alias: {
      '@app': fileURLToPath(new URL('./src/app', import.meta.url)),
      '@ported': fileURLToPath(new URL('./src/app/data/ported/index.ts', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 4000,
    reportCompressedSize: false,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
}))
