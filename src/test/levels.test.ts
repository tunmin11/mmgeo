import { listTowns, getTown, searchTowns } from '../towns';
import { listWards, getWard, searchWards } from '../wards';
import { listVillageTracts, getVillageTract, searchVillageTracts } from '../village-tracts';
import { nearestTownships } from '../index';
import townsData from '../../data/towns.json';
import wardsData from '../../data/wards.json';
import vtData from '../../data/village-tracts.json';
import geoData from '../../data/db.json';
import type { GeoData, TownsFile, VillageTractsFile, WardsFile } from '../types';

describe('data files', () => {
  const tsps = new Set((geoData as GeoData).states.flatMap(s => s.districts.flatMap(d => d.townships.map(t => t.code))));
  const towns = townsData as unknown as TownsFile;
  const wards = wardsData as unknown as WardsFile;
  const vts = vtData as unknown as VillageTractsFile;
  const townCodes = new Set(Object.values(towns.towns).flat().map(r => r[0]));

  test('every row belongs to a known parent and codes are unique', () => {
    for (const [tsp, rows] of Object.entries(towns.towns)) {
      expect(tsps.has(tsp)).toBe(true);
      for (const [code] of rows) expect(code.startsWith(tsp)).toBe(true);
    }
    for (const [town, rows] of Object.entries(wards.wards)) {
      expect(townCodes.has(town)).toBe(true);
      for (const [code] of rows) expect(code.startsWith(town)).toBe(true);
    }
    for (const [tsp, rows] of Object.entries(vts.villageTracts)) {
      expect(tsps.has(tsp)).toBe(true);
      for (const [code] of rows) expect(code.startsWith(tsp)).toBe(true);
    }
    const all = [...townCodes, ...Object.values(wards.wards).flat().map(r => r[0]), ...Object.values(vts.villageTracts).flat().map(r => r[0])];
    expect(new Set(all).size).toBe(all.length);
  });

  test('sizes are plausible and metadata matches the core data', () => {
    expect(townCodes.size).toBeGreaterThan(400);
    expect(Object.values(wards.wards).flat().length).toBeGreaterThan(3000);
    expect(Object.values(vts.villageTracts).flat().length).toBeGreaterThan(13000);
    for (const f of [towns, wards, vts]) expect(f.meta.version).toBe((geoData as GeoData).meta.version);
  });

  test('town coordinates fall inside Myanmar', () => {
    for (const [, , , lat, lng] of Object.values(towns.towns).flat()) {
      if (lat === undefined) continue;
      expect(lat).toBeGreaterThan(9); expect(lat).toBeLessThan(29);
      expect(lng).toBeGreaterThan(92); expect(lng).toBeLessThan(102);
    }
  });
});

describe('@tm11/mmgeo/towns', () => {
  test('lists towns of a township by code or unique name, with parents and coordinates', () => {
    const t = listTowns('MMR013010');
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({
      level: 'town', code: 'MMR013010701', en: 'Yankin', seat: true,
      townshipCode: 'MMR013010', districtCode: 'MMR013D002', stateCode: 'MMR013',
    });
    expect(t[0].lat).toBeCloseTo(16.836, 2);
    expect(listTowns('Yankin')).toEqual(t);
  });

  test('getTown, searchTowns, lang, unknowns', () => {
    expect(getTown('mmr013010701', { lang: 'mm' })!.name).toBe('ရန်ကင်း');
    expect(searchTowns('yankin')[0].code).toBe('MMR013010701');
    expect(listTowns('nope')).toEqual([]);
    expect(listTowns('Minhla')).toEqual([]); // ambiguous name → no guess
    expect(getTown('MMR000000000')).toBeUndefined();
  });
});

describe('@tm11/mmgeo/wards', () => {
  test('lists wards of a town or a whole township', () => {
    const byTown = listWards('MMR013010701');
    expect(byTown.length).toBe(15);
    expect(byTown[0]).toMatchObject({ level: 'ward', townCode: 'MMR013010701', townshipCode: 'MMR013010', stateCode: 'MMR013' });
    expect(listWards('MMR013010')).toEqual(byTown);
    expect(listWards('Yankin')).toEqual(byTown);
  });

  test('getWard and search, optionally inside one township', () => {
    expect(getWard('MMR013010701501')!.en).toBe('No (1) Ward');
    expect(getWard('MMR013010701501', { lang: 'mm' })!.name).toBe('အမှတ် (၁) ရပ်ကွက်');
    const inYankin = searchWards('ward', { township: 'MMR013010', limit: 50 });
    expect(inYankin.length).toBe(15);
    expect(inYankin.every(w => w.townshipCode === 'MMR013010')).toBe(true);
    expect(searchWards('ward', { township: 'nope' })).toEqual([]);
    expect(listWards('nope')).toEqual([]);
  });
});

describe('@tm11/mmgeo/village-tracts', () => {
  test('lists village tracts of a township', () => {
    const vts = listVillageTracts('MMR017024');
    expect(vts.length).toBe(76);
    expect(vts[0]).toMatchObject({ level: 'village-tract', code: 'MMR017024001', en: 'Lin Taing', townshipCode: 'MMR017024' });
  });

  test('previous names are kept and searchable', () => {
    expect(getVillageTract('MMR001004010')!.previousEn).toBe('Sa Rar Ka Htaung');
    expect(searchVillageTracts('Sa Rar Ka Htaung').map(v => v.code)).toContain('MMR001004010');
  });

  test('Burmese and Zawgyi search', () => {
    expect(searchVillageTracts('လင်းတိုင်း', { township: 'MMR017024' })[0].code).toBe('MMR017024001');
    expect(searchVillageTracts('', {})).toEqual([]);
  });
});

describe('nearestTownships', () => {
  test('finds the township around a point, with distance', () => {
    const [hit] = nearestTownships(16.836, 96.1624);
    expect(hit).toMatchObject({ code: 'MMR013010', en: 'Yankin' });
    expect(hit.distanceKm).toBeLessThan(0.1);
  });

  test('limit, ordering and bad input', () => {
    const near = nearestTownships(16.83, 96.19, { limit: 3 });
    expect(near).toHaveLength(3);
    expect(near[0].en).toBe('Thingangyun');
    expect(near[0].distanceKm).toBeLessThanOrEqual(near[1].distanceKm);
    expect(nearestTownships(NaN, 96)).toEqual([]);
  });
});
