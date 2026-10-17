import { describe, expect, it } from 'vitest';
import { bondEnthalpy, classifyBond, electronegativity, estimateEnergy, pairCompound } from '../src/chem/bonding';
import { parseEquation, type Equation } from '../src/chem/equation';

function eq(text: string): Equation {
  const r = parseEquation(text);
  if (!r.ok) throw new Error(r.error);
  return r.eq;
}

describe('bond classification', () => {
  it('uses the classroom rules', () => {
    expect(classifyBond('Na', 'Cl').type).toBe('ionic');
    expect(classifyBond('Mg', 'O').type).toBe('ionic');
    expect(classifyBond('H', 'H').type).toBe('nonpolar-covalent');
    expect(classifyBond('C', 'H').type).toBe('nonpolar-covalent');
    expect(classifyBond('O', 'H').type).toBe('polar-covalent');
    expect(classifyBond('H', 'Cl').type).toBe('polar-covalent');
    expect(classifyBond('Cu', 'Cu').type).toBe('metallic');
    expect(classifyBond('Cu', 'Zn').type).toBe('metallic');
    expect(classifyBond('Ne', 'Na').type).toBe('none');
  });
  it('reports electronegativity and the negative end', () => {
    expect(electronegativity('F')).toBe(3.98);
    const oh = classifyBond('H', 'O');
    expect(oh.dEN).toBeCloseTo(1.24, 2);
    expect(oh.negative).toBe('O');
    expect(classifyBond('Na', 'Cl').negative).toBe('Cl');
  });
  it('adds caveats where the simple rule is shaky', () => {
    expect(classifyBond('Al', 'Cl').caveat).toMatch(/covalent character/);
    expect(classifyBond('H', 'F').caveat).toMatch(/still covalent/);
    expect(classifyBond('Na', 'F').caveat).toBeNull();
  });
});

describe('pair compounds', () => {
  const f = (a: string, b: string) => pairCompound(a, b).formula;
  it('builds ionic formulas from ion charges', () => {
    expect(f('Na', 'Cl')).toBe('NaCl');
    expect(f('Mg', 'Cl')).toBe('MgCl₂');
    expect(f('Al', 'O')).toBe('Al₂O₃');
    expect(f('O', 'Al')).toBe('Al₂O₃');
    expect(f('Ca', 'N')).toBe('Ca₃N₂');
    const c = pairCompound('Mg', 'O');
    expect(c.kind === 'ionic' && [c.cation.count, c.anion.count]).toEqual([1, 1]);
  });
  it('builds simple molecules from valences', () => {
    expect(f('C', 'H')).toBe('CH₄');
    expect(f('H', 'C')).toBe('CH₄');
    expect(f('N', 'H')).toBe('NH₃');
    expect(f('O', 'H')).toBe('H₂O');
    expect(f('H', 'Cl')).toBe('HCl');
    expect(f('C', 'O')).toBe('CO₂');
    expect(f('C', 'Cl')).toBe('CCl₄');
    expect(f('O', 'F')).toBe('OF₂');
    expect(f('N', 'N')).toBe('N₂');
    const n2 = pairCompound('N', 'N');
    expect(n2.kind === 'molecule' && n2.order).toBe(3);
    const co2 = pairCompound('C', 'O');
    expect(co2.kind === 'molecule' && [co2.central, co2.terminals, co2.order]).toEqual(['C', 2, 2]);
  });
  it('is honest about structures it cannot draw', () => {
    expect(pairCompound('C', 'C').kind).toBe('giant-covalent');
    expect(pairCompound('Si', 'O').kind).toBe('giant-covalent');
    expect(pairCompound('N', 'O').kind).toBe('none');
    expect(pairCompound('He', 'H').kind).toBe('none');
    expect(pairCompound('Fe', 'Fe').kind).toBe('metallic');
  });
});

describe('bond enthalpies', () => {
  it('looks up bonds in either order', () => {
    expect(bondEnthalpy('H', 'O', 1)).toBe(464);
    expect(bondEnthalpy('O', 'H', 1)).toBe(464);
    expect(bondEnthalpy('N', 'N', 3)).toBe(945);
  });
  it('estimates reaction enthalpies close to measured values', () => {
    // measured (gas-phase water): 2H2 + O2 → 2H2O −484 kJ; CH4 combustion −802 kJ; Haber −92 kJ
    const water = estimateEnergy(eq('H2 + O2 -> H2O'), [2, 1, 2]);
    expect(water.ok && water.dH).toBe(2 * 436 + 498 - 4 * 464);
    const ch4 = estimateEnergy(eq('CH4 + O2 -> CO2 + H2O'), [1, 2, 1, 2]);
    expect(ch4.ok && Math.abs(ch4.dH + 802)).toBeLessThan(30);
    const nh3 = estimateEnergy(eq('N2 + H2 -> NH3'), [1, 3, 2]);
    expect(nh3.ok && Math.abs(nh3.dH + 92)).toBeLessThan(10);
  });
  it('refuses ionic and metal species', () => {
    const r = estimateEnergy(eq('Na + Cl2 -> NaCl'), [2, 1, 2]);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/metal/);
  });
});
