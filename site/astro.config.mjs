import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://bncc.dev',
  integrations: [sitemap()],
  build: { format: 'directory' },
  vite: {
    ssr: {
      // O @bncc/dados carrega os JSONs relativos ao próprio módulo
      // (import.meta.url); empacotá-lo quebraria a resolução dos dados.
      external: ['@bncc/dados'],
    },
  },
});
