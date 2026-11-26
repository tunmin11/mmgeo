import * as fs from 'fs';
import * as path from 'path';
import {
  availableLevels, boundariesInfo, getOutline, getPlace, isLoaded, listOutlines, loadOutlines, parentOf,
  placeAt, project, townshipAt,
} from '../boundaries';
import mapJson from '../../data/map.json';
import { getByCode } from '../api';
import type { MapData, MapShape, PartFile } from '../map-types';

const map = mapJson as unknown as MapData;
const partDir = path.join(__dirname, '../../data/map');
const parts = (map.meta.files ?? []).map(code => [code, JSON.parse(fs.readFileSync(path.join(partDir, `${code}.json`), 'utf8')) as PartFile] as const);

const validShape = (s: MapShape): void => {
  const [x0, y0, x1, y1] = s.b;
  expect(x1).toBeGreaterThan(x0); expect(y1).toBeGreaterThan(y0);
  expect(s.c[0]).toBeGreaterThanOrEqual(x0); expect(s.c[0]).toBeLessThanOrEqual(x1);
  expect(s.c[1]).toBeGreaterThanOrEqual(y0); expect(s.c[1]).toBeLessThanOrEqual(y1);
};

describe('data/map.json and data/map/*.json', () => {
  test('core outlines belong to known places at the right level', () => {
    for (const code of Object.keys(map.states)) expect(getByCode(code)?.level).toBe('state');
    for (const code of Object.keys(map.districts ?? {})) expect(getByCode(code)?.level).toBe('district');
    for (const s of [...Object.values(map.states), ...Object.values(map.districts ?? {})]) validShape(s);
  });

  test('every listed file exists, and nothing unlisted is left behind', () => {
    const onDisk = fs.existsSync(partDir) ? fs.readdirSync(partDir).map(f => f.replace(/\.json$/, '')).sort() : [];
    expect(onDisk).toEqual([...(map.meta.files ?? [])].sort());
  });

  test('a state file holds its townships; a township file its village tracts, towns and wards', () => {
    for (const [file, part] of parts) {
      const owner = getByCode(file);
      for (const [code, s] of Object.entries(part)) {
        validShape(s);
        if (owner?.level === 'state') {
          const t = getByCode(code);
          expect(t?.level).toBe('township');
          expect(t?.level === 'township' && t.stateCode).toBe(file);
        } else {
          expect(owner?.level).toBe('township');
          expect(code.slice(0, 9)).toBe(file);
          expect(['v', 't', 'w']).toContain(s.k);
          expect(s.n?.[0]).toBeTruthy();
          expect(code.length).toBe(s.k === 'w' ? 15 : 12);
        }
      }
    }
  });

  test('records its sources', () => {
    expect(boundariesInfo.sources.length).toBeGreaterThan(0);
    expect(availableLevels[0]).toBe('state');
  });
});

describe('outlines', () => {
  test('getOutline returns an SVG path in map units', () => {
    const o = getOutline('MMR013')!;
    expect(o.level).toBe('state');
    expect(o.d).toMatch(/^M-?\d+ -?\d+L/);
    expect(o.d.endsWith('Z')).toBe(true);
    expect(getOutline('MMR999')).toBeUndefined();
  });

  test('part codes resolve to the combined state outline', () => {
    expect(getOutline('MMR015')?.code).toBe('MMR222');
  });

  test('listOutlines lists the states that have outlines', () => {
    const states = listOutlines('state').map(o => o.code);
    expect(states).toContain('MMR013');
    expect(states.length).toBeGreaterThanOrEqual(14);
  });

  test('project maps the country into roughly 100,000 units of width', () => {
    const [x0] = project(20, 92.2), [x1] = project(20, 101.2);
    expect(x1 - x0).toBeGreaterThan(90000);
    expect(x1 - x0).toBeLessThan(105000);
  });
});

const deep = availableLevels.includes('village-tract') ? describe : describe.skip;
deep('on-demand outlines', () => {
  test('loadOutlines brings in a township and everything inside it', async () => {
    expect(isLoaded('MMR013010')).toBe(false);
    expect(getOutline('MMR013010')).toBeUndefined();
    await loadOutlines('MMR013010');
    expect(isLoaded('MMR013010')).toBe(true);
    expect(getOutline('MMR013010')?.level).toBe('township');
    expect(listOutlines('township', 'MMR013').length).toBeGreaterThan(30);
    const towns = listOutlines('town', 'MMR013010');
    expect(towns.length).toBeGreaterThan(0);
    expect(listOutlines('ward', towns[0].code).length).toBeGreaterThan(0);
  });

  test('getPlace and parentOf cover village tracts, towns and wards', async () => {
    await loadOutlines('MMR017024'); // Bogale
    const vt = listOutlines('village-tract', 'MMR017024')[0];
    const place = getPlace(vt.code, { lang: 'mm' })!;
    expect(place).toMatchObject({ level: 'village-tract', townshipCode: 'MMR017024', stateCode: 'MMR017' });
    expect(place.name).toBe(place.mm);
    expect(parentOf(vt.code)).toBe('MMR017024');
    expect(parentOf('MMR017024')).toBe(getByCode('MMR017024')!.level === 'township' && (getByCode('MMR017024') as { districtCode: string }).districtCode);
  });
});

describe('placeAt', () => {
  test('finds the state containing a point', async () => {
    expect((await placeAt(16.85, 96.17, { level: 'state' }))?.code).toBe('MMR013');   // Yangon
    expect((await placeAt(21.97, 96.08, { level: 'state' }))?.code).toBe('MMR010');   // Mandalay
    expect((await placeAt(25.38, 97.4, { level: 'state' }))?.code).toBe('MMR001');    // Myitkyina, Kachin
    expect((await placeAt(20.78, 97.04, { level: 'state', lang: 'mm' }))?.name).toBe('ရှမ်းပြည်နယ်'); // Taunggyi
  });

  test('returns undefined outside Myanmar or for bad input', async () => {
    expect(await placeAt(13.75, 100.5, { level: 'state' })).toBeUndefined(); // Bangkok
    expect(await placeAt(NaN, 96)).toBeUndefined();
  });

  test('townshipAt finds the township when township outlines are built', async () => {
    const t = await townshipAt(16.836, 96.1624);
    if (availableLevels.includes('township')) expect(t?.code).toBe('MMR013010');
    else expect(t).toBeUndefined();
  });

  deep('down to village tracts and wards', () => {
    test('a city point lands in a ward or town of its township', async () => {
      const p = await placeAt(16.836, 96.1624);
      expect(['ward', 'town']).toContain(p?.level);
      expect(p && 'townshipCode' in p && p.townshipCode).toBe('MMR013010');
    });

    test('a rural point lands in a village tract', async () => {
      expect((await placeAt(21.0, 95.0))?.level).toBe('village-tract');
    });
  });
});
