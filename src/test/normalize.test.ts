import { slugify, normalize } from '../normalize';

test('slugify converts English names to kebab-case', () => {
  expect(slugify('Hlaing Tharyar')).toBe('hlaing-tharyar');
  expect(slugify('Magway Region')).toBe('magway-region');
  expect(slugify(' (Nay Pyi Taw) ')).toBe('nay-pyi-taw');
});

test('normalize strips case, spaces, dashes, apostrophes for matching', () => {
  expect(normalize('Hlaing-Tharyar')).toBe('hlaingtharyar');
  expect(normalize('hlaing  tharyar')).toBe('hlaingtharyar');
  expect(normalize('မကွေး တိုင်း')).toBe('မကွေးတိုင်း');
});
