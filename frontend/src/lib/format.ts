// Document numbers as the schema comments show them: P-000123, OR-000123, JO-000123.
// Numbers past six digits are kept whole, never truncated.
export const formatDocNo = (prefix: 'P' | 'OR' | 'JO', n: number): string =>
  `${prefix}-${String(n).padStart(6, '0')}`;
