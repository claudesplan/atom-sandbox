/** Challenge progress, saved in this browser's localStorage. */

export interface ChallengeResult {
  stars: number;
  points: number;
  hints: number;
  /** answer was revealed: not counted as solved */
  revealed: boolean;
  at: number;
}

export interface PracticeStats {
  solved: { easy: number; medium: number; hard: number };
  points: number;
  streak: number;
  bestStreak: number;
}

export interface Progress {
  version: 1;
  results: Record<string, ChallengeResult>;
  /** randomly generated practice challenges (added later; may be missing in old saves) */
  practice?: PracticeStats;
}

export function emptyPractice(): PracticeStats {
  return { solved: { easy: 0, medium: 0, hard: 0 }, points: 0, streak: 0, bestStreak: 0 };
}

export function practiceStats(p: Progress): PracticeStats {
  const d = emptyPractice();
  const s = p.practice;
  if (!s) return d;
  return { solved: { ...d.solved, ...(s.solved ?? {}) }, points: s.points ?? 0, streak: s.streak ?? 0, bestStreak: s.bestStreak ?? 0 };
}

/** Record a practice result: solved (with points) or revealed (breaks the streak). */
export function recordPractice(p: Progress, difficulty: 'easy' | 'medium' | 'hard', points: number, revealed: boolean): Progress {
  const s = practiceStats(p);
  if (revealed) return { ...p, practice: { ...s, streak: 0 } };
  const streak = s.streak + 1;
  return { ...p, practice: { solved: { ...s.solved, [difficulty]: s.solved[difficulty] + 1 }, points: s.points + points, streak, bestStreak: Math.max(s.bestStreak, streak) } };
}

export const PROGRESS_KEY = 'atom-sandbox.progress.v1';

export function emptyProgress(): Progress {
  return { version: 1, results: {} };
}

export function loadProgress(storage: Pick<Storage, 'getItem'> | null = safeStorage()): Progress {
  try {
    const raw = storage?.getItem(PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const p = JSON.parse(raw) as Progress;
    if (p?.version !== 1 || typeof p.results !== 'object' || !p.results) return emptyProgress();
    return p;
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: Progress, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch {
    /* storage full or blocked: progress just isn't kept */
  }
}

export function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Record a result, keeping the best one. */
export function recordResult(p: Progress, id: string, r: ChallengeResult): Progress {
  const old = p.results[id];
  if (old && !old.revealed && (old.points > r.points || r.revealed)) return p;
  return { ...p, results: { ...p.results, [id]: r } };
}

export function isSolved(p: Progress, id: string): boolean {
  const r = p.results[id];
  return !!r && !r.revealed;
}

export function totals(p: Progress): { solved: number; stars: number; points: number } {
  let solved = 0;
  let stars = 0;
  let points = 0;
  for (const r of Object.values(p.results)) {
    if (r.revealed) continue;
    solved++;
    stars += r.stars;
    points += r.points;
  }
  return { solved, stars, points };
}
