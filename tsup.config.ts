import { readFile } from 'node:fs/promises';
import { defineConfig } from 'tsup';
import type { Plugin } from 'esbuild';

// Outline parts (data/map/*.json) are loaded on demand, one chunk each. Emit each as
// JSON.parse('<text>'): esbuild leaves the string as-is, where its JSON module would be
// pretty-printed with one export per key (about 35% bigger), and JSON.parse is faster to load.
const compactOutlines: Plugin = {
  name: 'compact-outlines',
  setup(build) {
    build.onLoad({ filter: /data[\\/]map[\\/][^\\/]+\.json$/ }, async args => ({
      contents: `export default JSON.parse(${JSON.stringify((await readFile(args.path, 'utf8')).trim())});`,
      loader: 'js',
    }));
  },
};

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    towns: 'src/towns.ts',
    wards: 'src/wards.ts',
    'village-tracts': 'src/village-tracts.ts',
    react: 'src/react.ts',
    zod: 'src/zod.ts',
    boundaries: 'src/boundaries.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  target: 'es2019',
  // Shared chunks keep one copy of the core data and one instance of its index.
  splitting: true,
  external: ['react', 'zod'],
  esbuildPlugins: [compactOutlines],
});
