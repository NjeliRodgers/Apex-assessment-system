import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Standalone Vite dev server for ApexFrontend.
// Talks to the SAME backend as GlobalFrontend (GlobalBackend) — see
// src/api/client.ts and VITE_API_URL in .env.
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 5174,
    },
  };
});