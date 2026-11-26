// Playground: `npm run demo` → http://localhost:8000
import { useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MyanmarMap, type MyanmarMapProps } from '../src';
import { useAddressCascade } from '@tm11/mmgeo/react';
import { availableLevels, placeAt, type MapPlace } from '@tm11/mmgeo/boundaries';
import { getByCode, type Lang } from '@tm11/mmgeo';

interface Variant { title: string; note: string; code: string; props: MyanmarMapProps }

const VARIANTS: Variant[] = [
  { title: 'Default', note: 'Click down from the country to a state, district, township, then a village tract or town, and a town\'s wards. Every click is already a valid answer; the breadcrumb or Escape goes back.',
    code: '<MyanmarMap onChange={setPlace} />', props: {} },
  { title: 'States only', note: 'No zooming in: one click picks a state.',
    code: '<MyanmarMap depth="state" />', props: { depth: 'state' } },
  { title: 'Down to townships', note: 'Stops at townships: the usual address form.',
    code: '<MyanmarMap depth="township" />', props: { depth: 'township' } },
  { title: 'Down to districts', note: 'Zooms into a state, stops at districts.',
    code: '<MyanmarMap depth="district" />', props: { depth: 'district' } },
  { title: 'Skip districts', note: 'State → township. Most address forms in Myanmar don\'t ask for the district.',
    code: '<MyanmarMap skipDistrict />', props: { skipDistrict: true } },
  { title: 'Only the area you picked', note: 'After zooming in, neighbouring areas are hidden instead of greyed out.',
    code: '<MyanmarMap context="hidden" />', props: { context: 'hidden' } },
  { title: 'One state only', note: 'Starts inside Shan State and can\'t zoom out of it — for an app that only serves Shan.',
    code: '<MyanmarMap root="MMR222" />', props: { root: 'MMR222' } },
  { title: 'One district only', note: 'A delivery zone: only the townships of Yangon (East).',
    code: '<MyanmarMap root="MMR013D002" />', props: { root: 'MMR013D002' } },
  { title: 'Names on the map', note: 'Hover popovers plus names drawn on shapes big enough to hold them.',
    code: '<MyanmarMap showLabels />', props: { showLabels: true } },
  { title: 'One township only', note: 'Starts inside Bogale: pick a village tract or town.',
    code: '<MyanmarMap root="MMR017024" />', props: { root: 'MMR017024' } },
  { title: 'Burmese', note: 'Labels, the breadcrumb, hover names and screen-reader names in Burmese.',
    code: '<MyanmarMap lang="mm" />', props: { lang: 'mm' } },
  { title: 'Your colours', note: 'Theme it to your brand, popover included.',
    code: `<MyanmarMap
  colors={{ fill: '#EFEAF2', hover: '#FFE45C', selected: '#2B1B2E',
            stroke: '#FFFFFF', context: '#F6F4F7', tooltip: '#2B1B2E' }} />`,
    props: { colors: { fill: '#EFEAF2', hover: '#FFE45C', selected: '#2B1B2E', stroke: '#FFFFFF', context: '#F6F4F7', tooltip: '#2B1B2E' } } },
];

function Card({ title, note, code, children }: { title: string; note: string; code: string; children: ReactNode }) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <p>{note}</p>
      <pre className="code">{code}</pre>
      {children}
    </section>
  );
}

function VariantCard({ v }: { v: Variant }) {
  const [picked, setPicked] = useState<MapPlace | null>(null);
  return (
    <Card title={v.title} note={v.note} code={v.code}>
      <MyanmarMap height={380} {...v.props} onChange={setPicked} />
      <pre className="out">onChange → {picked ? JSON.stringify({ level: picked.level, code: picked.code, name: picked.name }) : 'null'}</pre>
    </Card>
  );
}

function Playground() {
  const [lang, setLang] = useState<Lang>('en');
  const [located, setLocated] = useState('');
  const a = useAddressCascade({ lang });
  // The form stops at townships; a village tract, town or ward picked on the map sits below it,
  // and drops away as soon as the township changes.
  const [sub, setSub] = useState<MapPlace | null>(null);
  const below = sub && 'townshipCode' in sub && sub.townshipCode === a.value.townshipCode ? sub : null;
  const deepest = below?.code ?? a.value.townshipCode ?? a.value.districtCode ?? a.value.stateCode;
  const fromMap = (p: MapPlace) => {
    if (p.level === 'state') a.setState(p.code);
    else if (p.level === 'district') a.setDistrict(p.code);
    else if (p.level === 'township') a.setTownship(p.code);
    else { a.setTownship(p.townshipCode); setSub(p); }
  };
  const locate = () => {
    if (!navigator.geolocation) return setLocated('Geolocation is not available in this browser.');
    setLocated('Locating…');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const p = await placeAt(pos.coords.latitude, pos.coords.longitude, { lang });
          setLocated(p ? `You are in ${p.name} (${p.code}).` : 'That point is outside Myanmar.');
          if (p) fromMap(p);
        } catch {
          setLocated("Couldn't load the map outlines for your location.");
        }
      },
      () => setLocated('Location permission was denied.')
    );
  };
  return (
    <div className="grid">
      <section className="card">
        <h2>Map</h2>
        <MyanmarMap value={deepest} onChange={fromMap} lang={lang} height={560} />
      </section>
      <section className="card">
        <h2>Same selection, as a form</h2>
        <p>The map and the dropdowns share one <code>useAddressCascade</code> state.</p>
        <div className="row">
          <button type="button" onClick={() => setLang(l => (l === 'en' ? 'mm' : 'en'))}>{lang === 'en' ? 'မြန်မာ' : 'English'}</button>
          <button type="button" onClick={locate}>Use my location</button>
          <button type="button" onClick={a.reset}>Clear</button>
        </div>
        {located && <p>{located}</p>}
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
        <pre className="out">{JSON.stringify(deepest ? { ...a.value, name: below?.name ?? getByCode(deepest, { lang })?.name, ...(below ? { [below.level]: below.code } : {}) } : null, null, 2)}</pre>
      </section>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState<'variants' | 'playground'>('variants');
  return (
    <main>
      <header>
        <h1>@tm11/mmgeo — map picker</h1>
        <nav className="row" aria-label="Sections">
          <button type="button" aria-pressed={tab === 'variants'} onClick={() => setTab('variants')}>Variants</button>
          <button type="button" aria-pressed={tab === 'playground'} onClick={() => setTab('playground')}>Map + form</button>
        </nav>
        <p className="notice">Outlines: {availableLevels.join(' → ')}. Townships and finer load as you zoom in.</p>
      </header>
      {tab === 'variants'
        ? <div className="grid">{VARIANTS.map(v => <VariantCard key={v.title} v={v} />)}</div>
        : <Playground />}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
