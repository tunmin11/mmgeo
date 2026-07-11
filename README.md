# @tm11/mmgeo — Myanmar States, Districts & Townships

Complete, bilingual (English + Burmese) geographic data for Myanmar as a zero-dependency
npm package: all states/regions, districts, and townships, with stable slugs, search,
and validation. Built for address forms, delivery apps, and localization.

## Features

- Complete geographic data for Myanmar (states, districts, and townships)
- Bilingual support (English and Myanmar languages)
- Stable, kebab-case slugs for every state, district, and township
- Substring search and exact-match validation for townships
- TypeScript support with full type definitions
- Zero runtime dependencies

## Installation

You can install this package using NPM:

```bash
npm install @tm11/mmgeo
```

Or with Yarn:

```bash
yarn add @tm11/mmgeo
```

[![NPM Version](https://img.shields.io/npm/v/@tm11/mmgeo.svg)](https://www.npmjs.com/package/@tm11/mmgeo) [![NPM Downloads](https://img.shields.io/npm/dt/@tm11/mmgeo.svg)](https://www.npmjs.com/package/@tm11/mmgeo)

## Quick start: cascading address form

```typescript
import { listStates, listDistricts, listTownships } from '@tm11/mmgeo';

listStates();                       // → [{ slug: 'magway-region', name: 'Magway Region', en, mm, lat, lng, capital }, ...]
listDistricts('magway-region');     // districts of a state, for your second dropdown
listTownships('magway-region', 'magway'); // townships, for your third dropdown

// Burmese labels? Pass lang — no global state:
listStates({ lang: 'mm' });         // → [{ name: 'မကွေးတိုင်းဒေသကြီး', ... }]
```

Store the `slug` in your database; render `name` to the user.

## Search & validation

```typescript
import { searchTownships, isValidTownship } from '@tm11/mmgeo';

searchTownships('hlaing');    // substring match on English, Burmese, or slug;
                               // each result includes stateSlug/districtSlug to pre-fill the form
isValidTownship('Hlaingthaya'); // true — accepts en name, mm name, or slug
```

## API reference

| Function | Signature | Description |
| --- | --- | --- |
| `listStates` | `(opts?: { lang?: 'en' \| 'mm' }) => StatePlace[]` | All states/regions of Myanmar. |
| `listDistricts` | `(stateSlug: string, opts?: { lang?: 'en' \| 'mm' }) => Place[]` | Districts within a state. Unknown `stateSlug` → `[]`. |
| `listTownships` | `(stateSlug: string, districtSlug: string, opts?: { lang?: 'en' \| 'mm' }) => Place[]` | Townships within a district. Unknown slugs → `[]`. |
| `searchTownships` | `(query: string, opts?: { lang?: 'en' \| 'mm' }) => PlaceWithPath[]` | Normalized substring match against a township's English name, Burmese name, and slug. Empty query → `[]`. |
| `isValidTownship` | `(nameOrSlug: string) => boolean` | Normalized exact match against a township's English name, Burmese name, or slug. |

All functions default `lang` to `'en'` when `opts` is omitted.

### Types

```typescript
interface Place {
  slug: string; // stable kebab-case identifier, e.g. 'magway-region'
  name: string; // localized per opts.lang (default 'en')
  en: string;   // English name
  mm: string;   // Myanmar name
}

interface StatePlace extends Place {
  lat: number;
  lng: number;
  capital: string;
}

interface PlaceWithPath extends Place {
  stateSlug: string;
  districtSlug: string;
}
```

## Legacy class API

The original class-based API from `1.0.x` is still supported for backward compatibility.

```typescript
import { initialize, getStates } from '@tm11/mmgeo';

// Initialize with English language (default)
initialize({ language: 'en' });

// Get all states
const states = getStates();
console.log(states[0].getName()); // "Magway Region"

// Switch to Myanmar language
initialize({ language: 'mm' });
console.log(states[0].getName()); // "မကွေးတိုင်းဒေသကြီး"
```

`getStates()` returns `State[]`, where each `State` has `en`, `mm`, `lat`, `lng`, `capital`,
`districts`, `getName()`, and `getDistricts()`. Each `District` has `en`, `mm`, `townships`,
`getName()`, and `getTownships()`. Each `Township` has `en`, `mm`, and `getName()`.
`getName()` returns the name in the language set by `initialize()` (module-level state,
shared across calls — prefer the functional API above if you need per-call language control).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This package is licensed under the ISC License. See the [LICENSE](LICENSE) file for more information.
