# Changelog

## 2.2.0 — 2026-11-26

### Added
- `@tm11/mmgeo/boundaries` — outlines as SVG paths and exact point-in-shape lookup
  (`placeAt`, `townshipAt`, `getPlace`, `parentOf`, `loadOutlines`, `getOutline`, `listOutlines`)
  for every level down to village tracts, towns and wards. Townships and finer outlines load on
  demand, one chunk per state or township.
- Outlines from MIMU administrative boundaries v9.4 (CC BY-IGO).
- `npm run build:map` builds the outlines from GeoJSON or shapefiles with mapshaper.
- New companion package `@tm11/mmgeo-map` 0.1.0 (`packages/mmgeo-map`): `<MyanmarMap>`, a clickable,
  keyboard-accessible SVG map picker that drills down country → state → district → township →
  village tract / town → ward. Released separately (tags `map-v*`).

## 2.1.0 — 2026-11-26

### Added
- **Wards, village tracts and towns** from the same MIMU 9.7 release, as separate imports so
  the core stays small: `@tm11/mmgeo/wards` (3,481 urban wards), `@tm11/mmgeo/village-tracts`
  (13,771 village tracts, with previous names searchable) and `@tm11/mmgeo/towns` (532 towns
  with coordinates). Each has `list…`, `get…` and ranked `search…` functions.
- **Township coordinates** (`lat`, `lng`) from each township's seat town, for 351 of 356 townships.
- `nearestTownships(lat, lng, { limit })` — nearest townships by distance to their seat town.
- `@tm11/mmgeo/react` — `useAddressCascade`, a headless hook for state → district → township
  pickers (React 16.8+, optional peer dependency).
- `@tm11/mmgeo/zod` — `stateCode`, `districtCode`, `townshipCode`, `townshipName`,
  `mmAddressCodes` and `mmAddress` schemas that check codes exist and belong together
  (zod 3.23+ or 4, optional peer dependency).

### Changed
- The package no longer ships raw copies of data files other than `data/db.json`.
- CI now runs typecheck, tests, build and a smoke test on Node 18–24 for every push and PR.

## 2.0.0 — 2026-11-26

### Data
- Replaced the hand-maintained data with **MIMU P-codes Release 9.7** (Jan 2026):
  15 states/regions, 84 districts and self-administered zones, 356 townships.
- Every place now has a MIMU P-code (`code`), unique across the country.
- Fixed the 1.x data: 72 towns and sub-townships that were listed as townships; around
  40 townships in the wrong district; around 50 non-standard English spellings; 23 Burmese
  names that were wrong or encoded differently; 46 missing townships (Wa area, Naga SAZ,
  Hlaingtharya East/West); duplicate township slugs.
- Added the self-administered zones, a `type` field (`township` / `sub-township`, `district` /
  `self-administered-zone`, `state` / `region` / `union-territory`) and `official: false`
  for townships recognized only by field sources.
- The data is distributed under MIMU's terms, separate from the ISC code license (see `DATA_LICENSE`).

### API
- New: `getByCode`, `findTownships`, `dataInfo`, `createGeo`.
- `searchTownships` is ranked (exact → prefix → substring) and takes `limit` and
  `includeSubTownships`.
- Burmese input is matched in both Unicode and Zawgyi; "Township"/"မြို့နယ်" suffixes are ignored.
- State and district arguments accept a slug, a 1.x slug, or a code.
- `listTownships(state)` without a district lists every township in the state.
- Results include `code`, `level`, `type`, and parent codes.
- ESM build alongside CommonJS, with an `exports` map.

### Breaking
- Data, names and district assignments changed (see "Migrating from 1.x" in the README).
  1.x slugs still resolve as input.
- States are ordered by code.
- `initialize` / `getStates` are deprecated (still work).

## 1.1.0 — 2026-07-11

- New functional API: `listStates`, `listDistricts`, `listTownships`, `searchTownships`,
  `isValidTownship`, with a per-call `{ lang }` option.
- Stable slugs for every state, district and township.
- Removed an unused runtime dependency; the package now has none.
- The class API (`initialize`, `getStates`) keeps working.

## 1.0.3 / 1.0.4 — 2025-08-28

### Breaking
- Renamed the English name property from `eng` to `en` on states, districts and townships.

### Changed
- Added a `Language` type for stricter typing.
- Publishing to npm now runs from GitHub Actions on version tags.

## 1.0.0 — 2024-09-05

- First release: Myanmar states, districts and townships with English and Burmese names.
