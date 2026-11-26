# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`@tm11/mmgeo` — an NPM package providing Myanmar geographic data (states → districts/zones → townships) with MIMU P-codes and bilingual (English/Myanmar) names. No runtime server; it's a small data library.

## Commands

- `npm test` — run Jest tests (ts-jest, tests live in `src/test/**/*.test.ts`)
- `npm test -- -t "test name"` — run a single test by name
- `npm run typecheck` — `tsc --noEmit`
- `npm run build` — bundle with tsup to `dist/` (CJS `index.js`, ESM `index.mjs`, `.d.ts`/`.d.mts`)
- `npm run build:data -- <MIMU P-code .xlsm>` — regenerate `data/db.json` from a MIMU workbook

## Architecture

- `data/db.json` — generated, never hand-edit. Schema v2 (`GeoData` in `src/types.ts`): `meta` + `states[].districts[].townships[]`, each node with `code` (MIMU P-code), `slug`, `en`, `mm`, `type`, optional `aliases` (1.x slugs). Bundled into `dist/` by tsup.
- `scripts/build-data.ts` — MIMU workbook → `db.json`. Holds the state table (Bago/Shan combined codes `MMR111`/`MMR222`), and maps 1.x slugs (`scripts/fixtures/db-v1.json`) to aliases; `V1_OVERRIDES` fixes the ones name-matching can't place.
- `src/geo.ts` — `createGeo(data)`: the whole query API over any `GeoData`, with a lazily built township index.
- `src/api.ts` — the default instance over the bundled data.
- `src/normalize.ts` — `slugify`, `normalize`, `nameKey` (drops "Township"/"မြို့နယ်"), `queryKeys` (adds a Zawgyi→Unicode variant for Burmese input).
- `src/vendor/rabbit-zg2uni.ts` — vendored Rabbit Zawgyi rules (MIT). Don't edit by hand.
- `src/index.ts` — public entry: re-exports the API plus the deprecated class API (`getStates`, `initialize`), which uses global language state in `config.ts`/`hook.ts`/`utils.ts`.

## Notes

- Data is under MIMU's terms (`DATA_LICENSE`), code is ISC. Keep attribution intact.
- `src/test/data.test.ts` guards data quality (unique codes, hierarchy, sibling-unique slugs/aliases, NFC names); a new MIMU release must pass it.
- The legacy test (`mmgeo.test.ts`) sets the global language to `mm`; it resets it in `afterAll`.
- Publishing: pushing a `v*` tag runs `.github/workflows/publish.yml`.
