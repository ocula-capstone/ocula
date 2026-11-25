/** A Prisma Decimal (or number) as a plain JSON number, or null when empty. Use for every API response. */
export function decimalToNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
