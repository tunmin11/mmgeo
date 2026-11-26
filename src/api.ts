import geoData from '../data/db.json';
import { createGeo } from './geo';
import type { GeoData } from './types';

const geo = createGeo(geoData as GeoData);

/** Source and version of the bundled data (MIMU P-codes). */
export const dataInfo = geo.meta;

export const {
  listStates,
  listDistricts,
  listTownships,
  searchTownships,
  findTownships,
  isValidTownship,
  getByCode,
} = geo;
