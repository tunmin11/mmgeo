# @tm11/mmgeo — Myanmar States, Districts & Townships

Bilingual (English + Burmese) Myanmar administrative data with **MIMU P-codes**, as a
zero-dependency npm package: 15 states/regions, 84 districts and self-administered zones,
356 townships. Ranked search that accepts **Unicode or Zawgyi**, exact validation,
and lookup by code. Built for address forms, delivery apps and localization.

[![NPM Version](https://img.shields.io/npm/v/@tm11/mmgeo.svg)](https://www.npmjs.com/package/@tm11/mmgeo) [![NPM Downloads](https://img.shields.io/npm/dt/@tm11/mmgeo.svg)](https://www.npmjs.com/package/@tm11/mmgeo)

- Every place has a globally unique **MIMU P-code** (`MMR013009`), a slug, and English + Burmese names
- Data from MIMU P-codes Release 9.7 (Jan 2026) — see [Data source](#data-source--license)
- Search ranks exact → prefix → substring and ignores "Township"/"မြို့နယ်" suffixes
- Burmese input works in Unicode **and Zawgyi**
- Slugs from 1.x still resolve
- ESM + CommonJS, TypeScript types, zero runtime dependencies

## Install

```bash
npm install @tm11/mmgeo
```

## Quick start: cascading address form

```ts
import { listStates, listDistricts, listTownships } from '@tm11/mmgeo';

listStates();
// → [{ code: 'MMR001', slug: 'kachin-state', name: 'Kachin State', mm: 'ကချင်ပြည်နယ်', type: 'state', lat, lng, capital }, ...]

listDistricts('yangon-region');            // second dropdown (slug or code: 'MMR013')
listTownships('yangon-region', 'yangon-east'); // third dropdown (or 'MMR013', 'MMR013D002')
listTownships('yangon-region');            // skip districts: every township in the state

listStates({ lang: 'mm' });                // Burmese labels per call — no global state
```

**Store the township `code` in your database** and render `name` to the user. Codes are
unique across the whole country; township slugs are only unique within their district.

## Search, validation, lookup

```ts
import { searchTownships, findTownships, isValidTownship, getByCode } from '@tm11/mmgeo';

searchTownships('hlaing', { limit: 5 });  // ranked; each result has stateCode/districtCode to pre-fill a form
searchTownships('ရန်ကင်း');                 // Burmese, Unicode…
searchTownships('ရန္ကင္း');                 // …or Zawgyi

isValidTownship('Yankin Township');       // true — English, Burmese, slug, 1.x slug or code
findTownships('Minhla');                  // 2 results (Magway, Bago): ask the user which one
getByCode('MMR013009');                   // { level: 'township', en: 'Thingangyun', districtCode: 'MMR013D002', ... }
getByCode('MMR015');                      // MIMU's "Shan (North)" part code → Shan State
```

## API

All functions take an optional `{ lang: 'en' | 'mm' }` (default `'en'`) that only sets `name`.
State and district arguments accept a slug, a 1.x slug, or a code (case-insensitive).
Unknown references return `[]` / `undefined`; nothing throws.

| Function | Returns |
| --- | --- |
| `listStates(opts?)` | `StatePlace[]`, ordered by code |
| `listDistricts(state, opts?)` | `DistrictPlace[]` — districts and self-administered zones |
| `listTownships(state, district?, opts?)` | `TownshipPlace[]` — of a district, or the whole state if `district` is omitted |
| `searchTownships(query, opts?)` | `TownshipPlace[]`, ranked. Options: `limit`, `includeSubTownships` (default `true`) |
| `findTownships(input, opts?)` | `TownshipPlace[]` exactly matching a name, slug, 1.x slug or code |
| `isValidTownship(input)` | `boolean` — `findTownships(input).length > 0` |
| `getByCode(code, opts?)` | `StatePlace \| DistrictPlace \| TownshipPlace \| undefined` |
| `dataInfo` | `{ source, version, generatedAt }` of the bundled data |
| `createGeo(data)` | the same API over your own `GeoData` (e.g. a newer MIMU build) |

### Types

```ts
interface Place { code: string; slug: string; name: string; en: string; mm: string }

interface StatePlace extends Place {
  level: 'state'; type: 'state' | 'region' | 'union-territory';
  lat: number; lng: number; capital: string;
}
interface DistrictPlace extends Place {
  level: 'district'; type: 'district' | 'self-administered-zone' | 'self-administered-division';
  stateCode: string; stateSlug: string;
}
interface TownshipPlace extends Place {
  level: 'township'; type: 'township' | 'sub-township';
  official: boolean; // false = recognized by field sources only, not the GAD (e.g. parts of the Wa area)
  stateCode: string; stateSlug: string; districtCode: string; districtSlug: string;
}
```

## Notes on the data

- **Districts follow MIMU**, which still uses the 2008-constitution districts (plus
  self-administered zones), not the 121 districts announced by the Ministry of Home
  Affairs in April 2022. MIMU P-codes are the de facto standard for joining datasets, so
  we follow them.
- **Bago and Shan** are single states here (`MMR111`, `MMR222`). MIMU also splits them
  into parts (Bago East/West, Shan South/North/East); `getByCode` accepts those part codes.
- **Wa and Kokang areas** appear as MIMU publishes them, including townships that only
  field sources recognize (`official: false`).

## Migrating from 1.x

2.0 replaces the hand-maintained 1.x data with MIMU data. In short:

- **Add codes.** Results now have `code`, `level` and `type`. Store `code` going forward.
- **Old slugs keep working** as input: 414 of the 417 1.x township slugs, every 1.x state
  slug, and old district slugs resolve. Many 1.x "townships" were really towns or
  sub-townships (e.g. `tontar`, `kyainglap`); they now resolve to the township they belong to.
  Not mapped: `hlaingthaya` (MIMU splits it into East and West), `mine-pyin`, `mineyu`.
- **Names and spellings follow MIMU**, e.g. Chauck → Chauk, Tiddim → Tedim, Mine Hsat → Monghsat.
- **Districts changed** for about 40 townships, mostly into self-administered zones
  (e.g. Hopong → Pa-O SAZ). `listDistricts` returns new district slugs; old ones still resolve.
- **States are ordered by code**, not in the 1.x order.
- `PlaceWithPath` is now an alias of `TownshipPlace`.
- The class API (`initialize`, `getStates`) still works but is deprecated.

To find what changed for a value you stored, look it up: `findTownships(oldSlug)`.

## Updating the data

When MIMU publishes a new release, download the P-code workbook from
[themimu.info/place-codes](https://themimu.info/place-codes) and run:

```bash
npm run build:data -- path/to/Myanmar_PCodes_Release_X.Y_*.xlsm
npm test   # data-quality checks: unique codes, hierarchy, slugs, Unicode
```

## Data source & license

- **Code:** ISC — see [LICENSE](LICENSE).
- **Data:** [MIMU P-codes](https://themimu.info/place-codes) Release 9.7 (Jan 2026), by the
  Myanmar Information Management Unit. It is **not** covered by ISC: it stays under
  MIMU's terms, which require attribution and say MIMU products are not for sale and not
  for commercial use. See [DATA_LICENSE](DATA_LICENSE) before using it in your product.
- **Zawgyi conversion:** rules from [Rabbit](https://github.com/Rabbit-Converter/Rabbit-Node) (MIT).

## Contributing

Pull requests are welcome. Data fixes should go through `scripts/build-data.ts`
(MIMU source or the `V1_OVERRIDES` map) rather than hand-editing `data/db.json`.
