/**
 * Build data/map.json (outlines for @tm11/mmgeo/map and /boundaries).
 *
 *   npm run build:map -- --states <file> [--states-field <prop>]
 *                        [--townships <file> [--townships-field <prop>]]
 *
 * Inputs are GeoJSON or zipped/unzipped shapefiles (anything mapshaper reads).
 * Each feature is matched to an mmgeo place through `--*-field`: a MIMU P-code
 * (part codes like MMR015 resolve to their combined state) or a name.
 *
 * When townships are given, districts and states are DISSOLVED from them, so
 * borders line up exactly at every zoom level; `--states` is then ignored.
 *
 * All levels share one projection (equirectangular, scaled at 21°N), stored in
 * integer units: the country is 10,000 units wide.
 */
import * as fs from 'fs';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mapshaper = require('mapshaper');
import { getByCode, listStates, findTownships } from '../src/api';
import { nameKey } from '../src/normalize';
import type { MapData, MapShape, MapLevel } from '../src/map-types';

export const PROJECTION = { lon0: 92, lat0: 28.6, k: Math.cos((21 * Math.PI) / 180), scale: 10000 / (9.4 * Math.cos((21 * Math.PI) / 180)) };
const px = (lon: number) => Math.round((lon - PROJECTION.lon0) * PROJECTION.k * PROJECTION.scale);
const py = (lat: number) => Math.round((PROJECTION.lat0 - lat) * PROJECTION.scale);

type Geo = { type: string; coordinates: any };
type Feature = { type: 'Feature'; properties: Record<string, unknown>; geometry: Geo | null };
type FC = { type: 'FeatureCollection'; features: Feature[] };

const args = (() => {
  const a = process.argv.slice(2), out: Record<string, string> = {};
  for (let i = 0; i < a.length; i += 2) {
    if (!a[i].startsWith('--') || a[i + 1] === undefined) throw new Error(`Bad argument near ${a[i]}`);
    out[a[i].slice(2)] = a[i + 1];
  }
  return out;
})();

/** Run mapshaper; input is a file path or an in-memory GeoJSON. Returns the named GeoJSON outputs. */
async function ms(commands: string, input: Record<string, string | FC>): Promise<Record<string, FC>> {
  const files = Object.fromEntries(Object.entries(input).map(([k, v]) => [k, typeof v === 'string' ? v : JSON.stringify(v)]));
  const out = await mapshaper.applyCommands(commands, files);
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, JSON.parse(String(v))]));
}

const readAny = async (file: string): Promise<FC> => {
  const name = path.basename(file);
  const input = /\.(geo)?json$/i.test(name) ? fs.readFileSync(file, 'utf8') : fs.readFileSync(file);
  const out = await mapshaper.applyCommands(`-i ${JSON.stringify(name)} -proj wgs84 -o out.json format=geojson`, { [name]: input });
  return JSON.parse(String(out['out.json']));
};

const stateByName = (value: string) => {
  const k = nameKey(value);
  return listStates().find(s => nameKey(s.en) === k || nameKey(s.mm) === k || nameKey(s.en).startsWith(k));
};

/** Attach `code`/`districtCode`/`stateCode` from mmgeo; report anything unmatched. */
function annotate(fc: FC, level: 'state' | 'township', field: string): FC {
  const missed: string[] = [];
  const features = fc.features.flatMap(f => {
    const raw = String(f.properties[field] ?? '').trim();
    const byCode = getByCode(raw);
    let props: Record<string, string> | undefined;
    if (level === 'state') {
      const s = byCode?.level === 'state' ? byCode : stateByName(raw);
      if (s) props = { code: s.code };
    } else {
      const t = byCode?.level === 'township' ? byCode : (() => { const h = findTownships(raw); return h.length === 1 ? h[0] : undefined; })();
      if (t) props = { code: t.code, districtCode: t.districtCode, stateCode: t.stateCode };
    }
    if (!props || !f.geometry) { missed.push(raw || '(empty)'); return []; }
    return [{ ...f, properties: props }];
  });
  if (missed.length) console.log(`  ${level}: ${missed.length} features not matched to mmgeo: ${missed.slice(0, 20).join(', ')}${missed.length > 20 ? ', …' : ''}`);
  return { type: 'FeatureCollection', features };
}

/** Delta-encode a ring of [lon, lat] into projected integer units: [x0, y0, dx1, dy1, …]. */
const encodeRing = (ring: [number, number][]): number[] => {
  const out: number[] = [];
  let lx = 0, ly = 0, first = true;
  for (const [lon, lat] of ring) {
    const x = px(lon), y = py(lat);
    if (!first && x === lx && y === ly) continue;
    out.push(first ? x : x - lx, first ? y : y - ly);
    lx = x; ly = y; first = false;
  }
  return out.length >= 6 ? out : [];
};

function toShapes(fc: FC, labels: FC): Record<string, MapShape> {
  const label = new Map(labels.features.map(f => [String(f.properties.code), (f.geometry as Geo).coordinates as [number, number]]));
  const shapes: Record<string, MapShape> = {};
  for (const f of fc.features) {
    const code = String(f.properties.code);
    const polys: [number, number][][][] = f.geometry!.type === 'Polygon' ? [f.geometry!.coordinates] : f.geometry!.coordinates;
    const rings = polys.flat().map(encodeRing).filter(r => r.length);
    if (!rings.length) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const r of rings) {
      let x = 0, y = 0;
      for (let i = 0; i < r.length; i += 2) {
        x = i ? x + r[i] : r[0]; y = i ? y + r[i + 1] : r[1];
        x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      }
    }
    const [lon, lat] = label.get(code) ?? [0, 0];
    shapes[code] = { r: rings, b: [x0, y0, x1, y1], c: label.has(code) ? [px(lon), py(lat)] : [Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2)] };
  }
  return shapes;
}

async function level(fc: FC, dissolveBy: string | null, intervalM: number): Promise<Record<string, MapShape>> {
  const dissolve = dissolveBy ? `-dissolve ${dissolveBy} copy-fields=${dissolveBy} -rename-fields code=${dissolveBy}` : `-dissolve code`;
  const out = await ms(
    `-i in.json -proj wgs84 ${dissolve} -simplify interval=${intervalM} keep-shapes -clean ` +
    `-o shapes.json format=geojson precision=0.00001 ` +
    `-points inner -o labels.json format=geojson precision=0.00001`,
    { 'in.json': fc }
  );
  return toShapes(out['shapes.json'], out['labels.json']);
}

async function main() {
  const map: MapData = {
    meta: { sources: [], generatedAt: new Date().toISOString().slice(0, 10) },
    projection: PROJECTION,
    states: {},
  };
  if (args.townships) {
    const t = annotate(await readAny(args.townships), 'township', args['townships-field'] ?? 'TS_PCODE');
    // Simplify once at township detail, then dissolve up, so shared borders stay identical.
    map.townships = await level(t, null, 150);
    map.districts = await level(t, 'districtCode', 400);
    map.states = await level(t, 'stateCode', 1200);
    map.meta.sources.push({ levels: ['state', 'district', 'township'] as MapLevel[], source: args.source ?? path.basename(args.townships) });
  } else if (args.states) {
    const s = annotate(await readAny(args.states), 'state', args['states-field'] ?? 'ST_PCODE');
    map.states = await level(s, null, 1200);
    map.meta.sources.push({ levels: ['state'], source: args.source ?? path.basename(args.states) });
  } else {
    throw new Error('Pass --townships <file> (preferred) or --states <file>');
  }
  const out = path.join(__dirname, '..', 'data', 'map.json');
  fs.writeFileSync(out, JSON.stringify(map) + '\n');
  const count = (o?: Record<string, unknown>) => (o ? Object.keys(o).length : 0);
  console.log(`map: ${count(map.states)} states, ${count(map.districts)} districts, ${count(map.townships)} townships → data/map.json (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
  const missing = listStates().filter(s => !map.states[s.code]).map(s => s.en);
  if (missing.length) console.log(`  states with no outline: ${missing.join(', ')}`);
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
