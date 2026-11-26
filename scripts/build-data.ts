/**
 * Build data/db.json from the MIMU P-code workbook.
 *
 *   npm run build:data -- path/to/Myanmar_PCodes_Release_X.Y_*.xlsm
 *
 * Source: Myanmar Information Management Unit (MIMU), https://themimu.info/place-codes
 * The generated data is distributed under MIMU's terms (see DATA_LICENSE).
 *
 * Besides converting MIMU rows, this maps every slug from mmgeo 1.x
 * (scripts/fixtures/db-v1.json) onto the new data as `aliases`, so values
 * apps stored with 1.x keep resolving.
 */
import ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';
import { slugify, nameKey } from '../src/normalize';
import type { GeoData, RawDistrict, RawState, RawTownship } from '../src/types';

type Row = Record<string, string>;

// States/regions as the package presents them. MIMU splits Bago and Shan into
// parts (MMR007/008, MMR014/015/016) and also carries combined codes
// (MMR111, MMR222); we present the combined state and keep part codes.
// Coordinates and capitals are carried over from 1.x (MIMU's workbook has none).
const STATES: Record<string, { slug: string; en: string; type: RawState['type']; parts?: string[] }> = {
  MMR001: { slug: 'kachin-state', en: 'Kachin State', type: 'state' },
  MMR002: { slug: 'kayah-state', en: 'Kayah State', type: 'state' },
  MMR003: { slug: 'kayin-state', en: 'Kayin State', type: 'state' },
  MMR004: { slug: 'chin-state', en: 'Chin State', type: 'state' },
  MMR005: { slug: 'sagaing-region', en: 'Sagaing Region', type: 'region' },
  MMR006: { slug: 'tanintharyi-region', en: 'Tanintharyi Region', type: 'region' },
  MMR111: { slug: 'bago-region', en: 'Bago Region', type: 'region', parts: ['MMR007', 'MMR008'] },
  MMR009: { slug: 'magway-region', en: 'Magway Region', type: 'region' },
  MMR010: { slug: 'mandalay-region', en: 'Mandalay Region', type: 'region' },
  MMR011: { slug: 'mon-state', en: 'Mon State', type: 'state' },
  MMR012: { slug: 'rakhine-state', en: 'Rakhine State', type: 'state' },
  MMR013: { slug: 'yangon-region', en: 'Yangon Region', type: 'region' },
  MMR222: { slug: 'shan-state', en: 'Shan State', type: 'state', parts: ['MMR014', 'MMR015', 'MMR016'] },
  MMR017: { slug: 'ayeyarwady-region', en: 'Ayeyarwady Region', type: 'region' },
  MMR018: { slug: 'nay-pyi-taw', en: 'Nay Pyi Taw', type: 'union-territory' },
};
const V1_STATE_SLUG: Record<string, string> = {
  'ayeyawady-region': 'ayeyarwady-region',
  'taninthayi-region': 'tanintharyi-region',
};

const stateOf = (srCode: string): string =>
  Object.keys(STATES).find(c => c === srCode || STATES[c].parts?.includes(srCode)) ??
  fail(`Unknown SR code ${srCode}`);

function fail(msg: string): never {
  throw new Error(msg);
}

const str = (v: ExcelJS.CellValue): string => {
  if (v == null) return '';
  if (typeof v === 'object' && 'richText' in v) return v.richText.map(t => t.text).join('');
  if (typeof v === 'object' && 'result' in v) return String(v.result ?? '');
  return String(v);
};

/** Read a sheet whose header row is the fullest row starting with `firstHeader`. */
const readSheet = (wb: ExcelJS.Workbook, name: string, firstHeader: string): Row[] => {
  const ws = wb.getWorksheet(name) ?? fail(`Sheet ${name} not found`);
  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, row => {
    rows.push((row.values as ExcelJS.CellValue[]).slice(1).map(v => str(v).trim()));
  });
  const candidates = rows.map((r, i) => [r, i] as const).filter(([r]) => r[0] === firstHeader);
  if (!candidates.length) fail(`No header row in ${name}`);
  const [header, at] = candidates.reduce((a, b) => (b[0].filter(Boolean).length > a[0].filter(Boolean).length ? b : a));
  return rows
    .slice(at + 1)
    .filter(r => r[0]?.startsWith('MMR'))
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''] as const).filter(([h]) => h)));
};

const active = (r: Row, level: string): boolean => r[`MIMU_${level}_Mapping_Status`] === 'Active';

// Names are kept exactly as MIMU publishes them: qualifiers like "(Kokang SAZ)"
// tell apart the GAD and field-source entries for the same area.
const cleanEn = (s: string) => s.replace(/\s+/g, ' ').trim();
const cleanMm = (s: string) => s.replace(/[\u200b-\u200d\ufeff]/g, '').normalize('NFC').replace(/\s+/g, ' ').trim();

const uniqueSlugs = <T extends { en: string; slug: string }>(items: T[]): void => {
  const seen = new Map<string, number>();
  for (const it of items) {
    const base = slugify(it.en);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    it.slug = n > 1 ? `${base}-${n}` : base;
  }
};

// 1.x townships that name-matching can't place, looked up by hand in MIMU 9.7
// (most were towns listed as townships). Key: 1.x township slug → MIMU township code.
// `null` = deliberately left unmapped.
const V1_OVERRIDES: Record<string, string | null> = {
  hlaingthaya: null, // MIMU splits it into Hlaingtharya East and West
  'mine-pyin': null, // no confident MIMU match
  mineyu: null, // 1.x Burmese name points elsewhere; no confident match
  // 1.x had the wrong Burmese name for these; follow the English name.
  'mine-yawng': 'MMR016011', // Mongyawng
  'mine-yong': 'MMR016011', // Mongyawng
  'mine-ping': 'MMR016007', // Mongping
  minengaw: 'MMR015012', // Mongngawt Town, Kyaukme Tsp
  thani: 'MMR015002', // Hseni
  manhero: 'MMR015009', // Manhlyoe Town, Muse Tsp
  pansai: 'MMR015009', // Pang Hseng (Kyu Koke) Town, Muse Tsp
  pansang: 'MMR015005', // Pangsang (Panghkam)
  pangsang: 'MMR015005',
  minesan: 'MMR014017', // Mongsan Town, Monghsu Tsp
  seikkyikanaungto: 'MMR013031', // Seikgyikanaungto
  hsadone: 'MMR001002', // Sadung Town, Waingmaw Tsp
  wawlaymyaing: 'MMR003005', // Waw Lay Myaing Town, Myawaddy Tsp
  rikhuadal: 'MMR004001', // Rihkhawdar Town, Falam Tsp
};

// 1.x spelled Shan "Mong" names as "Mine"/"Mone" and joined words; fold those for matching.
const looseKey = (s: string) =>
  nameKey(s).replace(/^(mine|mone|moung)/, 'mong').replace(/[aeiouyh]/g, '');

interface V1Node { eng: string; mm: string; slug: string; townships?: V1Node[]; districts?: V1Node[] }

async function main() {
  const [xlsm] = process.argv.slice(2);
  if (!xlsm) fail('Usage: build-data <MIMU P-code .xlsm/.xlsx>');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(xlsm);

  const title = str(wb.getWorksheet('Metadata')!.getCell('B1').value);
  const version = title.match(/Release_([\d.]+)/)?.[1] ?? fail(`Can't read version from "${title}"`);

  const srRows = readSheet(wb, '01_SR', 'SR_Pcode');
  const zoneRows = readSheet(wb, 'SAD_SAZ', 'SR_Pcode');
  const districtRows = readSheet(wb, '02_District', 'SR').filter(r => active(r, 'District'));
  const townshipRows = readSheet(wb, '03_Township', 'SR_Pcode').filter(r => active(r, 'Township'));
  const townRows = readSheet(wb, '04_Town', 'SR_Pcode');

  const v1: { states: (V1Node & { lat: number; lng: number; capital: string })[] } = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'fixtures', 'db-v1.json'), 'utf8')
  );
  const v1State = (slug: string) =>
    v1.states.find(s => (V1_STATE_SLUG[s.slug] ?? s.slug) === slug) ?? fail(`No 1.x state for ${slug}`);

  // ---- Build the tree ----
  const states: RawState[] = Object.entries(STATES).map(([code, s]) => {
    const sr = srRows.find(r => r.SR_Pcode === code) ?? fail(`SR ${code} missing`);
    const old = v1State(s.slug);
    return {
      code, slug: s.slug, en: s.en, mm: cleanMm(sr.SR_Name_MMR), type: s.type,
      ...(s.parts ? { partCodes: s.parts } : {}),
      ...(old.slug !== s.slug ? { aliases: [old.slug] } : {}),
      lat: old.lat, lng: old.lng, capital: old.capital, districts: [],
    };
  });
  const stateByCode = new Map(states.map(s => [s.code, s]));
  const districtByCode = new Map<string, RawDistrict>();

  const addDistrict = (srCode: string, code: string, en: string, mm: string, type: RawDistrict['type']) => {
    const d: RawDistrict = { code, slug: '', en: cleanEn(en), mm: cleanMm(mm), type, townships: [] };
    stateByCode.get(stateOf(srCode))!.districts.push(d);
    districtByCode.set(code, d);
  };
  for (const r of districtRows) addDistrict(r.SR, r.District_Pcode, r.District_Name_Eng, r.District_Name_MMR, 'district');
  for (const r of zoneRows) {
    if (/S5\d\d$/.test(r['SAD/SAZ_Pcode'])) continue; // Wa SAD is a division of districts, not a parent of townships
    addDistrict(r.SR_Pcode, r['SAD/SAZ_Pcode'], r['SAD/SAZ_Name_Eng'], r['SAD/SAZ_Name_MMR'], 'self-administered-zone');
  }

  for (const r of townshipRows) {
    const d = districtByCode.get(r['District/SAZ_Pcode']) ?? fail(`Township ${r.Tsp_Pcode}: unknown parent ${r['District/SAZ_Pcode']}`);
    d.townships.push({
      code: r.Tsp_Pcode, slug: '',
      en: cleanEn(r.Township_Name_Eng), mm: cleanMm(r.Township_Name_MMR),
      type: /sub-township/i.test(r.Township_Name_Eng) ? 'sub-township' : 'township',
      ...(r.GAD_Township_Status === 'Active' ? {} : { official: false }),
    });
  }

  for (const s of states) {
    s.districts.sort((a, b) => a.code.localeCompare(b.code));
    uniqueSlugs(s.districts);
    for (const d of s.districts) {
      d.townships.sort((a, b) => a.code.localeCompare(b.code));
      uniqueSlugs(d.townships);
    }
  }

  // ---- Map 1.x slugs onto the new tree ----
  const unmatched: string[] = [];
  // Town name → parent township code, keyed per state (exact and loose English, exact Burmese).
  const townKey = (srCode: string, key: string) => `${stateOf(srCode)}:${key}`;
  const townExact = new Map<string, string>();
  const townLoose = new Map<string, string | null>(); // null = ambiguous
  for (const t of townRows) {
    const en = t.Town_Name_Eng.replace(/\s*Town$/, '').replace(/\s*\(.*?\)/g, '');
    const mm = cleanMm(t.Town_Name_MMR).replace(/\s*\(.*?\)/g, '').replace(/မြို့$/, '');
    townExact.set(townKey(t.SR_Pcode, nameKey(en)), t.Tsp_Pcode);
    if (mm) townExact.set(townKey(t.SR_Pcode, nameKey(mm)), t.Tsp_Pcode);
    const lk = townKey(t.SR_Pcode, looseKey(en));
    townLoose.set(lk, townLoose.has(lk) && townLoose.get(lk) !== t.Tsp_Pcode ? null : t.Tsp_Pcode);
  }
  for (const oldState of v1.states) {
    const state = states.find(s => s.slug === (V1_STATE_SLUG[oldState.slug] ?? oldState.slug))!;
    const tsps = state.districts.flatMap(d => d.townships.map(t => ({ t, d })));
    const byCode = new Map(tsps.map(x => [x.t.code, x]));
    // Most specific evidence first; the loose (vowel-folded) key only counts when unambiguous.
    const find = (old: V1Node) => {
      const en = nameKey(old.eng), loose = looseKey(old.eng);
      const mm = nameKey(cleanMm(old.mm.replace(/\s*\(.*?\)\s*/g, '')));
      const looseHits = tsps.filter(x => looseKey(x.t.en) === loose);
      const tk = (k: string) => `${state.code}:${k}`;
      if (V1_OVERRIDES[old.slug] === null) return undefined;
      return (
        byCode.get(V1_OVERRIDES[old.slug] ?? '') ??
        tsps.find(x => nameKey(x.t.en) === en) ??
        tsps.find(x => nameKey(x.t.mm) === mm) ??
        byCode.get(townExact.get(tk(en)) ?? '') ??
        byCode.get(townExact.get(tk(mm)) ?? '') ??
        (looseHits.length === 1 ? looseHits[0] : undefined) ??
        byCode.get(townLoose.get(tk(loose)) ?? '')
      );
    };
    for (const oldD of oldState.districts ?? []) {
      const votes = new Map<RawDistrict, number>();
      for (const oldT of oldD.townships ?? []) {
        const hit = find(oldT);
        if (!hit) { unmatched.push(`${oldState.slug}/${oldD.slug}/${oldT.slug}`); continue; }
        votes.set(hit.d, (votes.get(hit.d) ?? 0) + 1);
        addAlias(hit.t, hit.d.townships, oldT.slug);
      }
      const best = [...votes].sort((a, b) => b[1] - a[1])[0]?.[0];
      if (best) addAlias(best, state.districts, oldD.slug);
    }
  }

  const data: GeoData = {
    meta: {
      source: `MIMU Place Codes (P-codes) Release ${version}, Myanmar Information Management Unit (MIMU)`,
      version,
      generatedAt: new Date().toISOString().slice(0, 10),
    },
    states,
  };
  const out = path.join(__dirname, '..', 'data', 'db.json');
  fs.writeFileSync(out, JSON.stringify(data, null, 1) + '\n');

  const nd = states.reduce((n, s) => n + s.districts.length, 0);
  const nt = states.reduce((n, s) => n + s.districts.reduce((m, d) => m + d.townships.length, 0), 0);
  console.log(`MIMU ${version}: ${states.length} states, ${nd} districts/zones, ${nt} townships → ${path.relative(process.cwd(), out)}`);
  if (unmatched.length) console.log(`1.x townships with no match (no alias): ${unmatched.length}\n  ${unmatched.join('\n  ')}`);
}

/** Add `slug` as an alias of `node` unless a sibling already uses it. */
function addAlias(node: { slug: string; aliases?: string[] }, siblings: { slug: string; aliases?: string[] }[], slug: string) {
  if (node.slug === slug || node.aliases?.includes(slug)) return;
  if (siblings.some(s => s !== node && (s.slug === slug || s.aliases?.includes(slug)))) return;
  (node.aliases ??= []).push(slug);
}

main().catch(e => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
