/**
 * Towns with coordinates — `import { listTowns } from '@tm11/mmgeo/towns'`.
 * Data: MIMU P-codes (see DATA_LICENSE).
 */
import townsData from '../data/towns.json';
import { createLevel, type SubPlace, type SubSearchOpts } from './levels';
import type { LangOpts, TownRow, TownsFile } from './types';

export interface TownPlace extends SubPlace {
  level: 'town';
  lat?: number;
  lng?: number;
  /** True for the township's seat (MIMU code ending in 701). */
  seat: boolean;
}

const data = townsData as unknown as TownsFile;

const towns = createLevel<TownPlace>(
  data.towns,
  key => key,
  (row, base) => {
    const [code, , , lat, lng] = row as TownRow;
    return { level: 'town', ...base, ...(lat !== undefined ? { lat, lng } : {}), seat: code.endsWith('701') };
  }
);

/** Towns of a township (code, or a name/slug naming exactly one township). Unknown → `[]`. */
export const listTowns = (township: string, opts?: LangOpts): TownPlace[] => towns.listByTownship(township, opts);

/** Look up a town by MIMU code, e.g. `MMR013010701`. */
export const getTown = (code: string, opts?: LangOpts): TownPlace | undefined => towns.getByCode(code, opts);

/** Ranked town search; `{ township }` limits it to one township. */
export const searchTowns = (query: string, opts?: SubSearchOpts): TownPlace[] => towns.search(query, opts);

export const townsInfo = data.meta;
export type { SubSearchOpts };
