/** @jest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { useAddressCascade } from '../react';

test('cascades state → district → township and clears children', () => {
  const onChange = jest.fn();
  const { result } = renderHook(() => useAddressCascade({ onChange }));
  expect(result.current.states).toHaveLength(15);
  expect(result.current.districts).toEqual([]);

  act(() => result.current.setState('MMR013'));
  expect(result.current.districts.map(d => d.code)).toContain('MMR013D002');
  expect(result.current.townships).toEqual([]);

  act(() => result.current.setDistrict('MMR013D002'));
  expect(result.current.townships.some(t => t.code === 'MMR013010')).toBe(true);

  act(() => result.current.setTownship('MMR013010'));
  expect(result.current.value).toEqual({ stateCode: 'MMR013', districtCode: 'MMR013D002', townshipCode: 'MMR013010' });
  expect(result.current.isComplete).toBe(true);
  expect(result.current.selected.township!.en).toBe('Yankin');

  act(() => result.current.setState('MMR001'));
  expect(result.current.value).toEqual({ stateCode: 'MMR001', districtCode: null, townshipCode: null });
  expect(onChange).toHaveBeenCalledTimes(4);
});

test('pre-fills parents from a stored township code', () => {
  const { result } = renderHook(() => useAddressCascade({ initial: 'MMR013010', lang: 'mm' }));
  expect(result.current.value.districtCode).toBe('MMR013D002');
  expect(result.current.selected.township!.name).toBe('ရန်ကင်း');
  expect(result.current.townships.length).toBeGreaterThan(0);
});

test('skipDistrict lists all townships in the state and still fills the district', () => {
  const { result } = renderHook(() => useAddressCascade({ skipDistrict: true }));
  act(() => result.current.setState('MMR018'));
  expect(result.current.districts).toEqual([]);
  expect(result.current.townships).toHaveLength(8);
  act(() => result.current.setTownship(result.current.townships[0].code));
  expect(result.current.value.districtCode).toMatch(/^MMR018D/);
});

test('ignores unknown codes and resets', () => {
  const { result } = renderHook(() => useAddressCascade({ initial: { stateCode: 'nope' } }));
  expect(result.current.value.stateCode).toBeNull();
  act(() => result.current.setState('MMR013'));
  act(() => result.current.setTownship('nope'));
  expect(result.current.value).toEqual({ stateCode: 'MMR013', districtCode: null, townshipCode: null });
  act(() => result.current.reset());
  expect(result.current.value.stateCode).toBeNull();
});
