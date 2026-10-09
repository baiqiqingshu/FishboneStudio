import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  plugins: [
    vue(),
    dts({ tsconfigPath: '../../tsconfig.json', entryRoot: 'src', include: ['src'] })
  ],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      name: 'FishboneVue',
      formats: ['es', 'cjs'],
      fileName: (format) => `fishbone.${format === 'es' ? 'js' : 'cjs'}`
    },
    rollupOptions: { external: ['vue'], output: { globals: { vue: 'Vue' }, exports: 'named' } }
  }
})
