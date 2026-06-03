import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const apiUrl =
    process.env.VITE_API_URL ||
    (mode === 'production' ? 'https://zo0go8484gkscgo0o4o8o0s4.api.pbshope.in/api' : '/api');

  return {
    plugins: [react(), tailwindcss()],
    envDir: '.',
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
