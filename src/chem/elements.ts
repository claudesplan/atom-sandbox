/**
 * The 118 elements. Data: IUPAC names (British spelling as used by IUPAC: aluminium, caesium, sulfur),
 * abridged standard atomic weights. A weight in brackets in the source tables — the element has no stable
 * isotope and no standard atomic weight — is stored as the mass number of its longest-lived (or reference)
 * isotope with `weightIsMassNumber: true`.
 */

export type Category =
  | 'alkali'
  | 'alkaline-earth'
  | 'transition'
  | 'post-transition'
  | 'metalloid'
  | 'nonmetal'
  | 'halogen'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide';

export type Block = 's' | 'p' | 'd' | 'f';

export interface Element {
  Z: number;
  symbol: string;
  name: string;
  /** Standard atomic weight in u (g/mol), or a mass number when `weightIsMassNumber`. */
  weight: number;
  weightIsMassNumber: boolean;
  /** 1–18, or null for the f-block rows (La–Lu, Ac–Lr) in the 18-column layout used here. */
  group: number | null;
  period: number;
  block: Block;
  category: Category;
  /** Z ≥ 104: only a few atoms ever made; chemistry and category are predictions. */
  predicted: boolean;
  /** Mass number used when the element is picked: most abundant isotope, or longest-lived if none is stable. */
  refA: number;
  /** Grid position for the periodic table: column 1–18, row 1–7, f-block rows 9–10. */
  col: number;
  row: number;
}

// Z, symbol, name, weight ("[n]" = mass number), category code, reference mass number
const RAW: [string, string, string, string, number][] = [
  ['H', 'Hydrogen', '1.008', 'nm', 1],
  ['He', 'Helium', '4.0026', 'ng', 4],
  ['Li', 'Lithium', '6.94', 'al', 7],
  ['Be', 'Beryllium', '9.0122', 'ae', 9],
  ['B', 'Boron', '10.81', 'md', 11],
  ['C', 'Carbon', '12.011', 'nm', 12],
  ['N', 'Nitrogen', '14.007', 'nm', 14],
  ['O', 'Oxygen', '15.999', 'nm', 16],
  ['F', 'Fluorine', '18.998', 'hl', 19],
  ['Ne', 'Neon', '20.180', 'ng', 20],
  ['Na', 'Sodium', '22.990', 'al', 23],
  ['Mg', 'Magnesium', '24.305', 'ae', 24],
  ['Al', 'Aluminium', '26.982', 'pt', 27],
  ['Si', 'Silicon', '28.085', 'md', 28],
  ['P', 'Phosphorus', '30.974', 'nm', 31],
  ['S', 'Sulfur', '32.06', 'nm', 32],
  ['Cl', 'Chlorine', '35.45', 'hl', 35],
  ['Ar', 'Argon', '39.95', 'ng', 40],
  ['K', 'Potassium', '39.098', 'al', 39],
  ['Ca', 'Calcium', '40.078', 'ae', 40],
  ['Sc', 'Scandium', '44.956', 'tm', 45],
  ['Ti', 'Titanium', '47.867', 'tm', 48],
  ['V', 'Vanadium', '50.942', 'tm', 51],
  ['Cr', 'Chromium', '51.996', 'tm', 52],
  ['Mn', 'Manganese', '54.938', 'tm', 55],
  ['Fe', 'Iron', '55.845', 'tm', 56],
  ['Co', 'Cobalt', '58.933', 'tm', 59],
  ['Ni', 'Nickel', '58.693', 'tm', 58],
  ['Cu', 'Copper', '63.546', 'tm', 63],
  ['Zn', 'Zinc', '65.38', 'tm', 64],
  ['Ga', 'Gallium', '69.723', 'pt', 69],
  ['Ge', 'Germanium', '72.630', 'md', 74],
  ['As', 'Arsenic', '74.922', 'md', 75],
  ['Se', 'Selenium', '78.971', 'nm', 80],
  ['Br', 'Bromine', '79.904', 'hl', 79],
  ['Kr', 'Krypton', '83.798', 'ng', 84],
  ['Rb', 'Rubidium', '85.468', 'al', 85],
  ['Sr', 'Strontium', '87.62', 'ae', 88],
  ['Y', 'Yttrium', '88.906', 'tm', 89],
  ['Zr', 'Zirconium', '91.224', 'tm', 90],
  ['Nb', 'Niobium', '92.906', 'tm', 93],
  ['Mo', 'Molybdenum', '95.95', 'tm', 98],
  ['Tc', 'Technetium', '[98]', 'tm', 98],
  ['Ru', 'Ruthenium', '101.07', 'tm', 102],
  ['Rh', 'Rhodium', '102.91', 'tm', 103],
  ['Pd', 'Palladium', '106.42', 'tm', 106],
  ['Ag', 'Silver', '107.87', 'tm', 107],
  ['Cd', 'Cadmium', '112.41', 'tm', 114],
  ['In', 'Indium', '114.82', 'pt', 115],
  ['Sn', 'Tin', '118.71', 'pt', 120],
  ['Sb', 'Antimony', '121.76', 'md', 121],
  ['Te', 'Tellurium', '127.60', 'md', 130],
  ['I', 'Iodine', '126.90', 'hl', 127],
  ['Xe', 'Xenon', '131.29', 'ng', 132],
  ['Cs', 'Caesium', '132.91', 'al', 133],
  ['Ba', 'Barium', '137.33', 'ae', 138],
  ['La', 'Lanthanum', '138.91', 'ln', 139],
  ['Ce', 'Cerium', '140.12', 'ln', 140],
  ['Pr', 'Praseodymium', '140.91', 'ln', 141],
  ['Nd', 'Neodymium', '144.24', 'ln', 142],
  ['Pm', 'Promethium', '[145]', 'ln', 145],
  ['Sm', 'Samarium', '150.36', 'ln', 152],
  ['Eu', 'Europium', '151.96', 'ln', 153],
  ['Gd', 'Gadolinium', '157.25', 'ln', 158],
  ['Tb', 'Terbium', '158.93', 'ln', 159],
  ['Dy', 'Dysprosium', '162.50', 'ln', 164],
  ['Ho', 'Holmium', '164.93', 'ln', 165],
  ['Er', 'Erbium', '167.26', 'ln', 166],
  ['Tm', 'Thulium', '168.93', 'ln', 169],
  ['Yb', 'Ytterbium', '173.05', 'ln', 174],
  ['Lu', 'Lutetium', '174.97', 'ln', 175],
  ['Hf', 'Hafnium', '178.49', 'tm', 180],
  ['Ta', 'Tantalum', '180.95', 'tm', 181],
  ['W', 'Tungsten', '183.84', 'tm', 184],
  ['Re', 'Rhenium', '186.21', 'tm', 187],
  ['Os', 'Osmium', '190.23', 'tm', 192],
  ['Ir', 'Iridium', '192.22', 'tm', 193],
  ['Pt', 'Platinum', '195.08', 'tm', 195],
  ['Au', 'Gold', '196.97', 'tm', 197],
  ['Hg', 'Mercury', '200.59', 'tm', 202],
  ['Tl', 'Thallium', '204.38', 'pt', 205],
  ['Pb', 'Lead', '207.2', 'pt', 208],
  ['Bi', 'Bismuth', '208.98', 'pt', 209],
  ['Po', 'Polonium', '[209]', 'pt', 209],
  ['At', 'Astatine', '[210]', 'hl', 210],
  ['Rn', 'Radon', '[222]', 'ng', 222],
  ['Fr', 'Francium', '[223]', 'al', 223],
  ['Ra', 'Radium', '[226]', 'ae', 226],
  ['Ac', 'Actinium', '[227]', 'ac', 227],
  ['Th', 'Thorium', '232.04', 'ac', 232],
  ['Pa', 'Protactinium', '231.04', 'ac', 231],
  ['U', 'Uranium', '238.03', 'ac', 238],
  ['Np', 'Neptunium', '[237]', 'ac', 237],
  ['Pu', 'Plutonium', '[244]', 'ac', 244],
  ['Am', 'Americium', '[243]', 'ac', 243],
  ['Cm', 'Curium', '[247]', 'ac', 247],
  ['Bk', 'Berkelium', '[247]', 'ac', 247],
  ['Cf', 'Californium', '[251]', 'ac', 251],
  ['Es', 'Einsteinium', '[252]', 'ac', 252],
  ['Fm', 'Fermium', '[257]', 'ac', 257],
  ['Md', 'Mendelevium', '[258]', 'ac', 258],
  ['No', 'Nobelium', '[259]', 'ac', 259],
  ['Lr', 'Lawrencium', '[266]', 'ac', 266],
  ['Rf', 'Rutherfordium', '[267]', 'tm', 267],
  ['Db', 'Dubnium', '[268]', 'tm', 268],
  ['Sg', 'Seaborgium', '[269]', 'tm', 269],
  ['Bh', 'Bohrium', '[270]', 'tm', 270],
  ['Hs', 'Hassium', '[269]', 'tm', 269],
  ['Mt', 'Meitnerium', '[278]', 'tm', 278],
  ['Ds', 'Darmstadtium', '[281]', 'tm', 281],
  ['Rg', 'Roentgenium', '[282]', 'tm', 282],
  ['Cn', 'Copernicium', '[285]', 'tm', 285],
  ['Nh', 'Nihonium', '[286]', 'pt', 286],
  ['Fl', 'Flerovium', '[289]', 'pt', 289],
  ['Mc', 'Moscovium', '[290]', 'pt', 290],
  ['Lv', 'Livermorium', '[293]', 'pt', 293],
  ['Ts', 'Tennessine', '[294]', 'hl', 294],
  ['Og', 'Oganesson', '[294]', 'ng', 294],
];

const CAT: Record<string, Category> = {
  al: 'alkali',
  ae: 'alkaline-earth',
  tm: 'transition',
  pt: 'post-transition',
  md: 'metalloid',
  nm: 'nonmetal',
  hl: 'halogen',
  ng: 'noble-gas',
  ln: 'lanthanide',
  ac: 'actinide',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  alkali: 'Alkali metal',
  'alkaline-earth': 'Alkaline earth metal',
  transition: 'Transition metal',
  'post-transition': 'Post-transition metal',
  metalloid: 'Metalloid',
  nonmetal: 'Nonmetal',
  halogen: 'Halogen',
  'noble-gas': 'Noble gas',
  lanthanide: 'Lanthanide',
  actinide: 'Actinide',
};

/** Period and group (18-column layout, f-block separate) from Z. */
function position(Z: number): { period: number; group: number | null } {
  if (Z <= 2) return { period: 1, group: Z === 1 ? 1 : 18 };
  if (Z <= 10) return { period: 2, group: Z <= 4 ? Z - 2 : Z + 8 };
  if (Z <= 18) return { period: 3, group: Z <= 12 ? Z - 10 : Z };
  if (Z <= 36) return { period: 4, group: Z - 18 };
  if (Z <= 54) return { period: 5, group: Z - 36 };
  if (Z <= 86) return { period: 6, group: Z <= 56 ? Z - 54 : Z <= 71 ? null : Z - 68 };
  return { period: 7, group: Z <= 88 ? Z - 86 : Z <= 103 ? null : Z - 100 };
}

function blockOf(Z: number, group: number | null): Block {
  if (group === null) return 'f';
  if (Z === 2 || group <= 2) return 's';
  if (group <= 12) return 'd';
  return 'p';
}

export const ELEMENTS: Element[] = RAW.map(([symbol, name, w, cat, refA], i) => {
  const Z = i + 1;
  const { period, group } = position(Z);
  const bracket = w.startsWith('[');
  const fRow = group === null;
  return {
    Z,
    symbol,
    name,
    weight: Number(bracket ? w.slice(1, -1) : w),
    weightIsMassNumber: bracket,
    group,
    period,
    block: blockOf(Z, group),
    category: CAT[cat],
    predicted: Z >= 104,
    refA,
    col: fRow ? 3 + (Z - (period === 6 ? 57 : 89)) : group!,
    row: fRow ? (period === 6 ? 9 : 10) : period,
  };
});

const BY_SYMBOL = new Map(ELEMENTS.map((e) => [e.symbol, e]));

export function elementByZ(Z: number): Element | null {
  return Number.isInteger(Z) && Z >= 1 && Z <= ELEMENTS.length ? ELEMENTS[Z - 1] : null;
}

export function elementBySymbol(symbol: string): Element | null {
  return BY_SYMBOL.get(symbol) ?? null;
}

/** Find by symbol (case-sensitive first, then case-insensitive), name, or atomic number. */
export function findElement(query: string): Element | null {
  const q = query.trim();
  if (!q) return null;
  if (/^\d+$/.test(q)) return elementByZ(Number(q));
  const exact = BY_SYMBOL.get(q);
  if (exact) return exact;
  const lq = q.toLowerCase();
  return ELEMENTS.find((e) => e.symbol.toLowerCase() === lq || e.name.toLowerCase() === lq) ?? null;
}

/**
 * Typical ion charges met in school chemistry (compounds and solutions). A teaching list, not a law:
 * many elements form other ions, and multiply charged anions such as O²⁻ exist only inside crystals or
 * solutions, not as isolated gas-phase ions.
 */
export const COMMON_IONS: Record<number, number[]> = {
  1: [1, -1],
  3: [1],
  4: [2],
  7: [-3],
  8: [-2],
  9: [-1],
  11: [1],
  12: [2],
  13: [3],
  15: [-3],
  16: [-2],
  17: [-1],
  19: [1],
  20: [2],
  21: [3],
  24: [3, 2],
  25: [2],
  26: [2, 3],
  27: [2, 3],
  28: [2],
  29: [2, 1],
  30: [2],
  31: [3],
  34: [-2],
  35: [-1],
  37: [1],
  38: [2],
  47: [1],
  48: [2],
  50: [2, 4],
  53: [-1],
  55: [1],
  56: [2],
  79: [3, 1],
  80: [2],
  82: [2, 4],
};

/** Names of monatomic anions (-ide names). */
const ANION_NAMES: Record<number, string> = {
  1: 'hydride',
  5: 'boride',
  6: 'carbide',
  7: 'nitride',
  8: 'oxide',
  9: 'fluoride',
  14: 'silicide',
  15: 'phosphide',
  16: 'sulfide',
  17: 'chloride',
  33: 'arsenide',
  34: 'selenide',
  35: 'bromide',
  52: 'telluride',
  53: 'iodide',
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

/** Systematic name of a monatomic ion, e.g. "sodium ion", "iron(III) ion", "chloride ion". */
export function ionName(el: Element, charge: number): string {
  const lname = el.name.toLowerCase();
  if (charge === 0) return `${lname} atom`;
  if (charge < 0) return ANION_NAMES[el.Z] ? `${ANION_NAMES[el.Z]} ion` : `${lname} anion (charge ${charge})`;
  const variable = (COMMON_IONS[el.Z]?.filter((c) => c > 0).length ?? 0) > 1 || el.category === 'transition';
  if (variable && charge <= 10) return `${lname}(${ROMAN[charge]}) ion`;
  return `${lname} ion`;
}
