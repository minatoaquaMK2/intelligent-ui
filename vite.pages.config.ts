import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: fileURLToPath(new URL('./site', import.meta.url)),
  base: '/intelligent-ui/',
  publicDir: fileURLToPath(new URL('./public', import.meta.url)),
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4175, strictPort: true },
  build: {
    outDir: '../dist-pages',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./site/index.html', import.meta.url)),
        demo: fileURLToPath(new URL('./site/demo/index.html', import.meta.url)),
      },
    },
  },
});
