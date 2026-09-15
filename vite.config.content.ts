import { resolve } from 'node:path'
import { defineConfig } from 'vite'

/**
 * Content script build. MV3 content scripts are classic scripts, so this must
 * emit a single self-contained IIFE with no imports and no code splitting.
 * emptyOutDir is false because `build:pages` runs first and owns dist/.
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/content/index.ts'),
      name: 'CEKit',
      formats: ['iife'],
      fileName: () => 'content.js',
    },
  },
})
