import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH = "/trenavis/" en GitHub Pages (https://lorennsw.github.io/trenavis/)
export default defineConfig({
  root: 'web',
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
});
