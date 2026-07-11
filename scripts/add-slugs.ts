import * as fs from 'fs';
import * as path from 'path';
import { slugify } from '../src/normalize';

interface Node {
  eng: string;
  slug?: string;
  districts?: Node[];
  townships?: Node[];
}

const file = path.join(__dirname, '..', 'data', 'db.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8')) as { states: Node[] };

const addSlugs = (siblings: Node[]): void => {
  const seen = new Map<string, number>();
  for (const item of siblings) {
    const base = slugify(item.eng);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    item.slug = count > 1 ? `${base}-${count}` : base;
    if (item.districts) addSlugs(item.districts);
    if (item.townships) addSlugs(item.townships);
  }
};

addSlugs(data.states);
fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
console.log(`Slugged ${data.states.length} states.`);
