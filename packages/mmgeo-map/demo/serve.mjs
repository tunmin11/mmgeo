// The docs site, docs/index.html, for both packages.
//   npm run demo        → http://localhost:8000, built from source in memory (refresh after edits)
//   npm run build:docs  → docs/app.js for GitHub Pages: React and both packages come from the CDN
//                         through the import map in docs/index.html, so only the site code is committed.
import * as esbuild from 'esbuild';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const docs = here('../../../docs');
const base = { entryPoints: { app: here('./main.tsx') }, bundle: true, format: 'esm', jsx: 'automatic', logLevel: 'warning' };

if (process.argv.includes('--build')) {
  await esbuild.build({
    ...base,
    outdir: docs,
    minify: true,
    external: ['react', 'react/*', 'react-dom', 'react-dom/*', '@tm11/mmgeo', '@tm11/mmgeo/*', '@tm11/mmgeo-map'],
    define: { 'process.env.NODE_ENV': '"production"' },
  });
  console.log('docs/app.js written');
} else {
  const ctx = await esbuild.context({
    ...base,
    outdir: docs, // where the files are served from; write: false keeps them in memory, out of docs/
    write: false,
    splitting: true, // outline files load on demand, as they would in an app
    alias: { '@tm11/mmgeo-map': here('../src/index.tsx'), '@tm11/mmgeo': here('../../../src') },
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  const { port } = await ctx.serve({ servedir: docs, port: Number(process.env.PORT) || 8000 });
  console.log(`\n  mmgeo docs: http://localhost:${port}\n  Built from src/ on each load; refresh after edits.\n`);
}
