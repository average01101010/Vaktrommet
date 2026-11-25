import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Bygg for én selvstendig HTML-side (uten service worker): én JS-fil og én
 * CSS-fil som scripts/build-artifact.mjs syr sammen.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    outDir: 'dist-artifact',
    assetsInlineLimit: 0,
    cssCodeSplit: false,
    rollupOptions: { output: { format: 'iife', inlineDynamicImports: true } },
  },
})
