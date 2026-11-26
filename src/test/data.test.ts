// Guards on data/db.json, so a bad regeneration from a new MIMU release fails CI.
import geoData from '../../data/db.json';
import type { GeoData } from '../types';

const data = geoData as GeoData;
const districts = data.states.flatMap(s => s.districts.map(d => ({ s, d })));
const townships = districts.flatMap(({ s, d }) => d.townships.map(t => ({ s, d, t })));

test('carries MIMU source metadata', () => {
  expect(data.meta.source).toMatch(/MIMU/);
  expect(data.meta.version).toMatch(/^\d+\.\d+$/);
});

test('has 15 states/regions and a plausible number of districts and townships', () => {
  expect(data.states).toHaveLength(15);
  expect(districts.length).toBeGreaterThanOrEqual(75);
  expect(townships.length).toBeGreaterThanOrEqual(330);
});

test('every code is unique across all levels', () => {
  const codes = [
    ...data.states.flatMap(s => [s.code, ...(s.partCodes ?? [])]),
    ...districts.map(x => x.d.code),
    ...townships.map(x => x.t.code),
  ];
  expect(new Set(codes).size).toBe(codes.length);
});

test('codes follow the MIMU hierarchy', () => {
  for (const { s, d, t } of townships) {
    const prefixes = [s.code, ...(s.partCodes ?? [])];
    expect(prefixes).toContain(d.code.slice(0, 6));
    expect(prefixes).toContain(t.code.slice(0, 6));
    expect(t.code).toMatch(/^MMR\d{6}$/);
  }
});

test('slugs and aliases are unique among siblings', () => {
  const check = (nodes: { slug: string; aliases?: string[] }[]) => {
    const refs = nodes.flatMap(n => [n.slug, ...(n.aliases ?? [])]);
    expect(new Set(refs).size).toBe(refs.length);
    for (const r of refs) expect(r).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  };
  check(data.states);
  for (const s of data.states) {
    check(s.districts);
    for (const d of s.districts) check(d.townships);
  }
});

test('names are non-empty, trimmed, NFC and free of zero-width characters', () => {
  for (const n of [...data.states, ...districts.map(x => x.d), ...townships.map(x => x.t)]) {
    for (const name of [n.en, n.mm]) {
      expect(name.trim()).toBe(name);
      expect(name.length).toBeGreaterThan(0);
      expect(name.normalize('NFC')).toBe(name);
      expect(name).not.toMatch(/[​-‍﻿]/);
    }
    expect(n.mm).toMatch(/[က-႟]/);
  }
});
