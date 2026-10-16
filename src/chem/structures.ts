/**
 * 2D drawings of molecules and formula units, in bond-length units (y points down).
 *
 * These are flat "displayed formula" pictures for teaching (≈): bond angles are only roughly right and
 * 3D shapes are flattened. Ionic compounds are drawn as one formula unit, metals as one atom — the real
 * substances are giant lattices.
 */
import { elementBySymbol } from './elements';
import { hillKey, parseSpecies, type Species } from './formula';

export interface SAtom {
  el: string;
  x: number;
  y: number;
  /** ionic charge shown on this atom */
  charge?: number;
}

export interface SBond {
  a: number;
  b: number;
  order: 1 | 2 | 3;
  /** electrostatic attraction between ions (drawn dotted), not a shared-electron bond */
  ionic?: boolean;
}

export type StructureKind = 'molecule' | 'ionic' | 'metal' | 'atom' | 'ion' | 'electron' | 'unknown';

export interface Structure {
  atoms: SAtom[];
  bonds: SBond[];
  /** polyatomic ions drawn in brackets with a charge */
  groups: { atoms: number[]; charge: number }[];
  kind: StructureKind;
  note?: string;
}

const RESONANCE = 'One resonance structure is shown; the real electrons are shared over all the equivalent bonds ≈.';
const LATTICE = 'Drawn as one formula unit. The real solid is a giant lattice of ions ≈.';
const METAL = 'Drawn as one atom. A real piece of metal is a lattice of atoms sharing their outer electrons ≈.';

function polar(r: number, deg: number, cx = 0, cy = 0): [number, number] {
  const t = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
}

class B {
  atoms: SAtom[] = [];
  bonds: SBond[] = [];
  groups: { atoms: number[]; charge: number }[] = [];
  at(el: string, x: number, y: number, charge?: number): number {
    this.atoms.push(charge ? { el, x, y, charge } : { el, x, y });
    return this.atoms.length - 1;
  }
  bond(a: number, b: number, order: 1 | 2 | 3 = 1): this {
    this.bonds.push({ a, b, order });
    return this;
  }
  ionic(a: number, b: number): this {
    this.bonds.push({ a, b, order: 1, ionic: true });
    return this;
  }
  group(atoms: number[], charge: number): this {
    this.groups.push({ atoms, charge });
    return this;
  }
  done(kind: StructureKind, note?: string): Structure {
    return { atoms: this.atoms, bonds: this.bonds, groups: this.groups, kind, note };
  }
}

function diatomic(a: string, b: string, order: 1 | 2 | 3, note?: string): Structure {
  const s = new B();
  s.bond(s.at(a, -0.5, 0), s.at(b, 0.5, 0), order);
  return s.done('molecule', note);
}

function single(el: string, kind: StructureKind, charge = 0, note?: string): Structure {
  const s = new B();
  s.at(el, 0, 0, charge || undefined);
  return s.done(kind, note);
}

/** Ion pair / simple lattice fragment drawn as a row of alternating ions. */
function ionRow(ions: [string, number][], note = LATTICE): Structure {
  const s = new B();
  const n = ions.length;
  ions.forEach(([el, q], i) => s.at(el, (i - (n - 1) / 2) * 1.25, 0, q));
  for (let i = 0; i + 1 < n; i++) s.ionic(i, i + 1);
  return s.done('ionic', note);
}

function hydroxideAt(s: B, angle: number, cx: number, cy: number): number {
  const [ox, oy] = polar(1.25, angle, cx, cy);
  const [hx, hy] = polar(2.15, angle, cx, cy);
  const o = s.at('O', ox, oy);
  const h = s.at('H', hx, hy);
  s.bond(o, h);
  s.group([o, h], -1);
  return o;
}

/** Straight-chain alkane CnH(2n+2) as a displayed formula. */
function alkane(n: number): Structure {
  const s = new B();
  const c: number[] = [];
  for (let i = 0; i < n; i++) c.push(s.at('C', i, 0));
  for (let i = 0; i < n; i++) {
    if (i) s.bond(c[i - 1], c[i]);
    s.bond(c[i], s.at('H', i, -1));
    s.bond(c[i], s.at('H', i, 1));
  }
  s.bond(c[0], s.at('H', -1, 0));
  s.bond(c[n - 1], s.at('H', n, 0));
  return s.done('molecule', 'Displayed formula: the real carbon chain is a 3D zig-zag ≈.');
}

function build(): Record<string, Structure> {
  const L: Record<string, Structure> = {};

  L['H2'] = diatomic('H', 'H', 1);
  L['O2'] = diatomic('O', 'O', 2);
  L['N2'] = diatomic('N', 'N', 3);
  L['Cl2'] = diatomic('Cl', 'Cl', 1);
  L['HCl'] = diatomic('H', 'Cl', 1);
  L['NO'] = diatomic('N', 'O', 2, 'NO has an odd number of electrons; its bond is really between double and triple ≈.');

  {
    const s = new B();
    const o = s.at('O', 0, -0.3);
    const [x, y] = [Math.sin((52.25 * Math.PI) / 180), Math.cos((52.25 * Math.PI) / 180)];
    s.bond(o, s.at('H', -x, -0.3 + y));
    s.bond(o, s.at('H', x, -0.3 + y));
    L['H2O'] = s.done('molecule', 'Bent shape, 104.5° between the bonds.');
  }
  {
    const s = new B();
    const c = s.at('C', 0, 0);
    s.bond(c, s.at('O', -1, 0), 2).bond(c, s.at('O', 1, 0), 2);
    L['CO2'] = s.done('molecule', 'Linear molecule.');
  }
  {
    const s = new B();
    const c = s.at('C', 0, 0);
    for (const [x, y] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) s.bond(c, s.at('H', x, y));
    L['CH4'] = s.done('molecule', 'Really a 3D tetrahedron (109.5° angles), flattened here ≈.');
  }
  {
    const s = new B();
    const n = s.at('N', 0, -0.3);
    s.bond(n, s.at('H', -0.92, 0.15)).bond(n, s.at('H', 0.92, 0.15)).bond(n, s.at('H', 0, 0.55));
    L['NH3'] = s.done('molecule', 'Really a 3D pyramid, flattened here ≈.');
  }
  {
    const s = new B();
    const o1 = s.at('O', -0.5, 0);
    const o2 = s.at('O', 0.5, 0);
    s.bond(o1, o2).bond(o1, s.at('H', -0.85, -0.94)).bond(o2, s.at('H', 0.85, 0.94));
    L['H2O2'] = s.done('molecule', 'Really twisted in 3D ≈.');
  }
  {
    const s = new B();
    const o = s.at('O', 0, -0.25);
    s.bond(o, s.at('O', -0.853, 0.27), 2).bond(o, s.at('O', 0.853, 0.27), 1);
    L['O3'] = s.done('molecule', RESONANCE);
  }
  {
    const s = new B();
    const n = s.at('N', 0, -0.2);
    s.bond(n, s.at('O', -0.92, 0.19), 2).bond(n, s.at('O', 0.92, 0.19), 1);
    L['NO2'] = s.done('molecule', `NO₂ has one unpaired electron. ${RESONANCE}`);
  }
  {
    const s = new B();
    const su = s.at('S', 0, -0.25);
    s.bond(su, s.at('O', -0.87, 0.25), 2).bond(su, s.at('O', 0.87, 0.25), 2);
    L['SO2'] = s.done('molecule', RESONANCE);
  }
  {
    const s = new B();
    const su = s.at('S', 0, 0);
    for (const a of [-90, 30, 150]) s.bond(su, s.at('O', ...polar(1, a)), 2);
    L['SO3'] = s.done('molecule', 'Flat triangle. Drawn with three double bonds; the real bonding is delocalised ≈.');
  }

  L['C3H8'] = alkane(3);
  L['C8H18'] = alkane(8);
  {
    const s = new B();
    const c1 = s.at('C', 0, 0);
    const c2 = s.at('C', 1, 0);
    const o = s.at('O', 2, 0);
    s.bond(c1, c2).bond(c2, o).bond(o, s.at('H', 3, 0));
    s.bond(c1, s.at('H', -1, 0)).bond(c1, s.at('H', 0, -1)).bond(c1, s.at('H', 0, 1));
    s.bond(c2, s.at('H', 1, -1)).bond(c2, s.at('H', 1, 1));
    L['C2H5OH'] = s.done('molecule', 'Ethanol, displayed formula ≈.');
  }
  {
    const s = new B();
    const c: number[] = [];
    for (let i = 0; i < 6; i++) c.push(s.at('C', i, 0));
    for (let i = 1; i < 6; i++) s.bond(c[i - 1], c[i]);
    s.bond(c[0], s.at('O', 0, -1), 2).bond(c[0], s.at('H', 0, 1));
    for (let i = 1; i <= 4; i++) {
      s.bond(c[i], s.at('H', i, -1));
      const o = s.at('O', i, 1);
      s.bond(c[i], o).bond(o, s.at('H', i, 2));
    }
    s.bond(c[5], s.at('H', 5, -1)).bond(c[5], s.at('H', 5, 1));
    const o6 = s.at('O', 6, 0);
    s.bond(c[5], o6).bond(o6, s.at('H', 7, 0));
    L['C6H12O6'] = s.done('molecule', 'Glucose drawn as its open chain. In water it is mostly a ring, and real bond angles differ ≈.');
  }

  for (const m of ['Na', 'Mg', 'Fe', 'Al', 'Zn', 'Ca', 'Cu', 'K', 'Ag', 'Li']) L[m] = single(m, 'metal', 0, METAL);
  for (const [el, q] of [['Ag', 1], ['Cl', -1], ['Fe', 3], ['Fe', 2], ['Zn', 2], ['Cu', 2], ['Mn', 2], ['Na', 1], ['K', 1], ['Mg', 2], ['Ca', 2], ['Al', 3], ['Pb', 2], ['I', -1]] as [string, number][]) {
    L[`${el}^${Math.abs(q) === 1 ? '' : Math.abs(q)}${q > 0 ? '+' : '-'}`] = single(el, 'ion', q, 'A single ion. In water it is surrounded by water molecules (not shown).');
  }
  L['H^+'] = single('H', 'ion', 1, 'A bare proton. In water H⁺ is really attached to water molecules (H₃O⁺) ≈.');
  L['e-'] = { atoms: [], bonds: [], groups: [], kind: 'electron', note: 'An electron: no nucleus, charge −1.' };
  {
    const s = new B();
    const o = s.at('O', -0.5, 0);
    s.bond(o, s.at('H', 0.5, 0)).group([0, 1], -1);
    L['OH^-'] = s.done('ion', 'Hydroxide ion.');
  }

  L['NaCl'] = ionRow([['Na', 1], ['Cl', -1]]);
  L['KCl'] = ionRow([['K', 1], ['Cl', -1]]);
  L['MgO'] = ionRow([['Mg', 2], ['O', -2]]);
  L['CaO'] = ionRow([['Ca', 2], ['O', -2]]);
  L['AgCl'] = ionRow([['Ag', 1], ['Cl', -1]], `${LATTICE} (Its bonding is partly covalent.)`);
  L['ZnCl2'] = ionRow([['Cl', -1], ['Zn', 2], ['Cl', -1]], `${LATTICE} (Its bonding is partly covalent.)`);
  L['PbI2'] = ionRow([['I', -1], ['Pb', 2], ['I', -1]], `${LATTICE} (Its bonding is partly covalent.)`);
  L['Fe2O3'] = ionRow([['O', -2], ['Fe', 3], ['O', -2], ['Fe', 3], ['O', -2]]);
  L['Al2O3'] = ionRow([['O', -2], ['Al', 3], ['O', -2], ['Al', 3], ['O', -2]]);
  {
    const s = new B();
    const na = s.at('Na', -1.4, 0, 1);
    const o = hydroxideAt(s, 0, -1.4 + 0.05, 0);
    s.ionic(na, o);
    L['NaOH'] = s.done('ionic', LATTICE);
  }
  {
    const s = new B();
    const ca = s.at('Ca', 0, 0, 2);
    s.ionic(ca, hydroxideAt(s, 180, 0, 0));
    s.ionic(ca, hydroxideAt(s, 0, 0, 0));
    L['Ca(OH)2'] = s.done('ionic', LATTICE);
  }
  {
    const s = new B();
    const fe = s.at('Fe', 0, 0, 3);
    for (const a of [-90, 30, 150]) s.ionic(fe, hydroxideAt(s, a, 0, 0));
    L['Fe(OH)3'] = s.done('ionic', `${LATTICE} (Its bonding is partly covalent.)`);
  }
  {
    const s = new B();
    const ca = s.at('Ca', -1.9, 0.5, 2);
    const c = s.at('C', 0.3, 0);
    const o1 = s.at('O', 0.3, -1);
    const o2 = s.at('O', ...polar(1, 30, 0.3, 0));
    const o3 = s.at('O', ...polar(1, 150, 0.3, 0));
    s.bond(c, o1, 2).bond(c, o2).bond(c, o3).group([c, o1, o2, o3], -2).ionic(ca, o3);
    L['CaCO3'] = s.done('ionic', `${LATTICE} ${RESONANCE}`);
  }
  {
    const s = new B();
    const k = s.at('K', -2, 0.5, 1);
    const cl = s.at('Cl', 0.3, 0);
    const o1 = s.at('O', 0.3, -1);
    const o2 = s.at('O', ...polar(1, 30, 0.3, 0));
    const o3 = s.at('O', ...polar(1, 150, 0.3, 0));
    s.bond(cl, o1, 2).bond(cl, o2, 2).bond(cl, o3).group([cl, o1, o2, o3], -1).ionic(k, o3);
    L['KClO3'] = s.done('ionic', `${LATTICE} The chlorate ion is really a pyramid. ${RESONANCE}`);
  }
  {
    const s = new B();
    const mn = s.at('Mn', 0, 0);
    const os = [s.at('O', 0, -1), s.at('O', 1, 0), s.at('O', 0, 1), s.at('O', -1, 0)];
    s.bond(mn, os[0], 2).bond(mn, os[1], 2).bond(mn, os[2], 2).bond(mn, os[3], 1).group([mn, ...os], -1);
    L['MnO4^-'] = s.done('ion', `Permanganate ion: really a 3D tetrahedron. ${RESONANCE}`);
  }
  return L;
}

export const STRUCTURES: Record<string, Structure> = build();

/** Library entries that may be matched by composition alone (no isomers to confuse). */
const NOT_BY_COMPOSITION = new Set(['C2H5OH', 'C6H12O6', 'C3H8', 'C8H18']);

let byHill: Map<string, Structure> | null = null;

/** Drawing for a species: from the library, or a loose cluster of atoms if the structure is unknown. */
export function structureFor(sp: Species): Structure {
  const direct = STRUCTURES[sp.text];
  if (direct) return direct;
  if (!byHill) {
    byHill = new Map();
    for (const k of Object.keys(STRUCTURES)) if (!NOT_BY_COMPOSITION.has(k) && k !== 'e-') byHill.set(hillKey(parseSpecies(k)), STRUCTURES[k]);
  }
  const viaHill = byHill.get(hillKey(sp));
  if (viaHill) return viaHill;
  return clusterFallback(sp);
}

/** Atoms in a compact spiral, no bonds: honest "structure unknown" drawing. */
export function clusterFallback(sp: Species): Structure {
  const atoms: SAtom[] = [];
  const list: string[] = [];
  for (const [el, k] of sp.counts) for (let i = 0; i < k; i++) list.push(el);
  list.forEach((el, i) => {
    const r = 0.62 * Math.sqrt(i);
    const t = i * 2.39996;
    atoms.push({ el, x: r * Math.cos(t), y: r * Math.sin(t) });
  });
  if (atoms.length === 1 && sp.charge) atoms[0].charge = sp.charge;
  const groups = atoms.length > 1 && sp.charge ? [{ atoms: atoms.map((_, i) => i), charge: sp.charge }] : [];
  if (atoms.length === 1) {
    const el = elementBySymbol(atoms[0].el)!;
    const metal = !['nonmetal', 'halogen', 'noble-gas', 'metalloid'].includes(el.category);
    return { atoms, bonds: [], groups, kind: sp.charge ? 'ion' : metal ? 'metal' : 'atom', note: sp.charge ? undefined : metal ? METAL : undefined };
  }
  return { atoms, bonds: [], groups, kind: 'unknown', note: 'This structure is not in the app’s library — the atoms are shown as a loose group, not as real bonds.' };
}
