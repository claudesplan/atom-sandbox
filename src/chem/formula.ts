import { elementBySymbol } from './elements';
import { superscript } from './nuclides';

/** One chemical species, e.g. H₂O, SO₄²⁻, Fe³⁺ or an electron e⁻. */
export interface Species {
  /** normalised ASCII text, e.g. "SO4^2-" (without coefficient or state) */
  text: string;
  /** formula part without charge, e.g. "SO4", "CuSO4.5H2O", "e" */
  formula: string;
  /** element symbol → number of atoms, in order of first appearance */
  counts: Map<string, number>;
  charge: number;
  /** state symbol if typed: s, l, g or aq */
  state: string | null;
  isElectron: boolean;
}

export class FormulaError extends Error {}

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const SUP_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** Convert Unicode sub/superscripts and dashes to plain ASCII ("SO₄²⁻" → "SO4^2-"). */
export function normaliseText(input: string): string {
  let out = '';
  let sup = '';
  const flush = () => {
    if (sup) out += `^${sup}`;
    sup = '';
  };
  for (const ch of input) {
    const si = SUB.indexOf(ch);
    const pi = SUP_DIGITS.indexOf(ch);
    if (pi >= 0) sup += String(pi);
    else if (ch === '⁺') sup += '+';
    else if (ch === '⁻') sup += '-';
    else {
      flush();
      if (si >= 0) out += String(si);
      else if (ch === '−' || ch === '–') out += '-';
      else if (ch === '·' || ch === '•' || ch === '∙') out += '.';
      else out += ch;
    }
  }
  flush();
  return out;
}

function parseCharge(s: string): { body: string; charge: number } {
  if (!/[+-]$/.test(s)) return { body: s, charge: 0 };
  const caret = /\^(\d*)([+-])$/.exec(s);
  if (caret) {
    const mag = caret[1] ? Number(caret[1]) : 1;
    return { body: s.slice(0, caret.index), charge: caret[2] === '+' ? mag : -mag };
  }
  const caretSignFirst = /\^([+-])(\d+)$/.exec(s);
  if (caretSignFirst) return { body: s.slice(0, caretSignFirst.index), charge: (caretSignFirst[1] === '+' ? 1 : -1) * Number(caretSignFirst[2]) };
  const signs = /([+]+|[-]+)$/.exec(s)!;
  const sign = signs[1][0] === '+' ? 1 : -1;
  if (signs[1].length > 1) return { body: s.slice(0, signs.index), charge: sign * signs[1].length };
  const before = s.slice(0, signs.index);
  const digits = /(\d+)$/.exec(before);
  if (digits) {
    const prefix = before.slice(0, digits.index);
    const d = digits[1];
    // "SO42-" → SO4 with 2−; "Fe3+" → Fe with 3+; "NH4+" → NH4 with 1+
    if (d.length >= 2) return { body: prefix + d.slice(0, -1), charge: sign * Number(d.slice(-1)) };
    if (/^[A-Z][a-z]?$/.test(prefix)) return { body: prefix, charge: sign * Number(d) };
  }
  return { body: before, charge: sign };
}

/** Parse a formula body such as "Ca(OH)2", "Fe2(SO4)3" or "CuSO4.5H2O" into atom counts. */
export function countAtoms(body: string): Map<string, number> {
  const total = new Map<string, number>();
  const parts = body.split('.');
  for (const raw of parts) {
    if (!raw) throw new FormulaError('Empty part in hydrate formula');
    const lead = /^(\d+)/.exec(raw);
    const mult = lead ? Number(lead[1]) : 1;
    const part = lead ? raw.slice(lead[1].length) : raw;
    if (parts.length === 1 && lead) throw new FormulaError('A formula cannot start with a number (put the coefficient in front of the whole species)');
    let pos = 0;
    const readNumber = (): number => {
      const m = /^\d+/.exec(part.slice(pos));
      if (!m) return 1;
      pos += m[0].length;
      const n = Number(m[0]);
      if (n === 0) throw new FormulaError('Subscript 0 is not allowed');
      return n;
    };
    const parseSeq = (close: string | null): Map<string, number> => {
      const counts = new Map<string, number>();
      const add = (sym: string, n: number) => counts.set(sym, (counts.get(sym) ?? 0) + n);
      while (pos < part.length) {
        const ch = part[pos];
        if (ch === ')' || ch === ']') {
          if (ch !== close) throw new FormulaError(`Unexpected “${ch}”`);
          pos++;
          return counts;
        }
        if (ch === '(' || ch === '[') {
          pos++;
          const inner = parseSeq(ch === '(' ? ')' : ']');
          const n = readNumber();
          if (!inner.size) throw new FormulaError('Empty brackets');
          for (const [s, k] of inner) add(s, k * n);
          continue;
        }
        if (/[A-Z]/.test(ch)) {
          let sym = ch;
          if (/[a-z]/.test(part[pos + 1] ?? '')) sym += part[pos + 1];
          if (!elementBySymbol(sym)) {
            if (sym.length === 2 && elementBySymbol(ch)) throw new FormulaError(`Unknown element “${sym}” (symbols are case-sensitive: did you mean ${ch}${sym[1].toUpperCase()}?)`);
            throw new FormulaError(`Unknown element “${sym}”`);
          }
          pos += sym.length;
          add(sym, readNumber());
          continue;
        }
        if (/[a-z]/.test(ch)) throw new FormulaError(`Element symbols start with a capital letter (“${ch}” at position ${pos + 1})`);
        throw new FormulaError(`Unexpected character “${ch}”`);
      }
      if (close) throw new FormulaError(`Missing “${close}”`);
      return counts;
    };
    const counts = parseSeq(null);
    for (const [s, k] of counts) total.set(s, (total.get(s) ?? 0) + k * mult);
  }
  return total;
}

/** Parse one species (no coefficient), e.g. "H2O", "SO4^2-", "Na+", "e-", "NaCl(s)". */
export function parseSpecies(input: string): Species {
  let s = normaliseText(input).replace(/\s+/g, '');
  if (!s) throw new FormulaError('Empty formula');
  let state: string | null = null;
  const st = /\((s|l|g|aq)\)$/i.exec(s);
  if (st) {
    state = st[1].toLowerCase();
    s = s.slice(0, st.index);
  }
  if (/^e(\^?-|\^-1)?$/.test(s)) {
    return { text: 'e-', formula: 'e', counts: new Map(), charge: -1, state, isElectron: true };
  }
  const { body, charge } = parseCharge(s);
  if (!body) throw new FormulaError('Missing formula before the charge');
  const counts = countAtoms(body);
  let protons = 0;
  for (const [sym, k] of counts) protons += elementBySymbol(sym)!.Z * k;
  if (charge > protons) throw new FormulaError(`Charge ${charge}+ is impossible: ${body} only has ${protons} electrons to lose`);
  const text = body + (charge ? `^${Math.abs(charge) === 1 ? '' : Math.abs(charge)}${charge > 0 ? '+' : '-'}` : '');
  return { text, formula: body, counts, charge, state, isElectron: false };
}

/** Pretty display: subscripts and superscript charge, e.g. "SO₄²⁻", "CuSO₄·5H₂O". */
export function prettyFormula(sp: Pick<Species, 'formula' | 'charge' | 'isElectron'>, state?: string | null): string {
  if (sp.isElectron) return 'e⁻';
  const body = sp.formula
    .split('.')
    .map((part) => {
      const lead = /^(\d+)/.exec(part);
      const rest = lead ? part.slice(lead[1].length) : part;
      return (lead ? lead[1] : '') + rest.replace(/\d/g, (d) => SUB[Number(d)]);
    })
    .join('·');
  const c = sp.charge;
  const charge = c ? superscript(`${Math.abs(c) === 1 ? '' : Math.abs(c)}${c > 0 ? '+' : '-'}`) : '';
  return body + charge + (state ? `(${state})` : '');
}

/** Hill-order formula (C, H, then alphabetical) with charge, used as a composition key, e.g. "C2H6O". */
export function hillKey(sp: Species): string {
  if (sp.isElectron) return 'e-';
  const syms = [...sp.counts.keys()];
  const hasC = sp.counts.has('C');
  syms.sort((a, b) => {
    if (hasC) {
      const rank = (s: string) => (s === 'C' ? 0 : s === 'H' ? 1 : 2);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
    }
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const f = syms.map((s) => s + (sp.counts.get(s)! > 1 ? sp.counts.get(s) : '')).join('');
  return sp.charge ? `${f}^${sp.charge}` : f;
}

export const ELECTRON_MASS_U = 0.000548579909;

/** Molar mass from standard atomic weights; `approx` when an element has no standard weight. */
export function molarMass(sp: Species): { value: number; approx: boolean } {
  let value = 0;
  let approx = false;
  for (const [sym, k] of sp.counts) {
    const el = elementBySymbol(sym)!;
    value += el.weight * k;
    if (el.weightIsMassNumber) approx = true;
  }
  // ions: subtract (cations) or add (anions, electrons) the electron mass
  value -= sp.charge * ELECTRON_MASS_U;
  return { value, approx };
}

export function totalAtoms(sp: Species): number {
  let t = 0;
  for (const k of sp.counts.values()) t += k;
  return t;
}
