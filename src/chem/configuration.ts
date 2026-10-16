/**
 * Electron configurations.
 *
 * Neutral atoms: the aufbau (Madelung, n + l) filling order plus the ground-state exceptions measured by
 * spectroscopy (NIST). For Z ≥ 104 the configurations are theoretical predictions.
 *
 * Ions: cations remove electrons from the highest n first (4s before 3d), anions add electrons in filling
 * order. This simple rule reproduces textbook ions (Na⁺, Fe²⁺, Fe³⁺, Cu²⁺, Cl⁻, O²⁻…) but is an
 * approximation for some heavy d- and f-block ions.
 */

export interface Subshell {
  n: number;
  l: number;
  /** e.g. "3d" */
  label: string;
  capacity: number;
}

const L_LETTER = ['s', 'p', 'd', 'f', 'g'];

function sub(n: number, l: number): Subshell {
  return { n, l, label: `${n}${L_LETTER[l]}`, capacity: 2 * (2 * l + 1) };
}

/** Madelung order: by n + l, then by n. Enough subshells for 120 electrons. */
export const FILL_ORDER: Subshell[] = (() => {
  const out: Subshell[] = [];
  for (let s = 1; s <= 8; s++) {
    for (let n = 1; n <= s; n++) {
      const l = s - n;
      if (l < n && l <= 3) out.push(sub(n, l));
    }
  }
  return out;
})();

/** Electrons the app can place (enough for Og⁻ and Og²⁻). */
export const MAX_ELECTRONS = FILL_ORDER.slice(0, FILL_ORDER.findIndex((s) => s.label === '8s') + 1).reduce((a, s) => a + s.capacity, 0);

const SUB_BY_LABEL = new Map(FILL_ORDER.map((s) => [s.label, s]));

/** Configuration: subshell label → electron count. Only occupied subshells are kept. */
export type Configuration = Map<string, number>;

/** Neutral ground states that differ from the plain Madelung order (NIST). Only the valence part is listed. */
const EXCEPTIONS: Record<number, string> = {
  24: '[Ar] 3d5 4s1',
  29: '[Ar] 3d10 4s1',
  41: '[Kr] 4d4 5s1',
  42: '[Kr] 4d5 5s1',
  44: '[Kr] 4d7 5s1',
  45: '[Kr] 4d8 5s1',
  46: '[Kr] 4d10',
  47: '[Kr] 4d10 5s1',
  57: '[Xe] 5d1 6s2',
  58: '[Xe] 4f1 5d1 6s2',
  64: '[Xe] 4f7 5d1 6s2',
  78: '[Xe] 4f14 5d9 6s1',
  79: '[Xe] 4f14 5d10 6s1',
  89: '[Rn] 6d1 7s2',
  90: '[Rn] 6d2 7s2',
  91: '[Rn] 5f2 6d1 7s2',
  92: '[Rn] 5f3 6d1 7s2',
  93: '[Rn] 5f4 6d1 7s2',
  96: '[Rn] 5f7 6d1 7s2',
  103: '[Rn] 5f14 7s2 7p1',
};

export const NOBLE_GASES: { Z: number; symbol: string }[] = [
  { Z: 2, symbol: 'He' },
  { Z: 10, symbol: 'Ne' },
  { Z: 18, symbol: 'Ar' },
  { Z: 36, symbol: 'Kr' },
  { Z: 54, symbol: 'Xe' },
  { Z: 86, symbol: 'Rn' },
  { Z: 118, symbol: 'Og' },
];

/** Fill `count` electrons in Madelung order. */
export function aufbau(count: number): Configuration {
  const cfg: Configuration = new Map();
  let left = Math.max(0, Math.min(count, MAX_ELECTRONS));
  for (const s of FILL_ORDER) {
    if (left <= 0) break;
    const k = Math.min(s.capacity, left);
    cfg.set(s.label, k);
    left -= k;
  }
  return cfg;
}

/** Parse "[Ar] 3d5 4s1" or "1s2 2s2 2p6". */
export function parseConfiguration(text: string): Configuration {
  const cfg: Configuration = new Map();
  for (const tok of text.trim().split(/\s+/)) {
    const core = /^\[([A-Z][a-z]?)\]$/.exec(tok);
    if (core) {
      const ng = NOBLE_GASES.find((g) => g.symbol === core[1]);
      if (!ng) throw new Error(`Unknown core ${tok}`);
      for (const [k, v] of aufbau(ng.Z)) cfg.set(k, v);
      continue;
    }
    const m = /^(\d)([spdfg])(\d+)$/.exec(tok);
    if (!m || !SUB_BY_LABEL.has(`${m[1]}${m[2]}`)) throw new Error(`Bad subshell ${tok}`);
    cfg.set(`${m[1]}${m[2]}`, Number(m[3]));
  }
  return cfg;
}

/** Ground-state configuration of the neutral atom with atomic number Z. */
export function neutralConfiguration(Z: number): Configuration {
  return EXCEPTIONS[Z] ? parseConfiguration(EXCEPTIONS[Z]) : aufbau(Z);
}

export function isExceptionalConfiguration(Z: number): boolean {
  return Z in EXCEPTIONS;
}

function info(label: string): Subshell {
  return SUB_BY_LABEL.get(label)!;
}

/**
 * Configuration of an atom or ion with Z protons and `electrons` electrons.
 * Z = 0 (no nucleus) returns an empty configuration.
 */
export function configuration(Z: number, electrons: number): Configuration {
  if (Z <= 0 || electrons <= 0) return new Map();
  const cfg = new Map(neutralConfiguration(Math.min(Z, 118)));
  let diff = Math.min(electrons, MAX_ELECTRONS) - Math.min(Z, 118);
  // cation: take electrons from the highest n, then the highest l
  while (diff < 0) {
    let best: Subshell | null = null;
    for (const [label, k] of cfg) {
      if (k <= 0) continue;
      const s = info(label);
      if (!best || s.n > best.n || (s.n === best.n && s.l > best.l)) best = s;
    }
    if (!best) break;
    const k = cfg.get(best.label)! - 1;
    if (k) cfg.set(best.label, k);
    else cfg.delete(best.label);
    diff++;
  }
  // anion: add electrons in filling order
  for (const s of FILL_ORDER) {
    if (diff <= 0) break;
    const k = cfg.get(s.label) ?? 0;
    const add = Math.min(s.capacity - k, diff);
    if (add > 0) {
      cfg.set(s.label, k + add);
      diff -= add;
    }
  }
  return cfg;
}

/** Subshells ordered by n then l (the conventional way of writing a configuration). */
export function orderedSubshells(cfg: Configuration): { sub: Subshell; count: number }[] {
  return [...cfg.entries()]
    .filter(([, k]) => k > 0)
    .map(([label, count]) => ({ sub: info(label), count }))
    .sort((a, b) => a.sub.n - b.sub.n || a.sub.l - b.sub.l);
}

export function totalElectrons(cfg: Configuration): number {
  let t = 0;
  for (const k of cfg.values()) t += k;
  return t;
}

/** Full notation, e.g. "1s2 2s2 2p6 3s1". */
export function configString(cfg: Configuration): string {
  return orderedSubshells(cfg)
    .map(({ sub: s, count }) => `${s.label}${count}`)
    .join(' ');
}

function contains(cfg: Configuration, core: Configuration): boolean {
  for (const [label, k] of core) if ((cfg.get(label) ?? 0) < k) return false;
  return true;
}

/** The largest noble-gas core contained in the configuration, if any. */
export function nobleGasCore(cfg: Configuration): { symbol: string; Z: number } | null {
  for (let i = NOBLE_GASES.length - 1; i >= 0; i--) {
    const g = NOBLE_GASES[i];
    if (totalElectrons(cfg) >= g.Z && contains(cfg, aufbau(g.Z))) return g;
  }
  return null;
}

/** Noble-gas shorthand, e.g. "[Ne] 3s1"; "[Ne]" for Na⁺. */
export function shorthand(cfg: Configuration): string {
  const core = nobleGasCore(cfg);
  if (!core) return configString(cfg);
  const coreCfg = aufbau(core.Z);
  const rest: Configuration = new Map();
  for (const [label, k] of cfg) {
    const r = k - (coreCfg.get(label) ?? 0);
    if (r > 0) rest.set(label, r);
  }
  const tail = configString(rest);
  return tail ? `[${core.symbol}] ${tail}` : `[${core.symbol}]`;
}

/** If the configuration equals a noble gas's, return that gas (e.g. Na⁺ → Ne). */
export function isoelectronicNobleGas(cfg: Configuration): { symbol: string; Z: number } | null {
  const total = totalElectrons(cfg);
  const g = NOBLE_GASES.find((x) => x.Z === total);
  if (!g) return null;
  const ref = aufbau(g.Z);
  if (ref.size !== cfg.size) return null;
  for (const [label, k] of ref) if (cfg.get(label) !== k) return null;
  return g;
}

/** Electrons per principal quantum number n — the rings of the Bohr picture. */
export function shellCounts(cfg: Configuration): number[] {
  const out: number[] = [];
  for (const [label, k] of cfg) {
    const n = info(label).n;
    while (out.length < n) out.push(0);
    out[n - 1] += k;
  }
  return out;
}

/** Electrons in the outermost occupied shell. */
export function outerShellElectrons(cfg: Configuration): number {
  const shells = shellCounts(cfg);
  for (let i = shells.length - 1; i >= 0; i--) if (shells[i] > 0) return shells[i];
  return 0;
}

export interface OrbitalBoxRow {
  label: string;
  /** one entry per orbital: 0 empty, 1 ↑, 2 ↑↓ */
  boxes: number[];
}

/** Box diagram (Hund's rule: singly fill each orbital, then pair) for the subshells outside the noble-gas core. */
export function orbitalBoxes(cfg: Configuration): { core: string | null; rows: OrbitalBoxRow[] } {
  const core = nobleGasCore(cfg);
  const coreCfg = core ? aufbau(core.Z) : new Map<string, number>();
  const rows: OrbitalBoxRow[] = [];
  for (const s of FILL_ORDER) {
    const k = cfg.get(s.label) ?? 0;
    if (!k || (coreCfg.get(s.label) ?? 0) === k) continue;
    const orbitals = 2 * s.l + 1;
    const boxes = Array.from({ length: orbitals }, (_, i) => (k >= orbitals + i + 1 ? 2 : k >= i + 1 ? 1 : 0));
    rows.push({ label: s.label, boxes });
  }
  return { core: core?.symbol ?? null, rows };
}

/** Superscript notation for display, e.g. "[Ar] 3d⁶ 4s²". */
export function prettyConfig(text: string): string {
  const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  return text.replace(/(\d[spdfg])(\d+)/g, (_, s: string, k: string) => s + [...k].map((d) => SUP[Number(d)]).join(''));
}
