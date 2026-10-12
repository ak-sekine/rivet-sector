import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: '/rivet-sector/',
  build: { rolldownOptions: { input: {
    game: fileURLToPath(new URL('./index.html', import.meta.url)),
    legacy: fileURLToPath(new URL('./2d/index.html', import.meta.url)),
  } } },
});
