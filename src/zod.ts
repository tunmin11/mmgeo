/**
 * Zod schemas for Myanmar addresses — `import { mmAddress } from '@tm11/mmgeo/zod'`.
 * Works with zod 3.23+ and 4.x (optional peer dependency).
 */
import { z } from 'zod';
import { getByCode, isValidTownship } from './api';

const isLevel = (level: 'state' | 'district' | 'township') => (code: string) => getByCode(code)?.level === level;

/** A MIMU state/region code, e.g. `MMR013`. Bago/Shan part codes are accepted. */
export const stateCode = z.string().trim().refine(isLevel('state'), { message: 'Unknown state/region code' });

/** A MIMU district or self-administered zone code, e.g. `MMR013D002`. */
export const districtCode = z.string().trim().refine(isLevel('district'), { message: 'Unknown district code' });

/** A MIMU township code, e.g. `MMR013009`. */
export const townshipCode = z.string().trim().refine(isLevel('township'), { message: 'Unknown township code' });

/** Free-text township input: English, Burmese (Unicode or Zawgyi), slug or code. */
export const townshipName = z.string().trim().refine(isValidTownship, { message: 'Unknown township' });

const SUB_CODE = /^MMR\d{6}(\d{3}|\d{6})$/i;

type CodeIssue = { message: string; path: string[] };

/** Hierarchy problems between already-valid codes. */
const hierarchyIssues = (a: { stateCode: string; districtCode?: string; townshipCode: string; subCode?: string }): CodeIssue[] => {
  const t = getByCode(a.townshipCode);
  const s = getByCode(a.stateCode);
  if (t?.level !== 'township' || s?.level !== 'state') return []; // field schemas already report these
  const issues: CodeIssue[] = [];
  if (s.code !== t.stateCode) issues.push({ message: 'Township is not in this state/region', path: ['townshipCode'] });
  if (a.districtCode && getByCode(a.districtCode)?.level === 'district' && a.districtCode.toUpperCase() !== t.districtCode) {
    issues.push({ message: 'Township is not in this district', path: ['townshipCode'] });
  }
  if (a.subCode && SUB_CODE.test(a.subCode) && !a.subCode.toUpperCase().startsWith(t.code)) {
    issues.push({ message: 'Ward/village tract is not in this township', path: ['subCode'] });
  }
  return issues;
};

const checkHierarchy = (a: Parameters<typeof hierarchyIssues>[0], ctx: z.RefinementCtx) => {
  for (const issue of hierarchyIssues(a)) ctx.addIssue({ code: 'custom', ...issue });
};

/**
 * State + (optional) district + township codes that belong together.
 * Errors land on the field that doesn't fit, so forms can show them inline.
 */
export const mmAddressCodes = z
  .object({
    stateCode,
    districtCode: districtCode.optional(),
    townshipCode,
  })
  .superRefine(checkHierarchy);

/** A street address plus the administrative codes. */
export const mmAddress = z
  .object({
    line1: z.string().trim().min(1, { message: 'Required' }),
    line2: z.string().trim().optional(),
    stateCode,
    districtCode: districtCode.optional(),
    townshipCode,
    /** Ward or village tract code, if your form collects it (format and township are checked). */
    subCode: z.string().trim().regex(SUB_CODE, { message: 'Not a ward or village tract code' }).optional(),
  })
  .superRefine(checkHierarchy);

export type MmAddressCodes = z.infer<typeof mmAddressCodes>;
export type MmAddress = z.infer<typeof mmAddress>;
