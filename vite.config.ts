import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const devPort = 4000;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: devPort,
    strictPort: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    fs: {
      allow: ['..']
    }
  },
  preview: {
    host: '127.0.0.1',
    port: devPort,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  optimizeDeps: {
    exclude: ['7z-wasm', '@ffmpeg/ffmpeg'],
    include: []
  },
  worker: {
    format: 'es'
  },
  assetsInclude: ['**/*.wasm']
}) 
