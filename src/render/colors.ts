import { elementBySymbol, type Category } from '../chem/elements';

export const C = {
  bg: '#0f1215',
  grid: 'rgba(255,255,255,0.035)',
  gridMajor: 'rgba(255,255,255,0.07)',
  text: '#c9d1d9',
  dim: '#7d8792',
  faint: '#535c66',
  accent: '#3d9df3',
  ok: '#4cc38a',
  warn: '#f0a33a',
  bad: '#ef5b5b',
  proton: '#e05d5d',
  neutron: '#8a9aab',
  electron: '#4fb3ff',
  shell: 'rgba(125,135,146,0.35)',
};

/** Muted category colours for the periodic table (dark theme). */
export const CATEGORY_COLOR: Record<Category, string> = {
  alkali: '#7a3b3b',
  'alkaline-earth': '#7a5a32',
  transition: '#5e5470',
  'post-transition': '#3f5f6b',
  metalloid: '#4d6a4a',
  nonmetal: '#2f6a5a',
  halogen: '#7a6a2c',
  'noble-gas': '#3a5482',
  lanthanide: '#6b4567',
  actinide: '#6b4552',
};

/** Atom colours, CPK/Jmol-inspired, tuned for a dark background. */
const CPK: Record<string, string> = {
  H: '#e6e6e6',
  He: '#d9ffff',
  Li: '#cc80ff',
  Be: '#c2ff00',
  B: '#ffb5b5',
  C: '#8b949e',
  N: '#4d7cff',
  O: '#ff4d4d',
  F: '#90e050',
  Ne: '#b3e3f5',
  Na: '#ab5cf2',
  Mg: '#8aff00',
  Al: '#bfa6a6',
  Si: '#f0c8a0',
  P: '#ff8000',
  S: '#ffd633',
  Cl: '#1ff01f',
  Ar: '#80d1e3',
  K: '#8f40d4',
  Ca: '#3dff00',
  Mn: '#9c7ac7',
  Fe: '#e06633',
  Co: '#f090a0',
  Ni: '#50d050',
  Cu: '#c88033',
  Zn: '#7d80b0',
  Br: '#a62929',
  Ag: '#c0c0c0',
  I: '#940094',
  Pb: '#575961',
  Au: '#ffd123',
  U: '#008fff',
};

export function atomColor(symbol: string): string {
  if (CPK[symbol]) return CPK[symbol];
  const el = elementBySymbol(symbol);
  return el ? lighten(CATEGORY_COLOR[el.category], 0.45) : '#aaaaaa';
}

/** Readable text colour on a given fill. */
export function textOn(hex: string): string {
  const [r, g, b] = rgb(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#111418' : '#f0f3f6';
}

/** Covalent-radius-like drawing size in bond-length units. */
export function atomRadius(symbol: string): number {
  if (symbol === 'H') return 0.26;
  const el = elementBySymbol(symbol);
  if (!el) return 0.34;
  return el.period <= 2 ? 0.34 : el.period === 3 ? 0.39 : 0.42;
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function lighten(hex: string, f: number): string {
  return toHex(rgb(hex).map((v) => v + (255 - v) * f));
}

export function darken(hex: string, f: number): string {
  return toHex(rgb(hex).map((v) => v * (1 - f)));
}

function toHex(c: number[]): string {
  return `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
}

export function withAlpha(hex: string, a: number): string {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
