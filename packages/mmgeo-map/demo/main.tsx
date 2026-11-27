// The docs site (docs/index.html) for both packages.
// `npm run demo` serves it from source at http://localhost:8000; `npm run build:docs` writes docs/app.js,
// which loads React and both packages from the CDN through the import map in docs/index.html.
import { Fragment, useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MyanmarMap, type MyanmarMapProps } from '@tm11/mmgeo-map';
import { useAddressCascade } from '@tm11/mmgeo/react';
import { availableLevels, placeAt, type MapPlace } from '@tm11/mmgeo/boundaries';
import { getByCode, nearestTownships, searchTownships, type Lang } from '@tm11/mmgeo';
import type { WardPlace } from '@tm11/mmgeo/wards';
import type { VillageTractPlace } from '@tm11/mmgeo/village-tracts';

// Made-up numbers for the data example: one per state code.
const USERS: Record<string, number> = { MMR013: 1240, MMR010: 860, MMR005: 610, MMR111: 420, MMR222: 380, MMR017: 300, MMR009: 150, MMR001: 90 };
const shade = (n?: number): string | undefined =>
  n === undefined ? undefined : n > 1000 ? '#1D4ED8' : n > 500 ? '#60A5FA' : '#BFDBFE';

interface Example { id: string; title: string; note: string; code: string; props: MyanmarMapProps }
interface Group { title: string; examples: Example[] }

const GROUPS: Group[] = [
  { title: 'Map picker', examples: [
    { id: 'default', title: 'Default', note: 'Click down from the country to a state, district, township, then a village tract or town, and a town\'s wards. Every click is already a valid answer. The breadcrumb or Escape goes back.',
      code: '<MyanmarMap onChange={setPlace} />', props: {} },
    { id: 'states', title: 'States only', note: 'No zooming in: one click picks a state.',
      code: '<MyanmarMap depth="state" />', props: { depth: 'state' } },
    { id: 'districts', title: 'Down to districts', note: 'Zooms into a state and stops at districts.',
      code: '<MyanmarMap depth="district" />', props: { depth: 'district' } },
    { id: 'townships', title: 'Down to townships', note: 'Stops at townships, which is what most address forms need.',
      code: '<MyanmarMap depth="township" />', props: { depth: 'township' } },
    { id: 'skip-district', title: 'Skip districts', note: 'State, then township. Most address forms in Myanmar don\'t ask for the district.',
      code: '<MyanmarMap skipDistrict />', props: { skipDistrict: true } },
  ] },
  { title: 'Map in one area', examples: [
    { id: 'context-hidden', title: 'Hide the neighbours', note: 'After zooming in, neighbouring areas are hidden instead of greyed out.',
      code: '<MyanmarMap context="hidden" />', props: { context: 'hidden' } },
    { id: 'root-state', title: 'One state', note: 'Starts inside Shan State and can\'t zoom out of it, for an app that only serves Shan.',
      code: '<MyanmarMap root="MMR222" />', props: { root: 'MMR222' } },
    { id: 'root-district', title: 'One district', note: 'A delivery zone: only the townships of Yangon (East).',
      code: '<MyanmarMap root="MMR013D002" />', props: { root: 'MMR013D002' } },
    { id: 'root-township', title: 'One township', note: 'Starts inside Bogale. Pick a village tract or town.',
      code: '<MyanmarMap root="MMR017024" />', props: { root: 'MMR017024' } },
  ] },
  { title: 'Map look and language', examples: [
    { id: 'labels', title: 'Names on the map', note: 'Names always show on hover and focus. showLabels also draws them on shapes big enough to hold them.',
      code: '<MyanmarMap showLabels />', props: { showLabels: true } },
    { id: 'burmese', title: 'Burmese', note: 'Labels, the breadcrumb, hover names and screen-reader names in Burmese.',
      code: '<MyanmarMap lang="mm" />', props: { lang: 'mm' } },
    { id: 'colors', title: 'Your colours', note: 'Theme it to your brand, popover included. Any colour you leave out keeps its default.',
      code: `<MyanmarMap
  colors={{ fill: '#EFEAF2', hover: '#FFE45C', selected: '#2B1B2E',
            stroke: '#FFFFFF', context: '#F6F4F7', tooltip: '#2B1B2E' }}
/>`,
      props: { colors: { fill: '#EFEAF2', hover: '#FFE45C', selected: '#2B1B2E', stroke: '#FFFFFF', context: '#F6F4F7', tooltip: '#2B1B2E' } } },
    { id: 'data', title: 'Your data on the map', note: 'Colour each place by a number (made-up users here) and show it on hover. You choose the colours; the map draws them.',
      code: `const users = { MMR013: 1240, MMR010: 860 /* … */ };
const shade = (n?: number) => n === undefined ? undefined
  : n > 1000 ? '#1D4ED8' : n > 500 ? '#60A5FA' : '#BFDBFE';

<MyanmarMap
  fill={p => shade(users[p.code])}
  tooltip={p => \`\${p.name}: \${users[p.code] ?? 0} users\`}
/>`,
      props: { fill: p => shade(USERS[p.code]), tooltip: p => `${p.name}: ${USERS[p.code] ?? 0} users` } },
  ] },
];

const PROPS: [string, string, ReactNode][] = [
  ['value / defaultValue', '—', 'Selected code at any level. Controlled when value is given.'],
  ['onChange', '—', <><code>(place: MapPlace) =&gt; void</code>, called with the place clicked.</>],
  ['depth', 'finest available', <>Deepest level users can pick: <code>'state'</code>, <code>'district'</code>, <code>'township'</code>, <code>'village-tract'</code>, <code>'ward'</code>.</>],
  ['skipDistrict', 'false', 'Go straight from state to township.'],
  ['root', '—', 'Keep the map inside one state, district, township or town.'],
  ['context', "'faint'", <>Grey out neighbouring areas, or <code>'hidden'</code> to leave them out. <code>'hidden'</code> by default with <code>root</code>.</>],
  ['lang', "'en'", <><code>'en'</code> or <code>'mm'</code> for names, breadcrumb and accessible labels.</>],
  ['height', '480', 'Map height: a number in px, or any CSS length.'],
  ['showLabels', 'false', 'Also draw names on shapes big enough to hold them.'],
  ['colors', '—', <><code>fill</code>, <code>hover</code>, <code>selected</code>, <code>stroke</code>, <code>context</code>, <code>text</code>, <code>selectedText</code>, <code>tooltip</code>, <code>focus</code>.</>],
  ['fill', '—', <><code>(place) =&gt; string | undefined</code>. Colour shapes from your data. Hover and selected still win.</>],
  ['tooltip', '—', <><code>(place) =&gt; ReactNode</code>. Popover content. Default: the English and Burmese names.</>],
  ['className / style', '—', 'Passed to the wrapper.'],
  ['aria-label', "'Map of Myanmar'", 'Accessible name of the map (Burmese with lang="mm").'],
];

/** Just enough colour for JSX snippets: comments, strings, component tags. */
function highlight(src: string): ReactNode[] {
  return src.split(/(\/\*.*?\*\/|\/\/[^\n]*|'[^'\n]*'|"[^"\n]*"|`[^`]*`|<\/?[A-Z]\w*)/).map((part, i) =>
    i % 2 === 0 ? <Fragment key={i}>{part}</Fragment>
      : <span key={i} className={part.startsWith('/') ? 'c' : part.startsWith('<') ? 't' : 's'}>{part}</span>);
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }): ReactElement {
  const [state, setState] = useState(label);
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
      setState('Copied');
    } catch {
      setState('Copy failed. Select the text instead.');
    }
    setTimeout(() => setState(label), 1600);
  };
  return <button type="button" className="copy" onClick={copy} aria-live="polite">{state}</button>;
}

function Code({ src }: { src: string }): ReactElement {
  return (
    <div className="code">
      <pre><code>{highlight(src)}</code></pre>
      <CopyButton text={src} />
    </div>
  );
}

function Readout({ place }: { place: MapPlace | null }): ReactElement {
  return (
    <p className="readout" aria-live="polite">
      {place ? <>onChange(<b>{JSON.stringify({ level: place.level, code: place.code, name: place.name })}</b>)</> : 'Click a place to see what onChange receives.'}
    </p>
  );
}

function ExampleDoc({ ex, height = 420 }: { ex: Example; height?: number }): ReactElement {
  const [picked, setPicked] = useState<MapPlace | null>(null);
  return (
    <section className="doc" id={ex.id} aria-labelledby={`${ex.id}-h`}>
      <h2 id={`${ex.id}-h`}>{ex.title}</h2>
      <p>{ex.note}</p>
      <div className="example">
        <div className="stage"><MyanmarMap height={height} {...ex.props} onChange={setPicked} /></div>
        <Readout place={picked} />
        <Code src={ex.code} />
      </div>
    </section>
  );
}

function MapAndForm(): ReactElement {
  const [lang, setLang] = useState<Lang>('en');
  const [located, setLocated] = useState('');
  const a = useAddressCascade({ lang });
  // The form stops at townships; a village tract, town or ward picked on the map sits below it,
  // and drops away as soon as the township changes.
  const [sub, setSub] = useState<MapPlace | null>(null);
  const below = sub && 'townshipCode' in sub && sub.townshipCode === a.value.townshipCode ? sub : null;
  const deepest = below?.code ?? a.value.townshipCode ?? a.value.districtCode ?? a.value.stateCode;
  const fromMap = (p: MapPlace): void => {
    if (p.level === 'state') a.setState(p.code);
    else if (p.level === 'district') a.setDistrict(p.code);
    else if (p.level === 'township') a.setTownship(p.code);
    else { a.setTownship(p.townshipCode); setSub(p); }
  };
  const locate = (): void => {
    if (!navigator.geolocation) return setLocated('This browser can\'t share its location.');
    setLocated('Finding you…');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const p = await placeAt(pos.coords.latitude, pos.coords.longitude, { lang });
          setLocated(p ? `You are in ${p.name} (${p.code}).` : 'That point is outside Myanmar.');
          if (p) fromMap(p);
        } catch {
          setLocated("Couldn't load the outlines for your location. Check your connection and try again.");
        }
      },
      () => setLocated('Location permission was denied. Allow it in your browser to use this.')
    );
  };
  return (
    <section className="doc" id="map-and-form" aria-labelledby="map-and-form-h">
      <h2 id="map-and-form-h">Map and dropdowns in sync</h2>
      <p>The map and the form share one <code>useAddressCascade</code> state, so either one can fill in the address.</p>
      <div className="example">
        <div className="pair">
          <div className="stage"><MyanmarMap value={deepest} onChange={fromMap} lang={lang} height={520} /></div>
          <div className="form">
            <div className="row">
              <button type="button" onClick={() => setLang(l => (l === 'en' ? 'mm' : 'en'))}>{lang === 'en' ? 'မြန်မာ' : 'English'}</button>
              <button type="button" onClick={locate}>Use my location</button>
              <button type="button" onClick={a.reset}>Clear</button>
            </div>
            {located && <p className="status" role="status">{located}</p>}
            <label htmlFor="s">State / region</label>
            <select id="s" value={a.value.stateCode ?? ''} onChange={e => a.setState(e.target.value || null)}>
              <option value="">Choose…</option>
              {a.states.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <label htmlFor="d">District</label>
            <select id="d" value={a.value.districtCode ?? ''} onChange={e => a.setDistrict(e.target.value || null)} disabled={!a.districts.length}>
              <option value="">Choose…</option>
              {a.districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
            </select>
            <label htmlFor="t">Township</label>
            <select id="t" value={a.value.townshipCode ?? ''} onChange={e => a.setTownship(e.target.value || null)} disabled={!a.townships.length}>
              <option value="">Choose…</option>
              {a.townships.map(t => <option key={t.code} value={t.code}>{t.name}</option>)}
            </select>
            <label>What you'd store</label>
            <pre>{JSON.stringify(deepest ? { ...a.value, name: below?.name ?? getByCode(deepest, { lang })?.name, ...(below ? { [below.level]: below.code } : {}) } : null, null, 2)}</pre>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---- Address data (@tm11/mmgeo) ----

const QUICK_START = `import { listStates, listTownships, searchTownships, getByCode } from '@tm11/mmgeo';

listStates();
// [{ code: 'MMR013', slug: 'yangon-region', name: 'Yangon Region',
//    mm: 'ရန်ကုန်တိုင်းဒေသကြီး', type: 'region', lat: 16.8, lng: 96.15, capital: 'Yangon' }, …]

listTownships('yangon-region', 'yangon-east');  // slug or code: ('MMR013', 'MMR013D002')
// [{ code: 'MMR013009', slug: 'thingangyun', name: 'Thingangyun', mm: 'သင်္ဃန်းကျွန်း', … }, …]

searchTownships('တောင်ကြီး');  // ranked; English, Burmese (Unicode or Zawgyi), slug
// [{ code: 'MMR014001', en: 'Taunggyi', mm: 'တောင်ကြီး', stateSlug: 'shan-state', … }]

getByCode('MMR013009');  // any level, by MIMU P-code`;

const TYPES = `Place          { code, slug, name, en, mm }
StatePlace     Place & { level: 'state', type, lat, lng, capital }
DistrictPlace  Place & { level: 'district', type, stateCode, stateSlug }
TownshipPlace  Place & { level: 'township', type, official,
                         stateCode, stateSlug, districtCode, districtSlug, lat?, lng? }`;

const FUNCTIONS: [string, ReactNode, string][] = [
  ['listStates(opts?)', 'All 15 states and regions, each with coordinates and capital.', "(opts?: { lang?: 'en' | 'mm' }) => StatePlace[]"],
  ['listDistricts(state, opts?)', <>Districts and self-administered zones of one state, by slug or code. Returns <code>[]</code> for an unknown state.</>, "(state: string, opts?) => DistrictPlace[]"],
  ['listTownships(state, district?, opts?)', <>Townships of one district, or of the whole state when <code>district</code> is left out. Returns <code>[]</code> for unknown refs.</>, '(state: string, district?: string, opts?) => TownshipPlace[]'],
  ['searchTownships(query, opts?)', 'Ranked search (exact, then prefix, then substring) over English and Burmese names, slugs and codes. Burmese may be Unicode or Zawgyi. Results carry state and district codes for pre-filling a form.', '(query: string, opts?: { lang?, limit?, includeSubTownships? }) => TownshipPlace[]'],
  ['findTownships(input)', 'Every township matching a name, slug or code. More than one means the name is shared (Minhla, Htantabin).', '(input: string, opts?) => TownshipPlace[]'],
  ['getByCode(code, opts?)', 'Any state, district or township by MIMU P-code.', '(code: string, opts?) => AnyPlace | undefined'],
  ['nearestTownships(lat, lng, opts?)', 'Nearest townships by distance to their seat town.', '(lat: number, lng: number, opts?: { lang?, limit? }) => (TownshipPlace & { distanceKm })[]'],
  ['isValidTownship(input)', 'Check user input against the full township list: English, Burmese (Unicode or Zawgyi), slug or P-code.', '(input: string) => boolean'],
];

const ENTRY_POINTS: [string, ReactNode][] = [
  ['@tm11/mmgeo/wards', <>3,481 urban wards: <code>listWards</code>, <code>getWard</code>, <code>searchWards</code>.</>],
  ['@tm11/mmgeo/village-tracts', <>13,771 village tracts, previous names searchable: <code>listVillageTracts</code>, <code>getVillageTract</code>, <code>searchVillageTracts</code>.</>],
  ['@tm11/mmgeo/towns', <>532 towns with coordinates: <code>listTowns</code>, <code>getTown</code>, <code>searchTowns</code>.</>],
  ['@tm11/mmgeo/react', <><code>useAddressCascade</code>, a headless hook for state, district and township dropdowns.</>],
  ['@tm11/mmgeo/zod', <><code>stateCode</code>, <code>districtCode</code>, <code>townshipCode</code>, <code>mmAddressCodes</code>, <code>mmAddress</code>: schemas that check codes exist and belong together.</>],
  ['@tm11/mmgeo/boundaries', <>Outlines as SVG paths and exact point lookup: <code>placeAt(lat, lng)</code>, <code>townshipAt</code>, <code>loadOutlines</code>, <code>getOutline</code>.</>],
];

type Sub = WardPlace | VillageTractPlace;

/** Search plus cascading dropdowns, down to wards and village tracts. */
function TryData(): ReactElement {
  const [lang, setLang] = useState<Lang>('en');
  const [q, setQ] = useState('');
  const [note, setNote] = useState('Running @tm11/mmgeo in your browser. Nothing is sent anywhere.');
  const a = useAddressCascade({ lang });
  const [subs, setSubs] = useState<{ wards: Sub[]; tracts: Sub[] }>({ wards: [], tracts: [] });
  const [subCode, setSubCode] = useState('');
  const t = a.value.townshipCode;
  // Wards and village tracts are separate imports; load them once a township is picked.
  useEffect(() => {
    setSubCode('');
    if (!t) { setSubs({ wards: [], tracts: [] }); return; }
    let live = true;
    (async (): Promise<void> => {
      try {
        const [w, v] = await Promise.all([import('@tm11/mmgeo/wards'), import('@tm11/mmgeo/village-tracts')]);
        if (live) setSubs({ wards: w.listWards(t, { lang }), tracts: v.listVillageTracts(t, { lang }) });
      } catch {
        if (live) setNote("Couldn't load wards and village tracts. Check your connection and pick the township again.");
      }
    })();
    return () => { live = false; };
  }, [t, lang]);
  const hits = q.trim() ? searchTownships(q, { lang, limit: 6 }) : [];
  const sub = [...subs.wards, ...subs.tracts].find(x => x.code === subCode);
  const deepest = sub ?? (a.value.townshipCode ?? a.value.districtCode ?? a.value.stateCode ? getByCode((a.value.townshipCode ?? a.value.districtCode ?? a.value.stateCode)!, { lang }) : undefined);
  const locate = (): void => {
    if (!navigator.geolocation) return setNote("This browser can't share its location.");
    setNote('Finding the nearest township…');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const [n] = nearestTownships(pos.coords.latitude, pos.coords.longitude, { lang });
        if (!n) return setNote('No township found near that point.');
        a.setTownship(n.code);
        setNote(`Nearest township: ${n.name} (${n.distanceKm} km from its seat town). Your position stays in your browser.`);
      },
      () => setNote('Location permission was denied. Allow it in your browser to use this.')
    );
  };
  return (
    <div className="example">
      <div className="form">
        <div className="row">
          <div className="grow">
            <label htmlFor="q">Search a township</label>
            <input id="q" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Hlaing, ရန်ကင်း, or Zawgyi" autoComplete="off" />
          </div>
          <button type="button" onClick={locate}>Use my location</button>
          <button type="button" onClick={() => setLang(l => (l === 'en' ? 'mm' : 'en'))}>{lang === 'en' ? 'မြန်မာ' : 'English'}</button>
        </div>
        {hits.length > 0 && (
          <ul className="hits">
            {hits.map(h => (
              <li key={h.code}><button type="button" onClick={() => { a.setTownship(h.code); setQ(''); }}>
                {h.name} <small>{h.code}, {getByCode(h.stateCode, { lang })?.name}</small>
              </button></li>
            ))}
          </ul>
        )}
        <div className="cols">
          <div>
            <label htmlFor="ds">State / region</label>
            <select id="ds" value={a.value.stateCode ?? ''} onChange={e => a.setState(e.target.value || null)}>
              <option value="">Choose…</option>
              {a.states.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="dd">District</label>
            <select id="dd" value={a.value.districtCode ?? ''} onChange={e => a.setDistrict(e.target.value || null)} disabled={!a.districts.length}>
              <option value="">Choose…</option>
              {a.districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="dt">Township</label>
            <select id="dt" value={a.value.townshipCode ?? ''} onChange={e => a.setTownship(e.target.value || null)} disabled={!a.townships.length}>
              <option value="">Choose…</option>
              {a.townships.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="dw">Ward / village tract</label>
            <select id="dw" value={subCode} onChange={e => setSubCode(e.target.value)} disabled={!subs.wards.length && !subs.tracts.length}>
              <option value="">Choose…</option>
              {subs.wards.length > 0 && <optgroup label={lang === 'mm' ? 'ရပ်ကွက်' : 'Wards'}>{subs.wards.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}</optgroup>}
              {subs.tracts.length > 0 && <optgroup label={lang === 'mm' ? 'ကျေးရွာအုပ်စု' : 'Village tracts'}>{subs.tracts.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}</optgroup>}
            </select>
          </div>
        </div>
        <label>What you'd store</label>
        <pre>{deepest ? JSON.stringify({ code: deepest.code, name: deepest.name, ...a.value }, null, 2) : 'Pick a place, or search for a township.'}</pre>
        <p className="status" role="status">{note}</p>
      </div>
    </div>
  );
}

const NAV: { title: string; items: [string, string][] }[] = [
  { title: 'Get started', items: [['overview', 'Overview'], ['quick-start', 'Quick start']] },
  { title: 'Address data', items: [['try', 'Try it'], ['functions', 'Functions'], ['types', 'Types'], ['entry-points', 'More imports']] },
  ...GROUPS.map(g => ({ title: g.title, items: g.examples.map(e => [e.id, e.title] as [string, string]) })),
  { title: 'Recipes', items: [['map-and-form', 'Map and dropdowns']] },
  { title: 'Reference', items: [['props', 'Map props']] },
];

/** Id of the section nearest the top of the viewport, for the sidebar highlight. */
function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const io = new IntersectionObserver(entries => {
      const top = entries.filter(e => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0];
      if (top) setActive(top.target.id);
    }, { rootMargin: '0px 0px -70% 0px' });
    for (const id of ids) { const el = document.getElementById(id); if (el) io.observe(el); }
    return () => io.disconnect();
  }, [ids]);
  return active;
}

const IDS = NAV.flatMap(g => g.items.map(([id]) => id));
const INSTALL_CORE = 'npm install @tm11/mmgeo';
const INSTALL_MAP = 'npm install @tm11/mmgeo @tm11/mmgeo-map';

function Doc({ id, title, intro, children }: { id: string; title: string; intro?: ReactNode; children: ReactNode }): ReactElement {
  return (
    <section className="doc" id={id} aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{title}</h2>
      {intro && <p>{intro}</p>}
      {children}
    </section>
  );
}

function Docs(): ReactElement {
  const active = useActiveSection(IDS);
  // Sections exist only after the first render, so the browser can't follow a #link on load by itself.
  useEffect(() => {
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }, []);
  return (
    <div className="layout">
      <nav className="side" aria-label="Sections">
        <a className="pkg" href="#overview">mmgeo</a>
        <p className="ver">Myanmar places for JavaScript</p>
        {NAV.map(g => (
          <Fragment key={g.title}>
            <h2>{g.title}</h2>
            <ul>{g.items.map(([id, label]) => <li key={id}><a href={`#${id}`} aria-current={active === id}>{label}</a></li>)}</ul>
          </Fragment>
        ))}
        <p className="ext">
          <a href="https://www.npmjs.com/package/@tm11/mmgeo">npm</a>
          <a href="https://github.com/tunmin11/mmgeo">GitHub</a>
        </p>
      </nav>
      <main className="content">
        <section className="intro" id="overview" aria-labelledby="title">
          <h1 id="title">Myanmar states, townships and wards</h1>
          <p className="mm" lang="my">ပြည်နယ်၊ ခရိုင်၊ မြို့နယ်၊ ရပ်ကွက်၊ ကျေးရွာအုပ်စု</p>
          <p>Every place in Myanmar with its MIMU P-code, English and Burmese name and a stable slug, ready for address forms, validation and maps. Search accepts Unicode or Zawgyi. Zero dependencies, ESM and CommonJS, TypeScript types included.</p>
          <dl className="packages">
            <div>
              <dt><code>@tm11/mmgeo</code></dt>
              <dd>The data: lists, search, lookups, outlines.</dd>
              <dd className="install"><pre>{INSTALL_CORE}</pre><CopyButton text={INSTALL_CORE} /></dd>
            </div>
            <div>
              <dt><code>@tm11/mmgeo-map</code></dt>
              <dd>A clickable map picker for React.</dd>
              <dd className="install"><pre>{INSTALL_MAP}</pre><CopyButton text={INSTALL_MAP} /></dd>
            </div>
          </dl>
          <table className="counts">
            <caption>What's included, from MIMU P-codes 9.7</caption>
            <tbody>
              <tr><td>15</td><td>states and regions</td></tr>
              <tr><td>84</td><td>districts and zones</td></tr>
              <tr><td>356</td><td>townships</td></tr>
              <tr><td>3,481</td><td>wards</td></tr>
              <tr><td>13,771</td><td>village tracts</td></tr>
            </tbody>
          </table>
        </section>

        <Doc id="quick-start" title="Quick start" intro={<>Every function takes slugs or codes, and <code>{'{ lang: \'mm\' }'}</code> for Burmese names.</>}>
          <div className="example"><Code src={QUICK_START} /></div>
        </Doc>

        <h2 className="group-title">Address data</h2>
        <Doc id="try" title="Try it" intro="Search a township in English, Burmese or Zawgyi, or pick it step by step down to a ward or village tract.">
          <TryData />
        </Doc>
        <Doc id="functions" title="Functions" intro={<>From <code>@tm11/mmgeo</code>. Each returns plain objects; <code>name</code> follows the requested language.</>}>
          <div className="api">
            {FUNCTIONS.map(([name, desc, sig]) => (
              <div key={name}><h3><code>{name}</code></h3><p>{desc}</p><pre>{sig}</pre></div>
            ))}
          </div>
        </Doc>
        <Doc id="types" title="Types" intro="Every place shares one shape. Store the code; it never changes between releases.">
          <div className="example"><Code src={TYPES} /></div>
        </Doc>
        <Doc id="entry-points" title="More imports" intro="Separate imports, so the core stays small. Load only what you use.">
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Import</th><th scope="col">What it gives you</th></tr></thead>
              <tbody>{ENTRY_POINTS.map(([name, desc]) => <tr key={name}><td><code>{name}</code></td><td>{desc}</td></tr>)}</tbody>
            </table>
          </div>
        </Doc>

        {GROUPS.map((g, gi) => (
          <Fragment key={g.title}>
            <h2 className="group-title">{g.title}</h2>
            {gi === 0 && <p className="group-intro"><code>&lt;MyanmarMap&gt;</code> from <code>@tm11/mmgeo-map</code>: plain SVG with no map library or API key. Outlines load only as users zoom in ({availableLevels.join(', ')}).</p>}
            {g.examples.map((ex, i) => <ExampleDoc key={ex.id} ex={ex} height={gi === 0 && i === 0 ? 560 : 420} />)}
          </Fragment>
        ))}
        <h2 className="group-title">Recipes</h2>
        <MapAndForm />
        <h2 className="group-title">Reference</h2>
        <Doc id="props" title="Map props" intro={<><code>MyanmarMapProps</code>, <code>MyanmarMapColors</code> and <code>MapPlace</code> are exported as types.</>}>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Prop</th><th scope="col">Default</th><th scope="col">What it does</th></tr></thead>
              <tbody>{PROPS.map(([name, def, desc]) => <tr key={name}><td><code>{name}</code></td><td><code>{def}</code></td><td>{desc}</td></tr>)}</tbody>
            </table>
          </div>
        </Doc>
        <footer>
          <p>Code: ISC. Data: <a href="https://themimu.info/place-codes">MIMU P-codes</a> 9.7 and MIMU boundaries, used with attribution (see DATA_LICENSE).</p>
          <p>Built by <a href="https://github.com/tunmin11">tunmin</a>. <a href="https://github.com/tunmin11/mmgeo">Source on GitHub</a>.</p>
        </footer>
      </main>
    </div>
  );
}

/** `?hero`: one large map and nothing else, for README screenshots. */
function Hero(): ReactElement {
  const [place, setPlace] = useState<MapPlace | null>(null);
  return (
    <main className="example" style={{ maxWidth: 640, margin: '24px auto' }}>
      <div className="stage"><MyanmarMap height={620} onChange={setPlace} /></div>
      <Readout place={place} />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(new URLSearchParams(location.search).has('hero') ? <Hero /> : <Docs />);
