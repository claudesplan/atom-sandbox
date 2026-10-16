import { describeAtom, type AtomState } from '../chem/atom';
import { elementByZ } from '../chem/elements';
import { checkBalance, equationToText, parseEquation, type Equation } from '../chem/equation';
import { reactionById } from '../chem/reactions';

export interface Criterion {
  label: string;
  pass: boolean;
}

interface Base {
  id: string;
  level: number;
  title: string;
  goal: string;
  hints: string[];
  /** fun fact shown after completing */
  fact?: string;
}

export interface AtomChallenge extends Base {
  kind: 'atom';
  answer: AtomState;
  criteria: (a: AtomState) => Criterion[];
}

export interface EquationChallenge extends Base {
  kind: 'equation';
  reactionId: string;
}

export type Challenge = AtomChallenge | EquationChallenge;

export const LEVELS: { n: number; name: string }[] = [
  { n: 1, name: 'Building atoms' },
  { n: 2, name: 'Isotopes' },
  { n: 3, name: 'Ions' },
  { n: 4, name: 'Balancing equations' },
  { n: 5, name: 'Harder balancing' },
  { n: 6, name: 'Ions and charge' },
];

// ---------- atom criteria ----------

const name = (Z: number) => elementByZ(Z)!.name.toLowerCase();

function isElement(Z: number) {
  return (a: AtomState): Criterion => ({ label: `The element is ${name(Z)} (${Z} proton${Z === 1 ? '' : 's'} decide this)`, pass: a.protons === Z });
}
function massNumber(A: number) {
  return (a: AtomState): Criterion => ({ label: `Mass number is ${A} (protons + neutrons)`, pass: a.protons + a.neutrons === A });
}
function charge(q: number) {
  const txt = q === 0 ? 'The atom is neutral (charge 0)' : `Charge is ${q > 0 ? '+' : '−'}${Math.abs(q)}`;
  return (a: AtomState): Criterion => ({ label: txt, pass: a.protons - a.electrons === q });
}
function stable() {
  return (a: AtomState): Criterion => ({ label: 'The nucleus is a stable isotope', pass: describeAtom(a).nucleus.status === 'stable' });
}
function radioactiveBy(mode: 'β+' | 'β-' | 'α') {
  return (a: AtomState): Criterion => {
    const n = describeAtom(a).nucleus;
    return { label: `The nucleus is radioactive and decays by ${mode === 'β+' ? 'β⁺' : mode === 'β-' ? 'β⁻' : 'α'} (measured data, not an estimate)`, pass: n.status === 'radioactive' && !n.estimate && n.modes.includes(mode) };
  };
}
function noElectrons() {
  return (a: AtomState): Criterion => ({ label: 'No electrons at all', pass: a.electrons === 0 });
}

function atom(id: string, level: number, title: string, goal: string, answer: [number, number, number], crit: ((a: AtomState) => Criterion)[], hints: string[], fact?: string): AtomChallenge {
  return { id, level, kind: 'atom', title, goal, answer: { protons: answer[0], neutrons: answer[1], electrons: answer[2] }, criteria: (a) => crit.map((f) => f(a)), hints, fact };
}

function eqc(id: string, level: number, reactionId: string, hints: string[], fact?: string): EquationChallenge {
  const r = reactionById(reactionId)!;
  const parsed = parseEquation(r.equation);
  const pretty = parsed.ok ? equationToText(parsed.eq, parsed.eq.terms.map(() => 1)) : r.equation;
  return { id, level, kind: 'equation', title: `Balance: ${r.name}`, goal: `Balance ${pretty} using the smallest whole numbers.`, reactionId, hints, fact };
}

export const CHALLENGES: Challenge[] = [
  // Level 1
  atom('h1', 1, 'Hydrogen', 'Build a neutral hydrogen atom — the simplest atom there is.', [1, 0, 1], [isElement(1), massNumber(1), charge(0)], [
    'Hydrogen is element number 1. The number of protons is the atomic number.',
    'A neutral atom has exactly as many electrons as protons.',
    'Ordinary hydrogen has no neutrons at all: 1 proton, 0 neutrons, 1 electron.',
  ], 'About 3/4 of the ordinary matter in the universe is hydrogen.'),
  atom('he4', 1, 'Helium-4', 'Build a neutral helium-4 atom.', [2, 2, 2], [isElement(2), massNumber(4), charge(0)], [
    'Helium is element 2, so it has 2 protons.',
    'The “4” in helium-4 is the mass number: protons + neutrons = 4.',
    'You need 2 neutrons and 2 electrons.',
  ], 'Helium-4 nuclei are so tightly bound that radioactive atoms often throw them out whole — that is an α particle.'),
  atom('li7', 1, 'Lithium-7', 'Build a neutral lithium-7 atom. Watch the electrons start a second shell.', [3, 4, 3], [isElement(3), massNumber(7), charge(0)], [
    'Lithium is element 3. Find it on the periodic table below.',
    'Neutrons = mass number − protons = 7 − 3.',
    '3 protons, 4 neutrons, 3 electrons. The first shell only holds 2 electrons, so the third goes into shell 2.',
  ]),
  atom('c12', 1, 'Carbon-12', 'Build a neutral carbon-12 atom, the atom of life.', [6, 6, 6], [isElement(6), massNumber(12), charge(0)], [
    'Carbon is element 6.',
    'Carbon-12 has as many neutrons as protons.',
    '6 protons, 6 neutrons, 6 electrons.',
  ], 'The atomic mass unit is defined as exactly 1/12 of the mass of a carbon-12 atom.'),
  atom('ne20', 1, 'Neon: a full shell', 'Build a neutral neon-20 atom. Notice that its outer shell is full.', [10, 10, 10], [isElement(10), massNumber(20), charge(0)], [
    'Neon is element 10, a noble gas in group 18.',
    'Neon-20 has 10 neutrons.',
    '10 electrons fill shell 1 (2) and shell 2 (8) completely — that is why neon hardly reacts.',
  ]),
  // Level 2
  atom('d2', 2, 'Deuterium', 'Build “heavy hydrogen”: a neutral hydrogen atom with mass number 2.', [1, 1, 1], [isElement(1), massNumber(2), charge(0), stable()], [
    'Isotopes of an element have the same number of protons but different numbers of neutrons.',
    'Keep 1 proton and add 1 neutron.',
  ], 'Deuterium is stable. About 1 in 6,400 hydrogen atoms in sea water is deuterium.'),
  atom('c14', 2, 'Carbon-14', 'Build a neutral carbon-14 atom — the isotope used for radiocarbon dating.', [6, 8, 6], [isElement(6), massNumber(14), charge(0)], [
    'Carbon always has 6 protons, whatever the isotope.',
    'Mass number 14 = protons + neutrons, so neutrons = 14 − 6.',
    '6 protons, 8 neutrons, 6 electrons. Then look at the Nucleus panel: it is radioactive.',
  ], 'Carbon-14 has a half-life of about 5,700 years: after that time half of it has turned into nitrogen-14 by β⁻ decay.'),
  atom('t3', 2, 'Tritium', 'Build a neutral hydrogen isotope that is radioactive.', [1, 2, 1], [isElement(1), charge(0), radioactiveBy('β-')], [
    'Hydrogen-1 and hydrogen-2 are both stable. Try adding more neutrons.',
    'Hydrogen-3 (tritium) has 2 neutrons. With more than that the nucleus falls apart instantly.',
  ], 'Tritium makes the glow in some watch dials and emergency exit signs.'),
  atom('c11', 2, 'A proton-rich isotope', 'Build a neutral carbon isotope that decays by β⁺ (positron) emission.', [6, 5, 6], [isElement(6), charge(0), radioactiveBy('β+')], [
    'Nuclei with too few neutrons turn a proton into a neutron: β⁺ decay.',
    'Try carbon with fewer neutrons than protons.',
    'Carbon-11 (5 neutrons) or carbon-10 (4 neutrons) both work.',
  ], 'Carbon-11 is used in PET scans: the positrons it emits are detected as pairs of gamma rays.'),
  atom('ni62', 2, 'The most tightly bound nucleus', 'Build a neutral nickel-62 atom — its nucleus has the highest binding energy per nucleon of all.', [28, 34, 28], [isElement(28), massNumber(62), charge(0), stable()], [
    'Nickel is element 28. Click it on the periodic table to jump there.',
    'Neutrons = 62 − 28. Use the number fields in the Particles panel instead of clicking 34 times!',
  ], 'Iron-56 is often quoted as the most tightly bound nucleus, but measured masses show nickel-62 just beats it (8.795 vs 8.790 MeV per nucleon).'),
  atom('u235', 2, 'Uranium-235', 'Build a neutral uranium-235 atom, the fuel of nuclear reactors.', [92, 143, 92], [isElement(92), massNumber(235), charge(0)], [
    'Uranium is element 92 — the bottom row of the periodic table.',
    'Neutrons = 235 − 92 = 143. Type the numbers into the Particles panel.',
  ], 'Only 0.72 % of natural uranium is U-235; the rest is mostly U-238.'),
  // Level 3
  atom('na+', 3, 'Sodium ion Na⁺', 'Make a sodium ion with charge +1, using the stable isotope sodium-23.', [11, 12, 10], [isElement(11), massNumber(23), charge(1)], [
    'Ions are made by adding or removing electrons — never protons.',
    'A charge of +1 means one more proton than electrons.',
    '11 protons, 12 neutrons, 10 electrons. Look: the electron arrangement is now the same as neon’s.',
  ], 'Sodium loses its single outer electron very easily — that is why sodium metal reacts violently with water.'),
  atom('cl-', 3, 'Chloride ion Cl⁻', 'Make a chloride ion (charge −1) with a stable chlorine nucleus.', [17, 18, 18], [isElement(17), charge(-1), stable()], [
    'A negative ion has more electrons than protons.',
    'Chlorine has 17 protons; stable chlorine is chlorine-35 or chlorine-37.',
    '17 protons, 18 (or 20) neutrons, 18 electrons — the same arrangement as argon.',
  ]),
  atom('mg2+', 3, 'Magnesium ion Mg²⁺', 'Make a magnesium ion with charge +2 and a stable nucleus.', [12, 12, 10], [isElement(12), charge(2), stable()], [
    'Magnesium is in group 2: it has 2 electrons in its outer shell.',
    'Remove both outer electrons: 12 protons, 10 electrons. Magnesium-24 has 12 neutrons.',
  ]),
  atom('o2-', 3, 'Oxide ion O²⁻', 'Make an oxide ion (charge −2) with a stable nucleus.', [8, 8, 10], [isElement(8), charge(-2), stable()], [
    'Oxygen is in group 16: it needs 2 more electrons to fill its outer shell.',
    '8 protons, 8 neutrons (oxygen-16), 10 electrons.',
  ], 'An isolated O²⁻ ion would actually throw off an electron; it only exists surrounded by positive ions, e.g. in MgO crystals.'),
  atom('fe3+', 3, 'Iron(III) ion Fe³⁺', 'Make an iron(III) ion, Fe³⁺, with the most common iron nucleus (iron-56).', [26, 30, 23], [isElement(26), massNumber(56), charge(3)], [
    'Iron is element 26. Click it on the periodic table.',
    'Charge +3 means 3 fewer electrons than protons.',
    'Look at the configuration: the 4s electrons leave before the 3d ones, giving [Ar] 3d⁵.',
  ]),
  atom('alpha', 3, 'An α particle', 'Build an α particle: a helium-4 nucleus with no electrons at all.', [2, 2, 0], [isElement(2), massNumber(4), noElectrons()], [
    'An α particle is what some radioactive nuclei throw out.',
    'It is a helium-4 nucleus: 2 protons and 2 neutrons, with all electrons removed (charge +2).',
  ]),
  // Level 4
  eqc('eq-water', 4, 'water', ['Count the oxygen atoms: 2 on the left, 1 on the right.', 'Put a 2 in front of H₂O. Now count the hydrogens again.', 'The answer is 2H₂ + O₂ → 2H₂O.']),
  eqc('eq-methane', 4, 'methane', ['Balance carbon first, then hydrogen, and oxygen last.', 'CH₄ has 4 H atoms; each H₂O has 2. So you need 2 H₂O.', 'Now there are 4 O atoms on the right: you need 2 O₂.']),
  eqc('eq-nacl', 4, 'nacl', ['Chlorine comes as Cl₂ — two atoms per molecule.', 'Make 2 NaCl, then you need 2 Na.']),
  eqc('eq-haber', 4, 'haber', ['N₂ gives 2 nitrogen atoms, so you need 2 NH₃.', '2 NH₃ contains 6 H atoms. How many H₂ is that?']),
  eqc('eq-mgo', 4, 'mgo', ['Oxygen comes in pairs (O₂), MgO has one O.', '2 MgO uses one O₂ — then balance Mg.']),
  eqc('eq-h2o2', 4, 'h2o2', ['O₂ has an even number of O atoms; try an even number of H₂O₂.', '2H₂O₂ → 2H₂O + O₂']),
  eqc('eq-zinc', 4, 'zinc', ['ZnCl₂ needs 2 chlorine atoms.', 'Each HCl gives only one Cl.']),
  eqc('eq-caoh', 4, 'caoh', ['(OH)₂ means 2 O and 2 H atoms.', 'The right side has 4 H in total (2 in Ca(OH)₂, 2 in H₂).', 'You need 2 H₂O.']),
  // Level 5
  eqc('eq-rust', 5, 'rust', ['Fe₂O₃ has 3 O atoms but O₂ has 2: find a number that both 2 and 3 divide.', 'Try 2 Fe₂O₃ (6 O atoms).', '4Fe + 3O₂ → 2Fe₂O₃']),
  eqc('eq-propane', 5, 'propane', ['Carbon first: 3 C atoms make 3 CO₂.', '8 H atoms make 4 H₂O.', 'Count O on the right: 3×2 + 4×1 = 10 — that is 5 O₂.']),
  eqc('eq-kclo3', 5, 'kclo3', ['KClO₃ has 3 O; O₂ has 2. Use 2 KClO₃ (6 O).', '6 O atoms make 3 O₂.']),
  eqc('eq-al2o3', 5, 'al2o3', ['Same trick as rust: 2 and 3 meet at 6.', '4Al + 3O₂ → 2Al₂O₃']),
  eqc('eq-ethanol', 5, 'ethanol', ['C₂H₅OH has 6 H atoms in total (5 + 1) and one O atom already.', '2 CO₂ and 3 H₂O: 7 O atoms on the right.', 'One O comes from ethanol, so 6 from O₂: 3 O₂.']),
  eqc('eq-photo', 5, 'photo', ['Glucose has 6 C, 12 H and 6 O atoms.', '6 CO₂ and 6 H₂O give the C and H.', 'Count O: 6×2 + 6×1 = 18 on the left; glucose uses 6, so 12 more — 6 O₂.']),
  eqc('eq-octane', 5, 'octane', ['Pretend you can use half molecules: 1 C₈H₁₈ needs 8 CO₂ and 9 H₂O.', 'That is 25 O atoms = 12½ O₂. Double everything to get whole numbers.', '2C₈H₁₈ + 25O₂ → 16CO₂ + 18H₂O']),
  // Level 6
  eqc('eq-pbi2', 6, 'pbi2', ['Pb²⁺ has charge +2, each I⁻ has −1.', 'PbI₂ is neutral, so you need two I⁻ for each Pb²⁺.'], 'The total charge is 0 on both sides — charge is conserved like atoms are.'),
  eqc('eq-cl2e', 6, 'cl2e', ['Cl₂ contains two chlorine atoms.', 'Two Cl⁻ ions carry charge −2 in total, so two electrons are needed.'], 'Half-equations show electrons explicitly; in a full reaction the electrons gained equal the electrons lost.'),
  eqc('eq-alcu', 6, 'alcu', ['Atoms balance with 1 of each — but check the charge: +2 on the left, +3 on the right.', 'Al³⁺ and Cu²⁺: find a total charge that both 3 and 2 divide.', '2 Al³⁺ (+6) and 3 Cu²⁺ (+6).'], 'Aluminium atoms give 3 electrons each, copper ions take 2 each: 6 electrons change hands.'),
  eqc('eq-mno4', 6, 'mno4', [
    'Start with the electrons: Mn goes from +7 to +2 (gains 5), each Fe²⁺ → Fe³⁺ loses 1. So 5 Fe²⁺ per MnO₄⁻.',
    'The 4 O atoms of MnO₄⁻ end up in 4 H₂O, which need 8 H⁺.',
    'MnO₄⁻ + 8H⁺ + 5Fe²⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O. Check the charges: 17+ on both sides.',
  ]),
];

export function challengeById(id: string | null): Challenge | null {
  return CHALLENGES.find((c) => c.id === id) ?? null;
}

export function challengeEquation(c: EquationChallenge): Equation {
  const r = parseEquation(reactionById(c.reactionId)!.equation);
  if (!r.ok) throw new Error(r.error);
  return r.eq;
}

/** Same species in the same order (the player has not replaced the equation). */
export function sameSpecies(a: Equation, b: Equation): boolean {
  return a.terms.length === b.terms.length && a.terms.every((t, i) => t.side === b.terms[i].side && t.species.text === b.terms[i].species.text);
}

export function equationCriteria(eq: Equation, coefs: number[]): Criterion[] {
  const chk = checkBalance(eq, coefs);
  const off = chk.elements.filter((e) => e.left !== e.right).map((e) => e.symbol);
  const hasCharge = eq.terms.some((t) => t.species.charge !== 0);
  const out: Criterion[] = [{ label: off.length ? `Every element balanced (not yet: ${off.join(', ')})` : 'Every element balanced', pass: off.length === 0 }];
  if (hasCharge) out.push({ label: `Total charge equal on both sides (${fmtCharge(chk.chargeLeft)} vs ${fmtCharge(chk.chargeRight)})`, pass: chk.chargeBalanced });
  out.push({ label: 'Smallest whole numbers (no common factor)', pass: chk.lowestTerms && chk.allPositive });
  return out;
}

function fmtCharge(q: number): string {
  return q === 0 ? '0' : q > 0 ? `+${q}` : `−${-q}`;
}

export function criteriaFor(c: Challenge, atomState: AtomState, eq: Equation | null, coefs: number[]): Criterion[] {
  if (c.kind === 'atom') return c.criteria(atomState);
  if (!eq || !sameSpecies(eq, challengeEquation(c))) return [{ label: 'The challenge equation is loaded (press “Restart challenge” if you changed it)', pass: false }];
  return equationCriteria(eq, coefs);
}

export function pointsFor(hintsUsed: number): number {
  return Math.max(25, 100 - 25 * hintsUsed);
}

export function starsFor(hintsUsed: number): number {
  return hintsUsed === 0 ? 3 : hintsUsed === 1 ? 2 : 1;
}
