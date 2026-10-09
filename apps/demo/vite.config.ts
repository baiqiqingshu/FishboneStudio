import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@fishbone/vue': fileURLToPath(new URL('../../packages/vue/src/index.ts', import.meta.url))
    }
  },
  server: { port: 5173, strictPort: true }
})
