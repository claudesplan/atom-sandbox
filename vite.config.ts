import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  // Relative asset paths in the production build, so it works from any sub-folder
  // (e.g. https://<user>.github.io/atom-sandbox/) as well as from a domain root.
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  server: { port: 5175, strictPort: true },
  preview: { port: 5175 },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
}));
