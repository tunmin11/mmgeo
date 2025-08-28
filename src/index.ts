import geoData from '../data/db.json';
import { getName } from './utils';

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
    return this.townships.map(township => new Township(township.en, township.mm));
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
    return this.districts.map(district => new District(district.en, district.mm, district.townships.map(
      township => new Township(township.en, township.mm)
    )));
  }
}

export const getStates = (): State[] => {
  return geoData.states.map(state => new State(
    state.eng,
    state.mm,
    state.lat,
    state.lng,
    state.capital,
    state.districts.map(district => new District(
      district.eng,
      district.mm,
      district.townships.map(township => new Township(township.eng, township.mm))
    ))
  ));
};

export { initialize } from './hook';
export { District, Township };