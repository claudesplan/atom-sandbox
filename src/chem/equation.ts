import { FormulaError, normaliseText, parseSpecies, prettyFormula, type Species } from './formula';

export interface Term {
  species: Species;
  side: 'left' | 'right';
}

export interface Equation {
  /** reactants first, then products */
  terms: Term[];
  /** coefficients typed by the user (1 where none was typed) */
  typedCoefs: number[];
  reversible: boolean;
}

export type ParseResult = { ok: true; eq: Equation } | { ok: false; error: string };

const ARROW = /\s*(<=>|<->|⇌|->|→|⟶|=>|=)\s*/;

/** Split one side on "+" separators (not on the "+" of a charge). */
function splitSide(side: string): string[] {
  // A "+" separates species when it is followed by a new species: a coefficient, a capital letter,
  // a bracket, or an electron "e-". "Na+ + Cl-" and "Fe^3+ + e-" split correctly; "Na+Cl-" is read as Na + Cl⁻.
  // A "+" with spaces on both sides always separates species.
  return side
    .split(/\s+\+\s+/)
    .flatMap((chunk) => chunk.split(/\+(?=\s*(?:\d|[A-Z([]|e(?:\^?-|\s|$)))/))
    .map((t) => t.trim());
}

/** Parse "2H2 + O2 -> 2H2O". Accepts →, ->, =, ⇌ and Unicode sub/superscripts. */
export function parseEquation(input: string): ParseResult {
  const text = normaliseText(input).trim();
  if (!text) return { ok: false, error: 'Type an equation, e.g. H2 + O2 -> H2O' };
  const parts = text.split(ARROW);
  // split with a capture group returns [left, arrow, right]
  if (parts.length !== 3) return { ok: false, error: parts.length < 3 ? 'Missing arrow (use -> or →)' : 'Only one arrow is allowed' };
  const [lhs, arrow, rhs] = parts;
  const terms: Term[] = [];
  const typedCoefs: number[] = [];
  for (const [sideText, side] of [
    [lhs, 'left'],
    [rhs, 'right'],
  ] as const) {
    const items = splitSide(sideText);
    if (!items.length || items.some((t) => !t)) return { ok: false, error: `The ${side === 'left' ? 'left (reactant)' : 'right (product)'} side is empty or has a stray “+”` };
    for (const item of items) {
      const m = /^(\d+)\s*(.*)$/.exec(item);
      const coef = m ? Number(m[1]) : 1;
      const body = m ? m[2] : item;
      if (coef === 0) return { ok: false, error: `Coefficient 0 in “${item}”` };
      try {
        terms.push({ species: parseSpecies(body), side });
        typedCoefs.push(coef);
      } catch (e) {
        if (e instanceof FormulaError) return { ok: false, error: `“${item}”: ${e.message}` };
        throw e;
      }
    }
  }
  return { ok: true, eq: { terms, typedCoefs, reversible: arrow === '<=>' || arrow === '<->' || arrow === '⇌' } };
}

export function equationToText(eq: Equation, coefs: number[], pretty = true): string {
  const side = (s: 'left' | 'right') =>
    eq.terms
      .map((t, i) => ({ t, c: coefs[i] }))
      .filter(({ t }) => t.side === s)
      .map(({ t, c }) => `${c === 1 ? '' : c}${pretty ? prettyFormula(t.species, t.species.state) : t.species.text}`)
      .join(' + ');
  return `${side('left')} ${eq.reversible ? '⇌' : '→'} ${side('right')}`;
}

// ---------- counting and checking ----------

export interface ElementTally {
  symbol: string;
  left: number;
  right: number;
}

export interface BalanceCheck {
  elements: ElementTally[];
  chargeLeft: number;
  chargeRight: number;
  atomsBalanced: boolean;
  chargeBalanced: boolean;
  balanced: boolean;
  /** coefficients share no common factor */
  lowestTerms: boolean;
  allPositive: boolean;
}

export function elementsIn(eq: Equation): string[] {
  const out: string[] = [];
  for (const t of eq.terms) for (const s of t.species.counts.keys()) if (!out.includes(s)) out.push(s);
  return out;
}

export function checkBalance(eq: Equation, coefs: number[]): BalanceCheck {
  const elements: ElementTally[] = elementsIn(eq).map((symbol) => ({ symbol, left: 0, right: 0 }));
  let chargeLeft = 0;
  let chargeRight = 0;
  eq.terms.forEach((t, i) => {
    const c = coefs[i] ?? 0;
    for (const [s, k] of t.species.counts) {
      const row = elements.find((e) => e.symbol === s)!;
      if (t.side === 'left') row.left += c * k;
      else row.right += c * k;
    }
    if (t.side === 'left') chargeLeft += c * t.species.charge;
    else chargeRight += c * t.species.charge;
  });
  const atomsBalanced = elements.every((e) => e.left === e.right);
  const chargeBalanced = chargeLeft === chargeRight;
  const allPositive = coefs.length === eq.terms.length && coefs.every((c) => Number.isInteger(c) && c > 0);
  const g = coefs.reduce((a, c) => gcd(a, Math.abs(c)), 0);
  return { elements, chargeLeft, chargeRight, atomsBalanced, chargeBalanced, balanced: atomsBalanced && chargeBalanced && allPositive, lowestTerms: g === 1, allPositive };
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

// ---------- exact balancing (rational null space) ----------

function bgcd(a: bigint, b: bigint): bigint {
  if (a < 0n) a = -a;
  if (b < 0n) b = -b;
  while (b) [a, b] = [b, a % b];
  return a;
}

class Q {
  readonly n: bigint;
  readonly d: bigint;
  constructor(n: bigint, d: bigint = 1n) {
    if (d === 0n) throw new Error('division by zero');
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = bgcd(n, d) || 1n;
    this.n = n / g;
    this.d = d / g;
  }
  static of(x: number): Q {
    return new Q(BigInt(x));
  }
  isZero(): boolean {
    return this.n === 0n;
  }
  sub(o: Q): Q {
    return new Q(this.n * o.d - o.n * this.d, this.d * o.d);
  }
  mul(o: Q): Q {
    return new Q(this.n * o.n, this.d * o.d);
  }
  div(o: Q): Q {
    return new Q(this.n * o.d, this.d * o.n);
  }
  neg(): Q {
    return new Q(-this.n, this.d);
  }
}

export type BalanceResult =
  | { ok: true; coefs: number[] }
  | { ok: false; reason: 'impossible' | 'ambiguous' | 'not-positive'; message: string };

/**
 * Find the smallest positive whole-number coefficients that conserve every element and the total charge.
 * Exact rational arithmetic (no floating point): solves the null space of the composition matrix.
 */
export function balance(eq: Equation): BalanceResult {
  const els = elementsIn(eq);
  const cols = eq.terms.length;
  const rows: Q[][] = els.map((s) => eq.terms.map((t) => Q.of((t.side === 'left' ? 1 : -1) * (t.species.counts.get(s) ?? 0))));
  if (eq.terms.some((t) => t.species.charge !== 0)) rows.push(eq.terms.map((t) => Q.of((t.side === 'left' ? 1 : -1) * t.species.charge)));

  for (const s of els) {
    const l = eq.terms.some((t) => t.side === 'left' && t.species.counts.has(s));
    const r = eq.terms.some((t) => t.side === 'right' && t.species.counts.has(s));
    if (l !== r) return { ok: false, reason: 'impossible', message: `${s} appears only on the ${l ? 'left' : 'right'} side — atoms cannot appear or vanish, so this equation can never balance.` };
  }

  // reduced row echelon form
  const m = rows.map((r) => r.slice());
  const pivots: number[] = [];
  let r = 0;
  for (let c = 0; c < cols && r < m.length; c++) {
    let p = r;
    while (p < m.length && m[p][c].isZero()) p++;
    if (p === m.length) continue;
    [m[r], m[p]] = [m[p], m[r]];
    const pv = m[r][c];
    m[r] = m[r].map((x) => x.div(pv));
    for (let i = 0; i < m.length; i++) {
      if (i === r || m[i][c].isZero()) continue;
      const f = m[i][c];
      m[i] = m[i].map((x, j) => x.sub(f.mul(m[r][j])));
    }
    pivots.push(c);
    r++;
  }
  const free = [...Array(cols).keys()].filter((c) => !pivots.includes(c));
  if (free.length === 0) return { ok: false, reason: 'impossible', message: 'No set of coefficients conserves every element and the charge.' };
  if (free.length > 1)
    return {
      ok: false,
      reason: 'ambiguous',
      message: 'This equation can be balanced in more than one independent way (it is really two or more reactions added together). Balance it by hand.',
    };
  const f = free[0];
  const x: Q[] = Array.from({ length: cols }, () => Q.of(0));
  x[f] = Q.of(1);
  pivots.forEach((pc, i) => (x[pc] = m[i][f].neg()));
  const lcm = x.reduce((a, q) => (a * q.d) / bgcd(a, q.d), 1n);
  let ints = x.map((q) => (q.n * lcm) / q.d);
  const g = ints.reduce((a, v) => bgcd(a, v), 0n) || 1n;
  ints = ints.map((v) => v / g);
  if (ints.every((v) => v <= 0n)) ints = ints.map((v) => -v);
  if (ints.some((v) => v <= 0n))
    return { ok: false, reason: 'not-positive', message: 'The only way to conserve the atoms needs a zero or negative amount of some substance — check which side each one belongs on.' };
  return { ok: true, coefs: ints.map(Number) };
}

export function speciesLabel(sp: Species): string {
  return prettyFormula(sp, sp.state);
}
