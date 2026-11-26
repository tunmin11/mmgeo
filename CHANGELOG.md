# Changelog

## 2.0.0

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
