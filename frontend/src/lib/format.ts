// Document numbers as the schema comments show them: P-000123, OR-000123, JO-000123.
// Numbers past six digits are kept whole, never truncated.
export const formatDocNo = (prefix: 'P' | 'OR' | 'JO', n: number): string =>
  `${prefix}-${String(n).padStart(6, '0')}`;

// "1 day", "3 days", "1,248 patients": the count (with thousands commas) and the singular for one, else the plural (default: add "s").
export const plural = (n: number, one: string, many = `${one}s`): string =>
  `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
