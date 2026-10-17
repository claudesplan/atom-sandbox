/**
 * Randomly generated practice challenges. Deterministic: the same difficulty, kind and seed always give the
 * same challenge, so a "practice code" such as MQ-4821 can be shared and replayed.
 */
import { chargeSymbol, describeAtom, type AtomState } from '../chem/atom';
import { BOND_EXPLAIN, BOND_LABEL, classifyBond, pairCompound, type BondType } from '../chem/bonding';
import { configuration, isoelectronicNobleGas, prettyConfig, shorthand } from '../chem/configuration';
import { COMMON_IONS, elementBySymbol, elementByZ } from '../chem/elements';
import { balance, equationToText, parseEquation } from '../chem/equation';
import { prettyFormula } from '../chem/formula';
import { DECAY_LABEL, listedIsotopes, superscript, type DecayMode } from '../chem/nuclides';
import type { AtomChallenge, Challenge, Criterion, Difficulty, EquationChallenge, GeneratedInfo, QuizChallenge } from './challenges';

export type PracticeKind = 'atom' | 'equation' | 'quiz' | 'mixed';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
export const DIFFICULTY_POINTS: Record<Difficulty, number> = { easy: 50, medium: 100, hard: 150 };

const KIND_CODE: Record<Exclude<PracticeKind, 'mixed'>, string> = { atom: 'A', equation: 'Q', quiz: 'B' };
const DIFF_CODE: Record<Difficulty, string> = { easy: 'E', medium: 'M', hard: 'H' };

export type Generated = Challenge & { generated: GeneratedInfo };

/** Small seeded PRNG (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const pick = <T>(r: Rand, list: readonly T[]): T => list[Math.floor(r() * list.length)];
const nameOf = (Z: number) => elementByZ(Z)!.name.toLowerCase();

export function practiceCode(difficulty: Difficulty, kind: Exclude<PracticeKind, 'mixed'>, seed: number): string {
  return `${DIFF_CODE[difficulty]}${KIND_CODE[kind]}-${seed}`;
}

export function parsePracticeCode(code: string): { difficulty: Difficulty; kind: Exclude<PracticeKind, 'mixed'>; seed: number } | null {
  const m = /^([EMH])([AQB])-(\d{1,9})$/i.exec(code.trim());
  if (!m) return null;
  const difficulty = (Object.keys(DIFF_CODE) as Difficulty[]).find((d) => DIFF_CODE[d] === m[1].toUpperCase())!;
  const kind = (Object.keys(KIND_CODE) as Exclude<PracticeKind, 'mixed'>[]).find((k) => KIND_CODE[k] === m[2].toUpperCase())!;
  return { difficulty, kind, seed: Number(m[3]) };
}

export function randomSeed(): number {
  return 1 + Math.floor(Math.random() * 99999);
}

/** Generate a practice challenge. For 'mixed' the kind is chosen from the seed. */
export function generateChallenge(difficulty: Difficulty, kind: PracticeKind, seed: number): Generated {
  const r = rng(seed * 7919 + difficulty.length * 31);
  const k: Exclude<PracticeKind, 'mixed'> = kind === 'mixed' ? pick(r, ['atom', 'equation', 'quiz'] as const) : kind;
  const code = practiceCode(difficulty, k, seed);
  const base = { id: `rnd-${code}`, level: 0, generated: { difficulty, seed } };
  const c = k === 'atom' ? genAtom(r, difficulty) : k === 'equation' ? genEquation(r, difficulty) : genQuiz(r, difficulty);
  return { ...c, ...base, title: `${DIFFICULTY_LABEL[difficulty]} practice ${code}` } as Generated;
}

// ---------- atoms ----------

type AtomCrit = (a: AtomState) => Criterion;
const cElement = (Z: number): AtomCrit => (a) => ({ label: `The element is ${nameOf(Z)}`, pass: a.protons === Z });
const cMass = (A: number): AtomCrit => (a) => ({ label: `Mass number is ${A}`, pass: a.protons + a.neutrons === A });
const cCharge = (q: number): AtomCrit => (a) => ({ label: q === 0 ? 'Neutral (charge 0)' : `Charge is ${q > 0 ? '+' : '−'}${Math.abs(q)}`, pass: a.protons - a.electrons === q });
const cStable: AtomCrit = (a) => ({ label: 'The nucleus is stable', pass: describeAtom(a).nucleus.status === 'stable' });
const cKnown: AtomCrit = (a) => {
  const n = describeAtom(a).nucleus;
  return { label: 'The nucleus is a real, known isotope (stable or in the data table)', pass: !n.estimate && (n.status === 'stable' || n.status === 'radioactive') };
};

function atomChallenge(goal: string, answer: AtomState, crit: AtomCrit[], hints: string[]): Omit<AtomChallenge, 'id' | 'level' | 'title'> {
  return { kind: 'atom', goal, answer, criteria: (a) => crit.map((f) => f(a)), hints };
}

function stableIsotopes(Z: number): number[] {
  return listedIsotopes(Z)
    .filter((i) => i.stable)
    .map((i) => i.A);
}

function genAtom(r: Rand, d: Difficulty): Omit<AtomChallenge, 'id' | 'level' | 'title'> {
  if (d === 'easy') {
    const Z = 1 + Math.floor(r() * 20);
    const el = elementByZ(Z)!;
    if (r() < 0.5) {
      return atomChallenge(`Build a neutral ${nameOf(Z)}-${el.refA} atom.`, { protons: Z, neutrons: el.refA - Z, electrons: Z }, [cElement(Z), cMass(el.refA), cCharge(0)], [
        `${el.name} is element number ${Z}: it has ${Z} protons.`,
        `Neutrons = mass number − protons = ${el.refA} − ${Z}.`,
        `A neutral atom has as many electrons as protons: ${Z}.`,
      ]);
    }
    return atomChallenge(`Build a neutral atom with ${Z} proton${Z > 1 ? 's' : ''}, using any stable isotope. Which element is it?`, { protons: Z, neutrons: el.refA - Z, electrons: Z }, [cElement(Z), cCharge(0), cStable], [
      `Find element number ${Z} on the periodic table.`,
      `The isotope list on the left shows which neutron numbers are stable (green).`,
      `${el.name}-${el.refA} works: ${el.refA - Z} neutrons.`,
    ]);
  }
  if (d === 'medium') {
    const type = pick(r, ['isotope', 'ion', 'position'] as const);
    if (type === 'ion') {
      const Zs = Object.keys(COMMON_IONS).map(Number).filter((z) => z <= 38 && stableIsotopes(z).length);
      const Z = pick(r, Zs);
      const q = pick(r, COMMON_IONS[Z]);
      const el = elementByZ(Z)!;
      const A = stableIsotopes(Z).includes(el.refA) ? el.refA : stableIsotopes(Z)[0];
      return atomChallenge(`Make the ion ${el.symbol}${chargeSymbol(q)} with a stable nucleus.`, { protons: Z, neutrons: A - Z, electrons: Z - q }, [cElement(Z), cCharge(q), cStable], [
        `Ions form by gaining or losing electrons — the protons stay the same.`,
        q > 0 ? `A charge of +${q} means ${q} fewer electron${q > 1 ? 's' : ''} than protons.` : `A charge of −${-q} means ${-q} more electron${q < -1 ? 's' : ''} than protons.`,
        `${Z} protons, ${A - Z} neutrons, ${Z - q} electrons.`,
      ]);
    }
    if (type === 'position') {
      const Z = 1 + Math.floor(r() * 36);
      const el = elementByZ(Z)!;
      return atomChallenge(`Build a neutral atom of the element in period ${el.period}, group ${el.group}, with its most common isotope (mass number ${el.refA}).`, { protons: Z, neutrons: el.refA - Z, electrons: Z }, [cElement(Z), cMass(el.refA), cCharge(0)], [
        `Periods are rows, groups are columns of the periodic table below.`,
        `It is ${el.name} (${el.symbol}), element ${Z}.`,
        `${Z} protons, ${el.refA - Z} neutrons, ${Z} electrons.`,
      ]);
    }
    const Z = 1 + Math.floor(r() * 30);
    const isos = listedIsotopes(Z).filter((i) => i.A !== elementByZ(Z)!.refA && (i.stable || (i.entry && i.entry.halfLife > 1)));
    if (!isos.length) return genAtom(r, 'easy');
    const iso = pick(r, isos);
    const el = elementByZ(Z)!;
    return atomChallenge(`Build a neutral ${nameOf(Z)}-${iso.A} atom (${superscript(iso.A)}${el.symbol}). Is it stable?`, { protons: Z, neutrons: iso.A - Z, electrons: Z }, [cElement(Z), cMass(iso.A), cCharge(0)], [
      `Isotopes of ${nameOf(Z)} all have ${Z} protons.`,
      `Neutrons = ${iso.A} − ${Z} = ${iso.A - Z}.`,
      `Check the Nucleus panel: it is ${iso.stable ? 'stable' : 'radioactive'}.`,
    ]);
  }
  // hard
  const type = pick(r, ['config', 'isoelectronic', 'decay', 'transition'] as const);
  if (type === 'config') {
    const Z = 3 + Math.floor(r() * 54);
    const el = elementByZ(Z)!;
    const cfg = prettyConfig(shorthand(configuration(Z, Z)));
    return atomChallenge(`Build the neutral atom whose electron configuration is ${cfg}, with a real known isotope.`, { protons: Z, neutrons: el.refA - Z, electrons: Z }, [cElement(Z), cCharge(0), cKnown], [
      `Count the electrons: the noble gas in brackets plus the superscripts.`,
      `A neutral atom has the same number of protons as electrons: ${Z}.`,
      `It is ${el.name}. ${el.name}-${el.refA} has ${el.refA - Z} neutrons.`,
    ]);
  }
  if (type === 'isoelectronic') {
    const options: { Z: number; q: number; gas: string }[] = [];
    for (const [z, qs] of Object.entries(COMMON_IONS)) {
      for (const q of qs) {
        const g = isoelectronicNobleGas(configuration(Number(z), Number(z) - q));
        if (g && stableIsotopes(Number(z)).length) options.push({ Z: Number(z), q, gas: g.symbol });
      }
    }
    const o = pick(r, options);
    const el = elementByZ(o.Z)!;
    const A = stableIsotopes(o.Z).includes(el.refA) ? el.refA : stableIsotopes(o.Z)[0];
    const gasName = elementBySymbol(o.gas)!.name.toLowerCase();
    return atomChallenge(
      `Make an ion with charge ${o.q > 0 ? '+' : '−'}${Math.abs(o.q)} that has the same electron arrangement as ${gasName}, with a stable nucleus.`,
      { protons: o.Z, neutrons: A - o.Z, electrons: o.Z - o.q },
      [
        cCharge(o.q),
        (a) => {
          const g = isoelectronicNobleGas(configuration(a.protons, a.electrons));
          return { label: `Same electron arrangement as ${gasName}`, pass: a.protons > 0 && g?.symbol === o.gas && a.protons !== elementBySymbol(o.gas)!.Z };
        },
        cStable,
      ],
      [
        `${gasName[0].toUpperCase() + gasName.slice(1)} has ${elementBySymbol(o.gas)!.Z} electrons, so the ion needs exactly that many.`,
        o.q > 0 ? `Charge +${o.q}: protons = electrons + ${o.q}. Look just after ${gasName} in the table.` : `Charge −${-o.q}: protons = electrons − ${-o.q}. Look just before ${gasName} in the table.`,
        `${el.symbol}${chargeSymbol(o.q)} works: ${o.Z} protons, ${o.Z - o.q} electrons.`,
      ],
    );
  }
  if (type === 'decay') {
    const pool: { Z: number; A: number; mode: DecayMode }[] = [];
    for (let z = 1; z <= 95; z++)
      for (const i of listedIsotopes(z)) if (i.entry && !i.entry.uncertain && ['β-', 'β+', 'α', 'EC'].includes(i.entry.modes[0])) pool.push({ Z: z, A: i.A, mode: i.entry.modes[0] });
    const t = pick(r, pool);
    const el = elementByZ(t.Z)!;
    return atomChallenge(
      `Build a neutral isotope of ${nameOf(t.Z)} that decays by ${DECAY_LABEL[t.mode]} (measured data, not an estimate).`,
      { protons: t.Z, neutrons: t.A - t.Z, electrons: t.Z },
      [
        cElement(t.Z),
        cCharge(0),
        (a) => {
          const n = describeAtom(a).nucleus;
          return { label: `Radioactive by ${DECAY_LABEL[t.mode]} (from the data table)`, pass: n.status === 'radioactive' && !n.estimate && n.modes.includes(t.mode) };
        },
      ],
      [
        t.mode === 'β-' ? 'β⁻ decay happens when a nucleus has too many neutrons.' : t.mode === 'α' ? 'α decay is typical of heavy nuclei.' : 'β⁺ decay and electron capture happen when a nucleus has too few neutrons.',
        `The isotope list on the left shows the decay mode of each radioactive isotope of ${nameOf(t.Z)} (hover a row).`,
        `${el.name}-${t.A} works: ${t.A - t.Z} neutrons.`,
      ],
    );
  }
  const tm = pick(r, [24, 25, 26, 27, 28, 29, 30]);
  const q = pick(r, COMMON_IONS[tm]);
  const el = elementByZ(tm)!;
  const cfg = prettyConfig(shorthand(configuration(tm, tm - q)));
  return atomChallenge(`Make the ${el.name.toLowerCase()} ion ${el.symbol}${chargeSymbol(q)} from ${nameOf(tm)}-${el.refA}. What is its configuration?`, { protons: tm, neutrons: el.refA - tm, electrons: tm - q }, [cElement(tm), cMass(el.refA), cCharge(q)], [
    `${el.name} is element ${tm}.`,
    `Remove ${q} electron${q > 1 ? 's' : ''}: ${tm - q} electrons.`,
    `The 4s electrons leave first, giving ${cfg}.`,
  ]);
}

// ---------- equations ----------

const METALS_SIMPLE = ['Li', 'Na', 'K', 'Mg', 'Ca', 'Al', 'Zn'];
const HALOGENS = ['Cl2', 'Br2', 'I2'];

function ionicFormula(m: string, x: string): string | null {
  const c = pairCompound(m, x);
  if (c.kind !== 'ionic') return null;
  const n = (k: number) => (k === 1 ? '' : String(k));
  return `${c.cation.symbol}${n(c.cation.count)}${c.anion.symbol}${n(c.anion.count)}`;
}

function alkane(n: number): string {
  return `C${n === 1 ? '' : n}H${2 * n + 2}`;
}

function alcohol(n: number): string {
  return n === 1 ? 'CH3OH' : `C${n}H${2 * n + 1}OH`;
}

function equationCandidates(r: Rand, d: Difficulty): string {
  if (d === 'easy') {
    const t = pick(r, ['synth', 'synth', 'h2x', 'oxide'] as const);
    if (t === 'h2x') {
      const x = pick(r, HALOGENS).slice(0, -1);
      return `H2 + ${x}2 -> H${x}`;
    }
    if (t === 'oxide') {
      const m = pick(r, METALS_SIMPLE);
      return `${m} + O2 -> ${ionicFormula(m, 'O')}`;
    }
    const m = pick(r, METALS_SIMPLE);
    const x2 = pick(r, HALOGENS);
    return `${m} + ${x2} -> ${ionicFormula(m, x2.slice(0, -1))}`;
  }
  if (d === 'medium') {
    const t = pick(r, ['alkane', 'alcohol', 'acid', 'water', 'synth'] as const);
    if (t === 'alkane') return `${alkane(1 + Math.floor(r() * 4))} + O2 -> CO2 + H2O`;
    if (t === 'alcohol') return `${alcohol(1 + Math.floor(r() * 3))} + O2 -> CO2 + H2O`;
    if (t === 'acid') {
      const m = pick(r, ['Mg', 'Zn', 'Al', 'Ca', 'Na', 'K', 'Fe']);
      const q = m === 'Fe' ? 2 : COMMON_IONS[elementBySymbol(m)!.Z][0];
      return `${m} + HCl -> ${m}Cl${q === 1 ? '' : q} + H2`;
    }
    if (t === 'water') {
      const m = pick(r, ['Li', 'Na', 'K', 'Ca']);
      return m === 'Ca' ? 'Ca + H2O -> Ca(OH)2 + H2' : `${m} + H2O -> ${m}OH + H2`;
    }
    const m = pick(r, ['Al', 'Fe', 'Ca', 'Mg', 'Li']);
    const x = pick(r, ['O2', 'Cl2', 'Br2', 'N2']);
    const xs = x.slice(0, -1);
    const f = m === 'Fe' ? (xs === 'O' ? 'Fe2O3' : xs === 'N' ? null : `Fe${xs}3`) : ionicFormula(m, xs);
    return f ? `${m} + ${x} -> ${f}` : 'Al + Cl2 -> AlCl3';
  }
  const t = pick(r, ['alkane', 'alcohol', 'precip', 'redox', 'redox'] as const);
  if (t === 'alkane') return `${alkane(5 + Math.floor(r() * 6))} + O2 -> CO2 + H2O`;
  if (t === 'alcohol') return `${alcohol(4 + Math.floor(r() * 3))} + O2 -> CO2 + H2O`;
  if (t === 'precip') {
    const [c, q] = pick(r, [['Al', 3], ['Fe', 3], ['Fe', 2], ['Mg', 2], ['Cu', 2], ['Zn', 2], ['Ca', 2]] as const);
    const ion = `${c}^${q}+`;
    return pick(r, [true, false]) || c === 'Ca' ? `${ion} + OH- -> ${c}(OH)${q}` : `${ion} + Cl- -> ${c}Cl${q}`;
  }
  // displacement: a more reactive metal gives electrons to the ions of a less reactive one
  const series: [string, number][] = [['Mg', 2], ['Al', 3], ['Zn', 2], ['Fe', 2], ['Pb', 2], ['Cu', 2], ['Ag', 1]];
  const i = Math.floor(r() * (series.length - 1));
  const j = i + 1 + Math.floor(r() * (series.length - 1 - i));
  const [m, p] = series[i];
  const [n, q] = series[j];
  const ion = (s: string, k: number) => `${s}^${k === 1 ? '' : k}+`;
  return `${m} + ${ion(n, q)} -> ${ion(m, p)} + ${n}`;
}

function genEquation(r: Rand, d: Difficulty): Omit<EquationChallenge, 'id' | 'level' | 'title'> {
  for (let attempt = 0; attempt < 40; attempt++) {
    const text = equationCandidates(r, d);
    const p = parseEquation(text);
    if (!p.ok) continue;
    const b = balance(p.eq);
    if (!b.ok || b.coefs.every((c) => c === 1)) continue;
    const max = Math.max(...b.coefs);
    if (d === 'easy' && max > 4) continue;
    if (d === 'medium' && max > 9) continue;
    const pretty = equationToText(p.eq, p.eq.terms.map(() => 1));
    const charged = p.eq.terms.some((t) => t.species.charge !== 0);
    // element that appears in exactly one species on each side is a good starting point
    const start = [...new Set(p.eq.terms.flatMap((t) => [...t.species.counts.keys()]))].find(
      (el) => p.eq.terms.filter((t) => t.side === 'left' && t.species.counts.has(el)).length === 1 && p.eq.terms.filter((t) => t.side === 'right' && t.species.counts.has(el)).length === 1 && el !== 'O' && el !== 'H',
    );
    const k = b.coefs.findIndex((c) => c > 1);
    const hints = [
      start ? `Start with ${elementBySymbol(start)!.name.toLowerCase()} (${start}): it appears in just one substance on each side.` : 'Count each element on both sides using the table at the bottom.',
      charged ? 'Ions are involved: the total charge must also be equal on both sides.' : 'Leave elements that appear on their own (like O₂ or H₂) until last — they are easiest to adjust.',
      `The coefficient of ${prettyFormula(p.eq.terms[k].species)} is ${b.coefs[k]}.`,
    ];
    return { kind: 'equation', goal: `Balance ${pretty} using the smallest whole numbers.`, equation: text, hints };
  }
  return { kind: 'equation', goal: 'Balance H₂ + O₂ → H₂O using the smallest whole numbers.', equation: 'H2 + O2 -> H2O', hints: ['Count the oxygen atoms.', 'Put a 2 in front of H₂O.', '2H₂ + O₂ → 2H₂O'] };
}

// ---------- bonding quiz ----------

const EASY_PAIRS: [string, string][] = [
  ['Na', 'Cl'], ['K', 'Br'], ['Mg', 'O'], ['Ca', 'Cl'], ['Li', 'F'], ['Na', 'O'],
  ['H', 'Cl'], ['O', 'H'], ['C', 'H'], ['H', 'H'], ['N', 'N'], ['Cl', 'Cl'], ['C', 'O'],
  ['Cu', 'Cu'], ['Fe', 'Fe'], ['Na', 'Na'], ['Al', 'Al'],
];
const MORE_PAIRS: [string, string][] = [
  ...EASY_PAIRS, ['Ca', 'O'], ['Al', 'F'], ['K', 'S'], ['Ba', 'Cl'], ['H', 'F'], ['N', 'H'], ['S', 'H'], ['P', 'Cl'], ['C', 'Cl'],
  ['O', 'O'], ['F', 'F'], ['Br', 'Br'], ['C', 'S'], ['Mg', 'Mg'], ['Zn', 'Zn'], ['Cu', 'Zn'], ['Li', 'H'], ['Sr', 'Br'],
];

function quiz(question: string, options: string[], correct: number, explanation: string, pair?: [string, string]): Omit<QuizChallenge, 'id' | 'level' | 'title'> {
  return { kind: 'quiz', goal: question, question, options, correct, explanation, pair, hints: [explanation.split('. ')[0] + '.'] };
}

function shuffle<T>(r: Rand, list: T[]): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function genQuiz(r: Rand, d: Difficulty): Omit<QuizChallenge, 'id' | 'level' | 'title'> {
  const pairs = (d === 'easy' ? EASY_PAIRS : MORE_PAIRS).filter(([a, b]) => !classifyBond(a, b).caveat);
  const [a, b] = pick(r, pairs);
  const cls = classifyBond(a, b);
  const ea = elementBySymbol(a)!;
  const eb = elementBySymbol(b)!;
  const names = a === b ? `two ${ea.name.toLowerCase()} atoms` : `${ea.name.toLowerCase()} and ${eb.name.toLowerCase()}`;
  if (d === 'easy') {
    const opts = ['Ionic', 'Covalent', 'Metallic'];
    const correct = cls.type === 'ionic' ? 0 : cls.type === 'metallic' ? 2 : 1;
    const why = cls.type === 'ionic' ? 'a metal and a non-metal' : cls.type === 'metallic' ? 'metal atoms only' : 'non-metal atoms only';
    return quiz(`What type of bond forms between ${names}?`, opts, correct, `This is ${why}. ${BOND_EXPLAIN[cls.type]}`, [a, b]);
  }
  const type = d === 'hard' ? pick(r, ['type', 'delta', 'formula', 'pairs'] as const) : pick(r, ['type', 'type', 'formula'] as const);
  if (type === 'delta') {
    const polar = MORE_PAIRS.filter(([x, y]) => classifyBond(x, y).type === 'polar-covalent');
    const [x, y] = pick(r, polar);
    const c = classifyBond(x, y);
    const opts = shuffle(r, [x, y]);
    return quiz(`In the ${x}–${y} bond, which atom carries the partial negative charge δ−?`, opts, opts.indexOf(c.negative!), `${c.negative} is more electronegative (ΔEN = ${c.dEN!.toFixed(2)}), so it pulls the shared electrons closer and becomes δ−.`, [x, y]);
  }
  if (type === 'pairs') {
    const mols: [string, string][] = [['N', 'N'], ['O', 'O'], ['H', 'H'], ['Cl', 'Cl'], ['C', 'O'], ['C', 'H'], ['N', 'H'], ['O', 'H']];
    const [x, y] = pick(r, mols);
    const c = pairCompound(x, y);
    if (c.kind !== 'molecule') return genQuiz(r, 'medium');
    const pairsTotal = c.terminal ? c.terminals * c.order : c.order;
    const opts = shuffle(r, [...new Set([pairsTotal, pairsTotal + 1, Math.max(1, pairsTotal - 1), pairsTotal + 2])].slice(0, 4)).map(String);
    return quiz(
      `How many shared pairs of electrons (bonds) are there in one molecule of ${c.formula}?`,
      opts,
      opts.indexOf(String(pairsTotal)),
      `Each ${c.terminal ? 'bond' : 'atom'} ${c.order === 1 ? 'is a single bond (1 pair)' : c.order === 2 ? 'is a double bond (2 pairs)' : 'is a triple bond (3 pairs)'}${c.terminal ? `, and there ${c.terminals === 1 ? 'is 1 bond' : `are ${c.terminals} bonds`}` : ''}: ${pairsTotal} shared pairs in total. Look at it in the Bonds view.`,
      [x, y],
    );
  }
  if (type === 'formula') {
    const ionic = MORE_PAIRS.filter(([x, y]) => pairCompound(x, y).kind === 'ionic');
    const [x, y] = pick(r, ionic);
    const c = pairCompound(x, y);
    if (c.kind !== 'ionic') return genQuiz(r, 'easy');
    const n = (k: number) => (k === 1 ? '' : String(k).replace(/\d/g, (dd) => '₀₁₂₃₄₅₆₇₈₉'[Number(dd)]));
    const f = (p: number, q: number) => `${c.cation.symbol}${n(p)}${c.anion.symbol}${n(q)}`;
    const variants = [...new Set([c.formula, f(c.anion.count, c.cation.count), f(1, 1), f(c.cation.count + 1, c.anion.count), f(c.cation.count, c.anion.count + 1)])];
    const opts = shuffle(r, variants.slice(0, 4).includes(c.formula) ? variants.slice(0, 4) : [c.formula, ...variants.slice(1, 4)]);
    return quiz(
      `What is the formula of the ionic compound formed by ${elementBySymbol(c.cation.symbol)!.name.toLowerCase()} and ${elementBySymbol(c.anion.symbol)!.name.toLowerCase()}?`,
      opts,
      opts.indexOf(c.formula),
      `The ions are ${c.cation.symbol}${chargeSymbol(c.cation.charge)} and ${c.anion.symbol}${chargeSymbol(c.anion.charge)}. The charges must cancel: ${c.cation.count} × (+${c.cation.charge}) + ${c.anion.count} × (${c.anion.charge}) = 0, so the formula is ${c.formula}.`,
      [x, y],
    );
  }
  const opts: BondType[] = ['ionic', 'polar-covalent', 'nonpolar-covalent', 'metallic'];
  const dTxt = cls.dEN != null ? ` The electronegativity difference is ${cls.dEN.toFixed(2)}.` : '';
  return quiz(`What type of bond forms between ${names}?`, opts.map((o) => BOND_LABEL[o]), opts.indexOf(cls.type), `${BOND_EXPLAIN[cls.type]}${dTxt}`, [a, b]);
}
