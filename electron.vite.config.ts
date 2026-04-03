import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

const alias = {
  '@': resolve(__dirname, 'src'),
  '@domain': resolve(__dirname, 'src/domain'),
  '@application': resolve(__dirname, 'src/application'),
  '@infrastructure': resolve(__dirname, 'src/infrastructure'),
  '@presentation': resolve(__dirname, 'src/presentation'),
  '@shared': resolve(__dirname, 'src/shared')
}

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      lib: {
        entry: resolve(__dirname, 'src/presentation/electron/main/index.ts')
      }
    },
    plugins: [externalizeDepsPlugin()],
    resolve: { alias }
  },
  preload: {
    build: {
      outDir: 'dist/preload',
      lib: {
        entry: resolve(__dirname, 'src/presentation/electron/preload/index.ts')
      }
    },
    plugins: [externalizeDepsPlugin()],
    resolve: { alias }
  },
  renderer: {
    root: '.',
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        }
      }
    },
    plugins: [react(), tailwindcss()],
    resolve: { alias }
  }
})