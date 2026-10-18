import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // The dashboard serves this build under /tools/game/billards/dist/, so
  // asset URLs must stay relative.
  base: './',
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});