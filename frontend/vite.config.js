import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const BACKEND_URL = process.env.VITE_DEV_API_PROXY_TARGET ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: ['koncanicadigital.up.railway.app'],
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
    host: '0.0.0.0',
    allowedHosts: ['koncanicadigital.up.railway.app']
  }
});
