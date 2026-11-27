// Component docs: `npm run demo` → http://localhost:8000
import { Fragment, useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { MyanmarMap, type MyanmarMapProps } from '../src';
import { useAddressCascade } from '@tm11/mmgeo/react';
import { availableLevels, placeAt, type MapPlace } from '@tm11/mmgeo/boundaries';
import { getByCode, type Lang } from '@tm11/mmgeo';

// Made-up numbers for the data example: one per state code.
const USERS: Record<string, number> = { MMR013: 1240, MMR010: 860, MMR005: 610, MMR111: 420, MMR222: 380, MMR017: 300, MMR009: 150, MMR001: 90 };
const shade = (n?: number): string | undefined =>
  n === undefined ? undefined : n > 1000 ? '#1D4ED8' : n > 500 ? '#60A5FA' : '#BFDBFE';

interface Example { id: string; title: string; note: string; code: string; props: MyanmarMapProps }
interface Group { title: string; examples: Example[] }

const GROUPS: Group[] = [
  { title: 'How deep users can go', examples: [
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
  { title: 'Keeping to one area', examples: [
    { id: 'context-hidden', title: 'Hide the neighbours', note: 'After zooming in, neighbouring areas are hidden instead of greyed out.',
      code: '<MyanmarMap context="hidden" />', props: { context: 'hidden' } },
    { id: 'root-state', title: 'One state', note: 'Starts inside Shan State and can\'t zoom out of it, for an app that only serves Shan.',
      code: '<MyanmarMap root="MMR222" />', props: { root: 'MMR222' } },
    { id: 'root-district', title: 'One district', note: 'A delivery zone: only the townships of Yangon (East).',
      code: '<MyanmarMap root="MMR013D002" />', props: { root: 'MMR013D002' } },
    { id: 'root-township', title: 'One township', note: 'Starts inside Bogale. Pick a village tract or town.',
      code: '<MyanmarMap root="MMR017024" />', props: { root: 'MMR017024' } },
  ] },
  { title: 'Look and language', examples: [
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

const NAV: Group[] = [
  { title: 'Get started', examples: [{ id: 'install', title: 'Install' } as Example] },
  ...GROUPS,
  { title: 'Recipes', examples: [{ id: 'map-and-form', title: 'Map and dropdowns' } as Example] },
  { title: 'Reference', examples: [{ id: 'props', title: 'Props' } as Example] },
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

const IDS = NAV.flatMap(g => g.examples.map(e => e.id));
const INSTALL = 'npm install @tm11/mmgeo @tm11/mmgeo-map';

function Docs(): ReactElement {
  const active = useActiveSection(IDS);
  return (
    <div className="layout">
      <nav className="side" aria-label="Sections">
        <a className="pkg" href="#install">@tm11/mmgeo-map</a>
        <p className="ver">v0.1 · React</p>
        {NAV.map(g => (
          <Fragment key={g.title}>
            <h2>{g.title}</h2>
            <ul>{g.examples.map(e => <li key={e.id}><a href={`#${e.id}`} aria-current={active === e.id}>{e.title}</a></li>)}</ul>
          </Fragment>
        ))}
        <p className="ext">
          <a href="https://www.npmjs.com/package/@tm11/mmgeo-map">npm</a>
          <a href="https://github.com/tunmin11/mmgeo/tree/master/packages/mmgeo-map#readme">GitHub</a>
        </p>
      </nav>
      <main className="content">
        <section className="intro" id="install" aria-labelledby="title">
          <h1 id="title">&lt;MyanmarMap&gt;</h1>
          <p className="mm" lang="my">ပြည်နယ်မှ ရပ်ကွက်အထိ နှိပ်ရွေးနိုင်သော မြေပုံ</p>
          <p>A clickable map of Myanmar for React. Users pick a state, district, township, village tract, town or ward, and you get its MIMU P-code. Plain SVG with no map library or API key; outlines load only as users zoom in ({availableLevels.join(', ')}).</p>
          <div className="install"><pre>{INSTALL}</pre><CopyButton text={INSTALL} /></div>
        </section>
        {GROUPS.map((g, gi) => (
          <Fragment key={g.title}>
            <h2 className="group-title">{g.title}</h2>
            {g.examples.map((ex, i) => <ExampleDoc key={ex.id} ex={ex} height={gi === 0 && i === 0 ? 560 : 420} />)}
          </Fragment>
        ))}
        <h2 className="group-title">Recipes</h2>
        <MapAndForm />
        <h2 className="group-title">Reference</h2>
        <section className="doc" id="props" aria-labelledby="props-h">
          <h2 id="props-h">Props</h2>
          <p><code>MyanmarMapProps</code>, <code>MyanmarMapColors</code> and <code>MapPlace</code> are exported as types.</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th scope="col">Prop</th><th scope="col">Default</th><th scope="col">What it does</th></tr></thead>
              <tbody>{PROPS.map(([name, def, desc]) => <tr key={name}><td><code>{name}</code></td><td><code>{def}</code></td><td>{desc}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
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
