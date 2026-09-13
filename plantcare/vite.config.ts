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
export default defineConfig({
  base: './',
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
})
