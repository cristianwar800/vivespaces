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
                    'resources/js/app.jsx',
                ],
                refresh: true,
            }),
            react({
                fastRefresh: false,
            }),
        ],
        server: {
            host: '127.0.0.1',
            port: 5174,
            strictPort: true,
            cors: true,
            hmr: false,
            watch: {
                usePolling: true,
            },
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
            }
        },
    };
});
