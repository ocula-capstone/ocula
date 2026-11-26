// True when every word typed appears somewhere in the given parts (case does not matter).
export const matchesSearch = (query: string, ...parts: string[]): boolean => {
  const haystack = parts.join(' ').toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
};
