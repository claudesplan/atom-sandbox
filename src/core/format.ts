/** Number formatting helpers for engineering readouts. */

const PREFIXES: [number, string][] = [
  [1e9, 'G'],
  [1e6, 'M'],
  [1e3, 'k'],
  [1, ''],
  [1e-3, 'm'],
  [1e-6, 'µ'],
];

/** Format with SI prefix, e.g. fmtSI(12500, 'J') → "12.5 kJ". */
export function fmtSI(value: number, unit: string, digits = 3): string {
  if (!Number.isFinite(value)) return value > 0 ? `∞ ${unit}` : value < 0 ? `-∞ ${unit}` : `— ${unit}`;
  if (value === 0) return `0 ${unit}`;
  const a = Math.abs(value);
  for (const [f, p] of PREFIXES) {
    if (a >= f * 0.9995) return `${toPrecision(value / f, digits)} ${p}${unit}`;
  }
  return `${value.toExponential(digits - 1)} ${unit}`;
}

/** Fixed significant digits without exponent for normal ranges. */
export function toPrecision(x: number, digits = 4): string {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e6 || a < 1e-4) return x.toExponential(Math.max(0, digits - 1));
  const s = x.toPrecision(digits);
  // strip exponent-free trailing zeros after decimal point
  return s.includes('.') && !s.includes('e') ? s.replace(/\.?0+$/, '') : s;
}

export function fmtNum(x: number, decimals = 3): string {
  if (!Number.isFinite(x)) return '—';
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e7 || a < 10 ** -decimals)) return x.toExponential(2);
  return x.toFixed(decimals);
}

export const RAD2DEG = 180 / Math.PI;
export const DEG2RAD = Math.PI / 180;
