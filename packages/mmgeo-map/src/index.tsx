/**
 * Clickable, drill-down map of Myanmar — `import { MyanmarMap } from '@tm11/mmgeo-map'`.
 * Peer dependencies: `react` >= 16.8 and `@tm11/mmgeo` (data and outlines). Plain SVG, no map library.
 *
 * Country → state → district → township → village tract / town → ward. Townships and finer
 * outlines load on demand (one small file per state or township) as the user zooms in.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactElement } from 'react';
import {
  availableLevels, getOutline, getPlace, hasFile, isLoaded, listOutlines, loadOutlines, parentOf,
  type MapPlace, type Outline,
} from '@tm11/mmgeo/boundaries';
import type { Lang } from '@tm11/mmgeo';
import type { MapLevel } from '@tm11/mmgeo/boundaries';

export type { MapPlace };

export interface MyanmarMapColors {
  /** Fill of selectable shapes. */ fill: string;
  /** Fill on hover and keyboard focus. */ hover: string;
  /** Fill of the selected shape. */ selected: string;
  /** Borders between shapes. */ stroke: string;
  /** Shapes outside the current view (neighbouring states etc.). */ context: string;
  /** Label and breadcrumb text. */ text: string;
  /** Label text on the selected shape, and the hover popover's text. */ selectedText: string;
  /** Hover popover background. */ tooltip: string;
  /** Focus ring. */ focus: string;
}

export interface MyanmarMapProps {
  /** Selected code (state, district, township, village tract, town or ward). Controlled when given. */
  value?: string | null;
  defaultValue?: string | null;
  /** Called with the picked place. */
  onChange?: (place: MapPlace) => void;
  /**
   * Deepest level the user can pick: `'state'`, `'district'`, `'township'`, `'village-tract'`
   * (village tracts and towns) or `'ward'`. Default: the finest level with outlines.
   */
  depth?: MapLevel;
  /** Skip the district level and go state → township. Default `false`. */
  skipDistrict?: boolean;
  /**
   * Start inside one area (state, district, township or town code) and never zoom out past
   * it — for an app that only serves that area. The breadcrumb starts there too.
   */
  root?: string;
  /**
   * What to draw around the area you've zoomed into: `'faint'` shows the neighbours
   * greyed out for orientation, `'hidden'` shows only the area itself.
   * Default `'faint'`, or `'hidden'` when `root` is set.
   */
  context?: 'faint' | 'hidden';
  lang?: Lang;
  /** Map height. Default 480. */
  height?: number | string;
  /** Also draw names on shapes big enough to hold them. Names always show in a popover on hover and focus. Default `false`. */
  showLabels?: boolean;
  colors?: Partial<MyanmarMapColors>;
  className?: string;
  style?: CSSProperties;
  /** Accessible name for the map. */
  'aria-label'?: string;
}

const DEFAULT_COLORS: MyanmarMapColors = {
  fill: '#E6E8EC', hover: '#FFD666', selected: '#1F2937', stroke: '#FFFFFF',
  context: '#F3F4F6', text: '#1F2937', selectedText: '#FFFFFF', tooltip: '#1F2937', focus: '#1F2937',
};

let nextId = 0;

/** Rank of each level; towns sit beside village tracts. */
const RANK: Record<MapLevel, number> = { state: 0, district: 1, township: 2, 'village-tract': 3, town: 3, ward: 4 };
type Box = [number, number, number, number];

/** A village tract, town or ward code not loaded yet: fall back to its township. */
const known = (code: string): string | null =>
  getPlace(code) ? code : /^MMR\d{9}(\d{3})?$/.test(code) && getPlace(code.slice(0, 9)) ? code.slice(0, 9) : null;

/** `code` and everything above it, nearest first. */
const chain = (code: string | null): string[] => {
  const out: string[] = [];
  for (let c = code ? known(code) : null; c; c = parentOf(c)) out.push(c);
  return out;
};

/** Name drawn on the map: without "State"/"Region"/"Township"… so labels fit. Full name stays in aria-label and hover. */
const shortName = (name: string): string =>
  name.replace(/\s+(State|Region|District|Township|Ward)$/, '').replace(/(ပြည်နယ်|တိုင်းဒေသကြီး|ခရိုင်|မြို့နယ်|ရပ်ကွက်)$/, '') || name;

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function MyanmarMap(props: MyanmarMapProps): ReactElement {
  const {
    lang = 'en', height = 480, showLabels = false, skipDistrict = false, onChange,
    className, style, 'aria-label': ariaLabel,
  } = props;
  const root = props.root ? known(props.root) : null;
  const contextMode = props.context ?? (root ? 'hidden' : 'faint');
  const colors = { ...DEFAULT_COLORS, ...props.colors };
  const deepest = availableLevels[availableLevels.length - 1] ?? 'state';
  const maxRank = RANK[props.depth && availableLevels.includes(props.depth) ? props.depth : deepest];
  /** Whether places at `level` are drawn as pickable shapes. */
  const shown = (level: MapLevel): boolean =>
    RANK[level] <= maxRank && availableLevels.includes(level) && !(skipDistrict && level === 'district');

  // Bumped when outlines finish loading, so views that depend on them recompute.
  const [version, setVersion] = useState(0);
  const [failed, setFailed] = useState(false);

  /** The area to zoom into so that `code` is one of the shapes on screen (null = the country). */
  const viewParent = (code: string): string | null => chain(parentOf(code)).find(c => shown(getPlace(c)!.level)) ?? null;
  /** Pickable shapes inside `f` (the country when null), as far as they are loaded. */
  const childrenOf = (f: string | null): Outline[] => {
    if (!f) return listOutlines('state');
    const level = getPlace(f)?.level;
    if (level === 'state') return shown('district') ? listOutlines('district', f) : shown('township') ? listOutlines('township', f) : [];
    if (level === 'district') return shown('township') ? listOutlines('township', f) : [];
    if (level === 'township') return shown('village-tract') ? [...listOutlines('village-tract', f), ...listOutlines('town', f)] : [];
    if (level === 'town') return shown('ward') ? listOutlines('ward', f) : [];
    return [];
  };
  /** Whether picking `code` should zoom into it: it has shapes inside, or a file of them to load. */
  const canZoom = (code: string): boolean => {
    const p = getPlace(code);
    if (p?.level === 'state') return (shown('district') && listOutlines('district', code).length > 0) || (shown('township') && hasFile(code));
    if (p?.level === 'district') return shown('township') && hasFile(p.stateCode);
    if (p?.level === 'township') return shown('village-tract') && hasFile(code);
    if (p?.level === 'town') return shown('ward') && listOutlines('ward', code).length > 0;
    return false;
  };
  /** The view that shows `code` (or its deepest shown ancestor) as a pickable shape. */
  const focusFor = (code: string | null): string | null => {
    const shownSelf = chain(code).find(c => shown(getPlace(c)!.level));
    return shownSelf ? viewParent(shownSelf) : null;
  };
  /** Never focus above or outside `root`. */
  const clamp = (f: string | null): string | null => (!root || chain(f).includes(root) ? f : root);

  const controlled = props.value !== undefined;
  const [inner, setInner] = useState<string | null>(props.defaultValue ?? null);
  const value = controlled ? props.value ?? null : inner;
  const [focus, setFocus] = useState<string | null>(() => clamp(focusFor(value)));
  const [hover, setHover] = useState<string | null>(null);
  const [uid] = useState(() => String(++nextId));

  // Keep the view on the selection when it, `root` or the levels change from outside (e.g. a
  // dropdown), loading the outlines a deep selection needs first. Runs on mount too.
  const lastValue = useRef<string | null | undefined>(undefined);
  const config = `${root}|${maxRank}|${skipDistrict}`;
  const lastConfig = useRef(config);
  useEffect(() => {
    if (value === lastValue.current && config === lastConfig.current) return;
    lastValue.current = value;
    lastConfig.current = config;
    setFocus(clamp(focusFor(value)));
    if (!value || maxRank < RANK.township || isLoaded(value)) return;
    let live = true;
    loadOutlines(value).then(
      () => { if (live) { setVersion(n => n + 1); setFocus(clamp(focusFor(value))); } },
      () => { if (live) setFailed(true); }
    );
    return () => { live = false; };
  }, [value, config]);

  // Load the outlines inside the area in view.
  const loading = !!focus && maxRank >= RANK.township && !isLoaded(focus);
  useEffect(() => {
    if (!focus || maxRank < RANK.township || isLoaded(focus)) return;
    let live = true;
    setFailed(false);
    loadOutlines(focus).then(
      () => { if (live) setVersion(n => n + 1); },
      () => { if (live) setFailed(true); }
    );
    return () => { live = false; };
  }, [focus]);

  // With nothing finer to show (or still loading), the focused area itself is the one shape to pick.
  const children = useMemo<Outline[]>(() => {
    const list = childrenOf(focus);
    if (list.length || !focus) return list;
    const own = getOutline(focus);
    return own ? [own] : [];
  }, [focus, version, config]);
  // Neighbours drawn faintly for orientation.
  const context = useMemo<Outline[]>(() => {
    if (!focus || contextMode === 'hidden') return [];
    return childrenOf(viewParent(focus)).filter(o => o.code !== focus);
  }, [focus, version, config, contextMode]);

  // ---- Animated viewBox ----
  const target = useMemo<Box>(() => {
    const boxes = focus ? [getOutline(focus)?.bbox] : listOutlines('state').map(o => o.bbox);
    const valid = boxes.filter(Boolean) as Box[];
    if (!valid.length) return [0, 0, 100000, 200000];
    const x0 = Math.min(...valid.map(b => b[0])), y0 = Math.min(...valid.map(b => b[1]));
    const x1 = Math.max(...valid.map(b => b[2])), y1 = Math.max(...valid.map(b => b[3]));
    const pad = Math.max(x1 - x0, y1 - y0) * 0.06;
    return [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad];
  }, [focus, version]);
  const [box, setBox] = useState<Box>(target);
  const boxRef = useRef(box);
  boxRef.current = box;

  // Rendered size, so labels and strokes can be sized in screen pixels.
  const svgRef = useRef<SVGSVGElement>(null);
  const [px, setPx] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const measure = (): void => setPx([el.clientWidth, el.clientHeight]);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const from = boxRef.current;
    if (prefersReducedMotion() || typeof requestAnimationFrame === 'undefined') { setBox(target); return; }
    let raf = 0;
    const start = performance.now(), ms = 320;
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - t, 3);
      setBox(from.map((v, i) => v + (target[i] - v) * e) as Box);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  // ---- Interaction ----
  const select = useCallback(
    (code: string): void => {
      const place = getPlace(code, { lang });
      if (!place) return;
      if (!controlled) setInner(place.code);
      lastValue.current = place.code;
      onChange?.(place);
    },
    [controlled, lang, onChange]
  );

  // Keyboard focus survives zooming: the clicked shape unmounts when we zoom in,
  // so focus moves to the first new shape, and back to where we were on the way out.
  const shapesRef = useRef<SVGGElement>(null);
  const [focusTarget, setFocusTarget] = useState<string | null>(null);
  useEffect(() => {
    if (!focusTarget || loading) return;
    const g = shapesRef.current;
    const el = (focusTarget === '*' ? g?.querySelector('path') : g?.querySelector(`path[data-code="${focusTarget}"]`)) as SVGPathElement | null;
    el?.focus();
    setFocusTarget(null);
  }, [children, focusTarget, loading]);

  const hasFocusInside = (): boolean =>
    typeof document !== 'undefined' && !!shapesRef.current?.contains(document.activeElement);

  const pick = (o: Outline): void => {
    select(o.code);
    if (o.code !== focus && canZoom(o.code)) {
      if (hasFocusInside()) setFocusTarget('*');
      setFocus(o.code);
    }
    setHover(null);
  };

  const zoomOut = (): void => {
    if (!focus || focus === root) return;
    if (hasFocusInside()) setFocusTarget(focus);
    setFocus(clamp(viewParent(focus)));
  };

  const onKey = (e: KeyboardEvent, o: Outline): void => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(o); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); zoomOut(); }
  };

  const name = (code: string): string => getPlace(code, { lang })?.name ?? code;
  // Breadcrumb: the country, then each shown area down to the one in view.
  const trail: (string | null)[] = [null];
  for (let c = focus; c; c = viewParent(c)) trail.splice(1, 0, c);
  if (root) trail.splice(0, trail.indexOf(root));
  const crumbs = trail.map(code => ({ code, label: code ? name(code) : lang === 'mm' ? 'မြန်မာ' : 'Myanmar' }));
  const hovered = hover ? getPlace(hover) : undefined;
  // Popover position in px, relative to the wrapper: the pointer, or the centre of a keyboard-focused shape.
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<[number, number] | null>(null);
  const tipAt = (x: number, y: number): void => {
    const r = wrapRef.current?.getBoundingClientRect();
    if (r) setTip([x - r.left, y - r.top]);
  };
  // Map units per screen pixel (viewBox is fitted with "meet").
  const upp = px[0] && px[1] ? Math.max(box[2] / px[0], box[3] / px[1]) : box[2] / 400;
  const fontSize = 12 * upp;
  const strokeW = 1 * upp;
  const fits = (o: Outline): boolean => (o.bbox[2] - o.bbox[0]) / upp > shortName(name(o.code)).length * 6.6 + 10 && (o.bbox[3] - o.bbox[1]) / upp > 18;
  // The selected place and everything above it are highlighted.
  const selectedChain = new Set([...(value ? [value] : []), ...chain(value)]);
  const isSelected = (code: string): boolean => selectedChain.has(code);
  const css = `.mmgeo-map-${uid} path[role=button]{cursor:pointer;outline:none;transition:fill .15s ease-out}
.mmgeo-map-${uid} path[role=button]:focus-visible{stroke:${colors.focus};stroke-width:${strokeW * 3}px}
.mmgeo-map-${uid} button{font:inherit;background:none;border:0;padding:2px 0;color:${colors.text};cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.mmgeo-map-${uid} button:focus-visible{outline:2px solid ${colors.focus};outline-offset:2px}
@media (prefers-reduced-motion:reduce){.mmgeo-map-${uid} path{transition:none}}`;

  return (
    <div ref={wrapRef} className={[`mmgeo-map-${uid}`, className].filter(Boolean).join(' ')} style={{ position: 'relative', color: colors.text, ...style }}>
      <style>{css}</style>
      <nav aria-label={lang === 'mm' ? 'မြေပုံအဆင့်' : 'Map level'} style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', fontSize: 14, minHeight: 24 }}>
        {crumbs.map((c, i) => (
          <span key={c.code ?? 'root'} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            {i > 0 && <span aria-hidden="true">›</span>}
            {i < crumbs.length - 1
              ? <button type="button" onClick={() => setFocus(c.code)}>{c.label}</button>
              : <span aria-current="location" style={{ fontWeight: 600 }}>{c.label}</span>}
          </span>
        ))}
        {loading && !failed && <span role="status" style={{ marginLeft: 'auto', opacity: 0.7 }}>{lang === 'mm' ? 'ဖွင့်နေသည်…' : 'Loading…'}</span>}
        {failed && <span role="alert" style={{ marginLeft: 'auto' }}>{lang === 'mm' ? 'မြေပုံ မဖွင့်နိုင်ပါ' : "Couldn't load this part of the map."}</span>}
      </nav>
      <svg
        ref={svgRef}
        viewBox={box.join(' ')}
        role="group"
        aria-label={ariaLabel ?? (lang === 'mm' ? 'မြန်မာနိုင်ငံ မြေပုံ' : 'Map of Myanmar')}
        style={{ display: 'block', width: '100%', height, touchAction: 'manipulation' }}
        onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); zoomOut(); } }}
      >
        <g aria-hidden="true" fill={colors.context} stroke={colors.stroke} strokeWidth={strokeW} strokeLinejoin="round">
          {context.map(o => <path key={o.code} d={o.d} fillRule="evenodd" />)}
        </g>
        <g ref={shapesRef} stroke={colors.stroke} strokeWidth={strokeW} strokeLinejoin="round">
          {children.map(o => {
            const sel = isSelected(o.code);
            const hot = hover === o.code;
            return (
              <path
                key={o.code}
                data-code={o.code}
                d={o.d}
                fillRule="evenodd"
                role="button"
                tabIndex={0}
                aria-label={name(o.code)}
                aria-pressed={sel}
                fill={sel ? colors.selected : hot ? colors.hover : colors.fill}
                onClick={() => pick(o)}
                onKeyDown={e => onKey(e, o)}
                onMouseEnter={e => { setHover(o.code); tipAt(e.clientX, e.clientY); }}
                onMouseMove={e => tipAt(e.clientX, e.clientY)}
                onMouseLeave={() => setHover(h => (h === o.code ? null : h))}
                onFocus={e => {
                  setHover(o.code);
                  const b = e.currentTarget.getBoundingClientRect();
                  tipAt(b.left + b.width / 2, b.top + b.height / 2);
                }}
                onBlur={() => setHover(h => (h === o.code ? null : h))}
              />
            );
          })}
        </g>
        {showLabels && (
          <g aria-hidden="true" style={{ pointerEvents: 'none' }} textAnchor="middle" fontSize={fontSize}>
            {children
              .filter(fits)
              .map(o => (
                <text key={o.code} x={o.label[0]} y={o.label[1]} dy="0.35em"
                  fill={isSelected(o.code) ? colors.selectedText : colors.text}
                  style={{ paintOrder: 'stroke' }}
                  stroke={isSelected(o.code) ? colors.selected : colors.fill} strokeWidth={fontSize / 4}>
                  {shortName(name(o.code))}
                </text>
              ))}
          </g>
        )}
      </svg>
      {/* Visual only: each shape's aria-label already gives screen readers its name. */}
      {hovered && tip && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', left: tip[0], top: tip[1], transform: 'translate(-50%, calc(-100% - 12px))',
            pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 1, padding: '4px 10px', borderRadius: 6,
            fontSize: 13, lineHeight: 1.4, background: colors.tooltip, color: colors.selectedText,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
          }}
        >
          <strong style={{ fontWeight: 600 }}>{hovered.en}</strong> · <span lang="my">{hovered.mm}</span>
        </div>
      )}
    </div>
  );
}

