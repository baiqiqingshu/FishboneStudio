import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@ui-studio/fishbone': fileURLToPath(
        new URL('../../packages/fishbone/src/index.ts', import.meta.url)
      )
    }
  },
  server: { port: 5173, strictPort: true }
})
