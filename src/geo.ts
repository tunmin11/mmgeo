import { nameKey, normalize, queryKeys } from './normalize';
import type {
  AnyPlace, DistrictPlace, GeoData, Lang, LangOpts, RawDistrict, RawState, RawTownship,
  SearchOpts, StatePlace, TownshipPlace,
} from './types';

interface TownshipEntry {
  raw: RawTownship;
  state: RawState;
  district: RawDistrict;
  /** Match keys: names (en, mm), slug, aliases. */
  keys: string[];
}

const lang = (opts?: LangOpts): Lang => opts?.lang ?? 'en';
const pick = (n: { en: string; mm: string }, l: Lang) => (l === 'mm' ? n.mm : n.en);

/** Does `ref` (slug, alias or code) name this node? */
const isRef = (n: { code: string; slug: string; aliases?: string[] }, ref: string) =>
  n.slug === ref || n.code === ref.toUpperCase() || (n.aliases?.includes(ref) ?? false);

/**
 * Build the query API over a dataset. The package exports an instance over
 * the bundled MIMU data; tests and tools can build one over any `GeoData`.
 */
export const createGeo = (data: GeoData) => {
  const toState = (s: RawState, l: Lang): StatePlace => ({
    level: 'state', code: s.code, slug: s.slug, name: pick(s, l), en: s.en, mm: s.mm,
    type: s.type, lat: s.lat, lng: s.lng, capital: s.capital,
  });
  const toDistrict = (d: RawDistrict, s: RawState, l: Lang): DistrictPlace => ({
    level: 'district', code: d.code, slug: d.slug, name: pick(d, l), en: d.en, mm: d.mm,
    type: d.type, stateCode: s.code, stateSlug: s.slug,
  });
  const toTownship = (e: Omit<TownshipEntry, 'keys'>, l: Lang): TownshipPlace => ({
    level: 'township', code: e.raw.code, slug: e.raw.slug, name: pick(e.raw, l),
    en: e.raw.en, mm: e.raw.mm, type: e.raw.type, official: e.raw.official !== false,
    stateCode: e.state.code, stateSlug: e.state.slug,
    districtCode: e.district.code, districtSlug: e.district.slug,
  });

  // Flat index, built once on first use.
  let index: TownshipEntry[] | undefined;
  let byCode: Map<string, () => AnyPlace> | undefined;
  const entries = (): TownshipEntry[] =>
    (index ??= data.states.flatMap(state =>
      state.districts.flatMap(district =>
        district.townships.map(raw => ({
          raw, state, district,
          keys: [...new Set([nameKey(raw.en), nameKey(raw.mm), normalize(raw.slug), ...(raw.aliases ?? []).map(normalize)])],
        }))
      )
    ));

  const findState = (ref: string) => data.states.find(s => isRef(s, ref));
  const findDistrict = (s: RawState | undefined, ref: string) => s?.districts.find(d => isRef(d, ref));

  /** All states/regions plus Nay Pyi Taw, ordered by MIMU code. */
  const listStates = (opts?: LangOpts): StatePlace[] => data.states.map(s => toState(s, lang(opts)));

  /** Districts and self-administered zones of a state. Accepts a slug, old 1.x slug, or code. Unknown → `[]`. */
  const listDistricts = (stateRef: string, opts?: LangOpts): DistrictPlace[] => {
    const s = findState(stateRef);
    return s ? s.districts.map(d => toDistrict(d, s, lang(opts))) : [];
  };

  /**
   * Townships of a district, or of a whole state when `districtRef` is omitted
   * (handy for two-level address forms). Unknown refs → `[]`.
   */
  const listTownships = (stateRef: string, districtRef?: string | LangOpts, opts?: LangOpts): TownshipPlace[] => {
    if (typeof districtRef === 'object') [opts, districtRef] = [districtRef, undefined];
    const state = findState(stateRef);
    if (!state) return [];
    const districts = districtRef === undefined ? state.districts : [findDistrict(state, districtRef)].filter(Boolean) as RawDistrict[];
    return districts.flatMap(district => district.townships.map(raw => toTownship({ raw, state, district }, lang(opts))));
  };

  /**
   * Ranked township search over English and Burmese names, slugs and 1.x slugs.
   * Burmese input may be Unicode or Zawgyi. Order: exact, then prefix, then
   * substring; ties go to full townships, then English name.
   */
  const searchTownships = (query: string, opts: SearchOpts = {}): TownshipPlace[] => {
    const qs = queryKeys(query);
    if (!qs.length) return [];
    const scored: [TownshipEntry, number][] = [];
    for (const e of entries()) {
      if (opts.includeSubTownships === false && e.raw.type === 'sub-township') continue;
      let best = Infinity;
      for (const q of qs) for (const k of e.keys) {
        const score = k === q ? 0 : k.startsWith(q) ? 1 : k.includes(q) ? 2 : Infinity;
        if (score < best) best = score;
      }
      if (best !== Infinity) scored.push([e, best]);
    }
    scored.sort(([a, sa], [b, sb]) =>
      sa - sb ||
      Number(a.raw.type === 'sub-township') - Number(b.raw.type === 'sub-township') ||
      a.raw.en.localeCompare(b.raw.en)
    );
    const hits = opts.limit === undefined ? scored : scored.slice(0, Math.max(0, opts.limit));
    return hits.map(([e]) => toTownship(e, lang(opts)));
  };

  /**
   * Townships whose name, slug, 1.x slug or code matches `input` exactly
   * (after normalization). More than one result means the name is shared —
   * ask the user for the state or district.
   */
  const findTownships = (input: string, opts?: LangOpts): TownshipPlace[] => {
    const code = input.trim().toUpperCase();
    const qs = queryKeys(input);
    return entries()
      .filter(e => e.raw.code === code || qs.some(q => e.keys.includes(q)))
      .map(e => toTownship(e, lang(opts)));
  };

  /** True if `input` names at least one township (English, Burmese, slug, 1.x slug or code). */
  const isValidTownship = (input: string): boolean => findTownships(input).length > 0;

  /** Look up any state, district/zone or township by MIMU code, e.g. `MMR013`, `MMR013D001`, `MMR013001`. */
  const getByCode = (code: string, opts?: LangOpts): AnyPlace | undefined => {
    if (!byCode) {
      byCode = new Map();
      for (const s of data.states) {
        const sc = s;
        byCode.set(s.code, () => toState(sc, 'en'));
        for (const c of s.partCodes ?? []) byCode.set(c, () => toState(sc, 'en'));
        for (const d of s.districts) byCode.set(d.code, () => toDistrict(d, sc, 'en'));
      }
      for (const e of entries()) byCode.set(e.raw.code, () => toTownship(e, 'en'));
    }
    const place = byCode.get(code.trim().toUpperCase())?.();
    if (place && lang(opts) === 'mm') place.name = place.mm;
    return place;
  };

  return {
    meta: data.meta,
    listStates, listDistricts, listTownships,
    searchTownships, findTownships, isValidTownship, getByCode,
  };
};

export type Geo = ReturnType<typeof createGeo>;
