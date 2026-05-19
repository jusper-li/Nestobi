import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/.netlify/functions': {
        target: 'https://nestobi.netlify.app',
        changeOrigin: true,
        secure: true,
      },
      '/supabase': {
        target: 'https://qthciyizquumeufrujyp.supabase.co',
        changeOrigin: true,
        secure: true,
        rewrite: path => path.replace(/^\/supabase/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
