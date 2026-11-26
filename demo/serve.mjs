// npm run demo        → playground with PREVIEW outlines (approximate districts/townships)
// npm run demo:real   → playground with the outlines the package actually ships (data/map.json)
import * as esbuild from 'esbuild';
import path from 'node:path';

const preview = !process.argv.includes('--real');
const previewMap = {
  name: 'preview-map',
  setup(build) {
    if (!preview) return;
    build.onResolve({ filter: /data[\\/]map\.json$/ }, () => ({ path: path.resolve('demo/preview-map.json') }));
  },
};

const ctx = await esbuild.context({
  entryPoints: ['demo/main.tsx'],
  bundle: true,
  jsx: 'automatic',
  outdir: 'demo/out',
  define: { 'process.env.NODE_ENV': '"development"', __PREVIEW__: JSON.stringify(preview) },
  plugins: [previewMap],
  logLevel: 'warning',
});
await ctx.watch();
const { port } = await ctx.serve({ servedir: 'demo', port: Number(process.env.PORT) || 8000 });
console.log(`\n  mmgeo playground (${preview ? 'preview outlines' : 'shipped outlines'}): http://localhost:${port}\n  Edits to src/ rebuild automatically; refresh the page.\n`);
