import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  plugins: [react(), crx({ manifest })],
  server: {
    // Required so the CRX dev-server HMR socket can reach the extension context
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 1000000, // Inline fonts up to 1MB to fix Monaco icons
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/chunk-[hash].js',
      },
    },
  },
})
