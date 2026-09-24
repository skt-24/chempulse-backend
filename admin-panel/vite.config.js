import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  optimizeDeps: { noDiscovery: true, include: [], entries: [] },
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/chemsiq-admin.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: ({ name = '' }) => name.endsWith('.css')
          ? 'assets/chemsiq-admin.css'
          : 'assets/[name][extname]'
      }
    }
  }
});
