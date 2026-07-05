import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function getGitInfo() {
  try {
    const commitSha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const commitLong = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return {
      commitSha,
      commitLong,
      versionLabel: commitSha || 'dev',
    };
  } catch {
    return {
      commitSha: 'dev',
      commitLong: 'dev',
      versionLabel: 'dev',
    };
  }
}

const gitInfo = getGitInfo();

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(gitInfo.versionLabel),
    __APP_COMMIT_SHA__: JSON.stringify(gitInfo.commitSha),
    __APP_COMMIT_LONG__: JSON.stringify(gitInfo.commitLong),
  },
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
