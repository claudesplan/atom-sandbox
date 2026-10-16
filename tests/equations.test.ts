import { describe, expect, it } from 'vitest';
import { balance, checkBalance, equationToText, parseEquation, type Equation } from '../src/chem/equation';
import { molarMass, normaliseText, parseSpecies, prettyFormula } from '../src/chem/formula';
import { REACTIONS } from '../src/chem/reactions';
import { STRUCTURES, structureFor } from '../src/chem/structures';
import { CHALLENGES, challengeEquation, criteriaFor, pointsFor } from '../src/game/challenges';
import { emptyProgress, loadProgress, PROGRESS_KEY, recordResult, saveProgress, totals } from '../src/game/progress';

const counts = (s: string) => Object.fromEntries(parseSpecies(s).counts);

function eq(text: string): Equation {
  const r = parseEquation(text);
  if (!r.ok) throw new Error(r.error);
  return r.eq;
}

describe('formula parsing', () => {
  it('counts atoms', () => {
    expect(counts('H2O')).toEqual({ H: 2, O: 1 });
    expect(counts('C6H12O6')).toEqual({ C: 6, H: 12, O: 6 });
    expect(counts('Ca(OH)2')).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(counts('Fe2(SO4)3')).toEqual({ Fe: 2, S: 3, O: 12 });
    expect(counts('CuSO4.5H2O')).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
    expect(counts('CuSO₄·5H₂O')).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
    expect(counts('C2H5OH')).toEqual({ C: 2, H: 6, O: 1 });
    expect(counts('K4[Fe(CN)6]')).toEqual({ K: 4, Fe: 1, C: 6, N: 6 });
  });
  it('reads charges in several notations', () => {
    expect(parseSpecies('Na+').charge).toBe(1);
    expect(parseSpecies('Cl-').charge).toBe(-1);
    expect(parseSpecies('SO4^2-').charge).toBe(-2);
    expect(counts('SO4^2-')).toEqual({ S: 1, O: 4 });
    expect(parseSpecies('SO42-').charge).toBe(-2);
    expect(parseSpecies('Fe3+').charge).toBe(3);
    expect(counts('Fe3+')).toEqual({ Fe: 1 });
    expect(parseSpecies('NH4+').charge).toBe(1);
    expect(counts('NH4+')).toEqual({ N: 1, H: 4 });
    expect(parseSpecies('SO₄²⁻').charge).toBe(-2);
    expect(parseSpecies('Mg++').charge).toBe(2);
    expect(parseSpecies('e-').isElectron).toBe(true);
    expect(parseSpecies('NaCl(s)').state).toBe('s');
  });
  it('rejects bad formulas with helpful messages', () => {
    expect(() => parseSpecies('Xx2')).toThrow(/Unknown element/);
    expect(() => parseSpecies('h2o')).toThrow(/capital/);
    expect(() => parseSpecies('CA')).toThrow(/Unknown element/);
    expect(() => parseSpecies('Ca(OH2')).toThrow(/Missing/);
    expect(() => parseSpecies('H^2+')).toThrow(/impossible/);
  });
  it('formats prettily', () => {
    expect(prettyFormula(parseSpecies('SO4^2-'))).toBe('SO₄²⁻');
    expect(prettyFormula(parseSpecies('CuSO4.5H2O'))).toBe('CuSO₄·5H₂O');
    expect(normaliseText('Fe³⁺')).toBe('Fe^3+');
  });
  it('computes molar masses from standard atomic weights', () => {
    expect(molarMass(parseSpecies('H2O')).value).toBeCloseTo(18.015, 3);
    expect(molarMass(parseSpecies('CO2')).value).toBeCloseTo(44.009, 3);
    expect(molarMass(parseSpecies('Tc')).approx).toBe(true);
  });
});

describe('equations', () => {
  it('parses arrows, coefficients and ionic terms', () => {
    const e = eq('2H2 + O2 → 2H2O');
    expect(e.terms.map((t) => t.side)).toEqual(['left', 'left', 'right']);
    expect(e.typedCoefs).toEqual([2, 1, 2]);
    const ions = eq('Na+ + Cl- -> NaCl');
    expect(ions.terms.map((t) => t.species.charge)).toEqual([1, -1, 0]);
    const tight = eq('H2+O2=H2O');
    expect(tight.terms).toHaveLength(3);
    const el = eq('Fe^3+ + e- -> Fe^2+');
    expect(el.terms[1].species.isElectron).toBe(true);
  });
  it('reports errors', () => {
    expect(parseEquation('H2 + O2').ok).toBe(false);
    expect(parseEquation('H2 -> O2 -> H2O').ok).toBe(false);
    expect(parseEquation('H2 + -> H2O').ok).toBe(false);
    const lower = parseEquation('C12H22O11 + o2 -> CO2 + H2O');
    expect(!lower.ok && lower.error).toMatch(/“o2”.*capital/);
  });
  it('counts atoms on each side', () => {
    const e = eq('CH4 + O2 -> CO2 + H2O');
    const c = checkBalance(e, [1, 1, 1, 1]);
    expect(c.elements).toEqual([
      { symbol: 'C', left: 1, right: 1 },
      { symbol: 'H', left: 4, right: 2 },
      { symbol: 'O', left: 2, right: 3 },
    ]);
    expect(c.balanced).toBe(false);
    const ok = checkBalance(e, [1, 2, 1, 2]);
    expect(ok.balanced).toBe(true);
    expect(ok.lowestTerms).toBe(true);
    const doubled = checkBalance(e, [2, 4, 2, 4]);
    expect(doubled.balanced).toBe(true);
    expect(doubled.lowestTerms).toBe(false);
  });
  it('checks charge conservation', () => {
    const e = eq('Fe^3+ + e- -> Fe^2+');
    expect(checkBalance(e, [1, 1, 1]).balanced).toBe(true);
    expect(checkBalance(e, [1, 2, 1]).chargeBalanced).toBe(false);
    const fake = eq('Fe^3+ -> Fe^2+');
    expect(checkBalance(fake, [1, 1]).atomsBalanced).toBe(true);
    expect(checkBalance(fake, [1, 1]).balanced).toBe(false);
    expect(balance(fake).ok).toBe(false);
  });
  it('balances every library reaction to its known answer', () => {
    for (const r of REACTIONS) {
      const res = balance(eq(r.equation));
      expect(res.ok ? res.coefs : res, r.id).toEqual(r.answer);
      expect(checkBalance(eq(r.equation), r.answer).balanced, r.id).toBe(true);
    }
  });
  it('explains impossible and ambiguous equations', () => {
    const imp = balance(eq('H2 -> O2'));
    expect(imp.ok).toBe(false);
    expect(!imp.ok && imp.reason).toBe('impossible');
    const amb = balance(eq('H2 + O2 -> H2O + H2O2'));
    expect(!amb.ok && amb.reason).toBe('ambiguous');
  });
  it('balances bigger equations exactly', () => {
    const r = balance(eq('K4[Fe(CN)6] + KMnO4 + H2SO4 -> KHSO4 + Fe2(SO4)3 + MnSO4 + HNO3 + CO2 + H2O'));
    expect(r.ok && r.coefs).toEqual([10, 122, 299, 162, 5, 122, 60, 60, 188]);
  });
  it('prints equations', () => {
    const e = eq('H2 + O2 -> H2O');
    expect(equationToText(e, [2, 1, 2])).toBe('2H₂ + O₂ → 2H₂O');
  });
});

describe('molecule drawings', () => {
  it('every library drawing has exactly the atoms and charge of its formula', () => {
    for (const [key, s] of Object.entries(STRUCTURES)) {
      const sp = parseSpecies(key);
      const drawn: Record<string, number> = {};
      for (const a of s.atoms) drawn[a.el] = (drawn[a.el] ?? 0) + 1;
      expect(drawn, key).toEqual(Object.fromEntries(sp.counts));
      const q = s.kind === 'electron' ? -1 : s.atoms.reduce((t, a) => t + (a.charge ?? 0), 0) + s.groups.reduce((t, g) => t + g.charge, 0);
      expect(q, key).toBe(sp.charge);
    }
  });
  it('every species in the reaction library has a drawing', () => {
    for (const r of REACTIONS) for (const t of eq(r.equation).terms) expect(STRUCTURES[t.species.text], `${r.id}: ${t.species.text}`).toBeDefined();
  });
  it('bonds respect simple valences in molecules', () => {
    const valence: Record<string, number> = { H: 1, C: 4, N: 3, O: 2, Cl: 1 };
    for (const key of ['H2O', 'CH4', 'CO2', 'NH3', 'C3H8', 'C8H18', 'C2H5OH', 'C6H12O6', 'H2O2', 'N2', 'O2']) {
      const s = STRUCTURES[key];
      s.atoms.forEach((a, i) => {
        const order = s.bonds.filter((b) => !b.ionic && (b.a === i || b.b === i)).reduce((t, b) => t + b.order, 0);
        expect(order, `${key} atom ${i} ${a.el}`).toBe(valence[a.el]);
      });
    }
  });
  it('falls back to an honest loose cluster for unknown structures', () => {
    const s = structureFor(parseSpecies('C12H22O11'));
    expect(s.kind).toBe('unknown');
    expect(s.bonds).toHaveLength(0);
    expect(s.atoms).toHaveLength(45);
  });
});

describe('challenges and progress', () => {
  it('every atom challenge answer passes its own criteria', () => {
    for (const c of CHALLENGES) {
      if (c.kind !== 'atom') continue;
      expect(c.criteria(c.answer).every((k) => k.pass), c.id).toBe(true);
      expect(c.criteria({ protons: 0, neutrons: 0, electrons: 0 }).every((k) => k.pass), c.id).toBe(false);
    }
  });
  it('every equation challenge is solved by the library answer only', () => {
    for (const c of CHALLENGES) {
      if (c.kind !== 'equation') continue;
      const e = challengeEquation(c);
      const ans = REACTIONS.find((r) => r.id === c.reactionId)!.answer;
      const pass = (coefs: number[]) => criteriaFor(c, { protons: 0, neutrons: 0, electrons: 0 }, e, coefs).every((k) => k.pass);
      expect(pass(ans), c.id).toBe(true);
      expect(pass(ans.map((x) => x * 2)), c.id).toBe(false);
      // challenges start with every coefficient at 1, which must not already be the answer
      expect(pass(ans.map(() => 1)), c.id).toBe(false);
    }
  });
  it('has unique ids and at least one hint each', () => {
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length);
    for (const c of CHALLENGES) expect(c.hints.length, c.id).toBeGreaterThan(0);
  });
  it('scores and stores progress', () => {
    expect(pointsFor(0)).toBe(100);
    expect(pointsFor(2)).toBe(50);
    expect(pointsFor(9)).toBe(25);
    let p = emptyProgress();
    p = recordResult(p, 'h1', { stars: 2, points: 75, hints: 1, revealed: false, at: 1 });
    p = recordResult(p, 'h1', { stars: 1, points: 50, hints: 2, revealed: false, at: 2 });
    expect(p.results.h1.points).toBe(75);
    p = recordResult(p, 'c14', { stars: 0, points: 0, hints: 0, revealed: true, at: 3 });
    expect(totals(p)).toEqual({ solved: 1, stars: 2, points: 75 });
    const mem = new Map<string, string>();
    const storage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v) };
    saveProgress(p, storage);
    expect(mem.has(PROGRESS_KEY)).toBe(true);
    expect(loadProgress(storage)).toEqual(p);
    mem.set(PROGRESS_KEY, '{broken');
    expect(loadProgress(storage)).toEqual(emptyProgress());
  });
});
