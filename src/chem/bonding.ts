/**
 * Chemical bonding: bond type between two elements, simple compound formulas, and average bond enthalpies.
 *
 * Exact data: Pauling electronegativities (rounded to 2 decimals), ionic charges from the teaching list.
 * Simplified (≈): sorting bonds into "ionic / polar covalent / non-polar covalent / metallic" is a
 * classroom model — real bonds lie on a continuum. Average bond enthalpies are means over many molecules;
 * energy changes estimated from them are approximate and only apply to gases.
 */
import { COMMON_IONS, elementBySymbol, type Element } from './elements';
import type { Equation } from './equation';
import { structureFor } from './structures';

/** Pauling electronegativity. Missing: noble gases He–Ar (no bonds) and elements without a reliable value. */
const EN: Record<string, number> = {
  H: 2.2, Li: 0.98, Be: 1.57, B: 2.04, C: 2.55, N: 3.04, O: 3.44, F: 3.98,
  Na: 0.93, Mg: 1.31, Al: 1.61, Si: 1.9, P: 2.19, S: 2.58, Cl: 3.16,
  K: 0.82, Ca: 1.0, Sc: 1.36, Ti: 1.54, V: 1.63, Cr: 1.66, Mn: 1.55, Fe: 1.83, Co: 1.88, Ni: 1.91, Cu: 1.9, Zn: 1.65,
  Ga: 1.81, Ge: 2.01, As: 2.18, Se: 2.55, Br: 2.96, Kr: 3.0,
  Rb: 0.82, Sr: 0.95, Y: 1.22, Zr: 1.33, Nb: 1.6, Mo: 2.16, Tc: 1.9, Ru: 2.2, Rh: 2.28, Pd: 2.2, Ag: 1.93, Cd: 1.69,
  In: 1.78, Sn: 1.96, Sb: 2.05, Te: 2.1, I: 2.66, Xe: 2.6,
  Cs: 0.79, Ba: 0.89, La: 1.1, Hf: 1.3, Ta: 1.5, W: 2.36, Re: 1.9, Os: 2.2, Ir: 2.2, Pt: 2.28, Au: 2.54, Hg: 2.0,
  Tl: 1.62, Pb: 2.33, Bi: 2.02, Fr: 0.7, Ra: 0.9, U: 1.38,
};

export function electronegativity(symbol: string): number | null {
  return EN[symbol] ?? null;
}

export type BondType = 'ionic' | 'polar-covalent' | 'nonpolar-covalent' | 'metallic' | 'none';

export const BOND_LABEL: Record<BondType, string> = {
  ionic: 'Ionic',
  'polar-covalent': 'Polar covalent',
  'nonpolar-covalent': 'Non-polar covalent',
  metallic: 'Metallic',
  none: 'No bond',
};

export const BOND_EXPLAIN: Record<BondType, string> = {
  ionic: 'The metal atom gives its outer electrons to the non-metal atom. The positive and negative ions that form attract each other strongly.',
  'polar-covalent': 'The atoms share pairs of electrons, but the more electronegative atom pulls the shared electrons closer, so it becomes slightly negative (δ−) and the other slightly positive (δ+).',
  'nonpolar-covalent': 'The atoms share pairs of electrons equally — neither atom pulls harder.',
  metallic: 'Metal atoms release their outer electrons into a “sea” of delocalised electrons that holds the positive metal ions together.',
  none: 'Noble gases already have full outer shells, so they (almost) never form bonds.',
};

/** Typical properties of substances held together by each kind of bonding (teaching generalisations ≈). */
export const BOND_PROPERTIES: Record<Exclude<BondType, 'none'>, [string, string][]> = {
  ionic: [
    ['Structure', 'Giant lattice of ions'],
    ['Melting point', 'High (e.g. NaCl 801 °C)'],
    ['Conducts electricity', 'Only when melted or dissolved'],
    ['In water', 'Often dissolves'],
  ],
  'polar-covalent': [
    ['Structure', 'Usually small molecules'],
    ['Melting point', 'Low, but higher than similar non-polar molecules'],
    ['Conducts electricity', 'No (some, like HCl, form ions in water)'],
    ['In water', 'Often dissolves or mixes'],
  ],
  'nonpolar-covalent': [
    ['Structure', 'Usually small molecules (some giant: diamond, silica)'],
    ['Melting point', 'Low for molecules (O₂ −218 °C); very high for giant structures'],
    ['Conducts electricity', 'No (graphite is an exception)'],
    ['In water', 'Usually does not dissolve'],
  ],
  metallic: [
    ['Structure', 'Giant lattice of metal ions in a sea of electrons'],
    ['Melting point', 'Usually high (mercury is a liquid)'],
    ['Conducts electricity', 'Yes, as a solid'],
    ['Other', 'Shiny, bendable (malleable)'],
  ],
};

export function isMetal(el: Element): boolean {
  return ['alkali', 'alkaline-earth', 'transition', 'post-transition', 'lanthanide', 'actinide'].includes(el.category);
}

export interface BondClass {
  type: BondType;
  /** |ΔEN|, null if a value is missing */
  dEN: number | null;
  /** which atom gets δ− (polar) or becomes the anion (ionic) */
  negative: string | null;
  /** caveat when the simple rule and the electronegativity scale disagree */
  caveat: string | null;
}

/**
 * Classroom classification: metal + metal → metallic, metal + non-metal → ionic, non-metal + non-metal →
 * covalent (polar if ΔEN ≥ 0.4). The electronegativity difference is reported alongside, with caveats
 * where the two pictures disagree.
 */
export function classifyBond(a: string, b: string): BondClass {
  const ea = elementBySymbol(a);
  const eb = elementBySymbol(b);
  if (!ea || !eb) return { type: 'none', dEN: null, negative: null, caveat: null };
  const xa = electronegativity(a);
  const xb = electronegativity(b);
  const dEN = xa != null && xb != null ? Math.abs(xa - xb) : null;
  const negative = xa != null && xb != null && xa !== xb ? (xa > xb ? a : b) : null;
  if (ea.category === 'noble-gas' || eb.category === 'noble-gas') {
    const xe = (a === 'Xe' || b === 'Xe') && (a === 'F' || b === 'F' || a === 'O' || b === 'O');
    return { type: 'none', dEN, negative, caveat: xe ? 'Xenon is an exception: it does form a few compounds with fluorine and oxygen (e.g. XeF₂).' : null };
  }
  const ma = isMetal(ea);
  const mb = isMetal(eb);
  if (ma && mb) return { type: 'metallic', dEN, negative: null, caveat: a !== b ? 'Two different metals form an alloy, still held together by metallic bonding.' : null };
  if (ma || mb) {
    const caveat =
      dEN != null && dEN < 1.7
        ? `ΔEN is only ${dEN.toFixed(2)}, so this bond has a lot of covalent character (real examples: AlCl₃, ZnCl₂ and AgCl behave partly covalently).`
        : null;
    return { type: 'ionic', dEN, negative: ma ? b : a, caveat };
  }
  if (dEN == null) return { type: 'nonpolar-covalent', dEN, negative, caveat: null };
  const caveat = dEN > 1.7 ? `ΔEN is ${dEN.toFixed(2)}, which is very polar — but between two non-metals the bond is still covalent (e.g. H–F).` : null;
  return { type: dEN < 0.4 ? 'nonpolar-covalent' : 'polar-covalent', dEN, negative: dEN < 0.4 ? null : negative, caveat };
}

/** Usual number of covalent bonds formed by a non-metal atom (octet rule; H: duet). */
const VALENCE: Record<string, number> = { H: 1, B: 3, C: 4, N: 3, O: 2, F: 1, Si: 4, P: 3, S: 2, Cl: 1, Ge: 4, As: 3, Se: 2, Br: 1, Te: 2, I: 1 };

export function covalentValence(symbol: string): number | null {
  return VALENCE[symbol] ?? null;
}

/** Outer-shell (valence) electrons of a main-group atom in the classroom picture. */
export function outerElectrons(el: Element): number {
  if (el.Z === 1) return 1;
  if (el.Z === 2) return 2;
  if (el.group == null) return 2;
  if (el.group <= 2) return el.group;
  if (el.group >= 13) return el.group - 10;
  return 2; // transition metals: two s electrons (≈)
}

export interface Ion {
  symbol: string;
  charge: number;
  count: number;
}

export type Compound =
  | { kind: 'ionic'; formula: string; cation: Ion; anion: Ion }
  | { kind: 'molecule'; formula: string; central: string; terminal: string | null; terminals: number; order: number; note?: string }
  | { kind: 'metallic'; formula: string; metals: string[] }
  | { kind: 'giant-covalent'; formula: string; note: string }
  | { kind: 'none'; formula: null; note: string };

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

function sub(n: number): string {
  return n === 1 ? '' : String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[Number(d)]);
}

/** What A and B typically form together, in the simple school model. */
export function pairCompound(a: string, b: string): Compound {
  const ea = elementBySymbol(a)!;
  const eb = elementBySymbol(b)!;
  const cls = classifyBond(a, b);
  if (cls.type === 'none') return { kind: 'none', formula: null, note: BOND_EXPLAIN.none };
  if (cls.type === 'metallic') return { kind: 'metallic', formula: a === b ? a : `${a}–${b} alloy`, metals: a === b ? [a] : [a, b] };
  if (cls.type === 'ionic') {
    const [m, x] = isMetal(ea) ? [ea, eb] : [eb, ea];
    const qp = COMMON_IONS[m.Z]?.find((q) => q > 0) ?? null;
    const qn = COMMON_IONS[x.Z]?.find((q) => q < 0) ?? null;
    if (qp == null || qn == null) return { kind: 'none', formula: null, note: `${m.name} and ${x.name} do not form a simple ionic compound in this app’s list of common ions.` };
    const l = (qp * -qn) / gcd(qp, -qn);
    const nc = l / qp;
    const na = l / -qn;
    return { kind: 'ionic', formula: `${m.symbol}${sub(nc)}${x.symbol}${sub(na)}`, cation: { symbol: m.symbol, charge: qp, count: nc }, anion: { symbol: x.symbol, charge: qn, count: na } };
  }
  // covalent
  const va = covalentValence(a);
  const vb = covalentValence(b);
  if (va == null || vb == null) return { kind: 'none', formula: null, note: 'No simple molecule in this model.' };
  if (a === b) {
    if (['C', 'Si', 'Ge', 'B'].includes(a)) return { kind: 'giant-covalent', formula: a, note: `${ea.name} atoms bond to many neighbours, forming a giant covalent structure (like diamond) instead of small molecules.` };
    if (a === 'P') return { kind: 'giant-covalent', formula: 'P₄', note: 'White phosphorus forms P₄ molecules (a pyramid of 4 atoms) — not drawn here.' };
    if (a === 'S' || a === 'Se') return { kind: 'giant-covalent', formula: `${a}₈`, note: `${ea.name} forms rings of 8 atoms (${a}₈) — not drawn here.` };
    return { kind: 'molecule', formula: `${a}₂`, central: a, terminal: null, terminals: 1, order: va };
  }
  if ((a === 'Si' && b === 'O') || (a === 'O' && b === 'Si')) return { kind: 'giant-covalent', formula: 'SiO₂', note: 'Silicon dioxide (sand, quartz) is a giant covalent lattice, not small molecules.' };
  // central atom: higher valence (ties: lower electronegativity)
  const [c, t] = va > vb || (va === vb && (electronegativity(a) ?? 0) < (electronegativity(b) ?? 0)) ? [a, b] : [b, a];
  const vc = covalentValence(c)!;
  const vt = covalentValence(t)!;
  if (vc % vt !== 0 || vc / vt > 4) return { kind: 'none', formula: null, note: `${elementBySymbol(c)!.name} and ${elementBySymbol(t)!.name} form more complicated molecules (or several different ones) — not drawn by this simple model.` };
  const n = vc / vt;
  // Hydrogen is written first with group 16/17 elements (H₂O, H₂S, HCl); otherwise central atom first (CH₄, NH₃, CO₂).
  const other = c === 'H' ? t : t === 'H' ? c : null;
  const hFirst = other != null && ['O', 'S', 'Se', 'Te', 'F', 'Cl', 'Br', 'I'].includes(other);
  const formula = hFirst ? `H${sub(c === 'H' ? 1 : n)}${other}` : `${c}${t}${sub(n)}`;
  const note = c === 'B' ? 'Boron has only 6 outer electrons here — an exception to the octet rule.' : undefined;
  return { kind: 'molecule', formula, central: c, terminal: t, terminals: n, order: vt, note };
}

// ---------- average bond enthalpies ----------

/** Average bond enthalpies in kJ/mol (gas phase, typical data-book values ≈). Key: sorted symbols + order. */
const BE: Record<string, number> = {
  'H-H-1': 436, 'C-H-1': 413, 'C-C-1': 347, 'C-C-2': 612, 'C-C-3': 838, 'C-O-1': 358, 'C-O-2': 805, 'H-O-1': 464,
  'O-O-1': 146, 'O-O-2': 498, 'N-N-1': 158, 'N-N-3': 945, 'H-N-1': 391, 'Cl-H-1': 432, 'Cl-Cl-1': 243, 'Br-H-1': 366,
  'Br-Br-1': 193, 'H-I-1': 298, 'I-I-1': 151, 'F-H-1': 568, 'F-F-1': 158, 'C-Cl-1': 346, 'C-N-1': 286, 'C-N-3': 887,
  'H-S-1': 347, 'N-O-2': 607, 'O-S-2': 523, 'C-F-1': 485,
};

export function bondEnthalpy(a: string, b: string, order: number): number | null {
  const [x, y] = [a, b].sort();
  return BE[`${x}-${y}-${order}`] ?? null;
}

export interface BondTally {
  label: string;
  count: number;
  each: number;
}

export type EnergyEstimate =
  | { ok: true; broken: BondTally[]; formed: BondTally[]; totalBroken: number; totalFormed: number; dH: number }
  | { ok: false; reason: string };

/** Conventional label: C first, H last, otherwise alphabetical — e.g. C–H, O–H, C=O, N≡N. */
export function bondLabel(a: string, b: string, order: number): string {
  const rank = (x: string) => (x === 'C' ? 0 : x === 'H' ? 2 : 1);
  const [p, q] = [a, b].sort((m, n) => rank(m) - rank(n) || (m < n ? -1 : m > n ? 1 : 0));
  return `${p}${order === 1 ? '–' : order === 2 ? '=' : '≡'}${q}`;
}

/**
 * ΔH ≈ (energy to break reactant bonds) − (energy released forming product bonds), using average bond
 * enthalpies. Only for reactions where every species is a covalent molecule from the drawing library.
 */
export function estimateEnergy(eq: Equation, coefs: number[]): EnergyEstimate {
  const tally = (side: 'left' | 'right'): BondTally[] | string => {
    const map = new Map<string, BondTally>();
    for (let i = 0; i < eq.terms.length; i++) {
      const t = eq.terms[i];
      if (t.side !== side) continue;
      const s = structureFor(t.species);
      if (s.kind !== 'molecule') {
        const what = s.kind === 'ionic' ? 'an ionic lattice' : s.kind === 'metal' ? 'a metal' : s.kind === 'electron' ? 'an electron' : s.kind === 'ion' ? 'an ion in solution' : 'not in the drawing library';
        return `${t.species.text.replace(/\^/g, '')} is ${what}, so average bond enthalpies cannot describe it (that needs lattice or hydration energies).`;
      }
      for (const b of s.bonds) {
        const x = s.atoms[b.a].el;
        const y = s.atoms[b.b].el;
        const e = bondEnthalpy(x, y, b.order);
        if (e == null) return `No average bond enthalpy for ${bondLabel(x, y, b.order)} in this app’s table.`;
        const label = bondLabel(x, y, b.order);
        const cur = map.get(label) ?? { label, count: 0, each: e };
        cur.count += coefs[i] ?? 1;
        map.set(label, cur);
      }
    }
    return [...map.values()];
  };
  const broken = tally('left');
  if (typeof broken === 'string') return { ok: false, reason: broken };
  const formed = tally('right');
  if (typeof formed === 'string') return { ok: false, reason: formed };
  const sum = (l: BondTally[]) => l.reduce((t, b) => t + b.count * b.each, 0);
  const totalBroken = sum(broken);
  const totalFormed = sum(formed);
  return { ok: true, broken, formed, totalBroken, totalFormed, dH: totalBroken - totalFormed };
}
