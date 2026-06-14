import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Standalone 43" landscape touch kiosk. No BFF proxy yet — all data is mock.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    strictPort: false,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
});
