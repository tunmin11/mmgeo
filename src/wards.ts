/**
 * Urban wards (ရပ်ကွက်) — `import { listWards } from '@tm11/mmgeo/wards'`.
 * Data: MIMU P-codes (see DATA_LICENSE).
 */
import wardsData from '../data/wards.json';
import { createLevel, resolveTownshipCode, type SubPlace, type SubSearchOpts } from './levels';
import type { LangOpts, WardsFile } from './types';

export interface WardPlace extends SubPlace {
  level: 'ward';
  /** MIMU code of the town the ward belongs to. */
  townCode: string;
}

const data = wardsData as unknown as WardsFile;

// Group keys are town codes; a town code's first 9 characters are its township code.
const wards = createLevel<WardPlace>(
  data.wards,
  townCode => townCode.slice(0, 9),
  (_row, base, townCode) => ({ level: 'ward', ...base, townCode })
);

/**
 * Wards of a town (town code, e.g. `MMR013010701`) or of a whole township
 * (township code, or a name/slug naming exactly one township). Unknown → `[]`.
 */
export const listWards = (townOrTownship: string, opts?: LangOpts): WardPlace[] => {
  const ref = townOrTownship.trim();
  if (/^MMR\d{9}$/i.test(ref)) return wards.listByGroup(ref, opts);
  return resolveTownshipCode(ref) ? wards.listByTownship(ref, opts) : [];
};

/** Look up a ward by MIMU code, e.g. `MMR013010701501`. */
export const getWard = (code: string, opts?: LangOpts): WardPlace | undefined => wards.getByCode(code, opts);

/** Ranked ward search; `{ township }` limits it to one township. */
export const searchWards = (query: string, opts?: SubSearchOpts): WardPlace[] => wards.search(query, opts);

export const wardsInfo = data.meta;
export type { SubSearchOpts };
