import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    towns: 'src/towns.ts',
    wards: 'src/wards.ts',
    'village-tracts': 'src/village-tracts.ts',
    react: 'src/react.ts',
    zod: 'src/zod.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  target: 'es2019',
  // Shared chunks keep one copy of the core data and one instance of its index.
  splitting: true,
  external: ['react', 'zod'],
});
