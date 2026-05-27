import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const bffUrl = env['VITE_SIM_BFF_URL'] ?? 'http://localhost:4100';
  const bffWsUrl = bffUrl.replace(/^http/, 'ws');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      strictPort: false,
      // Proxy /sim/* to the local sim-bff so the browser can hit a same-origin
      // path in dev. Production goes through the real domain instead.
      proxy: {
        '/sim': {
          target: bffUrl,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    define: {
      __SIM_BFF_URL__: JSON.stringify(bffUrl),
      __SIM_BFF_WS_URL__: JSON.stringify(bffWsUrl),
    },
    build: {
      target: 'es2022',
      sourcemap: true,
    },
  };
});
