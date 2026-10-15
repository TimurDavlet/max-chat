import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // слушаем и IPv4, и IPv6, чтобы localhost / 127.0.0.1 / адрес в сети открывались одинаково
    host: true,
    port: 5173,
    open: true,
  },
  preview: { host: true, port: 4173 },
});
