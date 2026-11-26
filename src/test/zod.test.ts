import { mmAddress, mmAddressCodes, stateCode, townshipCode, townshipName } from '../zod';

const issues = (r: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  r.success ? [] : r.error!.issues.map(i => `${i.path.join('.')}: ${i.message}`);

test('code schemas accept real codes only', () => {
  expect(stateCode.safeParse('MMR013').success).toBe(true);
  expect(stateCode.safeParse('MMR015').success).toBe(true); // Shan part code
  expect(stateCode.safeParse('MMR013010').success).toBe(false);
  expect(townshipCode.safeParse(' MMR013010 ').success).toBe(true);
  expect(townshipCode.safeParse('MMR013').success).toBe(false);
});

test('townshipName accepts names in either script and encoding', () => {
  for (const v of ['Yankin', 'ရန်ကင်း', 'ရန္ကင္း', 'MMR013010']) expect(townshipName.safeParse(v).success).toBe(true);
  expect(townshipName.safeParse('Atlantis').success).toBe(false);
});

test('mmAddressCodes checks the hierarchy and points at the township field', () => {
  expect(mmAddressCodes.safeParse({ stateCode: 'MMR013', districtCode: 'MMR013D002', townshipCode: 'MMR013010' }).success).toBe(true);
  expect(mmAddressCodes.safeParse({ stateCode: 'MMR013', townshipCode: 'MMR013010' }).success).toBe(true);
  expect(issues(mmAddressCodes.safeParse({ stateCode: 'MMR001', townshipCode: 'MMR013010' })))
    .toEqual(['townshipCode: Township is not in this state/region']);
  expect(issues(mmAddressCodes.safeParse({ stateCode: 'MMR013', districtCode: 'MMR013D001', townshipCode: 'MMR013010' })))
    .toEqual(['townshipCode: Township is not in this district']);
  expect(issues(mmAddressCodes.safeParse({ stateCode: 'nope', townshipCode: 'MMR013010' })))
    .toEqual(['stateCode: Unknown state/region code']);
});

test('mmAddress validates lines and the optional ward/village tract code', () => {
  const ok = { line1: 'No. 12, Kabar Aye Pagoda Rd', stateCode: 'MMR013', townshipCode: 'MMR013010', subCode: 'MMR013010701501' };
  expect(mmAddress.safeParse(ok).success).toBe(true);
  expect(issues(mmAddress.safeParse({ ...ok, line1: ' ' }))).toEqual(['line1: Required']);
  expect(issues(mmAddress.safeParse({ ...ok, subCode: 'MMR017024001' })))
    .toEqual(['subCode: Ward/village tract is not in this township']);
  expect(issues(mmAddress.safeParse({ ...ok, subCode: 'abc' }))).toEqual(['subCode: Not a ward or village tract code']);
});
