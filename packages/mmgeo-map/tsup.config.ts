import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.tsx' },
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  target: 'es2019',
  // Next.js App Router: the component uses hooks, so mark it as a client component.
  banner: { js: '"use client";' },
  // The data and outlines come from the installed @tm11/mmgeo, never bundled.
  external: [/^@tm11\/mmgeo(\/|$)/, 'react', 'react/jsx-runtime'],
});
