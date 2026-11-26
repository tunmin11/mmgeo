# @tm11/mmgeo-map — clickable map of Myanmar for React

Click down from the country to a state, district, township, then a village tract or town, and a town's
wards. Plain SVG: no map library, no tiles, no API key. Keyboard and screen-reader accessible, English
and Burmese.

```bash
npm install @tm11/mmgeo @tm11/mmgeo-map
```

```tsx
import { MyanmarMap } from '@tm11/mmgeo-map';

<MyanmarMap
  value={code}
  onChange={place => setCode(place.code)}
  lang="mm"
  height={480}
/>
```

A clickable SVG map of Myanmar with no map library or tiles behind it. Click down from the country to a
state, district, township, then a village tract or town, and a town's wards. Every click is already a valid
answer (`onChange` gets the place at whatever level was clicked) and a breadcrumb or Escape goes back.
Hover or focus colours the shape and shows its English and Burmese name in a popover (`showLabels` also draws
names on the map); click, Enter or Space picks. Every shape is a real button for keyboards and screen readers.

`depth` sets how far users can zoom in (`'state'`, `'district'`, `'township'`, `'village-tract'`, `'ward'`),
`skipDistrict` goes state → township, `root="MMR017024"` keeps the map inside one state, district, township or town,
and `context="hidden"` hides the neighbouring areas once zoomed in. Combine it with `useAddressCascade` or a
dropdown: a controlled `value` keeps the map in step with the rest of the form. Needs `react` 16.8+.

**Size:** states and districts load with the component (about 80 KB gzipped). Townships load per state, and
village tracts, towns and wards per township (each 5–70 KB), only when someone zooms in. Bundlers that support
dynamic `import()` (Vite, webpack, Next.js, esbuild) split them into separate chunks automatically.

## Props

| Prop | Default | |
|---|---|---|
| `value` / `defaultValue` | — | Selected code at any level. Controlled when `value` is given. |
| `onChange` | — | `(place) => void` with the place clicked: state, district, township, village tract, town or ward. |
| `depth` | finest available | Deepest level users can pick: `'state'`, `'district'`, `'township'`, `'village-tract'`, `'ward'`. |
| `skipDistrict` | `false` | Go state → township. |
| `root` | — | Keep the map inside one state, district, township or town. |
| `context` | `'faint'` (`'hidden'` with `root`) | Show neighbouring areas greyed out, or hide them. |
| `lang` | `'en'` | `'en'` or `'mm'` for labels, breadcrumb and accessible names. |
| `height` | `480` | Map height. |
| `showLabels` | `false` | Also draw names on shapes big enough to hold them. |
| `colors` | | `fill`, `hover`, `selected`, `stroke`, `context`, `text`, `selectedText`, `tooltip`, `focus`. |
| `className` / `style` / `aria-label` | | Passed to the wrapper and the map. |

The data, outlines and point lookup (`placeAt`) come from
[`@tm11/mmgeo`](https://www.npmjs.com/package/@tm11/mmgeo), a peer dependency. Boundaries: MIMU
(themimu.info), CC BY-IGO; see its `DATA_LICENSE`.

## Developing

From the repo root: `npm run demo` starts the playground at http://localhost:8000, `npm test` runs both
packages' tests, and `npm run build` builds both. Here, `@tm11/mmgeo` resolves to the source in `../../src`.

License: ISC.
