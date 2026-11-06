import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the API runs on Laravel's port 8000 and Vite proxies to it,
// so the browser only ever talks to http://localhost:5173.
const backend = 'http://127.0.0.1:8000';

export default defineConfig({
  // '@/' is src/.
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: backend, changeOrigin: true },
      '/storage': { target: backend, changeOrigin: true },
    },
  },
});
