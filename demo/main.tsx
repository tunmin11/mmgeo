// Local playground: `npm run demo`, then open http://localhost:8000
// Imports the source directly, so a page refresh picks up your edits.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MyanmarMap } from '../src/map';
import { useAddressCascade } from '../src/react';
import { availableLevels, boundariesInfo, placeAt } from '../src/boundaries';
import { getByCode } from '../src/api';
import type { AnyPlace, Lang } from '../src/types';

function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [located, setLocated] = useState<string>('');
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
    <main>
      <section className="card">
        <h1>MyanmarMap</h1>
        <p>Outlines: {availableLevels.join(', ')} · {boundariesInfo.sources.map(s => s.source).join('; ')}</p>
        <MyanmarMap value={deepest} onChange={fromMap} lang={lang} height={560} />
      </section>
      <section className="card">
        <h1>Same selection, as a form</h1>
        <p>The map and the dropdowns share one <code>useAddressCascade</code> state.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => setLang(l => (l === 'en' ? 'mm' : 'en'))}>{lang === 'en' ? 'မြန်မာ' : 'English'}</button>
          <button type="button" onClick={locate}>Use my location</button>
          <button type="button" onClick={a.reset}>Clear</button>
        </div>
        {located && <p style={{ marginTop: 8 }}>{located}</p>}
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
        <pre>{JSON.stringify(deepest ? { ...a.value, name: getByCode(deepest, { lang })?.name } : null, null, 2)}</pre>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
