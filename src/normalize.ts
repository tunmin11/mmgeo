export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const normalize = (value: string): string =>
  value.toLowerCase().replace(/[\s\-_''()]+/g, '');
