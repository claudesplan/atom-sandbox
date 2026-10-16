import { create } from 'zustand';
import { clampAtom, type AtomState } from '../chem/atom';
import { balance, parseEquation, type ParseResult } from '../chem/equation';
import { reactionById } from '../chem/reactions';
import { challengeById, criteriaFor, pointsFor, starsFor } from '../game/challenges';
import { emptyProgress, isSolved, loadProgress, recordResult, safeStorage, saveProgress, type Progress } from '../game/progress';

export type Mode = 'atom' | 'reaction';
export type Tool = 'proton' | 'neutron' | 'electron' | 'remove';

/** The undoable document. */
export interface Doc {
  atom: AtomState;
  eqText: string;
  coefs: number[];
}

export interface ViewOptions {
  labels: boolean;
  animate: boolean;
  /** draw an electron "cloud" impression instead of Bohr rings */
  cloud: boolean;
  /** reaction view: show formula labels under molecules */
  formulas: boolean;
}

export type DialogId = null | 'help' | 'settings';

export interface StoreState {
  mode: Mode;
  doc: Doc;
  tool: Tool;
  view: ViewOptions;
  canUndo: boolean;
  canRedo: boolean;
  progress: Progress;
  activeChallenge: string | null;
  hintsShown: number;
  revealed: boolean;
  /** set when the active challenge has just been completed in this attempt */
  completed: { stars: number; points: number; revealed: boolean } | null;
  /** bumped to start the "atoms rearrange" animation in the reaction view */
  animateReaction: number;
  dialog: DialogId;
  toast: { text: string; kind: 'info' | 'warn' | 'error' | 'win'; id: number } | null;

  commit: (fn: (d: Doc) => Doc) => void;
  undo: () => void;
  redo: () => void;
  setMode: (m: Mode) => void;
  setAtom: (fn: (a: AtomState) => AtomState) => void;
  setEquation: (text: string, coefs?: number[]) => void;
  setCoef: (i: number, v: number) => void;
  setView: (p: Partial<ViewOptions>) => void;
  startChallenge: (id: string) => void;
  restartChallenge: () => void;
  exitChallenge: () => void;
  showHint: () => void;
  revealAnswer: () => void;
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
}

function loadSaved(): Partial<Saved> {
  try {
    const raw = safeStorage()?.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : {};
  } catch {
    return {};
  }
}

const DEFAULT_DOC: Doc = { atom: { protons: 6, neutrons: 6, electrons: 6 }, eqText: 'H2 + O2 -> H2O', coefs: [1, 1, 1] };
const DEFAULT_VIEW: ViewOptions = { labels: true, animate: true, cloud: false, formulas: true };

function initial(): { mode: Mode; doc: Doc; view: ViewOptions } {
  const s = loadSaved();
  const doc = s.doc && s.doc.atom && typeof s.doc.eqText === 'string' ? { ...s.doc, atom: clampAtom(s.doc.atom), coefs: coefsFor(s.doc.eqText, s.doc.coefs) } : DEFAULT_DOC;
  return { mode: s.mode === 'reaction' ? 'reaction' : 'atom', doc, view: { ...DEFAULT_VIEW, ...(s.view ?? {}) } };
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
    const crit = criteriaFor(ch, st.doc.atom, p.ok ? p.eq : null, st.doc.coefs);
    if (!crit.every((c) => c.pass)) return;
    const revealed = st.revealed;
    const stars = revealed ? 0 : starsFor(st.hintsShown);
    const points = revealed ? 0 : pointsFor(st.hintsShown);
    const progress = recordResult(st.progress, ch.id, { stars, points, hints: st.hintsShown, revealed, at: Date.now() });
    saveProgress(progress);
    set({ progress, completed: { stars, points, revealed } });
    if (!revealed) get().notify(`Challenge complete: ${ch.title}  ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}  +${points} points`, 'win');
  };

  return {
    mode: init.mode,
    doc: init.doc,
    tool: 'proton',
    view: init.view,
    canUndo: false,
    canRedo: false,
    progress: loadProgress(),
    activeChallenge: null,
    hintsShown: 0,
    revealed: false,
    completed: null,
    animateReaction: 0,
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
    setView: (p) => set({ view: { ...get().view, ...p } }),

    startChallenge: (id) => {
      const ch = challengeById(id);
      if (!ch) return;
      set({ activeChallenge: id, hintsShown: 0, revealed: false, completed: null, mode: ch.kind === 'atom' ? 'atom' : 'reaction' });
      if (ch.kind === 'atom') get().commit((d) => ({ ...d, atom: { protons: 0, neutrons: 0, electrons: 0 } }));
      else {
        const r = reactionById(ch.reactionId)!;
        const n = parsedEquation(r.equation);
        get().commit((d) => ({ ...d, eqText: r.equation, coefs: n.ok ? n.eq.terms.map(() => 1) : [] }));
      }
      checkChallenge();
    },
    restartChallenge: () => {
      const id = get().activeChallenge;
      if (id) get().startChallenge(id);
    },
    exitChallenge: () => set({ activeChallenge: null, hintsShown: 0, revealed: false, completed: null }),
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
      else {
        const p = parsedEquation(get().doc.eqText);
        if (p.ok) {
          const b = balance(p.eq);
          if (b.ok) get().commit((d) => ({ ...d, coefs: b.coefs }));
        }
      }
      get().notify('Answer shown — this challenge earns no points. Try it again later for stars!', 'warn');
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
  if (s.doc === prev.doc && s.mode === prev.mode && s.view === prev.view) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const st = useStore.getState();
    try {
      safeStorage()?.setItem(STATE_KEY, JSON.stringify({ mode: st.mode, doc: st.doc, view: st.view } satisfies Saved));
    } catch {
      /* ignore */
    }
  }, 300);
});
