import geoData from '../data/db.json';

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
