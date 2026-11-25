const PH_MOBILE = /^(?:\+63|0)?9\d{9}$/;

// A Philippine mobile number in its one standard form, +639XXXXXXXXX, or null when it is not one.
// Accepts a +63 or 0 prefix (or none) and spaces or dashes.
export function normalizePhone(value: unknown): string | null {
  const digits = (typeof value === 'string' ? value : '').replace(/[\s-]/g, '');
  return PH_MOBILE.test(digits) ? `+63${digits.slice(-10)}` : null;
}
