// Legacy 1.0.x class API: must keep working.
import { initialize } from '../hook';
import { getStates } from '../index';

afterAll(() => initialize({ language: 'en' }));

test('Get all states in English by default', () => {
  const magway = getStates().find(s => s.en === 'Magway Region')!;
  expect(magway.getName()).toBe('Magway Region');
  expect(magway.getDistricts()[0].getTownships()[0].getName()).toBeTruthy();
});

test('Set language to Myanmar and get states', () => {
  initialize({ language: 'mm' });
  const magway = getStates().find(s => s.en === 'Magway Region')!;
  expect(magway.getName()).toBe('မကွေးတိုင်းဒေသကြီး');
});
