import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND_URL = process.env.VITE_DEV_API_PROXY_TARGET ?? 'http://localhost:3001';
const RAILWAY_HOST = 'koncanicadigital.up.railway.app';
const ALLOWED_HOSTS = Array.from(
  new Set(
    [RAILWAY_HOST, ...(process.env.VITE_ALLOWED_HOSTS ?? '').split(',')]
      .map((host) => host.trim())
      .filter(Boolean)
  )
);

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
      '/api': BACKEND_URL
    }
  },
  preview: {
    allowedHosts: ALLOWED_HOSTS
  }
});
