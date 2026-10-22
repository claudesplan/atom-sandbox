import { create } from 'zustand';
import { clampAtom, type AtomState } from '../chem/atom';
import { anionById, cationById } from '../chem/compounds';
import { elementBySymbol } from '../chem/elements';
import { balance, parseEquation, type ParseResult } from '../chem/equation';
import { challengeById, criteriaFor, generatedInfo, pointsFor, registerGenerated, starsFor, type Difficulty } from '../game/challenges';
import { DIFFICULTY_POINTS, generateChallenge, parsePracticeCode, randomSeed, type PracticeKind } from '../game/generator';
import { emptyProgress, isSolved, loadProgress, recordPractice, recordResult, safeStorage, saveProgress, type Progress } from '../game/progress';

export type Mode = 'atom' | 'reaction' | 'bonds' | 'compounds';

/** Compound shown in the Compounds view: built from two ions, or any formula. */
export type CompoundSel = { kind: 'ions'; cation: string; anion: string } | { kind: 'formula'; text: string };
export type Tool = 'proton' | 'neutron' | 'electron' | 'remove';

/** The undoable document. */
export interface Doc {
  atom: AtomState;
  eqText: string;
  coefs: number[];
  /** the two elements in the Bonds view */
  pair: [string, string];
  compound: CompoundSel;
}

export interface ViewOptions {
  labels: boolean;
  animate: boolean;
  /** draw an electron "cloud" impression instead of Bohr rings */
  cloud: boolean;
  /** reaction view: show formula labels under molecules */
  formulas: boolean;
  /** reaction view: colour bonds by type and show δ+/δ− */
  bondTypes: boolean;
  /** periodic table coloured by electronegativity (Bonds view) */
  enColours: boolean;
}

export interface PracticeSettings {
  difficulty: Difficulty;
  kind: PracticeKind;
}

export type DialogId = null | 'help' | 'settings';

export interface StoreState {
  mode: Mode;
  doc: Doc;
  tool: Tool;
  /** which slot a periodic-table click fills in the Bonds view */
  pickSlot: 0 | 1;
  view: ViewOptions;
  practice: PracticeSettings;
  canUndo: boolean;
  canRedo: boolean;
  progress: Progress;
  activeChallenge: string | null;
  hintsShown: number;
  revealed: boolean;
  /** quiz challenges: chosen option and number of wrong tries */
  quizChoice: number | null;
  wrongAnswers: number;
  /** set when the active challenge has just been completed in this attempt */
  completed: { stars: number; points: number; revealed: boolean } | null;
  /** bumped to start the "atoms rearrange" animation in the reaction view */
  animateReaction: number;
  /** bumped to replay the bonding animation */
  animateBond: number;
  dialog: DialogId;
  toast: { text: string; kind: 'info' | 'warn' | 'error' | 'win'; id: number } | null;

  commit: (fn: (d: Doc) => Doc) => void;
  undo: () => void;
  redo: () => void;
  setMode: (m: Mode) => void;
  setAtom: (fn: (a: AtomState) => AtomState) => void;
  setEquation: (text: string, coefs?: number[]) => void;
  setCoef: (i: number, v: number) => void;
  setPair: (slot: 0 | 1, symbol: string) => void;
  setCompound: (c: CompoundSel) => void;
  setView: (p: Partial<ViewOptions>) => void;
  setPractice: (p: Partial<PracticeSettings>) => void;
  startChallenge: (id: string) => void;
  startPractice: (code?: string) => boolean;
  restartChallenge: () => void;
  exitChallenge: () => void;
  showHint: () => void;
  revealAnswer: () => void;
  answerQuiz: (i: number) => void;
  resetProgress: () => void;
  notify: (text: string, kind?: 'info' | 'warn' | 'error' | 'win') => void;
}

// ---------- parsing cache ----------

let parseCacheKey = '';
let parseCacheVal: ParseResult = { ok: false, error: '' };
export function parsedEquation(text: string): ParseResult {
  if (text !== parseCacheKey) {
    parseCacheKey = text;
    parseCacheVal = parseEquation(text);
  }
  return parseCacheVal;
}

function coefsFor(text: string, given?: number[]): number[] {
  const r = parsedEquation(text);
  if (!r.ok) return [];
  return given && given.length === r.eq.terms.length ? given : r.eq.typedCoefs.slice();
}

// ---------- persistence ----------

const STATE_KEY = 'atom-sandbox.state.v1';

interface Saved {
  mode: Mode;
  doc: Doc;
  view: ViewOptions;
  practice: PracticeSettings;
}

function loadSaved(): Partial<Saved> {
  try {
    const raw = safeStorage()?.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : {};
  } catch {
    return {};
  }
}

const DEFAULT_DOC: Doc = { atom: { protons: 6, neutrons: 6, electrons: 6 }, eqText: 'H2 + O2 -> H2O', coefs: [1, 1, 1], pair: ['Na', 'Cl'], compound: { kind: 'ions', cation: 'Al', anion: 'SO4' } };
const DEFAULT_VIEW: ViewOptions = { labels: true, animate: true, cloud: false, formulas: true, bondTypes: false, enColours: false };
const DEFAULT_PRACTICE: PracticeSettings = { difficulty: 'easy', kind: 'mixed' };

function validCompound(c: unknown): c is CompoundSel {
  if (!c || typeof c !== 'object') return false;
  const x = c as Record<string, unknown>;
  if (x.kind === 'ions') return !!cationById(String(x.cation)) && !!anionById(String(x.anion));
  return x.kind === 'formula' && typeof x.text === 'string';
}

function validPair(p: unknown): p is [string, string] {
  return Array.isArray(p) && p.length === 2 && p.every((x) => typeof x === 'string' && elementBySymbol(x));
}

function initial(): { mode: Mode; doc: Doc; view: ViewOptions; practice: PracticeSettings } {
  const s = loadSaved();
  const doc =
    s.doc && s.doc.atom && typeof s.doc.eqText === 'string'
      ? {
          ...s.doc,
          atom: clampAtom(s.doc.atom),
          coefs: coefsFor(s.doc.eqText, s.doc.coefs),
          pair: validPair(s.doc.pair) ? s.doc.pair : DEFAULT_DOC.pair,
          compound: validCompound(s.doc.compound) ? s.doc.compound : DEFAULT_DOC.compound,
        }
      : DEFAULT_DOC;
  const mode: Mode = s.mode === 'reaction' || s.mode === 'bonds' || s.mode === 'compounds' ? s.mode : 'atom';
  return { mode, doc, view: { ...DEFAULT_VIEW, ...(s.view ?? {}) }, practice: { ...DEFAULT_PRACTICE, ...(s.practice ?? {}) } };
}

// ---------- history ----------

const undoStack: Doc[] = [];
const redoStack: Doc[] = [];
const MAX_HISTORY = 200;

const init = initial();

export const useStore = create<StoreState>((set, get) => {
  const afterChange = () => {
    set({ canUndo: undoStack.length > 0, canRedo: redoStack.length > 0 });
    checkChallenge();
  };

  const checkChallenge = () => {
    const st = get();
    const ch = challengeById(st.activeChallenge);
    if (!ch || st.completed) return;
    const p = parsedEquation(st.doc.eqText);
    const crit = criteriaFor(ch, st.doc.atom, p.ok ? p.eq : null, st.doc.coefs, st.quizChoice);
    if (!crit.every((c) => c.pass)) return;
    const revealed = st.revealed;
    const penalties = st.hintsShown + st.wrongAnswers;
    const stars = revealed ? 0 : starsFor(penalties);
    const gen = generatedInfo(ch.id);
    let points: number;
    let progress: Progress;
    if (gen) {
      points = revealed ? 0 : Math.round((DIFFICULTY_POINTS[gen.difficulty] * pointsFor(penalties)) / 100);
      progress = recordPractice(st.progress, gen.difficulty, points, revealed);
    } else {
      points = revealed ? 0 : pointsFor(penalties);
      progress = recordResult(st.progress, ch.id, { stars, points, hints: penalties, revealed, at: Date.now() });
    }
    saveProgress(progress);
    set({ progress, completed: { stars, points, revealed } });
    if (ch.kind === 'quiz' && ch.pair) get().commit((d) => ({ ...d, pair: ch.pair! }));
    if (ch.kind === 'quiz' && ch.compound) get().commit((d) => ({ ...d, compound: { kind: 'formula', text: ch.compound! } }));
    if (!revealed) get().notify(`${gen ? 'Practice' : 'Challenge'} complete${gen ? '' : `: ${ch.title}`}  ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  +${points} points`, 'win');
  };

  const begin = (id: string) => {
    const ch = challengeById(id);
    if (!ch) return;
    const mode: Mode = ch.kind === 'atom' ? 'atom' : ch.kind === 'equation' ? 'reaction' : ch.compound ? 'compounds' : 'bonds';
    set({ activeChallenge: id, hintsShown: 0, revealed: false, completed: null, quizChoice: null, wrongAnswers: 0, mode });
    if (ch.kind === 'atom') get().commit((d) => ({ ...d, atom: { protons: 0, neutrons: 0, electrons: 0 } }));
    else if (ch.kind === 'equation') {
      const n = parsedEquation(ch.equation);
      get().commit((d) => ({ ...d, eqText: ch.equation, coefs: n.ok ? n.eq.terms.map(() => 1) : [] }));
    }
    checkChallenge();
  };

  return {
    mode: init.mode,
    doc: init.doc,
    tool: 'proton',
    pickSlot: 0,
    view: init.view,
    practice: init.practice,
    canUndo: false,
    canRedo: false,
    progress: loadProgress(),
    activeChallenge: null,
    hintsShown: 0,
    revealed: false,
    quizChoice: null,
    wrongAnswers: 0,
    completed: null,
    animateReaction: 0,
    animateBond: 0,
    dialog: null,
    toast: null,

    commit: (fn) => {
      const prev = get().doc;
      const next = fn(prev);
      if (next === prev || JSON.stringify(next) === JSON.stringify(prev)) return;
      undoStack.push(prev);
      if (undoStack.length > MAX_HISTORY) undoStack.shift();
      redoStack.length = 0;
      set({ doc: next });
      afterChange();
    },
    undo: () => {
      const d = undoStack.pop();
      if (!d) return;
      redoStack.push(get().doc);
      set({ doc: d });
      afterChange();
    },
    redo: () => {
      const d = redoStack.pop();
      if (!d) return;
      undoStack.push(get().doc);
      set({ doc: d });
      afterChange();
    },
    setMode: (mode) => set({ mode }),
    setAtom: (fn) => get().commit((d) => ({ ...d, atom: clampAtom(fn(d.atom)) })),
    setEquation: (text, coefs) => get().commit((d) => ({ ...d, eqText: text, coefs: coefsFor(text, coefs) })),
    setCoef: (i, v) =>
      get().commit((d) => {
        if (i < 0 || i >= d.coefs.length) return d;
        const c = Math.max(1, Math.min(99, Math.round(v)));
        return { ...d, coefs: d.coefs.map((x, k) => (k === i ? c : x)) };
      }),
    setPair: (slot, symbol) => {
      get().commit((d) => {
        const pair: [string, string] = [...d.pair];
        pair[slot] = symbol;
        return { ...d, pair };
      });
      set({ animateBond: get().animateBond + 1 });
    },
    setCompound: (compound) => {
      get().commit((d) => ({ ...d, compound }));
      set({ animateBond: get().animateBond + 1 });
    },
    setView: (p) => set({ view: { ...get().view, ...p } }),
    setPractice: (p) => set({ practice: { ...get().practice, ...p } }),

    startChallenge: (id) => begin(id),
    startPractice: (code) => {
      const { difficulty, kind } = get().practice;
      let c;
      if (code) {
        const parsed = parsePracticeCode(code);
        if (!parsed) return false;
        c = generateChallenge(parsed.difficulty, parsed.kind, parsed.seed);
      } else c = generateChallenge(difficulty, kind, randomSeed());
      registerGenerated(c);
      begin(c.id);
      return true;
    },
    restartChallenge: () => {
      const id = get().activeChallenge;
      if (id) begin(id);
    },
    exitChallenge: () => set({ activeChallenge: null, hintsShown: 0, revealed: false, completed: null, quizChoice: null, wrongAnswers: 0 }),
    showHint: () => {
      const ch = challengeById(get().activeChallenge);
      if (!ch || get().completed) return;
      set({ hintsShown: Math.min(ch.hints.length, get().hintsShown + 1) });
    },
    revealAnswer: () => {
      const ch = challengeById(get().activeChallenge);
      if (!ch || get().completed) return;
      set({ revealed: true });
      if (ch.kind === 'atom') get().setAtom(() => ch.answer);
      else if (ch.kind === 'quiz') {
        set({ quizChoice: ch.correct });
        checkChallenge();
      } else {
        const p = parsedEquation(get().doc.eqText);
        if (p.ok) {
          const b = balance(p.eq);
          if (b.ok) get().commit((d) => ({ ...d, coefs: b.coefs }));
        }
      }
      get().notify('Answer shown — this challenge earns no points. Try it again later for stars!', 'warn');
    },
    answerQuiz: (i) => {
      const ch = challengeById(get().activeChallenge);
      if (!ch || ch.kind !== 'quiz' || get().completed) return;
      if (i !== ch.correct) set({ wrongAnswers: get().wrongAnswers + 1, quizChoice: i });
      else set({ quizChoice: i });
      checkChallenge();
    },
    resetProgress: () => {
      const progress = emptyProgress();
      saveProgress(progress);
      set({ progress, completed: null });
      get().notify('Progress reset');
    },
    notify: (text, kind = 'info') => set({ toast: { text, kind, id: Date.now() + Math.random() } }),
  };
});

export function isChallengeSolved(id: string): boolean {
  return isSolved(useStore.getState().progress, id);
}

// persist the working state (not history)
let saveTimer: ReturnType<typeof setTimeout> | null = null;
useStore.subscribe((s, prev) => {
  if (s.doc === prev.doc && s.mode === prev.mode && s.view === prev.view && s.practice === prev.practice) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const st = useStore.getState();
    try {
      safeStorage()?.setItem(STATE_KEY, JSON.stringify({ mode: st.mode, doc: st.doc, view: st.view, practice: st.practice } satisfies Saved));
    } catch {
      /* ignore */
    }
  }, 300);
});
