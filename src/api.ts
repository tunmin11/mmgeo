import geoData from '../data/db.json';
import { normalize } from './normalize';

export type Lang = 'en' | 'mm';

export interface Place {
  slug: string;
  name: string;
  en: string;
  mm: string;
}

export interface StatePlace extends Place {
  lat: number;
  lng: number;
  capital: string;
}

export interface PlaceWithPath extends Place {
  stateSlug: string;
  districtSlug: string;
}

interface Opts {
  lang?: Lang;
}

interface RawPlace {
  slug: string;
  eng: string;
  mm: string;
}

const toPlace = (item: RawPlace, lang: Lang): Place => ({
  slug: item.slug,
  name: lang === 'mm' ? item.mm : item.eng,
  en: item.eng,
  mm: item.mm,
});

export const listStates = (opts: Opts = {}): StatePlace[] =>
  geoData.states.map(state => ({
    ...toPlace(state, opts.lang ?? 'en'),
    lat: state.lat,
    lng: state.lng,
    capital: state.capital,
  }));

export const listDistricts = (stateSlug: string, opts: Opts = {}): Place[] => {
  const state = geoData.states.find(s => s.slug === stateSlug);
  if (!state) return [];
  return state.districts.map(district => toPlace(district, opts.lang ?? 'en'));
};

export const listTownships = (
  stateSlug: string,
  districtSlug: string,
  opts: Opts = {}
): Place[] => {
  const state = geoData.states.find(s => s.slug === stateSlug);
  const district = state?.districts.find(d => d.slug === districtSlug);
  if (!district) return [];
  return district.townships.map(township => toPlace(township, opts.lang ?? 'en'));
};

export const searchTownships = (query: string, opts: Opts = {}): PlaceWithPath[] => {
  const q = normalize(query);
  if (!q) return [];
  const results: PlaceWithPath[] = [];
  for (const state of geoData.states) {
    for (const district of state.districts) {
      for (const township of district.townships) {
        if (
          normalize(township.eng).includes(q) ||
          normalize(township.mm).includes(q) ||
          township.slug.replace(/-/g, '').includes(q)
        ) {
          results.push({
            ...toPlace(township, opts.lang ?? 'en'),
            stateSlug: state.slug,
            districtSlug: district.slug,
          });
        }
      }
    }
  }
  return results;
};

export const isValidTownship = (nameOrSlug: string): boolean => {
  const q = normalize(nameOrSlug);
  if (!q) return false;
  return geoData.states.some(state =>
    state.districts.some(district =>
      district.townships.some(
        township =>
          normalize(township.eng) === q ||
          normalize(township.mm) === q ||
          township.slug.replace(/-/g, '') === q
      )
    )
  );
};
