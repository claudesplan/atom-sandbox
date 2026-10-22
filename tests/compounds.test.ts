import { describe, expect, it } from 'vitest';
import { anionById, ANIONS, cationById, CATIONS, combineIons, COMPOUNDS, covalentName, describeCompound } from '../src/chem/compounds';
import { parseSpecies } from '../src/chem/formula';

const combo = (c: string, a: string) => combineIons(cationById(c)!, anionById(a)!);

describe('ionic formulas from charges', () => {
  it('balances the charges', () => {
    expect(combo('Na', 'Cl').formula).toBe('NaCl');
    expect(combo('Mg', 'Cl').formula).toBe('MgCl2');
    expect(combo('Al', 'O').formula).toBe('Al2O3');
    expect(combo('Ca', 'OH').formula).toBe('Ca(OH)2');
    expect(combo('Na', 'OH').formula).toBe('NaOH');
    expect(combo('Al', 'SO4').formula).toBe('Al2(SO4)3');
    expect(combo('NH4', 'SO4').formula).toBe('(NH4)2SO4');
    expect(combo('NH4', 'Cl').formula).toBe('NH4Cl');
    expect(combo('Ca', 'PO4').formula).toBe('Ca3(PO4)2');
    expect(combo('Fe3', 'O').formula).toBe('Fe2O3');
    expect(combo('Fe2', 'O').formula).toBe('FeO');
    expect(combo('Mg', 'N').formula).toBe('Mg3N2');
  });
  it('every combination is electrically neutral and parseable', () => {
    for (const c of CATIONS)
      for (const a of ANIONS) {
        const ic = combineIons(c, a);
        expect(ic.nCation * c.charge + ic.nAnion * a.charge, ic.formula).toBe(0);
        expect(parseSpecies(ic.formula).charge).toBe(0);
      }
  });
  it('names compounds systematically', () => {
    expect(combo('Na', 'Cl').name).toBe('sodium chloride');
    expect(combo('Fe3', 'O').name).toBe('iron(III) oxide');
    expect(combo('Cu2', 'SO4').name).toBe('copper(II) sulfate');
    expect(combo('NH4', 'NO3').name).toBe('ammonium nitrate');
    expect(combo('H', 'SO4').name).toBe('sulfuric acid');
    expect(combo('H', 'Cl').name).toBe('hydrochloric acid');
    expect(combo('H', 'OH').formula).toBe('H2O');
  });
  it('flags combinations that do not really exist', () => {
    expect(combo('Al', 'CO3').warning).toMatch(/not a stable/);
    expect(combo('Na', 'Cl').warning).toBeNull();
  });
});

describe('covalent prefix names', () => {
  const n = (f: string) => covalentName(parseSpecies(f));
  it('uses prefixes and drops mono on the first element', () => {
    expect(n('CO')).toBe('carbon monoxide');
    expect(n('CO2')).toBe('carbon dioxide');
    expect(n('N2O4')).toBe('dinitrogen tetroxide');
    expect(n('PCl5')).toBe('phosphorus pentachloride');
    expect(n('SF6')).toBe('sulfur hexafluoride');
    expect(n('N2O')).toBe('dinitrogen monoxide');
    expect(n('NaCl')).toBeNull();
  });
});

describe('describeCompound', () => {
  it('finds names for library, ionic and covalent formulas', () => {
    expect(describeCompound('NaHCO3').common).toBe('baking soda');
    expect(describeCompound('Al2(SO4)3').name).toBe('aluminium sulfate');
    expect(describeCompound('Al2(SO4)3').type).toBe('ionic');
    expect(describeCompound('SO3').name).toBe('sulfur trioxide');
    expect(describeCompound('H2O').name).toBe('water');
    expect(describeCompound('Ca(OH)2').ions?.nAnion).toBe(2);
  });
  it('computes percent composition that sums to 100', () => {
    const w = describeCompound('H2O');
    const h = w.percent.find((p) => p.symbol === 'H')!;
    expect(h.percent).toBeCloseTo(11.19, 1);
    for (const c of COMPOUNDS) {
      const d = describeCompound(c.formula);
      expect(d.percent.reduce((t, p) => t + p.percent, 0), c.formula).toBeCloseTo(100, 6);
      expect(d.name, c.formula).toBe(c.name);
    }
  });
});
