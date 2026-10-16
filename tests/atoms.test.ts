import { describe, expect, it } from 'vitest';
import { describeAtom, referenceAtom } from '../src/chem/atom';
import {
  configString,
  configuration,
  neutralConfiguration,
  orbitalBoxes,
  shellCounts,
  shorthand,
  totalElectrons,
} from '../src/chem/configuration';
import { ELEMENTS, elementBySymbol, elementByZ, findElement, ionName } from '../src/chem/elements';
import { classifyNucleus, daughter, formatHalfLife, isStable, listedIsotopes, RADIOACTIVE, stableCount, STABLE } from '../src/chem/nuclides';

describe('elements', () => {
  it('has 118 elements with unique symbols and consecutive Z', () => {
    expect(ELEMENTS).toHaveLength(118);
    expect(new Set(ELEMENTS.map((e) => e.symbol)).size).toBe(118);
    ELEMENTS.forEach((e, i) => expect(e.Z).toBe(i + 1));
  });
  it('looks up by Z, symbol, name and number', () => {
    expect(elementByZ(6)?.name).toBe('Carbon');
    expect(elementBySymbol('Na')?.Z).toBe(11);
    expect(findElement('iron')?.symbol).toBe('Fe');
    expect(findElement('cl')?.name).toBe('Chlorine');
    expect(findElement('92')?.symbol).toBe('U');
    expect(elementByZ(0)).toBeNull();
    expect(elementByZ(119)).toBeNull();
  });
  it('places elements in the right group and period', () => {
    const at = (s: string) => elementBySymbol(s)!;
    expect([at('H').group, at('H').period]).toEqual([1, 1]);
    expect([at('He').group, at('He').period]).toEqual([18, 1]);
    expect([at('B').group, at('Al').group, at('Ga').group]).toEqual([13, 13, 13]);
    expect([at('Fe').group, at('Fe').period]).toEqual([8, 4]);
    expect([at('Hf').group, at('Rn').group, at('Og').group]).toEqual([4, 18, 18]);
    expect(at('Ce').group).toBeNull();
    expect([at('La').row, at('Lu').col, at('Lr').row]).toEqual([9, 17, 10]);
  });
  it('periodic table cells do not overlap', () => {
    const cells = new Set(ELEMENTS.map((e) => `${e.row},${e.col}`));
    expect(cells.size).toBe(118);
  });
  it('reference isotopes are known nuclides', () => {
    for (const e of ELEMENTS) {
      const info = classifyNucleus(e.Z, e.refA - e.Z);
      expect(info.estimate, e.symbol).toBe(false);
      expect(['stable', 'radioactive'], e.symbol).toContain(info.status);
    }
  });
  it('names ions', () => {
    expect(ionName(elementBySymbol('Na')!, 1)).toBe('sodium ion');
    expect(ionName(elementBySymbol('Cl')!, -1)).toBe('chloride ion');
    expect(ionName(elementBySymbol('O')!, -2)).toBe('oxide ion');
    expect(ionName(elementBySymbol('Fe')!, 3)).toBe('iron(III) ion');
  });
});

describe('electron configuration', () => {
  const cfg = (Z: number, e = Z) => configString(configuration(Z, e));
  const short = (Z: number, e = Z) => shorthand(configuration(Z, e));

  it('fills by the aufbau order', () => {
    expect(cfg(1)).toBe('1s1');
    expect(cfg(6)).toBe('1s2 2s2 2p2');
    expect(cfg(11)).toBe('1s2 2s2 2p6 3s1');
    expect(short(26)).toBe('[Ar] 3d6 4s2');
    expect(short(35)).toBe('[Ar] 3d10 4s2 4p5');
    expect(short(82)).toBe('[Xe] 4f14 5d10 6s2 6p2');
  });
  it('uses measured exceptions', () => {
    expect(short(24)).toBe('[Ar] 3d5 4s1');
    expect(short(29)).toBe('[Ar] 3d10 4s1');
    expect(short(46)).toBe('[Kr] 4d10');
    expect(short(79)).toBe('[Xe] 4f14 5d10 6s1');
    expect(short(64)).toBe('[Xe] 4f7 5d1 6s2');
    expect(short(103)).toBe('[Rn] 5f14 7s2 7p1');
  });
  it('always contains Z electrons for neutral atoms', () => {
    for (let Z = 1; Z <= 118; Z++) expect(totalElectrons(neutralConfiguration(Z))).toBe(Z);
  });
  it('noble gases end in a closed shell', () => {
    expect(short(10)).toBe('[Ne]');
    expect(short(118)).toBe('[Og]');
  });
  it('removes the highest-n electrons first for cations', () => {
    expect(short(11, 10)).toBe('[Ne]');
    expect(short(26, 24)).toBe('[Ar] 3d6');
    expect(short(26, 23)).toBe('[Ar] 3d5');
    expect(short(29, 27)).toBe('[Ar] 3d9');
    expect(short(50, 48)).toBe('[Kr] 4d10 5s2');
    expect(short(58, 55)).toBe('[Xe] 4f1');
  });
  it('adds electrons in filling order for anions', () => {
    expect(short(17, 18)).toBe('[Ar]');
    expect(short(8, 10)).toBe('[Ne]');
    expect(cfg(1, 2)).toBe('1s2');
  });
  it('groups electrons into Bohr shells by n', () => {
    expect(shellCounts(neutralConfiguration(19))).toEqual([2, 8, 8, 1]);
    expect(shellCounts(neutralConfiguration(26))).toEqual([2, 8, 14, 2]);
    expect(shellCounts(neutralConfiguration(10))).toEqual([2, 8]);
  });
  it("draws orbital boxes with Hund's rule", () => {
    const n = orbitalBoxes(neutralConfiguration(7));
    expect(n.core).toBe('He');
    expect(n.rows).toEqual([
      { label: '2s', boxes: [2] },
      { label: '2p', boxes: [1, 1, 1] },
    ]);
    const o = orbitalBoxes(neutralConfiguration(8));
    expect(o.rows[1].boxes).toEqual([2, 1, 1]);
  });
});

describe('nuclides', () => {
  it('lists the 251 stable nuclides', () => {
    expect(stableCount()).toBe(251);
    expect(STABLE[43]).toBeUndefined();
    expect(STABLE[61]).toBeUndefined();
    expect(Object.keys(STABLE).every((z) => Number(z) <= 82)).toBe(true);
  });
  it('never lists a nuclide as both stable and radioactive', () => {
    for (const r of RADIOACTIVE) expect(isStable(r.Z, r.A), `${r.Z}-${r.A}`).toBe(false);
    const keys = RADIOACTIVE.map((r) => `${r.Z}-${r.A}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('classifies well-known nuclides', () => {
    expect(classifyNucleus(6, 6).status).toBe('stable');
    const c14 = classifyNucleus(6, 8);
    expect(c14.status).toBe('radioactive');
    expect(c14.modes).toEqual(['β-']);
    expect(c14.estimate).toBe(false);
    expect(formatHalfLife(c14.halfLife!)).toBe('5,700 years');
    expect(classifyNucleus(83, 126).status).toBe('radioactive'); // Bi-209
    expect(classifyNucleus(92, 146).modes).toEqual(['α']);
    expect(classifyNucleus(2, 3).status).toBe('unbound'); // He-5
    expect(classifyNucleus(4, 4).modes).toEqual(['2α']); // Be-8
  });
  it('marks estimates and unbound extremes', () => {
    const h10 = classifyNucleus(1, 10);
    expect(h10.status).toBe('unbound');
    const heavyN = classifyNucleus(20, 60);
    expect(heavyN.status).toBe('unbound');
    expect(heavyN.estimate).toBe(true);
    const fe50 = classifyNucleus(26, 24);
    expect(fe50.estimate).toBe(true);
    expect(fe50.modes).toEqual(['β+']);
    const fe62 = classifyNucleus(26, 36);
    expect(fe62.modes).toEqual(['β-']);
  });
  it('handles free neutrons and empty nuclei', () => {
    expect(classifyNucleus(0, 0).status).toBe('empty');
    expect(classifyNucleus(0, 1).status).toBe('neutron');
    expect(classifyNucleus(0, 4).status).toBe('neutrons');
  });
  it('computes decay products', () => {
    expect(daughter(6, 8, 'β-')).toEqual({ Z: 7, N: 7 });
    expect(daughter(92, 146, 'α')).toEqual({ Z: 90, N: 144 });
    expect(daughter(6, 5, 'β+')).toEqual({ Z: 5, N: 6 });
  });
  it('lists isotopes of an element', () => {
    const c = listedIsotopes(6).map((i) => i.A);
    expect(c).toContain(12);
    expect(c).toContain(14);
    expect(c).toEqual([...c].sort((a, b) => a - b));
  });
});

describe('describeAtom', () => {
  it('describes isotopes and ions', () => {
    const c14 = describeAtom({ protons: 6, neutrons: 8, electrons: 6 });
    expect(c14.isotopeName).toBe('carbon-14');
    expect(c14.isotopeSymbol).toBe('¹⁴C');
    expect(c14.charge).toBe(0);
    const na = describeAtom({ protons: 11, neutrons: 12, electrons: 10 });
    expect(na.ionSymbol).toBe('Na⁺');
    expect(na.kindName).toBe('sodium ion');
    expect(na.nobleGasLike).toBe('Ne');
    expect(na.isCommonIon).toBe(true);
    const o = describeAtom({ protons: 8, neutrons: 8, electrons: 10 });
    expect(o.ionSymbol).toBe('O²⁻');
    expect(o.shells).toEqual([2, 8]);
    expect(o.outerElectrons).toBe(8);
  });
  it('builds reference atoms', () => {
    expect(referenceAtom(26)).toEqual({ protons: 26, neutrons: 30, electrons: 26 });
    expect(describeAtom(referenceAtom(1)).nucleus.status).toBe('stable');
  });
  it('flags d-block ion configurations as rule-based', () => {
    expect(describeAtom({ protons: 26, neutrons: 30, electrons: 23 }).configMeasured).toBe(false);
    expect(describeAtom({ protons: 11, neutrons: 12, electrons: 10 }).configMeasured).toBe(true);
    expect(describeAtom({ protons: 110, neutrons: 171, electrons: 110 }).configMeasured).toBe(false);
  });
});
