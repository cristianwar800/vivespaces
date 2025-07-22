// vite.config.js
import { defineConfig, loadEnv } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const isNgrok = process.env.VITE_USE_NGROK === 'true';

    return {
        plugins: [
            laravel({
                input: [
                    'resources/css/app.css',
                    'resources/js/app.jsx',  // ← Cambio aquí: .js por .jsx
                ],
                refresh: true,
            }),
            react(),
        ],
        server: {
            host: '0.0.0.0',
            port: 5174,
            strictPort: true,
            cors: true,
            hmr: {
                host: 'localhost',
                port: 5174,
            },
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
            }
        },
    };
});
