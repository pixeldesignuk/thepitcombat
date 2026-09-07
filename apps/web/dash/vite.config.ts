import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const api = process.env.API_INTERNAL_URL || env.API_INTERNAL_URL || 'http://localhost:3001';
  const auth = process.env.AUTH_INTERNAL_URL || env.AUTH_INTERNAL_URL || 'http://localhost:3002';
  return {
    server: {
      proxy: {
        '/auth': { target: auth, changeOrigin: true },
        '/api': { target: api, changeOrigin: true, rewrite: path => path.replace(/^\/api/, '/v1') },
      },
    },
  };
});
