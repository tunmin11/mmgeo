// Shared engine for the sub-township levels (towns, wards, village tracts).
// Each level's data is a separate JSON file loaded only by its subpath import.
import { getByCode as getAdminPlace, findTownships } from './api';
import { nameKey, normalize, queryKeys } from './normalize';
import type { Lang, LangOpts } from './types';

export interface SubPlace {
  code: string;
  /** Localized per `opts.lang` (default `'en'`). */
  name: string;
  en: string;
  mm: string;
  townshipCode: string;
  districtCode: string;
  stateCode: string;
}

export interface SubSearchOpts extends LangOpts {
  /** Only search inside this township (code, or any input naming exactly one township). */
  township?: string;
  limit?: number;
}

type Row = [string, string, string, ...unknown[]];

interface Entry<P> {
  row: Row;
  keys: string[];
  build: (lang: Lang) => P;
}

/** Resolve a township reference to its code: a code, or a name/slug naming exactly one township. */
export const resolveTownshipCode = (ref: string): string | undefined => {
  const byCode = getAdminPlace(ref);
  if (byCode?.level === 'township') return byCode.code;
  const hits = findTownships(ref);
  return hits.length === 1 ? hits[0].code : undefined;
};

export const createLevel = <P extends SubPlace>(
  groups: Record<string, Row[]>,
  /** Township code for a row, given its group key. */
  townshipOf: (groupKey: string) => string,
  extend: (row: Row, base: SubPlace, groupKey: string) => P,
  extraKeys: (row: Row) => string[] = () => []
) => {
  let entries: Entry<P>[] | undefined;
  let byCode: Map<string, Entry<P>> | undefined;
  let byTownship: Map<string, Entry<P>[]> | undefined;

  const load = () => {
    if (entries) return;
    entries = []; byCode = new Map(); byTownship = new Map();
    for (const [key, rows] of Object.entries(groups)) {
      const tsp = townshipOf(key);
      const parent = getAdminPlace(tsp);
      if (parent?.level !== 'township') continue;
      for (const row of rows) {
        const [code, en, mm] = row;
        const e: Entry<P> = {
          row,
          keys: [...new Set([nameKey(en), nameKey(mm), normalize(code), ...extraKeys(row).map(nameKey)])],
          build: lang => extend(row, {
            code, name: lang === 'mm' ? mm : en, en, mm,
            townshipCode: parent.code, districtCode: parent.districtCode, stateCode: parent.stateCode,
          }, key),
        };
        entries.push(e);
        byCode.set(code, e);
        const list = byTownship.get(tsp) ?? [];
        list.push(e);
        byTownship.set(tsp, list);
      }
    }
  };

  const lang = (opts?: LangOpts): Lang => opts?.lang ?? 'en';

  /** Everything in a township (code, or any input naming exactly one township). Unknown → `[]`. */
  const listByTownship = (township: string, opts?: LangOpts): P[] => {
    load();
    const code = resolveTownshipCode(township);
    return code ? (byTownship!.get(code) ?? []).map(e => e.build(lang(opts))) : [];
  };

  /** Everything in one group (e.g. the wards of one town). */
  const listByGroup = (groupKey: string, opts?: LangOpts): P[] => {
    load();
    return (groups[groupKey.trim().toUpperCase()] ?? [])
      .map(row => byCode!.get(row[0]))
      .filter((e): e is Entry<P> => !!e)
      .map(e => e.build(lang(opts)));
  };

  const getByCode = (code: string, opts?: LangOpts): P | undefined => {
    load();
    return byCode!.get(code.trim().toUpperCase())?.build(lang(opts));
  };

  /** Ranked search: exact, then prefix, then substring. Unicode or Zawgyi Burmese. */
  const search = (query: string, opts: SubSearchOpts = {}): P[] => {
    load();
    const qs = queryKeys(query);
    if (!qs.length) return [];
    let pool = entries!;
    if (opts.township !== undefined) {
      const code = resolveTownshipCode(opts.township);
      pool = code ? byTownship!.get(code) ?? [] : [];
    }
    const scored: [Entry<P>, number][] = [];
    for (const e of pool) {
      let best = Infinity;
      for (const q of qs) for (const k of e.keys) {
        const s = k === q ? 0 : k.startsWith(q) ? 1 : k.includes(q) ? 2 : Infinity;
        if (s < best) best = s;
      }
      if (best !== Infinity) scored.push([e, best]);
    }
    scored.sort(([a, sa], [b, sb]) => sa - sb || a.row[1].localeCompare(b.row[1]));
    const hits = opts.limit === undefined ? scored : scored.slice(0, Math.max(0, opts.limit));
    return hits.map(([e]) => e.build(lang(opts)));
  };

  return { listByTownship, listByGroup, getByCode, search };
};
