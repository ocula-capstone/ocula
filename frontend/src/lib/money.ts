// Money is handled in whole centavos (integers) so adding amounts never picks up
// floating-point error: 0.10 + 0.20 must be exactly 0.30.

const AMOUNT = /^-?\d+(\.\d{1,2})?$/;

// Accepts a Decimal string from the API ("1234.50") or a number. Throws on anything else.
export function toCentavos(value: string | number): number {
  // toFixed(2) turns a number like 12.5 into "12.50" so both inputs share one parser.
  const text =
    typeof value === 'number' && Number.isFinite(value) ? value.toFixed(2) : String(value).trim();
  if (!AMOUNT.test(text)) throw new Error(`Invalid amount: ${String(value)}`);
  const negative = text.startsWith('-');
  const [whole, fraction = ''] = text.replace('-', '').split('.');
  const centavos = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  // 0 - x rather than -x, so "-0" gives 0 and never negative zero.
  return negative ? 0 - centavos : centavos;
}

export function sumCentavos(values: (string | number)[]): number {
  return values.reduce<number>((total, value) => total + toCentavos(value), 0);
}

// 123450 centavos is shown as "₱1,234.50"; negatives read "-₱5.00".
export function formatPeso(value: string | number): string {
  const centavos = toCentavos(value);
  const abs = Math.abs(centavos);
  const pesos = Math.floor(abs / 100).toLocaleString('en-US');
  const cents = String(abs % 100).padStart(2, '0');
  return `${centavos < 0 ? '-' : ''}₱${pesos}.${cents}`;
}

// "₱6,450" for whole pesos and "₱6,450.50" otherwise, for dashboard cards where ".00" is noise.
export function formatPesoShort(value: string | number): string {
  const full = formatPeso(value);
  return full.endsWith('.00') ? full.slice(0, -3) : full;
}
