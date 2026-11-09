import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-recharts': ['recharts'],
          'vendor-lucide':   ['lucide-react'],
        },
      },
    },
  },
  // Required for Capacitor APK: assets resolve from relative path
  base: './',
  server: {
    port: 5173,
    strictPort: false,
  },
});
