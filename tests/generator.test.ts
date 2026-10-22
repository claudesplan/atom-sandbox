import { describe, expect, it } from 'vitest';
import { balance, checkBalance, parseEquation } from '../src/chem/equation';
import { structureFor } from '../src/chem/structures';
import { describeCompound } from '../src/chem/compounds';
import { CHALLENGES, criteriaFor, type Difficulty } from '../src/game/challenges';
import { generateChallenge, parsePracticeCode, practiceCode } from '../src/game/generator';

const DIFFS: Difficulty[] = ['easy', 'medium', 'hard'];
const SEEDS = Array.from({ length: 150 }, (_, i) => i * 37 + 1);

describe('practice generator', () => {
  it('is deterministic for a given code', () => {
    const a = generateChallenge('medium', 'equation', 4821);
    const b = generateChallenge('medium', 'equation', 4821);
    expect(a.goal).toBe(b.goal);
    expect(a.id).toBe('rnd-MQ-4821');
    expect(parsePracticeCode('mq-4821')).toEqual({ difficulty: 'medium', kind: 'equation', seed: 4821 });
    expect(parsePracticeCode('nonsense')).toBeNull();
    expect(practiceCode('hard', 'quiz', 7)).toBe('HB-7');
  });

  it('every generated atom challenge is solved by its answer and not by an empty atom', () => {
    for (const d of DIFFS)
      for (const s of SEEDS) {
        const c = generateChallenge(d, 'atom', s);
        if (c.kind !== 'atom') throw new Error('kind');
        expect(c.criteria(c.answer).every((k) => k.pass), `${c.id}: ${c.goal}`).toBe(true);
        expect(c.criteria({ protons: 0, neutrons: 0, electrons: 0 }).every((k) => k.pass), c.id).toBe(false);
        expect(c.hints.length).toBeGreaterThan(0);
      }
  });

  it('every generated equation balances, needs work, and can be drawn', () => {
    const maxCoef: Record<Difficulty, number> = { easy: 4, medium: 9, hard: 99 };
    for (const d of DIFFS)
      for (const s of SEEDS) {
        const c = generateChallenge(d, 'equation', s);
        if (c.kind !== 'equation') throw new Error('kind');
        const p = parseEquation(c.equation);
        expect(p.ok, `${c.id}: ${c.equation}`).toBe(true);
        if (!p.ok) continue;
        const b = balance(p.eq);
        expect(b.ok, c.equation).toBe(true);
        if (!b.ok) continue;
        expect(checkBalance(p.eq, b.coefs).balanced).toBe(true);
        expect(b.coefs.every((x) => x === 1), c.equation).toBe(false);
        expect(Math.max(...b.coefs), c.equation).toBeLessThanOrEqual(maxCoef[d]);
        expect(criteriaFor(c, { protons: 0, neutrons: 0, electrons: 0 }, p.eq, b.coefs).every((k) => k.pass), c.equation).toBe(true);
        for (const t of p.eq.terms) {
          const st = structureFor(t.species);
          expect(st.kind, `${c.equation}: ${t.species.text}`).not.toBe('unknown');
          const drawn: Record<string, number> = {};
          for (const a of st.atoms) drawn[a.el] = (drawn[a.el] ?? 0) + 1;
          expect(drawn, t.species.text).toEqual(Object.fromEntries(t.species.counts));
        }
      }
  });

  it('every generated quiz has a valid, unique correct answer', () => {
    for (const d of DIFFS)
      for (const s of SEEDS) {
        const c = generateChallenge(d, 'quiz', s);
        if (c.kind !== 'quiz') throw new Error('kind');
        expect(c.correct, `${c.id}: ${c.question}`).toBeGreaterThanOrEqual(0);
        expect(c.correct).toBeLessThan(c.options.length);
        expect(new Set(c.options).size, c.question).toBe(c.options.length);
        expect(c.options.length).toBeGreaterThanOrEqual(2);
        expect(criteriaFor(c, { protons: 0, neutrons: 0, electrons: 0 }, null, [], c.correct)[0].pass).toBe(true);
      }
  });

  it('mixed mode produces all kinds', () => {
    const kinds = new Set(SEEDS.map((s) => generateChallenge('medium', 'mixed', s).kind));
    expect(kinds).toEqual(new Set(['atom', 'equation', 'quiz']));
  });
});

describe('compound questions', () => {
  const checkQuiz = (c: { question: string; options: string[]; correct: number; compound?: string; id: string }) => {
    expect(c.correct, `${c.id}: ${c.question}`).toBeGreaterThanOrEqual(0);
    expect(new Set(c.options).size, c.question).toBe(c.options.length);
    expect(c.options.length, c.question).toBeGreaterThanOrEqual(3);
    expect(c.compound, c.id).toBeTruthy();
    const info = describeCompound(c.compound!);
    const answer = c.options[c.correct];
    if (/^What is the formula/.test(c.question)) expect(answer, c.question).toBe(info.pretty);
    if (/^What is the name/.test(c.question)) expect(answer, c.question).toBe(info.name);
    if (/^What is the molar mass/.test(c.question)) expect(answer).toBe(`${info.molarMass.toFixed(1)} g/mol`);
    if (/percentage/.test(c.question)) {
      const pcts = info.percent.map((p) => `${Math.round(p.percent)} %`);
      expect(pcts, c.question).toContain(answer);
    }
    // no wrong option may also be a correct formula/name for the same compound
    c.options.forEach((o, i) => {
      if (i !== c.correct && /^What is the name/.test(c.question)) expect(o).not.toBe(info.name);
    });
  };
  it('every generated compound question has exactly one right answer', () => {
    for (const d of DIFFS)
      for (const s of SEEDS) {
        const c = generateChallenge(d, 'compound', s);
        if (c.kind !== 'quiz') throw new Error('kind');
        checkQuiz(c);
      }
  });
  it('the fixed Level 7 questions are right', () => {
    for (const c of CHALLENGES) if (c.kind === 'quiz') checkQuiz(c);
    expect(CHALLENGES.filter((c) => c.level === 7).length).toBe(8);
  });
});
