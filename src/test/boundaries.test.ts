import { availableLevels, getOutline, listOutlines, placeAt, project, townshipAt, boundariesInfo } from '../boundaries';
import mapJson from '../../data/map.json';
import { getByCode } from '../api';
import type { MapData } from '../map-types';

const map = mapJson as unknown as MapData;

describe('data/map.json', () => {
  test('every outline belongs to a known place at the right level', () => {
    for (const [level, key] of [['state', 'states'], ['district', 'districts'], ['township', 'townships']] as const) {
      for (const code of Object.keys(map[key] ?? {})) expect(getByCode(code)?.level).toBe(level);
    }
  });

  test('outlines have valid bounding boxes and label points inside them', () => {
    for (const shapes of [map.states, map.districts ?? {}, map.townships ?? {}]) {
      for (const s of Object.values(shapes)) {
        const [x0, y0, x1, y1] = s.b;
        expect(x1).toBeGreaterThan(x0); expect(y1).toBeGreaterThan(y0);
        expect(s.c[0]).toBeGreaterThanOrEqual(x0); expect(s.c[0]).toBeLessThanOrEqual(x1);
        expect(s.c[1]).toBeGreaterThanOrEqual(y0); expect(s.c[1]).toBeLessThanOrEqual(y1);
      }
    }
  });

  test('records its source', () => {
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

  test('project maps the country into roughly 10,000 units of width', () => {
    const [x0] = project(20, 92.2), [x1] = project(20, 101.2);
    expect(x1 - x0).toBeGreaterThan(9000);
    expect(x1 - x0).toBeLessThan(10500);
  });
});

describe('placeAt', () => {
  test('finds the state containing a point', () => {
    expect(placeAt(16.85, 96.17, { level: 'state' })?.code).toBe('MMR013');   // Yangon
    expect(placeAt(21.97, 96.08, { level: 'state' })?.code).toBe('MMR010');   // Mandalay
    expect(placeAt(25.38, 97.4, { level: 'state' })?.code).toBe('MMR001');    // Myitkyina, Kachin
    expect(placeAt(20.78, 97.04, { level: 'state', lang: 'mm' })?.name).toBe('ရှမ်းပြည်နယ်'); // Taunggyi
  });

  test('returns undefined outside Myanmar or for bad input', () => {
    expect(placeAt(13.75, 100.5, { level: 'state' })).toBeUndefined(); // Bangkok
    expect(placeAt(NaN, 96)).toBeUndefined();
  });

  test('townshipAt only answers when township outlines are built', () => {
    const t = townshipAt(16.836, 96.1624);
    if (availableLevels.includes('township')) expect(t?.code).toBe('MMR013010');
    else expect(t).toBeUndefined();
  });
});
