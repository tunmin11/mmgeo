/**
 * Outlines and exact point lookup — `import { placeAt } from '@tm11/mmgeo/boundaries'`.
 * No React; used by `@tm11/mmgeo/map`.
 */
import mapJson from '../data/map.json';
import { getByCode, listDistricts, listStates, listTownships } from './api';
import type { AnyPlace, LangOpts } from './types';
import type { MapData, MapLevel, MapShape } from './map-types';

export type { MapData, MapLevel, MapShape };

const map = mapJson as unknown as MapData;
const levelKey = { state: 'states', district: 'districts', township: 'townships' } as const;
const shapesOf = (level: MapLevel) => (map[levelKey[level]] ?? {}) as Record<string, MapShape>;

/** Where the outlines came from, and when they were built. */
export const boundariesInfo = map.meta;

/** Levels that have outlines in this build, from coarsest to finest. */
export const availableLevels: MapLevel[] = (['state', 'district', 'township'] as MapLevel[]).filter(
  l => Object.keys(shapesOf(l)).length > 0
);

/** Project WGS84 to map units (the country is 10,000 units wide). */
export const project = (lat: number, lng: number): [number, number] => {
  const p = map.projection;
  return [(lng - p.lon0) * p.k * p.scale, (p.lat0 - lat) * p.scale];
};

const decoded = new Map<string, number[][]>();
const ringsOf = (level: MapLevel, code: string): number[][] | undefined => {
  const key = `${level}:${code}`;
  if (decoded.has(key)) return decoded.get(key);
  const shape = shapesOf(level)[code];
  if (!shape) return undefined;
  const rings = shape.r.map(r => {
    const abs = new Array<number>(r.length);
    for (let i = 0; i < r.length; i += 2) {
      abs[i] = i ? abs[i - 2] + r[i] : r[i];
      abs[i + 1] = i ? abs[i - 1] + r[i + 1] : r[i + 1];
    }
    return abs;
  });
  decoded.set(key, rings);
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
/** Outline of a state, district or township by code, if this build has it. */
export const getOutline = (code: string): Outline | undefined => {
  const place = getByCode(code);
  if (!place) return undefined;
  const shape = shapesOf(place.level)[place.code];
  if (!shape) return undefined;
  const key = `${place.level}:${place.code}`;
  let d = paths.get(key);
  if (d === undefined) {
    d = ringsOf(place.level, place.code)!
      .map(r => {
        let s = `M${r[0]} ${r[1]}`;
        for (let i = 2; i < r.length; i += 2) s += `L${r[i]} ${r[i + 1]}`;
        return s + 'Z';
      })
      .join('');
    paths.set(key, d);
  }
  return { code: place.code, level: place.level, d, bbox: shape.b, label: shape.c };
};

/** Outlines of every place at `level`, optionally only inside one parent (state or district code). */
export const listOutlines = (level: MapLevel, parent?: string): Outline[] => {
  let codes: string[];
  if (!parent) codes = level === 'state' ? listStates().map(s => s.code) : Object.keys(shapesOf(level));
  else if (level === 'district') codes = listDistricts(parent).map(d => d.code);
  else if (level === 'township') {
    const p = getByCode(parent);
    codes = p?.level === 'district' ? listTownships(p.stateCode, p.code).map(t => t.code)
      : p?.level === 'state' ? listTownships(p.code).map(t => t.code) : [];
  } else codes = [];
  return codes.map(getOutline).filter((o): o is Outline => o?.level === level);
};

/** Even-odd point-in-polygon over all rings of a shape. */
const contains = (level: MapLevel, code: string, x: number, y: number): boolean => {
  const shape = shapesOf(level)[code];
  if (!shape) return false;
  const [x0, y0, x1, y1] = shape.b;
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  let inside = false;
  for (const r of ringsOf(level, code)!) {
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
};

/**
 * The place containing a point, at `level` (default: the finest level this build has).
 * Exact to the outlines' simplification (about 150 m for townships). `undefined` outside Myanmar.
 */
export const placeAt = (lat: number, lng: number, opts: LangOpts & { level?: MapLevel } = {}): AnyPlace | undefined => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  const level = opts.level ?? availableLevels[availableLevels.length - 1];
  const [x, y] = project(lat, lng);
  const code = Object.keys(shapesOf(level)).find(c => contains(level, c, x, y));
  return code ? getByCode(code, opts) : undefined;
};

/** The township containing a point, or `undefined` (also when this build has no township outlines). */
export const townshipAt = (lat: number, lng: number, opts?: LangOpts) =>
  availableLevels.includes('township') ? placeAt(lat, lng, { ...opts, level: 'township' }) : undefined;
