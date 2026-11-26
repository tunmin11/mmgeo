import { slugify, normalize, nameKey, queryKeys } from '../normalize';
import { zg2uni } from '../vendor/rabbit-zg2uni';

test('nameKey drops a trailing Township / မြို့နယ်', () => {
  expect(nameKey('Yankin Township')).toBe('yankin');
  expect(nameKey('ရန်ကင်းမြို့နယ်')).toBe(nameKey('ရန်ကင်း'));
  expect(nameKey('Township')).toBe('township'); // never reduce to empty
});

test('queryKeys adds a Zawgyi→Unicode variant for Burmese input only', () => {
  expect(zg2uni('ရန္ကင္း')).toBe('ရန်ကင်း');
  expect(queryKeys('ရန္ကင္း')).toContain(nameKey('ရန်ကင်း'));
  expect(queryKeys('Yankin')).toEqual(['yankin']);
  expect(queryKeys('   ')).toEqual([]);
});

test('slugify converts English names to kebab-case', () => {
  expect(slugify('Hlaing Tharyar')).toBe('hlaing-tharyar');
  expect(slugify('Magway Region')).toBe('magway-region');
  expect(slugify(' (Nay Pyi Taw) ')).toBe('nay-pyi-taw');
});

test('normalize strips case, spaces, dashes, apostrophes for matching', () => {
  expect(normalize('Hlaing-Tharyar')).toBe('hlaingtharyar');
  expect(normalize('hlaing  tharyar')).toBe('hlaingtharyar');
  expect(normalize('မကွေး တိုင်း')).toBe('မကွေးတိုင်း');
  expect(normalize("Kayin's")).toBe('kayins');
  expect(normalize('Kayin’s')).toBe('kayins');
});
