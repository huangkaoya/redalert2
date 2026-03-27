import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
const devPort = 4000;
export default defineConfig({
    plugins: [react(), basicSsl()],
    server: {
        host: '0.0.0.0',
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
        host: '0.0.0.0',
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
});
