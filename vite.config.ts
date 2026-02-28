import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/wl': {
        target: 'https://api.worldlabs.ai',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/wl/, ''),
      },
      '/api/claude': {
        target: 'https://api.anthropic.com',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/claude/, ''),
      },
      '/api/el': {
        target: 'https://api.elevenlabs.io',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/el/, ''),
      },
    },
  },
});
