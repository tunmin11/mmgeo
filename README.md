# @tm11/mmgeo — Myanmar States, Districts, Townships, Wards & Village Tracts

Bilingual (English + Burmese) Myanmar administrative data with **MIMU P-codes**, as a
zero-dependency npm package: 15 states/regions, 84 districts and self-administered zones,
356 townships — plus 532 towns, 3,481 urban wards and 13,771 village tracts as opt-in imports.
Ranked search that accepts **Unicode or Zawgyi**, validation, lookup by code or by
coordinates, a React hook and zod schemas. Built for address forms, delivery apps and localization.

[![NPM Version](https://img.shields.io/npm/v/@tm11/mmgeo.svg)](https://www.npmjs.com/package/@tm11/mmgeo) [![NPM Downloads](https://img.shields.io/npm/dt/@tm11/mmgeo.svg)](https://www.npmjs.com/package/@tm11/mmgeo)

- Every place has a globally unique **MIMU P-code** (`MMR013009`), a slug, and English + Burmese names
- Data from MIMU P-codes Release 9.7 (Jan 2026) — see [Data source](#data-source--license)
- Search ranks exact → prefix → substring and ignores "Township"/"မြို့နယ်" suffixes
- Burmese input works in Unicode **and Zawgyi**
- Down to ward / village tract level, loaded only when you import it
- Township coordinates and a nearest-township lookup
- Headless React hook (`@tm11/mmgeo/react`) and zod schemas (`@tm11/mmgeo/zod`)
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

nearestTownships(16.84, 96.16);           // [{ en: 'Yankin', distanceKm: 0.5, ... }] — e.g. from the browser's geolocation
```

`nearestTownships` measures distance to each township's seat town, so it's a good default
for a form, not a boundary lookup: near a border it can pick the neighbouring township.

## Wards, village tracts and towns

Each level is a separate import, so apps that only need townships don't download it.
Urban addresses use **wards** (ရပ်ကွက်); rural addresses use **village tracts** (ကျေးရွာအုပ်စု).

```ts
import { listWards, searchWards } from '@tm11/mmgeo/wards';               // ~48 KB gzipped
import { listVillageTracts, searchVillageTracts } from '@tm11/mmgeo/village-tracts'; // ~210 KB gzipped
import { listTowns } from '@tm11/mmgeo/towns';                            // ~15 KB gzipped

listWards('MMR013010');                    // all wards of Yankin (township code, or a unique township name)
listWards('MMR013010701');                 // wards of one town
searchWards('No 1', { township: 'Yankin', limit: 5 });  // 'No (1) Ward', 'No (11) Ward', …
listVillageTracts('MMR017024');            // village tracts of Bogale
listTowns('Yankin');                       // [{ code: 'MMR013010701', en: 'Yankin', seat: true, lat, lng, ... }]
```

Every result carries `townshipCode`, `districtCode` and `stateCode`, so one stored
ward or village tract code is enough to rebuild the whole address.

## React

```tsx
import { useAddressCascade } from '@tm11/mmgeo/react';

function AddressPicker({ value, onChange }) {
  const a = useAddressCascade({ initial: value, onChange: v => onChange(v.townshipCode), lang: 'mm' });
  return (
    <>
      <select value={a.value.stateCode ?? ''} onChange={e => a.setState(e.target.value || null)}>
        <option value="">ပြည်နယ်/တိုင်း</option>
        {a.states.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
      </select>
      <select value={a.value.districtCode ?? ''} onChange={e => a.setDistrict(e.target.value || null)} disabled={!a.districts.length}>
        <option value="">ခရိုင်</option>
        {a.districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
      </select>
      <select value={a.value.townshipCode ?? ''} onChange={e => a.setTownship(e.target.value || null)} disabled={!a.townships.length}>
        <option value="">မြို့နယ်</option>
        {a.townships.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
      </select>
    </>
  );
}
```

The hook is headless — use it with any UI kit. Choosing a parent clears its children;
choosing a township fills in its parents. Pass `skipDistrict: true` for a two-level
form (state → township). `initial` takes a stored township code. Needs `react` 16.8+.

## Map picker

```tsx
import { MyanmarMap } from '@tm11/mmgeo/map';

<MyanmarMap
  value={stateCode}
  onChange={place => setStateCode(place?.code ?? null)}
  lang="mm"
  height={480}
/>
```

A clickable SVG map of Myanmar with no map library or tiles behind it. Hover or focus shows
the English and Burmese name; click, Enter or Space picks. Every shape is a real button
for keyboards and screen readers, and a breadcrumb leads back out.
`depth` sets how far users can zoom in (`'state'`, `'district'`, `'township'`), `skipDistrict` goes state → township,
`root="MMR222"` keeps the map inside one state or district, and `context="hidden"` hides the neighbouring
areas once zoomed in. Combine it with `useAddressCascade` or a dropdown: a controlled `value` keeps the map
in step with the rest of the form. Needs `react` 16.8+.

> **Coverage today:** state and region outlines only (Natural Earth, public domain;
> Nay Pyi Taw has no outline of its own yet). District and township outlines,
> with drill-down zoom, are coming from MIMU's boundary data.

### Which place contains a point?

```ts
import { placeAt } from '@tm11/mmgeo/boundaries';

placeAt(16.85, 96.17, { level: 'state' });  // Yangon Region — an exact point-in-shape test
```

`@tm11/mmgeo/boundaries` also exports `getOutline(code)` and `listOutlines(level, parent?)`
(SVG path data) to draw your own maps, and `townshipAt(lat, lng)` once township outlines ship.

## zod

```ts
import { mmAddress, mmAddressCodes, townshipCode, townshipName } from '@tm11/mmgeo/zod';

mmAddressCodes.parse({ stateCode: 'MMR013', townshipCode: 'MMR013010' });
mmAddress.safeParse({ line1: 'No. 12, Kabar Aye Pagoda Rd', stateCode: 'MMR001', townshipCode: 'MMR013010' });
// → error on townshipCode: "Township is not in this state/region"
```

Codes must exist and belong together (state ⊃ district ⊃ township ⊃ ward/village tract),
and errors point at the field that doesn't fit. Works with zod 3.23+ and 4.

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
| `nearestTownships(lat, lng, opts?)` | `(TownshipPlace & { distanceKm })[]`, nearest first. Option: `limit` (default 1) |
| `dataInfo` | `{ source, version, generatedAt }` of the bundled data |
| `createGeo(data)` | the same API over your own `GeoData` (e.g. a newer MIMU build) |

**`@tm11/mmgeo/wards`** — `listWards(townOrTownship)`, `getWard(code)`, `searchWards(query, { township?, limit? })` → `WardPlace`
**`@tm11/mmgeo/village-tracts`** — `listVillageTracts(township)`, `getVillageTract(code)`, `searchVillageTracts(query, opts?)` → `VillageTractPlace`
**`@tm11/mmgeo/towns`** — `listTowns(township)`, `getTown(code)`, `searchTowns(query, opts?)` → `TownPlace`
**`@tm11/mmgeo/react`** — `useAddressCascade({ lang?, skipDistrict?, initial?, onChange? })`
**`@tm11/mmgeo/zod`** — `stateCode`, `districtCode`, `townshipCode`, `townshipName`, `mmAddressCodes`, `mmAddress`
**`@tm11/mmgeo/map`** — `<MyanmarMap value onChange lang depth skipDistrict root context height showLabels colors />`
**`@tm11/mmgeo/boundaries`** — `placeAt`, `townshipAt`, `getOutline`, `listOutlines`, `project`, `availableLevels`

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
  lat?: number; lng?: number; // seat town
  stateCode: string; stateSlug: string; districtCode: string; districtSlug: string;
}

// Wards, village tracts and towns share this base:
interface SubPlace { code: string; name: string; en: string; mm: string; townshipCode: string; districtCode: string; stateCode: string }
interface WardPlace extends SubPlace { level: 'ward'; townCode: string }
interface VillageTractPlace extends SubPlace { level: 'village-tract'; previousEn?: string }
interface TownPlace extends SubPlace { level: 'town'; seat: boolean; lat?: number; lng?: number }
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
- **Coordinates** are those of each township's seat town. 5 townships have none in MIMU
  9.7: Hlaingtharya East and West (recently split) and the field-source Kokang entries.
- **Only places MIMU marks as active** are included. City-wide entries that span several
  townships (Yangon City, Mandalay City, Nay Pyi Taw) are left out of the town list.

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

## Data source & license

- **Code:** ISC — see [LICENSE](LICENSE).
- **Data:** [MIMU P-codes](https://themimu.info/place-codes) Release 9.7 (Jan 2026), by the
  Myanmar Information Management Unit. It is **not** covered by ISC: it stays under
  MIMU's terms, which require attribution and say MIMU products are not for sale and not
  for commercial use. See [DATA_LICENSE](DATA_LICENSE) before using it in your product.
- **Zawgyi conversion:** rules from [Rabbit](https://github.com/Rabbit-Converter/Rabbit-Node) (MIT).

## Issues

Found a wrong name, code or missing place? Open an issue at
[github.com/tunmin11/mmgeo/issues](https://github.com/tunmin11/mmgeo/issues).

Release notes: [CHANGELOG](https://github.com/tunmin11/mmgeo/blob/master/CHANGELOG.md).
