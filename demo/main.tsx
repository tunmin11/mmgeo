// Playground: `npm run demo` → http://localhost:8000
import { useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MyanmarMap, type MyanmarMapProps } from '../src/map';
import { useAddressCascade } from '../src/react';
import { availableLevels, placeAt } from '../src/boundaries';
import { getByCode } from '../src/api';
import type { AnyPlace, Lang } from '../src/types';

declare const __PREVIEW__: boolean;

interface Variant { title: string; note: string; code: string; props: MyanmarMapProps }

const VARIANTS: Variant[] = [
  { title: 'Default', note: 'Click a state to zoom in and pick a district, then a township. Every click is already a valid answer; the breadcrumb or Escape goes back.',
    code: '<MyanmarMap onChange={setPlace} />', props: {} },
  { title: 'States only', note: 'No zooming in: one click picks a state.',
    code: '<MyanmarMap depth="state" />', props: { depth: 'state' } },
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
  { title: 'Burmese', note: 'Labels, the breadcrumb, hover names and screen-reader names in Burmese.',
    code: '<MyanmarMap lang="mm" />', props: { lang: 'mm' } },
  { title: 'Your colours, no labels', note: 'Theme it to your brand; hide labels for a cleaner look.',
    code: `<MyanmarMap
  showLabels={false}
  colors={{ fill: '#EFEAF2', hover: '#FFE45C', selected: '#2B1B2E',
            stroke: '#FFFFFF', context: '#F6F4F7' }} />`,
    props: { showLabels: false, colors: { fill: '#EFEAF2', hover: '#FFE45C', selected: '#2B1B2E', stroke: '#FFFFFF', context: '#F6F4F7' } } },
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
  const [picked, setPicked] = useState<AnyPlace | null>(null);
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
  const deepest = a.value.townshipCode ?? a.value.districtCode ?? a.value.stateCode;
  const fromMap = (p: AnyPlace | null) => {
    if (!p) return a.reset();
    if (p.level === 'state') a.setState(p.code);
    else if (p.level === 'district') a.setDistrict(p.code);
    else a.setTownship(p.code);
  };
  const locate = () => {
    if (!navigator.geolocation) return setLocated('Geolocation is not available in this browser.');
    setLocated('Locating…');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const p = placeAt(pos.coords.latitude, pos.coords.longitude, { lang });
        setLocated(p ? `You are in ${p.name} (${p.code}).` : 'That point is outside Myanmar.');
        if (p) fromMap(p);
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
        <pre className="out">{JSON.stringify(deepest ? { ...a.value, name: getByCode(deepest, { lang })?.name } : null, null, 2)}</pre>
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
        {__PREVIEW__
          ? <p className="notice"><strong>Preview shapes.</strong> District and township outlines here are approximate (each township is the area nearest its main town), so you can try the drill-down before the real MIMU boundaries are added. Run <code>npm run demo:real</code> to see what the package ships today ({availableLevels.join(', ')}).</p>
          : <p className="notice">Showing the outlines the package ships: {availableLevels.join(', ')}.</p>}
      </header>
      {tab === 'variants'
        ? <div className="grid">{VARIANTS.map(v => <VariantCard key={v.title} v={v} />)}</div>
        : <Playground />}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
