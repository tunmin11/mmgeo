import {
  listStates, listDistricts, listTownships, searchTownships, findTownships,
  isValidTownship, getByCode, dataInfo,
} from '../index';

describe('listStates', () => {
  test('returns all 15 with codes, coordinates and localized names', () => {
    const states = listStates();
    expect(states).toHaveLength(15);
    const yangon = states.find(s => s.slug === 'yangon-region')!;
    expect(yangon).toMatchObject({
      level: 'state', code: 'MMR013', name: 'Yangon Region', en: 'Yangon Region',
      mm: 'ရန်ကုန်တိုင်းဒေသကြီး', type: 'region', capital: 'Yangon',
    });
    expect(typeof yangon.lat).toBe('number');
  });

  test('lang option localizes without global state', () => {
    expect(listStates({ lang: 'mm' }).find(s => s.code === 'MMR013')!.name).toBe('ရန်ကုန်တိုင်းဒေသကြီး');
    expect(listStates().find(s => s.code === 'MMR013')!.name).toBe('Yangon Region');
  });
});

describe('listDistricts / listTownships', () => {
  test('accept slug, code or a 1.x slug for the same state', () => {
    const bySlug = listDistricts('ayeyarwady-region');
    expect(bySlug.length).toBeGreaterThan(0);
    expect(listDistricts('MMR017')).toEqual(bySlug);
    expect(listDistricts('mmr017')).toEqual(bySlug);
    expect(listDistricts('ayeyawady-region')).toEqual(bySlug); // 1.x spelling
  });

  test('districts carry their state and include self-administered zones', () => {
    const shan = listDistricts('shan-state');
    expect(shan.every(d => d.stateCode === 'MMR222' && d.stateSlug === 'shan-state')).toBe(true);
    expect(shan.some(d => d.type === 'self-administered-zone' && /Pa-O/.test(d.en))).toBe(true);
  });

  test('townships by district (slug, code or 1.x slug) carry the full path', () => {
    const t = listTownships('yangon-region', 'yangon-east');
    expect(t.length).toBeGreaterThan(0);
    expect(listTownships('MMR013', 'MMR013D002')).toEqual(t);
    expect(listTownships('yangon-region', 'east-yangon')).toEqual(t); // 1.x slug
    expect(t[0]).toMatchObject({ level: 'township', stateSlug: 'yangon-region', districtCode: 'MMR013D002', official: true });
  });

  test('omitting the district lists every township in the state', () => {
    const all = listTownships('nay-pyi-taw');
    expect(all).toHaveLength(8);
    expect(listTownships('nay-pyi-taw', { lang: 'mm' })[0].name).toBe(all[0].mm);
  });

  test('unknown refs return empty arrays, never throw', () => {
    expect(listDistricts('nope')).toEqual([]);
    expect(listTownships('nope')).toEqual([]);
    expect(listTownships('yangon-region', 'nope')).toEqual([]);
  });
});

describe('searchTownships', () => {
  test('ranks exact before prefix before substring', () => {
    const names = searchTownships('dagon').map(r => r.en);
    expect(names[0]).toBe('Dagon');
    expect(names.slice(1).every(n => /Dagon/.test(n))).toBe(true);
  });

  test('ignores case, spacing and a trailing "Township"', () => {
    expect(searchTownships('  YANKIN township ')[0].code).toBe('MMR013010');
  });

  test('matches Burmese, with or without မြို့နယ်', () => {
    expect(searchTownships('ရန်ကင်း')[0].en).toBe('Yankin');
    expect(searchTownships('ရန်ကင်းမြို့နယ်')[0].en).toBe('Yankin');
  });

  test('matches Zawgyi-encoded Burmese', () => {
    expect(searchTownships('ရန္ကင္း')[0].en).toBe('Yankin'); // Zawgyi
  });

  test('finds 1.x sub-township slugs via their parent township', () => {
    expect(searchTownships('tontar')[0].en).toBe('Mongping');
  });

  test('limit, lang and includeSubTownships options', () => {
    expect(searchTownships('a', { limit: 3 })).toHaveLength(3);
    expect(searchTownships('yankin', { lang: 'mm' })[0].name).toBe('ရန်ကင်း');
    expect(searchTownships('chinshwehaw').some(r => r.type === 'sub-township')).toBe(true);
    expect(searchTownships('chinshwehaw', { includeSubTownships: false }).some(r => r.type === 'sub-township')).toBe(false);
  });

  test('empty query returns []', () => {
    expect(searchTownships('')).toEqual([]);
    expect(searchTownships('   ')).toEqual([]);
  });
});

describe('findTownships / isValidTownship', () => {
  test('returns every township sharing a name, so callers can disambiguate', () => {
    const minhla = findTownships('Minhla');
    expect(minhla.map(t => t.stateSlug).sort()).toEqual(['bago-region', 'magway-region']);
  });

  test('accepts English, Burmese, Zawgyi, slug, 1.x slug and code', () => {
    for (const input of ['Yankin', 'ရန်ကင်း', 'ရန္ကင္း', 'yankin', 'MMR013010', 'Kyimyindaing', 'tontar']) {
      expect(isValidTownship(input)).toBe(true);
    }
    expect(isValidTownship('definitely-not-a-township')).toBe(false);
    expect(isValidTownship('')).toBe(false);
  });

  test('exact match only — no partial names', () => {
    expect(isValidTownship('Yank')).toBe(false);
  });
});

describe('getByCode', () => {
  test('resolves every level', () => {
    expect(getByCode('MMR013')).toMatchObject({ level: 'state', slug: 'yangon-region' });
    expect(getByCode('MMR013D002')).toMatchObject({ level: 'district', stateCode: 'MMR013' });
    expect(getByCode('MMR013010')).toMatchObject({ level: 'township', en: 'Yankin', districtCode: 'MMR013D002' });
  });

  test('resolves MIMU part codes of Shan and Bago to the combined state', () => {
    expect(getByCode('MMR015')).toMatchObject({ code: 'MMR222', slug: 'shan-state' });
    expect(getByCode('MMR007')).toMatchObject({ code: 'MMR111', slug: 'bago-region' });
  });

  test('is case-insensitive, localizes, and returns undefined for unknown codes', () => {
    expect(getByCode('mmr013010', { lang: 'mm' })!.name).toBe('ရန်ကင်း');
    expect(getByCode('MMR013010')!.name).toBe('Yankin');
    expect(getByCode('MMR999999')).toBeUndefined();
  });
});

test('dataInfo exposes the MIMU release', () => {
  expect(dataInfo.version).toBe('9.7');
});
