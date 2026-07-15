/** Converts arbitrary text into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Appends a short random suffix to keep slugs unique. */
export function uniqueSlug(input: string): string {
  const base = slugify(input) || 'item';
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}
