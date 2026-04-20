// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://chipcolate.github.io',
  base: '/tesserone',
  vite: {
    plugins: [tailwindcss()],
  },
});