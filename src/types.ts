// Shapes of data/db.json (schema v2) and of the public API.

export type Lang = 'en' | 'mm';

export type StateType = 'state' | 'region' | 'union-territory';
export type DistrictType = 'district' | 'self-administered-zone' | 'self-administered-division';
export type TownshipType = 'township' | 'sub-township';

interface RawNode {
  /** MIMU place code, e.g. `MMR013`, `MMR013D001`, `MMR013001`. Globally unique. */
  code: string;
  /** kebab-case English name, unique among its siblings. */
  slug: string;
  en: string;
  mm: string;
  /** Slugs this node had in earlier releases; still accepted as input. */
  aliases?: string[];
}

export interface RawTownship extends RawNode {
  type: TownshipType;
  /** `false` when only field sources (not the GAD) recognize it, e.g. parts of the Wa area. */
  official?: false;
  /** Coordinates of the township's seat town (MIMU). Absent for a few field-only townships. */
  lat?: number;
  lng?: number;
}

// Sub-township levels are stored as compact rows, grouped by parent code.
/** `[code, en, mm, lat?, lng?]` */
export type TownRow = [string, string, string, number?, number?];
/** `[code, en, mm]` */
export type WardRow = [string, string, string];
/** `[code, en, mm, previousEn?]` */
export type VillageTractRow = [string, string, string, string?];

export interface TownsFile { meta: GeoData['meta']; towns: Record<string, TownRow[]> }
export interface WardsFile { meta: GeoData['meta']; wards: Record<string, WardRow[]> }
export interface VillageTractsFile { meta: GeoData['meta']; villageTracts: Record<string, VillageTractRow[]> }

export interface RawDistrict extends RawNode {
  type: DistrictType;
  townships: RawTownship[];
}

export interface RawState extends RawNode {
  type: StateType;
  /** MIMU codes of the parts MIMU splits this state into (Bago, Shan). */
  partCodes?: string[];
  lat: number;
  lng: number;
  capital: string;
  districts: RawDistrict[];
}

export interface GeoData {
  meta: {
    source: string;
    version: string;
    generatedAt: string;
  };
  states: RawState[];
}

// ---- Public shapes ----

export interface Place {
  code: string;
  slug: string;
  /** Localized per `opts.lang` (default `'en'`). */
  name: string;
  en: string;
  mm: string;
}

export interface StatePlace extends Place {
  level: 'state';
  type: StateType;
  lat: number;
  lng: number;
  capital: string;
}

export interface DistrictPlace extends Place {
  level: 'district';
  type: DistrictType;
  stateCode: string;
  stateSlug: string;
}

export interface TownshipPlace extends Place {
  level: 'township';
  type: TownshipType;
  /** `false` when only field sources (not the GAD) recognize it. */
  official: boolean;
  /** Seat-town coordinates, when MIMU has them. */
  lat?: number;
  lng?: number;
  stateCode: string;
  stateSlug: string;
  districtCode: string;
  districtSlug: string;
}

/** @deprecated Use `TownshipPlace`. Kept as an alias for 1.x code. */
export type PlaceWithPath = TownshipPlace;

export type AnyPlace = StatePlace | DistrictPlace | TownshipPlace;

export interface LangOpts {
  lang?: Lang;
}

export interface SearchOpts extends LangOpts {
  /** Maximum number of results. Default: no limit. */
  limit?: number;
  /** Include sub-townships in results. Default `true`. */
  includeSubTownships?: boolean;
}
