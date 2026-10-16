/** Challenge progress, saved in this browser's localStorage. */

export interface ChallengeResult {
  stars: number;
  points: number;
  hints: number;
  /** answer was revealed: not counted as solved */
  revealed: boolean;
  at: number;
}

export interface Progress {
  version: 1;
  results: Record<string, ChallengeResult>;
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
