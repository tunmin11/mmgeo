// npm run demo → playground at http://localhost:8000, built from source (edits rebuild; refresh the page).
// @tm11/mmgeo resolves to the core package's source in this repo.
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

const ctx = await esbuild.context({
  entryPoints: [here('./main.tsx')],
  bundle: true,
  splitting: true, // outline files load on demand, as they would in an app
  format: 'esm',
  jsx: 'automatic',
  outdir: here('./out'),
  alias: { '@tm11/mmgeo': here('../../../src') },
  define: { 'process.env.NODE_ENV': '"development"' },
  logLevel: 'warning',
});
await ctx.watch();
const { port } = await ctx.serve({ servedir: here('.'), port: Number(process.env.PORT) || 8000 });
console.log(`\n  mmgeo-map playground: http://localhost:${port}\n  Edits to src/ rebuild automatically; refresh the page.\n`);
