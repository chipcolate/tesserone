// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://chipcolate.github.io',
  base: '/tesserone',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'it', 'fr', 'es'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
