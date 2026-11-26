import { zg2uni } from './vendor/rabbit-zg2uni';

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ZERO_WIDTH = /[​-‍﻿]/g;

/** Lowercase, NFC, and strip spaces, dashes, underscores, apostrophes, parens and zero-width chars. */
export const normalize = (value: string): string =>
  value
    .normalize('NFC')
    .replace(ZERO_WIDTH, '')
    .toLowerCase()
    .replace(/[\s\-_'’().,]+/g, '');

// Generic words people add to a place name that shouldn't affect matching.
const EN_SUFFIX = /(township|subtownship|district|region|state)$/;
const MM_SUFFIX = /(မြို့နယ်ခွဲ|မြို့နယ်|ခရိုင်|တိုင်းဒေသကြီး|ပြည်နယ်)$/;

/** Normalize, then drop a trailing "Township"/"မြို့နယ်"-style word. */
export const nameKey = (value: string): string => {
  const n = normalize(value);
  const stripped = n.replace(EN_SUFFIX, '').replace(MM_SUFFIX, '');
  return stripped || n;
};

const hasMyanmar = (value: string): boolean => /[က-႟]/.test(value);

/**
 * Keys to try when matching user input. Burmese input may be Unicode or Zawgyi,
 * and the two can't be told apart reliably on short strings, so we try both:
 * the input as-is and the input converted from Zawgyi.
 */
export const queryKeys = (value: string): string[] => {
  const keys = new Set<string>([nameKey(value)]);
  if (hasMyanmar(value)) keys.add(nameKey(zg2uni(value)));
  keys.delete('');
  return [...keys];
};
