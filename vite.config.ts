import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: '/rivet-sector/',
  build: { rolldownOptions: { input: {
    tps: fileURLToPath(new URL('./index.html', import.meta.url)),
    prototype2d: fileURLToPath(new URL('./2d/index.html', import.meta.url)),
  } } },
});
