import geoData from '../data/db.json';
import { getName } from './utils';
import type { GeoData } from './types';

// ---- Legacy 1.0.x class API (kept for backward compatibility) ----

class Township {
  constructor(public en: string, public mm: string) {}
  getName(): string {
    return getName(this);
  }
}

class District {
  constructor(public en: string, public mm: string, public townships: Township[]) {}
  getName(): string {
    return getName(this);
  }
  getTownships(): Township[] {
    return this.townships;
  }
}

class State {
  constructor(
    public en: string,
    public mm: string,
    public lat: number,
    public lng: number,
    public capital: string,
    public districts: District[]
  ) {}
  getName(): string {
    return getName(this);
  }
  getDistricts(): District[] {
    return this.districts;
  }
}

let legacyStates: State[] | undefined;

/**
 * @deprecated Use `listStates()` / `listDistricts()` / `listTownships()`, which
 * take a per-call `lang` and return plain objects with codes and slugs.
 */
export const getStates = (): State[] =>
  (legacyStates ??= (geoData as GeoData).states.map(
    s =>
      new State(s.en, s.mm, s.lat, s.lng, s.capital,
        s.districts.map(d => new District(d.en, d.mm, d.townships.map(t => new Township(t.en, t.mm)))))
  ));

/** @deprecated Language is a per-call option (`{ lang: 'mm' }`) in the functional API. */
export { initialize } from './hook';
export { District, Township };

// ---- Current API ----

export {
  dataInfo,
  listStates,
  listDistricts,
  listTownships,
  searchTownships,
  findTownships,
  isValidTownship,
  getByCode,
  nearestTownships,
} from './api';
export { createGeo } from './geo';
export type { SubPlace, SubSearchOpts } from './levels';
export type { Geo } from './geo';
export type {
  Lang, LangOpts, SearchOpts, Place, StatePlace, DistrictPlace, TownshipPlace, PlaceWithPath, AnyPlace,
  StateType, DistrictType, TownshipType, GeoData,
} from './types';
