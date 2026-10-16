/**
 * Nuclide data and classification.
 *
 * Exact data (rounded to 2–4 significant figures):
 *  - STABLE: every nuclide for which no decay has ever been observed (251 nuclides, Z = 1…82, none for Tc and
 *    Pm). A few of them may turn out to decay with half-lives far longer than the age of the universe.
 *  - RADIOACTIVE: a curated table of well-known radioactive nuclides with half-life and main decay mode,
 *    including the known light isotopes up to oxygen and the longest-lived isotope of every element
 *    without stable isotopes.
 *  - UNBOUND: light nuclei that have been observed only as resonances that fall apart in ~10⁻²¹ s.
 *
 * Estimates (marked ≈ in the UI): anything else is classified with the semi-empirical (liquid-drop) mass
 * formula — whether it is bound at all, and its most likely decay mode from its position relative to the
 * valley of stability.
 */

export type DecayMode = 'β-' | 'β+' | 'EC' | 'α' | 'SF' | '2β-' | '2EC' | 'n' | '2n' | 'p' | '2p' | '2α';

export const DECAY_LABEL: Record<DecayMode, string> = {
  'β-': 'β⁻ decay',
  'β+': 'β⁺ decay',
  EC: 'electron capture',
  α: 'α decay',
  SF: 'spontaneous fission',
  '2β-': 'double β⁻ decay',
  '2EC': 'double electron capture',
  n: 'neutron emission',
  '2n': 'two-neutron emission',
  p: 'proton emission',
  '2p': 'two-proton emission',
  '2α': 'break-up into two α particles',
};

export const DECAY_EXPLAIN: Record<DecayMode, string> = {
  'β-': 'A neutron turns into a proton, emitting an electron and an antineutrino. Z goes up by 1, A stays the same.',
  'β+': 'A proton turns into a neutron, emitting a positron and a neutrino. Z goes down by 1, A stays the same.',
  EC: 'The nucleus captures one of its own inner electrons; a proton becomes a neutron. Z goes down by 1.',
  α: 'The nucleus emits an α particle (a helium-4 nucleus: 2 protons + 2 neutrons). Z drops by 2, A by 4.',
  SF: 'The nucleus splits into two large fragments plus a few neutrons.',
  '2β-': 'Two neutrons turn into two protons at once — extremely slow.',
  '2EC': 'Two electrons are captured at once — extremely slow.',
  n: 'A neutron simply falls out: the nucleus is not bound.',
  '2n': 'Two neutrons fall out: the nucleus is not bound.',
  p: 'A proton falls out: the nucleus is not bound.',
  '2p': 'Two protons fall out: the nucleus is not bound.',
  '2α': 'The nucleus instantly splits into two helium-4 nuclei.',
};

const YEAR = 365.25 * 86400;
const UNIT: Record<string, number> = { us: 1e-6, ms: 1e-3, s: 1, min: 60, h: 3600, d: 86400, y: YEAR };

/** Stable nuclides (no decay observed): Z → mass numbers. */
export const STABLE: Record<number, number[]> = {
  1: [1, 2], 2: [3, 4], 3: [6, 7], 4: [9], 5: [10, 11], 6: [12, 13], 7: [14, 15], 8: [16, 17, 18], 9: [19], 10: [20, 21, 22],
  11: [23], 12: [24, 25, 26], 13: [27], 14: [28, 29, 30], 15: [31], 16: [32, 33, 34, 36], 17: [35, 37], 18: [36, 38, 40],
  19: [39, 41], 20: [40, 42, 43, 44, 46], 21: [45], 22: [46, 47, 48, 49, 50], 23: [51], 24: [50, 52, 53, 54], 25: [55],
  26: [54, 56, 57, 58], 27: [59], 28: [58, 60, 61, 62, 64], 29: [63, 65], 30: [64, 66, 67, 68, 70], 31: [69, 71],
  32: [70, 72, 73, 74], 33: [75], 34: [74, 76, 77, 78, 80], 35: [79, 81], 36: [80, 82, 83, 84, 86], 37: [85],
  38: [84, 86, 87, 88], 39: [89], 40: [90, 91, 92, 94], 41: [93], 42: [92, 94, 95, 96, 97, 98],
  44: [96, 98, 99, 100, 101, 102, 104], 45: [103], 46: [102, 104, 105, 106, 108, 110], 47: [107, 109],
  48: [106, 108, 110, 111, 112, 114], 49: [113], 50: [112, 114, 115, 116, 117, 118, 119, 120, 122, 124], 51: [121, 123],
  52: [120, 122, 123, 124, 125, 126], 53: [127], 54: [126, 128, 129, 130, 131, 132, 134], 55: [133],
  56: [132, 134, 135, 136, 137, 138], 57: [139], 58: [136, 138, 140, 142], 59: [141], 60: [142, 143, 145, 146, 148],
  62: [144, 149, 150, 152, 154], 63: [153], 64: [154, 155, 156, 157, 158, 160], 65: [159], 66: [156, 158, 160, 161, 162, 163, 164],
  67: [165], 68: [162, 164, 166, 167, 168, 170], 69: [169], 70: [168, 170, 171, 172, 173, 174, 176], 71: [175],
  72: [176, 177, 178, 179, 180], 73: [181], 74: [182, 183, 184, 186], 75: [185], 76: [184, 187, 188, 189, 190, 192],
  77: [191, 193], 78: [192, 194, 195, 196, 198], 79: [197], 80: [196, 198, 199, 200, 201, 202, 204], 81: [203, 205],
  82: [204, 206, 207, 208],
};

export interface RadioactiveEntry {
  Z: number;
  A: number;
  /** seconds */
  halfLife: number;
  modes: DecayMode[];
  /** superheavy: only a handful of atoms observed; large uncertainty */
  uncertain?: boolean;
  note?: string;
}

// [Z, A, half-life, unit, modes, note?]
type Row = [number, number, number, string, string, string?];
const RADIO_ROWS: Row[] = [
  [1, 3, 12.32, 'y', 'β-', 'Tritium'],
  [2, 6, 0.807, 's', 'β-'], [2, 8, 0.119, 's', 'β-'],
  [3, 8, 0.84, 's', 'β-'], [3, 9, 0.178, 's', 'β-'], [3, 11, 8.75, 'ms', 'β-', 'A “halo” nucleus: two neutrons orbit far outside the core.'],
  [4, 7, 53.2, 'd', 'EC'], [4, 10, 1.39e6, 'y', 'β-'], [4, 11, 13.8, 's', 'β-'], [4, 12, 21.5, 'ms', 'β-'], [4, 14, 4.35, 'ms', 'β-'],
  [5, 8, 0.77, 's', 'β+'], [5, 12, 20.2, 'ms', 'β-'], [5, 13, 17.3, 'ms', 'β-'], [5, 14, 12.5, 'ms', 'β-'], [5, 15, 9.9, 'ms', 'β-'],
  [5, 17, 5.1, 'ms', 'β-'], [5, 19, 2.9, 'ms', 'β-'],
  [6, 9, 126.5, 'ms', 'β+'], [6, 10, 19.3, 's', 'β+'], [6, 11, 20.36, 'min', 'β+', 'Used in PET medical scans.'],
  [6, 14, 5700, 'y', 'β-', 'Radiocarbon: made in the atmosphere by cosmic rays; used for dating (often quoted as 5730 y).'],
  [6, 15, 2.45, 's', 'β-'], [6, 16, 0.747, 's', 'β-'], [6, 17, 193, 'ms', 'β-'], [6, 18, 92, 'ms', 'β-'], [6, 19, 46, 'ms', 'β-'],
  [6, 20, 16, 'ms', 'β-'], [6, 22, 6.2, 'ms', 'β-'],
  [7, 12, 11.0, 'ms', 'β+'], [7, 13, 9.965, 'min', 'β+'], [7, 16, 7.13, 's', 'β-'], [7, 17, 4.17, 's', 'β-'], [7, 18, 0.62, 's', 'β-'],
  [7, 19, 0.336, 's', 'β-'], [7, 20, 136, 'ms', 'β-'], [7, 21, 84, 'ms', 'β-'], [7, 22, 23, 'ms', 'β-'], [7, 23, 14, 'ms', 'β-'],
  [8, 13, 8.58, 'ms', 'β+'], [8, 14, 70.6, 's', 'β+'], [8, 15, 122.2, 's', 'β+'], [8, 19, 26.9, 's', 'β-'], [8, 20, 13.5, 's', 'β-'],
  [8, 21, 3.42, 's', 'β-'], [8, 22, 2.25, 's', 'β-'], [8, 23, 97, 'ms', 'β-'], [8, 24, 77, 'ms', 'β-'],
  [9, 17, 64.5, 's', 'β+'], [9, 18, 109.7, 'min', 'β+', 'Used in PET medical scans.'], [9, 20, 11.0, 's', 'β-'],
  [10, 19, 17.2, 's', 'β+'], [10, 23, 37.2, 's', 'β-'],
  [11, 22, 2.602, 'y', 'β+'], [11, 24, 14.96, 'h', 'β-'],
  [12, 27, 9.46, 'min', 'β-'], [12, 28, 20.9, 'h', 'β-'],
  [13, 26, 7.17e5, 'y', 'β+'], [13, 28, 2.24, 'min', 'β-'],
  [14, 31, 157, 'min', 'β-'], [14, 32, 153, 'y', 'β-'],
  [15, 32, 14.27, 'd', 'β-'], [15, 33, 25.3, 'd', 'β-'],
  [16, 35, 87.4, 'd', 'β-'],
  [17, 36, 3.01e5, 'y', 'β-'],
  [18, 39, 268, 'y', 'β-'], [18, 41, 109.6, 'min', 'β-'],
  [19, 40, 1.248e9, 'y', 'β-,EC', 'Natural radioactivity in bananas and in your body.'],
  [20, 41, 9.9e4, 'y', 'EC'], [20, 45, 162.6, 'd', 'β-'], [20, 48, 6.4e19, 'y', '2β-'],
  [21, 46, 83.8, 'd', 'β-'],
  [22, 44, 59.1, 'y', 'EC'],
  [23, 50, 2.7e17, 'y', 'EC'],
  [24, 51, 27.7, 'd', 'EC'],
  [25, 54, 312, 'd', 'EC'],
  [26, 55, 2.74, 'y', 'EC'], [26, 59, 44.5, 'd', 'β-'], [26, 60, 2.6e6, 'y', 'β-'],
  [27, 57, 271.7, 'd', 'EC'], [27, 60, 5.27, 'y', 'β-', 'Used in radiotherapy and to sterilise equipment.'],
  [28, 59, 7.6e4, 'y', 'EC'], [28, 63, 101, 'y', 'β-'],
  [29, 64, 12.7, 'h', 'β+,β-'],
  [30, 65, 244, 'd', 'EC'],
  [31, 67, 3.26, 'd', 'EC'], [31, 68, 67.7, 'min', 'β+'],
  [32, 68, 271, 'd', 'EC'], [32, 76, 1.8e21, 'y', '2β-'],
  [34, 75, 119.8, 'd', 'EC'], [34, 79, 3.3e5, 'y', 'β-'], [34, 82, 1.0e20, 'y', '2β-'],
  [36, 78, 9.2e21, 'y', '2EC'], [36, 81, 2.3e5, 'y', 'EC'], [36, 85, 10.75, 'y', 'β-'],
  [37, 87, 4.97e10, 'y', 'β-'],
  [38, 89, 50.6, 'd', 'β-'], [38, 90, 28.8, 'y', 'β-', 'A fission product from nuclear reactors and weapons tests.'],
  [39, 90, 64.0, 'h', 'β-'],
  [40, 96, 2.3e19, 'y', '2β-'],
  [42, 99, 65.9, 'h', 'β-'], [42, 100, 7.1e18, 'y', '2β-'],
  [43, 97, 4.21e6, 'y', 'EC'], [43, 98, 4.2e6, 'y', 'β-'], [43, 99, 2.11e5, 'y', 'β-', 'Its excited state ⁹⁹ᵐTc (6 h) is the most used medical tracer.'],
  [44, 106, 371.8, 'd', 'β-'],
  [46, 107, 6.5e6, 'y', 'β-'],
  [48, 109, 461, 'd', 'EC'], [48, 113, 8.0e15, 'y', 'β-'], [48, 116, 2.8e19, 'y', '2β-'],
  [49, 111, 2.80, 'd', 'EC'], [49, 115, 4.41e14, 'y', 'β-', 'Most natural indium is this very slightly radioactive isotope.'],
  [50, 126, 2.3e5, 'y', 'β-'],
  [51, 125, 2.76, 'y', 'β-'],
  [52, 128, 2.2e24, 'y', '2β-', 'The slowest decay ever measured.'], [52, 130, 7.9e20, 'y', '2β-'],
  [53, 125, 59.4, 'd', 'EC'], [53, 129, 1.57e7, 'y', 'β-'], [53, 131, 8.02, 'd', 'β-', 'Used to treat thyroid disease.'],
  [54, 124, 1.8e22, 'y', '2EC'], [54, 133, 5.25, 'd', 'β-'], [54, 135, 9.14, 'h', 'β-'], [54, 136, 2.2e21, 'y', '2β-'],
  [55, 134, 2.065, 'y', 'β-'], [55, 135, 2.3e6, 'y', 'β-'], [55, 137, 30.08, 'y', 'β-', 'A fission product (Chernobyl, Fukushima).'],
  [56, 130, 1e21, 'y', '2EC'], [56, 133, 10.5, 'y', 'EC'],
  [57, 138, 1.03e11, 'y', 'EC,β-'],
  [58, 144, 284.9, 'd', 'β-'],
  [60, 144, 2.29e15, 'y', 'α'], [60, 150, 9.3e18, 'y', '2β-'],
  [61, 145, 17.7, 'y', 'EC'], [61, 147, 2.62, 'y', 'β-'],
  [62, 147, 1.06e11, 'y', 'α'], [62, 148, 7e15, 'y', 'α'],
  [63, 151, 5e18, 'y', 'α'], [63, 152, 13.5, 'y', 'EC,β-'], [63, 154, 8.6, 'y', 'β-'],
  [64, 152, 1.08e14, 'y', 'α'], [64, 153, 240, 'd', 'EC'],
  [71, 176, 3.76e10, 'y', 'β-'],
  [72, 174, 2.0e15, 'y', 'α'],
  [74, 180, 1.8e18, 'y', 'α'],
  [75, 187, 4.12e10, 'y', 'β-'],
  [76, 186, 2.0e15, 'y', 'α'],
  [77, 192, 73.8, 'd', 'β-'],
  [78, 190, 4.8e11, 'y', 'α'],
  [79, 198, 2.69, 'd', 'β-'],
  [80, 203, 46.6, 'd', 'β-'],
  [81, 204, 3.78, 'y', 'β-'],
  [82, 210, 22.2, 'y', 'β-'], [82, 212, 10.6, 'h', 'β-'], [82, 214, 26.8, 'min', 'β-'],
  [83, 209, 2.01e19, 'y', 'α', 'Was thought to be stable until 2003.'], [83, 210, 5.01, 'd', 'β-'], [83, 214, 19.9, 'min', 'β-'],
  [84, 209, 124, 'y', 'α'], [84, 210, 138.4, 'd', 'α'], [84, 214, 164, 'us', 'α'], [84, 218, 3.10, 'min', 'α'],
  [85, 210, 8.1, 'h', 'EC'], [85, 211, 7.2, 'h', 'EC,α'],
  [86, 220, 55.6, 's', 'α'], [86, 222, 3.82, 'd', 'α', 'A radioactive gas that seeps out of rocks; the largest source of natural radiation dose for most people.'],
  [87, 223, 22.0, 'min', 'β-'],
  [88, 226, 1600, 'y', 'α', 'Discovered by Marie and Pierre Curie.'], [88, 228, 5.75, 'y', 'β-'],
  [89, 227, 21.8, 'y', 'β-'],
  [90, 230, 7.54e4, 'y', 'α'], [90, 232, 1.40e10, 'y', 'α'], [90, 234, 24.1, 'd', 'β-'],
  [91, 231, 3.28e4, 'y', 'α'],
  [92, 233, 1.59e5, 'y', 'α'], [92, 234, 2.45e5, 'y', 'α'], [92, 235, 7.04e8, 'y', 'α', 'The fissile isotope used in nuclear reactors (0.72 % of natural uranium).'],
  [92, 238, 4.47e9, 'y', 'α', 'About as old as the Earth: half of the original ²³⁸U is still here.'],
  [93, 237, 2.14e6, 'y', 'α'],
  [94, 238, 87.7, 'y', 'α', 'Powers space probes (radioisotope generators).'], [94, 239, 2.41e4, 'y', 'α'], [94, 244, 8.1e7, 'y', 'α'],
  [95, 241, 432.2, 'y', 'α', 'Used in household smoke detectors.'], [95, 243, 7370, 'y', 'α'],
  [96, 247, 1.56e7, 'y', 'α'],
  [97, 247, 1380, 'y', 'α'],
  [98, 251, 898, 'y', 'α'], [98, 252, 2.645, 'y', 'α,SF'],
  [99, 252, 471.7, 'd', 'α'],
  [100, 257, 100.5, 'd', 'α'],
  [101, 258, 51.5, 'd', 'α'],
  [102, 259, 58, 'min', 'α'],
  [103, 266, 11, 'h', 'SF'],
];

// Superheavy elements: few atoms observed, values approximate.
const SUPERHEAVY_ROWS: Row[] = [
  [104, 267, 1.3, 'h', 'SF'], [105, 268, 16, 'h', 'SF'], [106, 269, 14, 'min', 'α'], [107, 270, 61, 's', 'α'],
  [108, 269, 10, 's', 'α'], [109, 278, 5, 's', 'α'], [110, 281, 13, 's', 'SF'], [111, 282, 100, 's', 'α'],
  [112, 285, 30, 's', 'α'], [113, 286, 10, 's', 'α'], [114, 289, 2, 's', 'α'], [115, 290, 0.65, 's', 'α'],
  [116, 293, 57, 'ms', 'α'], [117, 294, 51, 'ms', 'α'], [118, 294, 0.7, 'ms', 'α'],
];

function toEntry([Z, A, t, u, modes, note]: Row, uncertain = false): RadioactiveEntry {
  return { Z, A, halfLife: t * UNIT[u], modes: modes.split(',') as DecayMode[], uncertain, note };
}

export const RADIOACTIVE: RadioactiveEntry[] = [...RADIO_ROWS.map((r) => toEntry(r)), ...SUPERHEAVY_ROWS.map((r) => toEntry(r, true))];

/** Light nuclei observed only as unbound resonances (lifetimes ~10⁻²² – 10⁻¹⁶ s). [Z, A, mode] */
const UNBOUND_ROWS: [number, number, DecayMode][] = [
  [1, 4, 'n'], [1, 5, '2n'], [1, 6, 'n'], [1, 7, '2n'],
  [2, 2, 'p'], [2, 5, 'n'], [2, 7, 'n'], [2, 9, 'n'], [2, 10, '2n'],
  [3, 4, 'p'], [3, 5, 'p'], [3, 10, 'n'], [3, 12, 'n'], [3, 13, '2n'],
  [4, 6, '2p'], [4, 8, '2α'], [4, 13, 'n'], [4, 15, 'n'], [4, 16, '2n'],
  [5, 7, 'p'], [5, 9, 'p'], [5, 16, 'n'], [5, 18, 'n'], [5, 20, 'n'], [5, 21, '2n'],
  [6, 8, '2p'], [6, 21, 'n'],
  [7, 10, 'p'], [7, 11, 'p'], [7, 24, 'n'], [7, 25, 'n'],
  [8, 11, '2p'], [8, 12, '2p'], [8, 25, 'n'], [8, 26, '2n'], [8, 27, 'n'], [8, 28, '2n'],
];

/** For Z ≤ LIGHT_COMPLETE_Z the tables above aim to list every observed nuclide; anything else is reported as never observed. */
export const LIGHT_COMPLETE_Z = 8;

const key = (Z: number, A: number) => Z * 1000 + A;
const RADIO_MAP = new Map(RADIOACTIVE.map((e) => [key(e.Z, e.A), e]));
const UNBOUND_MAP = new Map(UNBOUND_ROWS.map(([Z, A, m]) => [key(Z, A), m]));

export function isStable(Z: number, A: number): boolean {
  return STABLE[Z]?.includes(A) ?? false;
}

export function radioactiveEntry(Z: number, A: number): RadioactiveEntry | null {
  return RADIO_MAP.get(key(Z, A)) ?? null;
}

export function stableCount(): number {
  return Object.values(STABLE).reduce((a, l) => a + l.length, 0);
}

/** Known isotopes of an element for the isotope list: stable ones and those in the radioactive table. */
export function listedIsotopes(Z: number): { A: number; stable: boolean; entry: RadioactiveEntry | null }[] {
  const out = (STABLE[Z] ?? []).map((A) => ({ A, stable: true, entry: null as RadioactiveEntry | null }));
  for (const e of RADIOACTIVE) if (e.Z === Z) out.push({ A: e.A, stable: false, entry: e });
  return out.sort((a, b) => a.A - b.A);
}

// ---------- semi-empirical mass formula (liquid-drop model) ----------

const aV = 15.75;
const aS = 17.8;
const aC = 0.711;
const aA = 23.7;
const aP = 11.18;

/** Liquid-drop binding energy in MeV (≈ a few % for medium/heavy nuclei, poor for very light ones). */
export function semfBinding(Z: number, N: number): number {
  const A = Z + N;
  if (A <= 1 || Z < 0 || N < 0) return 0;
  let pairing = 0;
  if (Z % 2 === 0 && N % 2 === 0) pairing = aP / Math.sqrt(A);
  else if (Z % 2 === 1 && N % 2 === 1) pairing = -aP / Math.sqrt(A);
  const B = aV * A - aS * A ** (2 / 3) - (aC * Z * (Z - 1)) / A ** (1 / 3) - (aA * (A - 2 * Z) ** 2) / A + pairing;
  return B;
}

/** Proton number of the β-stability valley for mass number A (from the liquid-drop formula). */
export function valleyZ(A: number): number {
  return A / (2 + (aC / (2 * aA)) * A ** (2 / 3));
}

// ---------- classification ----------

export type NucleusStatus = 'empty' | 'neutron' | 'neutrons' | 'stable' | 'radioactive' | 'unbound';

export interface NucleusInfo {
  status: NucleusStatus;
  /** true when the result comes from the liquid-drop estimate rather than measured data */
  estimate: boolean;
  /** seconds, when known */
  halfLife: number | null;
  modes: DecayMode[];
  uncertain: boolean;
  note: string | null;
  /** short headline, e.g. "Stable", "Radioactive — t½ 5,700 years" */
  summary: string;
}

/** Product nucleus after one decay of the given mode, or null for fission. */
export function daughter(Z: number, N: number, mode: DecayMode): { Z: number; N: number } | null {
  switch (mode) {
    case 'β-':
      return { Z: Z + 1, N: N - 1 };
    case 'β+':
    case 'EC':
      return { Z: Z - 1, N: N + 1 };
    case 'α':
    case '2α':
      return { Z: Z - 2, N: N - 2 };
    case '2β-':
      return { Z: Z + 2, N: N - 2 };
    case '2EC':
      return { Z: Z - 2, N: N + 2 };
    case 'n':
      return { Z, N: N - 1 };
    case '2n':
      return { Z, N: N - 2 };
    case 'p':
      return { Z: Z - 1, N };
    case '2p':
      return { Z: Z - 2, N };
    case 'SF':
      return null;
  }
}

function estimateMode(Z: number, N: number): DecayMode {
  const A = Z + N;
  const z0 = valleyZ(A);
  if (Z >= 84 && Z >= z0 - 2) return 'α';
  return Z > z0 ? 'β+' : 'β-';
}

export function formatHalfLife(s: number): string {
  const sig = (x: number) => (x >= 100 ? Math.round(x).toLocaleString('en-GB') : x.toPrecision(3).replace(/\.?0+$/, ''));
  if (s >= YEAR * 1e6) {
    const y = s / YEAR;
    const e = Math.floor(Math.log10(y));
    const m = y / 10 ** e;
    return `${m.toPrecision(3).replace(/\.?0+$/, '')} × 10${superscript(e)} years`;
  }
  if (s >= YEAR) return `${sig(s / YEAR)} years`;
  if (s >= 86400) return `${sig(s / 86400)} days`;
  if (s >= 3600) return `${sig(s / 3600)} hours`;
  if (s >= 60) return `${sig(s / 60)} minutes`;
  if (s >= 1) return `${sig(s)} s`;
  if (s >= 1e-3) return `${sig(s * 1e3)} ms`;
  return `${sig(s * 1e6)} µs`;
}

export function superscript(n: number | string): string {
  const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '+': '⁺' };
  return String(n)
    .split('')
    .map((c) => SUP[c] ?? c)
    .join('');
}

/** Classify a nucleus with Z protons and N neutrons. */
export function classifyNucleus(Z: number, N: number): NucleusInfo {
  const base = { estimate: false, halfLife: null, modes: [] as DecayMode[], uncertain: false, note: null };
  const A = Z + N;
  if (A === 0) return { ...base, status: 'empty', summary: 'No nucleus' };
  if (Z === 0) {
    if (N === 1) return { ...base, status: 'neutron', halfLife: 610, modes: ['β-'], summary: 'A free neutron — decays to a proton (t½ ≈ 10 minutes)' };
    return { ...base, status: 'neutrons', modes: ['n'], summary: 'Neutrons alone do not stick together — no bound nucleus without protons' };
  }
  if (isStable(Z, A)) return { ...base, status: 'stable', summary: 'Stable — no decay has ever been observed' };
  const r = radioactiveEntry(Z, A);
  if (r)
    return {
      ...base,
      status: 'radioactive',
      halfLife: r.halfLife,
      modes: r.modes,
      uncertain: !!r.uncertain,
      note: r.note ?? (r.uncertain ? 'Only a few atoms have ever been made; the half-life is uncertain.' : null),
      summary: `Radioactive — half-life ${r.uncertain ? '≈ ' : ''}${formatHalfLife(r.halfLife)}`,
    };
  const ub = UNBOUND_MAP.get(key(Z, A));
  if (ub) return { ...base, status: 'unbound', modes: [ub], summary: 'Unbound — falls apart almost instantly (~10⁻²¹ s)' };
  if (Z <= LIGHT_COMPLETE_Z) {
    const proRich = N < Z;
    return {
      ...base,
      status: 'unbound',
      estimate: true,
      modes: [proRich ? 'p' : 'n'],
      summary: 'Never observed — beyond the limit where nucleons stay bound',
    };
  }
  // liquid-drop estimate
  const B = semfBinding(Z, N);
  const sn = B - semfBinding(Z, N - 1);
  const sp = B - semfBinding(Z - 1, N);
  const s2n = N >= 2 ? B - semfBinding(Z, N - 2) : sn;
  const s2p = Z >= 2 ? B - semfBinding(Z - 2, N) : sp;
  if (sn < 0 || s2n < 0) return { ...base, status: 'unbound', estimate: true, modes: [sn < 0 ? 'n' : '2n'], summary: 'Probably unbound — too many neutrons to hold on to' };
  if (sp < 0 || s2p < 0) return { ...base, status: 'unbound', estimate: true, modes: [sp < 0 ? 'p' : '2p'], summary: 'Probably unbound — too many protons to hold on to' };
  const mode = estimateMode(Z, N);
  return {
    ...base,
    status: 'radioactive',
    estimate: true,
    modes: [mode],
    summary: `Radioactive — not in this app’s data table; probably decays by ${DECAY_LABEL[mode]}`,
  };
}
