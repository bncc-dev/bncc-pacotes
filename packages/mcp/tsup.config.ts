import { readFileSync } from 'node:fs';
import { defineConfig } from 'tsup';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  entry: ['src/servidor.ts', 'src/tools.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  // A versão do McpServer sempre acompanha a do pacote (corrige o '0.0.1' que ficou para trás).
  define: { 'process.env.VERSAO_PACOTE': JSON.stringify(pkg.version) },
});
