// Shapes of data/map.json.

export type MapLevel = 'state' | 'district' | 'township';

export interface MapShape {
  /** Rings, delta-encoded in projected integer units: [x0, y0, dx1, dy1, …]. Fill with even-odd. */
  r: number[][];
  /** Bounding box [x0, y0, x1, y1]. */
  b: [number, number, number, number];
  /** Label point inside the shape [x, y]. */
  c: [number, number];
}

export interface MapData {
  meta: { sources: { levels: MapLevel[]; source: string }[]; generatedAt: string };
  /** x = (lon - lon0) · k · scale, y = (lat0 - lat) · scale */
  projection: { lon0: number; lat0: number; k: number; scale: number };
  states: Record<string, MapShape>;
  districts?: Record<string, MapShape>;
  townships?: Record<string, MapShape>;
}
