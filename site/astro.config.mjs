import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { versao } from '@bncc/dados';

// lastmod honesto: a data da versão dos dados (dados-2026.07 → 2026-07-01),
// não a data do build — rebuildar sem mudar dado não deve sinalizar recrawl.
const [, ano, mes] = versao().data_version.match(/(\d{4})\.(\d{2})/) ?? [];
const lastmod = ano ? `${ano}-${mes}-01` : undefined;

export default defineConfig({
  site: 'https://bncc.dev',
  integrations: [sitemap({
    serialize: (item) => (lastmod ? { ...item, lastmod } : item),
  })],
  build: { format: 'directory' },
  vite: {
    ssr: {
      // O @bncc/dados carrega os JSONs relativos ao próprio módulo
      // (import.meta.url); empacotá-lo quebraria a resolução dos dados.
      external: ['@bncc/dados'],
    },
  },
});
