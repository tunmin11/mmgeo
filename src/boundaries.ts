/**
 * Outlines and exact point lookup — `import { placeAt } from '@tm11/mmgeo/boundaries'`.
 * No React; used by `@tm11/mmgeo-map`.
 *
 * States and districts ship in the core file. Finer outlines are split into files loaded on
 * demand with `loadOutlines(code)`: a state's townships, or a township's village tracts, towns
 * and wards. Bundlers turn each file into its own chunk.
 */
import mapJson from '../data/map.json';
import { getByCode, listDistricts, listStates, listTownships } from './api';
import type { AnyPlace, LangOpts } from './types';
import type { TownPlace } from './towns';
import type { VillageTractPlace } from './village-tracts';
import type { WardPlace } from './wards';
import type { MapData, MapLevel, MapShape, PartFile } from './map-types';

export type { MapData, MapLevel, MapShape, PartFile };

/** Any place the map can show: state, district, township, village tract, town or ward. */
export type MapPlace = AnyPlace | VillageTractPlace | TownPlace | WardPlace;

type Shape = PartFile[string];

const map = mapJson as unknown as MapData;
const files = new Set(map.meta.files ?? []);

/** Every outline loaded so far, by code (codes are unique across levels). */
const shapes = new Map<string, Shape>([...Object.entries(map.states), ...Object.entries(map.districts ?? {})]);
/** Sub-township children by parent: a township's village tracts and towns, a town's wards. */
const kids = new Map<string, string[]>();

/** Where the outlines came from, and when they were built. */
export const boundariesInfo = map.meta;

const ORDER: MapLevel[] = ['state', 'district', 'township', 'village-tract', 'town', 'ward'];

/** Levels that have outlines in this build, from coarsest to finest (finer ones load on demand). */
export const availableLevels: MapLevel[] = ORDER.filter(l => map.meta.sources.some(s => s.levels.includes(l)));

/** Project WGS84 to map units (the country is 100,000 units wide). */
export const project = (lat: number, lng: number): [number, number] => {
  const p = map.projection;
  return [(lng - p.lon0) * p.k * p.scale, (p.lat0 - lat) * p.scale];
};

/** A village tract, town or ward code (MMR + 9 or 12 digits; townships have 6). */
const SUB_CODE = /^MMR\d{9}(\d{3})?$/;

/** Files needed to draw `code` and what is inside it: its state's file, then its township's. */
const filesFor = (code: string): string[] => {
  const p = getByCode(SUB_CODE.test(code) ? code.slice(0, 9) : code);
  if (!p) return [];
  const state = p.level === 'state' ? p.code : p.stateCode;
  const township = p.level === 'township' ? p.code : undefined;
  return [state, township].filter((f): f is string => !!f && files.has(f));
};

const loading = new Map<string, Promise<void>>();
const settled = new Set<string>();

const loadFile = (f: string): Promise<void> => {
  const pending = loading.get(f);
  if (pending) return pending;
  const p = (async (): Promise<void> => {
    const part = ((await import(`../data/map/${f}.json`)) as { default: PartFile }).default;
    for (const [c, s] of Object.entries(part)) {
      shapes.set(c, s);
      if (!s.k) continue;
      const parent = s.k === 'w' ? c.slice(0, 12) : c.slice(0, 9);
      kids.set(parent, [...(kids.get(parent) ?? []), c]);
    }
    settled.add(f);
  })();
  loading.set(f, p);
  // A failed load (e.g. offline) may be retried by the next call; callers still get the error.
  p.catch(() => loading.delete(f));
  return p;
};

/**
 * Load what is needed to draw `code` and the outlines inside it: a state's townships, a
 * township's village tracts, towns and wards. Resolves at once when there is nothing to load.
 */
export const loadOutlines = async (code: string): Promise<void> => {
  for (const f of filesFor(code)) await loadFile(f);
};

/** True once `loadOutlines(code)` has nothing left to load. */
export const isLoaded = (code: string): boolean => filesFor(code).every(f => settled.has(f));

/** Whether this build has outlines inside `code` beyond the core file (a state's townships, a township's village tracts). */
export const hasFile = (code: string): boolean => files.has(code);

/** Any place by code, including village tracts, towns and wards once their township is loaded. */
export const getPlace = (code: string, opts: LangOpts = {}): MapPlace | undefined => {
  const admin = getByCode(code, opts);
  if (admin) return admin;
  const s = shapes.get(code);
  const t = getByCode(code.slice(0, 9));
  if (!s?.k || !s.n || t?.level !== 'township') return undefined;
  const [en, mm] = s.n;
  const base = { code, name: opts.lang === 'mm' ? mm : en, en, mm, townshipCode: t.code, districtCode: t.districtCode, stateCode: t.stateCode };
  if (s.k === 'v') return { level: 'village-tract', ...base };
  if (s.k === 't') return { level: 'town', ...base, seat: code.endsWith('701') };
  return { level: 'ward', ...base, townCode: code.slice(0, 12) };
};

/** The place directly above `code` (a township's district, a ward's town…), or `null`. */
export const parentOf = (code: string): string | null => {
  const p = getPlace(code);
  if (!p || p.level === 'state') return null;
  if (p.level === 'district') return p.stateCode;
  if (p.level === 'township') return p.districtCode;
  if (p.level === 'ward') return p.townCode;
  return p.townshipCode;
};

const decoded = new Map<string, number[][]>();
const ringsOf = (code: string): number[][] | undefined => {
  if (decoded.has(code)) return decoded.get(code);
  const shape = shapes.get(code);
  if (!shape) return undefined;
  const rings = shape.r.map(r => {
    const abs = new Array<number>(r.length);
    for (let i = 0; i < r.length; i += 2) {
      abs[i] = i ? abs[i - 2] + r[i] : r[i];
      abs[i + 1] = i ? abs[i - 1] + r[i + 1] : r[i + 1];
    }
    return abs;
  });
  decoded.set(code, rings);
  return rings;
};

export interface Outline {
  code: string;
  level: MapLevel;
  /** SVG path data in map units; fill with `fill-rule="evenodd"`. */
  d: string;
  /** [x0, y0, x1, y1] in map units. */
  bbox: [number, number, number, number];
  /** A point inside the shape for its label. */
  label: [number, number];
}

const paths = new Map<string, string>();
/** Outline of any place by code, if this build has it and it is loaded. */
export const getOutline = (code: string): Outline | undefined => {
  const place = getPlace(code);
  const shape = place && shapes.get(place.code);
  if (!place || !shape) return undefined;
  let d = paths.get(place.code);
  if (d === undefined) {
    d = ringsOf(place.code)!
      .map(r => {
        let s = `M${r[0]} ${r[1]}`;
        for (let i = 2; i < r.length; i += 2) s += `L${r[i]} ${r[i + 1]}`;
        return s + 'Z';
      })
      .join('');
    paths.set(place.code, d);
  }
  return { code: place.code, level: place.level, d, bbox: shape.b, label: shape.c };
};

/** Codes of the places at `level` inside `parent` (all of them without one), loaded or not. */
const codesAt = (level: MapLevel, parent?: string): string[] => {
  const p = parent ? getPlace(parent) : undefined;
  if (level === 'state') return parent ? [] : listStates().map(s => s.code);
  if (level === 'district') return p?.level === 'state' ? listDistricts(p.code).map(d => d.code) : parent ? [] : Object.keys(map.districts ?? {});
  if (level === 'township') {
    return p?.level === 'district' ? listTownships(p.stateCode, p.code).map(t => t.code)
      : p?.level === 'state' ? listTownships(p.code).map(t => t.code) : [];
  }
  return parent ? kids.get(parent) ?? [] : [];
};

/**
 * Loaded outlines at `level`, optionally only inside one parent: a state or district for
 * districts and townships, a township for village tracts and towns, a town for wards.
 */
export const listOutlines = (level: MapLevel, parent?: string): Outline[] =>
  codesAt(level, parent).map(getOutline).filter((o): o is Outline => o?.level === level);

/** Even-odd point-in-polygon over all rings of a shape. */
const contains = (code: string, x: number, y: number): boolean => {
  const shape = shapes.get(code);
  if (!shape) return false;
  const [x0, y0, x1, y1] = shape.b;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  let inside = false;
  for (const r of ringsOf(code)!) {
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
};

/**
 * The deepest place containing a point, down to `level` (default: the finest this build has),
 * loading finer outlines as needed. Exact to the outlines' simplification (about 300 m for
 * townships, 40 m for village tracts). `undefined` outside Myanmar.
 */
export const placeAt = async (lat: number, lng: number, opts: LangOpts & { level?: MapLevel } = {}): Promise<MapPlace | undefined> => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  const stop = ORDER.indexOf(opts.level ?? availableLevels[availableLevels.length - 1] ?? 'state');
  const [x, y] = project(lat, lng);
  const hit = (codes: string[]): string | undefined => codes.find(c => contains(c, x, y));
  let found = hit(codesAt('state'));
  if (!found) return undefined;
  const state = found;
  if (stop >= 1) found = hit(codesAt('district', state)) ?? found;
  if (stop >= 2 && files.has(state)) {
    await loadOutlines(state);
    const township = hit(codesAt('township', state));
    if (township) {
      found = township;
      if (stop >= 3) {
        await loadOutlines(township);
        const local = hit(codesAt('village-tract', township));
        if (local) found = local;
        if (local && stop >= 5) found = hit(codesAt('ward', local)) ?? local;
      }
    }
  }
  return getPlace(found, opts);
};

/** The township containing a point, or `undefined` (also when this build has no township outlines). */
export const townshipAt = async (lat: number, lng: number, opts?: LangOpts): Promise<AnyPlace | undefined> => {
  const p = await placeAt(lat, lng, { ...opts, level: 'township' });
  return p?.level === 'township' ? p : undefined;
};
