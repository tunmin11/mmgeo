/**
 * Rural village tracts (ကျေးရွာအုပ်စု) — `import { listVillageTracts } from '@tm11/mmgeo/village-tracts'`.
 * Data: MIMU P-codes (see DATA_LICENSE).
 */
import vtData from '../data/village-tracts.json';
import { createLevel, type SubPlace, type SubSearchOpts } from './levels';
import type { LangOpts, VillageTractRow, VillageTractsFile } from './types';

export interface VillageTractPlace extends SubPlace {
  level: 'village-tract';
  /** Earlier English name, when MIMU records one. Also matched by search. */
  previousEn?: string;
}

const data = vtData as unknown as VillageTractsFile;

const villageTracts = createLevel<VillageTractPlace>(
  data.villageTracts,
  key => key,
  (row, base) => {
    const prev = (row as VillageTractRow)[3];
    return { level: 'village-tract', ...base, ...(prev ? { previousEn: prev } : {}) };
  },
  row => ((row as VillageTractRow)[3] ? [(row as VillageTractRow)[3]!] : [])
);

/** Village tracts of a township (code, or a name/slug naming exactly one township). Unknown → `[]`. */
export const listVillageTracts = (township: string, opts?: LangOpts): VillageTractPlace[] =>
  villageTracts.listByTownship(township, opts);

/** Look up a village tract by MIMU code, e.g. `MMR017024040`. */
export const getVillageTract = (code: string, opts?: LangOpts): VillageTractPlace | undefined =>
  villageTracts.getByCode(code, opts);

/** Ranked village tract search; `{ township }` limits it to one township. */
export const searchVillageTracts = (query: string, opts?: SubSearchOpts): VillageTractPlace[] =>
  villageTracts.search(query, opts);

export const villageTractsInfo = data.meta;
export type { SubSearchOpts };
