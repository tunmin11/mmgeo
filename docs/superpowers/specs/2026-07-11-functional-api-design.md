# mmgeo v1.1 — Additive Functional API

**Date:** 2026-07-11
**Status:** Approved

## Goal

Make `@tm11/mmgeo` practically useful for the three things devs actually need Myanmar geo data for — cascading address forms, search/validation, and localized display — without breaking any existing user. Additive minor release (1.1.0).

## Backward compatibility (hard requirement)

- `initialize()`, `getStates()` (class instances), `getName()`, and the global language state keep working exactly as today.
- The two existing tests in `src/test/mmgeo.test.ts` must pass unchanged; they act as the compat guard.
- Version bump is **minor**, not major.

## Data changes

- A one-time script (`scripts/add-slugs.ts`, run manually, not shipped) adds a stable `slug` field to every state, district, and township in `data/db.json`, slugified from the English name (`"Hlaing Tharyar"` → `"hlaing-tharyar"`). Additive only — existing keys (`eng`, `mm`, `lat`, `lng`, `capital`) are untouched.
- If slugification produces a duplicate within the same parent, disambiguate with a numeric suffix (`-2`).
- Delete the duplicate `db.json` at the repo root; code only ever imported `data/db.json`.
- Drop the useless `global` dependency from `package.json`.

## New public API

All new names — nothing collides with existing exports. All functions are pure; language is a per-call option, never global.

```ts
type Lang = 'en' | 'mm';

interface Place {
  slug: string;
  name: string;   // localized per opts.lang, default 'en'
  en: string;
  mm: string;
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

listStates(opts?: { lang?: Lang }): StatePlace[];
listDistricts(stateSlug: string, opts?: { lang?: Lang }): Place[];
listTownships(stateSlug: string, districtSlug: string, opts?: { lang?: Lang }): Place[];
searchTownships(query: string, opts?: { lang?: Lang }): PlaceWithPath[];
isValidTownship(nameOrSlug: string): boolean;
```

Behavior details:

- `listDistricts` / `listTownships` return `[]` for unknown slugs (no throw) — matches the dropdown use case where an empty list is the sane fallback.
- `searchTownships` uses normalized matching: lowercase, strip spaces and dashes, substring match against `en`, `mm`, and `slug`. Returns `[]` for empty/whitespace query. `opts.lang` only affects the `name` field in results, not matching.
- `isValidTownship` is true if the normalized input exactly matches any township's normalized `en`, `mm`, or `slug`.
- No fuzzy/Levenshtein matching in this release (deliberate — normalized substring covers most real variance; fuzzy can be added later without breaking anything).

## Code structure

- `src/normalize.ts` — `slugify()` and `normalize()` helpers; shared by the API and the slug script.
- `src/api.ts` — the five new functions and their types.
- `src/index.ts` — re-exports everything from `api.ts` alongside the existing exports.
- Zero runtime dependencies.

## Testing

- Existing 2 tests unchanged.
- New tests in `src/test/api.test.ts`: each function's happy path, Myanmar-language query matching, unknown slug → `[]`, empty query → `[]`, validation of a name vs a slug, and `lang: 'mm'` localizing `name`.

## Docs

- README gains a "Address forms & search" section with cascading-dropdown and validation examples; existing usage docs stay.

## Out of scope

- MCP server, hosted API, MIMU pcodes, postal codes, township coordinates, fuzzy matching, ESM dual build (package stays CJS as-is for now).
