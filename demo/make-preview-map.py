"""
Preview outlines for the playground ONLY — not real boundaries, never shipped.

Each township gets the area closest to its seat town (a Voronoi cell), clipped to
its real state outline (Natural Earth, public domain). Districts and states are
then dissolved from those cells by scripts/build-map.ts, exactly as real MIMU
township outlines will be.

  python3 demo/make-preview-map.py <ne_10m_admin_1_states_provinces.geojson> <out.geojson>
  npm run build:map -- --townships <out.geojson> --source "Preview" --out demo/preview-map.json

Needs: pip install shapely
"""
import json, sys
from shapely.geometry import shape, mapping, MultiPoint, Point
from shapely.ops import unary_union, voronoi_diagram

ne_path, out_path = sys.argv[1], sys.argv[2]
db = json.load(open('data/db.json', encoding='utf8'))
ne = json.load(open(ne_path, encoding='utf8'))

NE_TO_CODE = {'Ayeyarwady': 'MMR017', 'Bago': 'MMR111', 'Chin': 'MMR004', 'Kachin': 'MMR001', 'Kayah': 'MMR002',
              'Kayin': 'MMR003', 'Magway': 'MMR009', 'Mandalay': 'MMR010', 'Mon': 'MMR011', 'Rakhine': 'MMR012',
              'Sagaing': 'MMR005', 'Shan': 'MMR222', 'Tanintharyi': 'MMR006', 'Yangon': 'MMR013'}
polys = {}
for f in ne['features']:
    if f['properties'].get('adm0_a3') != 'MMR': continue
    code = NE_TO_CODE[f['properties']['name']]
    polys[code] = shape(f['geometry']).buffer(0)
# Natural Earth has no Nay Pyi Taw: its townships share Mandalay's outline.
area_of = lambda state_code: 'MMR010' if state_code == 'MMR018' else state_code

points = {}
for s in db['states']:
    for d in s['districts']:
        for t in d['townships']:
            if 'lat' in t and t.get('official', True) is not False:
                points.setdefault(area_of(s['code']), []).append((t['code'], Point(t['lng'], t['lat'])))

features = []
for area, pts in points.items():
    poly = polys[area]
    pts = [(c, p) for c, p in pts if poly.buffer(0.05).contains(p)]
    cells = voronoi_diagram(MultiPoint([p for _, p in pts]), envelope=poly.envelope.buffer(1))
    for cell in cells.geoms:
        code = next((c for c, p in pts if cell.contains(p)), None)
        clip = cell.intersection(poly)
        if code and not clip.is_empty:
            features.append({'type': 'Feature', 'properties': {'TS_PCODE': code}, 'geometry': mapping(clip)})

json.dump({'type': 'FeatureCollection', 'features': features}, open(out_path, 'w'))
print(f'{len(features)} preview township cells → {out_path}')
