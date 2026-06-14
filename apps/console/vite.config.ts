import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// Standalone desktop research console. Phase 1 wires the Commissioning module
// to the live DigitalTwin BFF; other modules are still mock.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const bffUrl = env['VITE_SIM_BFF_URL'] ?? 'http://localhost:4100';
  const bffWsUrl = bffUrl.replace(/^http/, 'ws');

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5174,
      strictPort: false,
      // Same-origin proxy in dev so the browser never hits the BFF cross-origin.
      proxy: {
        '/sim': { target: bffUrl, changeOrigin: true, ws: true },
        '/commissioning': { target: bffUrl, changeOrigin: true },
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
