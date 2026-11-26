// Shapes of data/map.json.

export type MapLevel = 'state' | 'district' | 'township' | 'village-tract' | 'town' | 'ward';

export interface MapShape {
  /** Rings, delta-encoded in projected integer units: [x0, y0, dx1, dy1, …]. Fill with even-odd. */
  r: number[][];
  /** Bounding box [x0, y0, x1, y1]. */
  b: [number, number, number, number];
  /** Label point inside the shape [x, y]. */
  c: [number, number];
}

export interface MapData {
  meta: {
    sources: { levels: MapLevel[]; source: string }[];
    generatedAt: string;
    /**
     * Codes that have a file data/map/<code>.json, loaded on demand: a state's file holds its
     * townships, a township's file its village tracts, towns and wards.
     */
    files?: string[];
  };
  /** x = (lon - lon0) · k · scale, y = (lat0 - lat) · scale. The country is 100,000 units wide. */
  projection: { lon0: number; lat0: number; k: number; scale: number };
  states: Record<string, MapShape>;
  districts?: Record<string, MapShape>;
}

/**
 * data/map/<code>.json, by place code. In a township's file, `k` is the kind (village tract `v`,
 * town `t`, ward `w`) and `n` the names, since those levels aren't in the core data.
 */
export type PartFile = Record<string, MapShape & { k?: 'v' | 't' | 'w'; n?: [en: string, mm: string] }>;
