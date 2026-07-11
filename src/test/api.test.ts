import { listStates, listDistricts, listTownships, searchTownships, isValidTownship } from '../api';

test('listStates returns plain localized places with coordinates', () => {
  const states = listStates();
  expect(states.length).toBeGreaterThan(0);
  const first = states[0];
  expect(first.slug).toBe('magway-region');
  expect(first.name).toBe('Magway Region');
  expect(first.en).toBe('Magway Region');
  expect(first.mm).toBe('မကွေးတိုင်းဒေသကြီး');
  expect(typeof first.lat).toBe('number');
  expect(typeof first.lng).toBe('number');
  expect(typeof first.capital).toBe('string');
});

test('lang option localizes name without global state', () => {
  expect(listStates({ lang: 'mm' })[0].name).toBe('မကွေးတိုင်းဒေသကြီး');
  expect(listStates()[0].name).toBe('Magway Region'); // default en, unaffected
});

test('listDistricts returns children by state slug', () => {
  const districts = listDistricts('magway-region');
  expect(districts.length).toBeGreaterThan(0);
  expect(districts[0].slug).toBeTruthy();
  expect(districts[0].name).toBe(districts[0].en);
});

test('listTownships returns children by state+district slug', () => {
  const district = listDistricts('magway-region')[0];
  const townships = listTownships('magway-region', district.slug);
  expect(townships.length).toBeGreaterThan(0);
  expect(townships[0].slug).toBeTruthy();
});

test('unknown slugs return empty arrays, never throw', () => {
  expect(listDistricts('nope')).toEqual([]);
  expect(listTownships('nope', 'nope')).toEqual([]);
  expect(listTownships('magway-region', 'nope')).toEqual([]);
});

const sample = (): { en: string; mm: string; slug: string } => {
  const district = listDistricts('magway-region')[0];
  return listTownships('magway-region', district.slug)[0];
};

test('searchTownships matches English names ignoring case/spacing and returns path', () => {
  const t = sample();
  const results = searchTownships(` ${t.en.toUpperCase()} `);
  const hit = results.find(r => r.slug === t.slug);
  expect(hit).toBeDefined();
  expect(hit!.stateSlug).toBe('magway-region');
  expect(hit!.districtSlug).toBeTruthy();
});

test('searchTownships matches Myanmar-language queries', () => {
  const t = sample();
  const results = searchTownships(t.mm);
  expect(results.some(r => r.slug === t.slug)).toBe(true);
});

test('searchTownships localizes name via lang option', () => {
  const t = sample();
  const results = searchTownships(t.en, { lang: 'mm' });
  expect(results.find(r => r.slug === t.slug)!.name).toBe(t.mm);
});

test('searchTownships returns [] for empty or whitespace query', () => {
  expect(searchTownships('')).toEqual([]);
  expect(searchTownships('   ')).toEqual([]);
});

test('isValidTownship accepts en name, mm name, or slug; rejects unknown', () => {
  const t = sample();
  expect(isValidTownship(t.en)).toBe(true);
  expect(isValidTownship(t.mm)).toBe(true);
  expect(isValidTownship(t.slug)).toBe(true);
  expect(isValidTownship('definitely-not-a-township')).toBe(false);
  expect(isValidTownship('')).toBe(false);
});
