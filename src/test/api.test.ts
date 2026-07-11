import { listStates, listDistricts, listTownships } from '../api';

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
