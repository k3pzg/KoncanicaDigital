import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND_URL = process.env.VITE_DEV_API_PROXY_TARGET ?? 'http://localhost:3001';

// VITE_ALLOWED_HOSTS: comma-separated extra hosts for the preview server
const extraHosts = (process.env.VITE_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': BACKEND_URL,
      '/health': BACKEND_URL,
      '/water-objects': BACKEND_URL,
      '/fish-species': BACKEND_URL,
      '/fish-categories': BACKEND_URL,
      '/fish-entry-events': BACKEND_URL,
      '/fish-control-events': BACKEND_URL,
      '/fish-exit-events': BACKEND_URL,
      '/fish-stock-current': BACKEND_URL,
      '/api': BACKEND_URL,
    },
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT ?? 4173),
    // Allow any *.railway.app subdomain plus any explicitly listed hosts
    allowedHosts: ['all', ...extraHosts],
  },
});
