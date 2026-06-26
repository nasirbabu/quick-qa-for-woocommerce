import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
    rollupOptions: {
      input: resolve(__dirname, 'src/index.jsx'),
      output: {
        entryFileNames: 'quick-qa-app.js',
        chunkFileNames: 'quick-qa-[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'quick-qa-app.css';
          }
          return assetInfo.name;
        },
      },
    },
  },
  base: './',
});
