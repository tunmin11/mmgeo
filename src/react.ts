/**
 * React hook for cascading Myanmar address pickers — `import { useAddressCascade } from '@tm11/mmgeo/react'`.
 * Headless: it gives you options and selection state; render any UI you like.
 * Requires `react` >= 16.8 (optional peer dependency).
 */
import { useCallback, useMemo, useState } from 'react';
import { getByCode, listDistricts, listStates, listTownships } from './api';
import type { DistrictPlace, Lang, StatePlace, TownshipPlace } from './types';

export interface AddressCodes {
  stateCode: string | null;
  districtCode: string | null;
  townshipCode: string | null;
}

export interface UseAddressCascadeOptions {
  lang?: Lang;
  /**
   * Skip the district level: townships are listed for the whole state.
   * `districtCode` is still filled in when a township is picked.
   */
  skipDistrict?: boolean;
  /** Pre-fill from a stored township code (parents are filled in) or from explicit codes. */
  initial?: string | Partial<AddressCodes>;
  /** Called with the new codes after every change. */
  onChange?: (codes: AddressCodes) => void;
}

const EMPTY: AddressCodes = { stateCode: null, districtCode: null, townshipCode: null };

/** Turn `initial` into a consistent set of codes; anything that doesn't resolve is dropped. */
const resolveInitial = (initial: UseAddressCascadeOptions['initial']): AddressCodes => {
  if (!initial) return EMPTY;
  const codes = typeof initial === 'string' ? { townshipCode: initial } : initial;
  const tsp = codes.townshipCode ? getByCode(codes.townshipCode) : undefined;
  if (tsp?.level === 'township') {
    return { stateCode: tsp.stateCode, districtCode: tsp.districtCode, townshipCode: tsp.code };
  }
  const dist = codes.districtCode ? getByCode(codes.districtCode) : undefined;
  if (dist?.level === 'district') return { stateCode: dist.stateCode, districtCode: dist.code, townshipCode: null };
  const state = codes.stateCode ? getByCode(codes.stateCode) : undefined;
  return state?.level === 'state' ? { ...EMPTY, stateCode: state.code } : EMPTY;
};

export const useAddressCascade = (options: UseAddressCascadeOptions = {}) => {
  const { lang = 'en', skipDistrict = false, onChange } = options;
  const [codes, setCodes] = useState<AddressCodes>(() => resolveInitial(options.initial));

  const states = useMemo<StatePlace[]>(() => listStates({ lang }), [lang]);
  const districts = useMemo<DistrictPlace[]>(
    () => (codes.stateCode && !skipDistrict ? listDistricts(codes.stateCode, { lang }) : []),
    [codes.stateCode, skipDistrict, lang]
  );
  const townships = useMemo<TownshipPlace[]>(() => {
    if (!codes.stateCode) return [];
    if (skipDistrict) return listTownships(codes.stateCode, { lang });
    return codes.districtCode ? listTownships(codes.stateCode, codes.districtCode, { lang }) : [];
  }, [codes.stateCode, codes.districtCode, skipDistrict, lang]);

  const update = useCallback(
    (next: AddressCodes) => {
      setCodes(next);
      onChange?.(next);
    },
    [onChange]
  );

  /** Pick a state (code or `null`); clears district and township. */
  const setState = useCallback(
    (stateCode: string | null) => {
      const s = stateCode ? getByCode(stateCode) : undefined;
      update({ ...EMPTY, stateCode: s?.level === 'state' ? s.code : null });
    },
    [update]
  );

  /** Pick a district (code or `null`); clears the township. */
  const setDistrict = useCallback(
    (districtCode: string | null) => {
      const d = districtCode ? getByCode(districtCode) : undefined;
      if (d?.level === 'district') update({ stateCode: d.stateCode, districtCode: d.code, townshipCode: null });
      else update({ ...codes, districtCode: null, townshipCode: null });
    },
    [codes, update]
  );

  /** Pick a township (code or `null`); fills in state and district. */
  const setTownship = useCallback(
    (townshipCode: string | null) => {
      const t = townshipCode ? getByCode(townshipCode) : undefined;
      if (t?.level === 'township') update({ stateCode: t.stateCode, districtCode: t.districtCode, townshipCode: t.code });
      else update({ ...codes, townshipCode: null });
    },
    [codes, update]
  );

  const reset = useCallback(() => update(EMPTY), [update]);

  const find = <T extends { code: string }>(list: T[], code: string | null) => list.find(x => x.code === code) ?? null;
  const township = codes.townshipCode ? (getByCode(codes.townshipCode, { lang }) as TownshipPlace | undefined) ?? null : null;

  return {
    /** Options for each dropdown. */
    states,
    districts,
    townships,
    /** Selected codes — store these. */
    value: codes,
    /** Selected places (with localized `name`), or `null`. */
    selected: {
      state: find(states, codes.stateCode),
      district: codes.districtCode ? (getByCode(codes.districtCode, { lang }) as DistrictPlace | undefined) ?? null : null,
      township,
    },
    /** True once a township is chosen. */
    isComplete: township !== null,
    setState,
    setDistrict,
    setTownship,
    reset,
  };
};

export type AddressCascade = ReturnType<typeof useAddressCascade>;
