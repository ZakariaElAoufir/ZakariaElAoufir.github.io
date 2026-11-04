// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import react from '@astrojs/react';

export default defineConfig({
  site: 'https://zakariaelaoufir.github.io',

  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: { prefixDefaultLocale: false }
  },

  vite: {
    plugins: [tailwindcss()],
    // pre-bundle React's runtimes up front: re-optimizing them mid-session in dev left two copies (jsxDEV is not a function)
    optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] }
  },
  integrations: [react()]
});