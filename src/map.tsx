/**
 * Clickable, drill-down map of Myanmar — `import { MyanmarMap } from '@tm11/mmgeo/map'`.
 * Requires `react` >= 16.8 (optional peer dependency). Plain SVG, no map library.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { getByCode } from './api';
import { availableLevels, getOutline, listOutlines, type Outline } from './boundaries';
import type { AnyPlace, Lang } from './types';
import type { MapLevel } from './map-types';

export interface MyanmarMapColors {
  /** Fill of selectable shapes. */ fill: string;
  /** Fill on hover and keyboard focus. */ hover: string;
  /** Fill of the selected shape. */ selected: string;
  /** Borders between shapes. */ stroke: string;
  /** Shapes outside the current view (neighbouring states etc.). */ context: string;
  /** Label and breadcrumb text. */ text: string;
  /** Focus ring. */ focus: string;
}

export interface MyanmarMapProps {
  /** Selected code (state, district or township). Controlled when given. */
  value?: string | null;
  defaultValue?: string | null;
  /** Called with the picked place (or `null` when cleared via the breadcrumb). */
  onChange?: (place: AnyPlace | null) => void;
  /** Deepest level the user can pick. Default: the finest level with outlines. */
  depth?: MapLevel;
  /** Skip the district level and go state → township. Default `false`. */
  skipDistrict?: boolean;
  lang?: Lang;
  /** Map height. Default 480. */
  height?: number | string;
  /** Draw names on shapes big enough to hold them. Default `true`. */
  showLabels?: boolean;
  colors?: Partial<MyanmarMapColors>;
  className?: string;
  style?: CSSProperties;
  /** Accessible name for the map. */
  'aria-label'?: string;
}

const DEFAULT_COLORS: MyanmarMapColors = {
  fill: '#E6E8EC', hover: '#FFD666', selected: '#1F2937', stroke: '#FFFFFF',
  context: '#F3F4F6', text: '#1F2937', focus: '#1F2937',
};

let nextId = 0;

const ORDER: MapLevel[] = ['state', 'district', 'township'];
type Box = [number, number, number, number];

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Parent code to focus on so that `code` is visible as a selectable shape. */
const focusFor = (code: string | null | undefined): string | null => {
  const p = code ? getByCode(code) : undefined;
  if (!p || p.level === 'state') return null;
  if (p.level === 'district') return p.stateCode;
  return availableLevels.includes('district') ? p.districtCode : p.stateCode;
};

export function MyanmarMap(props: MyanmarMapProps) {
  const {
    lang = 'en', height = 480, showLabels = true, skipDistrict = false, onChange,
    className, style, 'aria-label': ariaLabel,
  } = props;
  const colors = { ...DEFAULT_COLORS, ...props.colors };
  const deepest = availableLevels[availableLevels.length - 1] ?? 'state';
  const depth = props.depth && availableLevels.includes(props.depth) ? props.depth : deepest;
  const levels = availableLevels.filter(l => ORDER.indexOf(l) <= ORDER.indexOf(depth) && !(skipDistrict && l === 'district'));

  const controlled = props.value !== undefined;
  const [inner, setInner] = useState<string | null>(props.defaultValue ?? null);
  const value = controlled ? props.value ?? null : inner;
  const [focus, setFocus] = useState<string | null>(() => focusFor(value));
  const [hover, setHover] = useState<string | null>(null);
  const [uid] = useState(() => String(++nextId));

  // Keep the view on the selection when it changes from outside (e.g. a dropdown).
  const lastValue = useRef(value);
  useEffect(() => {
    if (value !== lastValue.current) { lastValue.current = value; setFocus(focusFor(value)); }
  }, [value]);

  const focusPlace = focus ? getByCode(focus, { lang }) : undefined;
  const childLevel: MapLevel | undefined = focusPlace
    ? levels.find(l => ORDER.indexOf(l) > ORDER.indexOf(focusPlace.level as MapLevel))
    : levels[0];

  const children = useMemo<Outline[]>(
    () => (childLevel ? listOutlines(childLevel, focus ?? undefined) : []),
    [childLevel, focus]
  );
  // Neighbours drawn faintly for orientation.
  const context = useMemo<Outline[]>(() => {
    if (!focusPlace) return [];
    if (focusPlace.level === 'state') return listOutlines('state').filter(o => o.code !== focusPlace.code);
    return listOutlines('district', focusPlace.stateCode).filter(o => o.code !== focusPlace.code);
  }, [focusPlace?.code]);

  // ---- Animated viewBox ----
  const target = useMemo<Box>(() => {
    const boxes = focus ? [getOutline(focus)?.bbox] : listOutlines('state').map(o => o.bbox);
    const valid = boxes.filter(Boolean) as Box[];
    if (!valid.length) return [0, 0, 10000, 20000];
    const x0 = Math.min(...valid.map(b => b[0])), y0 = Math.min(...valid.map(b => b[1]));
    const x1 = Math.max(...valid.map(b => b[2])), y1 = Math.max(...valid.map(b => b[3]));
    const pad = Math.max(x1 - x0, y1 - y0) * 0.06;
    return [x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad];
  }, [focus]);
  const [box, setBox] = useState<Box>(target);
  const boxRef = useRef(box);
  boxRef.current = box;

  // Rendered size, so labels and strokes can be sized in screen pixels.
  const svgRef = useRef<SVGSVGElement>(null);
  const [px, setPx] = useState<[number, number]>([0, 0]);
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const measure = () => setPx([el.clientWidth, el.clientHeight]);
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
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms), e = 1 - Math.pow(1 - t, 3);
      setBox(from.map((v, i) => v + (target[i] - v) * e) as Box);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  // ---- Interaction ----
  const select = useCallback(
    (code: string | null) => {
      const place = code ? getByCode(code, { lang }) ?? null : null;
      if (!controlled) setInner(place?.code ?? null);
      lastValue.current = place?.code ?? null;
      onChange?.(place);
    },
    [controlled, lang, onChange]
  );

  const pick = (o: Outline) => {
    select(o.code);
    const deeper = levels.some(l => ORDER.indexOf(l) > ORDER.indexOf(o.level));
    if (deeper) setFocus(o.code);
    setHover(null);
  };

  const zoomOut = () => {
    if (!focusPlace) return;
    const up = focusPlace.level === 'district' ? focusPlace.stateCode : null;
    setFocus(up && levels.includes('district') ? up : null);
  };

  const onKey = (e: KeyboardEvent, o: Outline) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(o); }
    else if (e.key === 'Escape') { e.preventDefault(); zoomOut(); }
  };

  const name = (code: string) => getByCode(code, { lang })?.name ?? code;
  const crumbs: { code: string | null; label: string }[] = [{ code: null, label: lang === 'mm' ? 'မြန်မာ' : 'Myanmar' }];
  if (focusPlace) {
    if (focusPlace.level === 'district') crumbs.push({ code: focusPlace.stateCode, label: name(focusPlace.stateCode) });
    crumbs.push({ code: focusPlace.code, label: focusPlace.name });
  }
  const hovered = hover ? getByCode(hover) : undefined;
  // Map units per screen pixel (viewBox is fitted with "meet").
  const upp = px[0] && px[1] ? Math.max(box[2] / px[0], box[3] / px[1]) : box[2] / 400;
  const fontSize = 12 * upp;
  const strokeW = 1 * upp;
  const fits = (o: Outline) => (o.bbox[2] - o.bbox[0]) / upp > name(o.code).length * 6.6 + 10 && (o.bbox[3] - o.bbox[1]) / upp > 18;
  const valuePlace = value ? getByCode(value) : undefined;
  const isSelected = (code: string) =>
    value === code || (valuePlace?.level === 'township' && (valuePlace.districtCode === code || valuePlace.stateCode === code))
      || (valuePlace?.level === 'district' && valuePlace.stateCode === code);
  const css = `.mmgeo-map-${uid} path[role=button]{cursor:pointer;outline:none;transition:fill .15s ease-out}
.mmgeo-map-${uid} path[role=button]:focus-visible{stroke:${colors.focus};stroke-width:${strokeW * 3}px}
.mmgeo-map-${uid} button{font:inherit;background:none;border:0;padding:2px 0;color:${colors.text};cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.mmgeo-map-${uid} button:focus-visible{outline:2px solid ${colors.focus};outline-offset:2px}
@media (prefers-reduced-motion:reduce){.mmgeo-map-${uid} path{transition:none}}`;

  return (
    <div className={[`mmgeo-map-${uid}`, className].filter(Boolean).join(' ')} style={{ position: 'relative', color: colors.text, ...style }}>
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
      </nav>
      <svg
        ref={svgRef}
        viewBox={box.join(' ')}
        role="group"
        aria-label={ariaLabel ?? (lang === 'mm' ? 'မြန်မာနိုင်ငံ မြေပုံ' : 'Map of Myanmar')}
        style={{ display: 'block', width: '100%', height, touchAction: 'manipulation' }}
        onKeyDown={e => { if (e.key === 'Escape') zoomOut(); }}
      >
        <g aria-hidden="true" fill={colors.context} stroke={colors.stroke} strokeWidth={strokeW} strokeLinejoin="round">
          {context.map(o => <path key={o.code} d={o.d} fillRule="evenodd" />)}
        </g>
        <g stroke={colors.stroke} strokeWidth={strokeW} strokeLinejoin="round">
          {children.map(o => {
            const sel = isSelected(o.code);
            const hot = hover === o.code;
            return (
              <path
                key={o.code}
                d={o.d}
                fillRule="evenodd"
                role="button"
                tabIndex={0}
                aria-label={name(o.code)}
                aria-pressed={sel}
                fill={sel ? colors.selected : hot ? colors.hover : colors.fill}
                onClick={() => pick(o)}
                onKeyDown={e => onKey(e, o)}
                onMouseEnter={() => setHover(o.code)}
                onMouseLeave={() => setHover(h => (h === o.code ? null : h))}
                onFocus={() => setHover(o.code)}
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
                  fill={isSelected(o.code) ? '#FFFFFF' : colors.text}
                  style={{ paintOrder: 'stroke' }}
                  stroke={isSelected(o.code) ? colors.selected : colors.fill} strokeWidth={fontSize / 4}>
                  {name(o.code)}
                </text>
              ))}
          </g>
        )}
      </svg>
      <div aria-live="polite" style={{ minHeight: 24, fontSize: 14 }}>
        {hovered ? <><strong style={{ fontWeight: 600 }}>{hovered.en}</strong> · <span lang="my">{hovered.mm}</span></> : null}
      </div>
    </div>
  );
}

export default MyanmarMap;
