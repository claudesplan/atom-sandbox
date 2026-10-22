/**
 * Compounds: common ions, ionic formulas from charges, systematic names, a library of everyday compounds,
 * and percent composition by mass.
 *
 * Exact: formulas from charge balance, molar masses and % composition (from standard atomic weights),
 * IUPAC-style names. Simplified ≈: the ion list is a teaching selection, and "the charges balance" does not
 * guarantee a stable compound exists (a few known exceptions are flagged).
 */
import { elementBySymbol } from './elements';
import { hillKey, molarMass, parseSpecies, prettyFormula, type Species } from './formula';

export interface IonDef {
  id: string;
  /** ASCII formula body, e.g. "Fe", "SO4", "NH4" */
  body: string;
  charge: number;
  name: string;
  /** polyatomic: needs brackets when more than one is used */
  poly: boolean;
}

export const CATIONS: IonDef[] = [
  { id: 'H', body: 'H', charge: 1, name: 'hydrogen', poly: false },
  { id: 'Li', body: 'Li', charge: 1, name: 'lithium', poly: false },
  { id: 'Na', body: 'Na', charge: 1, name: 'sodium', poly: false },
  { id: 'K', body: 'K', charge: 1, name: 'potassium', poly: false },
  { id: 'Ag', body: 'Ag', charge: 1, name: 'silver', poly: false },
  { id: 'NH4', body: 'NH4', charge: 1, name: 'ammonium', poly: true },
  { id: 'Cu1', body: 'Cu', charge: 1, name: 'copper(I)', poly: false },
  { id: 'Mg', body: 'Mg', charge: 2, name: 'magnesium', poly: false },
  { id: 'Ca', body: 'Ca', charge: 2, name: 'calcium', poly: false },
  { id: 'Ba', body: 'Ba', charge: 2, name: 'barium', poly: false },
  { id: 'Zn', body: 'Zn', charge: 2, name: 'zinc', poly: false },
  { id: 'Cu2', body: 'Cu', charge: 2, name: 'copper(II)', poly: false },
  { id: 'Fe2', body: 'Fe', charge: 2, name: 'iron(II)', poly: false },
  { id: 'Fe3', body: 'Fe', charge: 3, name: 'iron(III)', poly: false },
  { id: 'Pb2', body: 'Pb', charge: 2, name: 'lead(II)', poly: false },
  { id: 'Al', body: 'Al', charge: 3, name: 'aluminium', poly: false },
  { id: 'Cr3', body: 'Cr', charge: 3, name: 'chromium(III)', poly: false },
];

export const ANIONS: IonDef[] = [
  { id: 'F', body: 'F', charge: -1, name: 'fluoride', poly: false },
  { id: 'Cl', body: 'Cl', charge: -1, name: 'chloride', poly: false },
  { id: 'Br', body: 'Br', charge: -1, name: 'bromide', poly: false },
  { id: 'I', body: 'I', charge: -1, name: 'iodide', poly: false },
  { id: 'O', body: 'O', charge: -2, name: 'oxide', poly: false },
  { id: 'S', body: 'S', charge: -2, name: 'sulfide', poly: false },
  { id: 'N', body: 'N', charge: -3, name: 'nitride', poly: false },
  { id: 'OH', body: 'OH', charge: -1, name: 'hydroxide', poly: true },
  { id: 'NO3', body: 'NO3', charge: -1, name: 'nitrate', poly: true },
  { id: 'NO2', body: 'NO2', charge: -1, name: 'nitrite', poly: true },
  { id: 'HCO3', body: 'HCO3', charge: -1, name: 'hydrogencarbonate', poly: true },
  { id: 'ClO', body: 'ClO', charge: -1, name: 'hypochlorite', poly: true },
  { id: 'MnO4', body: 'MnO4', charge: -1, name: 'permanganate', poly: true },
  { id: 'CO3', body: 'CO3', charge: -2, name: 'carbonate', poly: true },
  { id: 'SO4', body: 'SO4', charge: -2, name: 'sulfate', poly: true },
  { id: 'SO3', body: 'SO3', charge: -2, name: 'sulfite', poly: true },
  { id: 'PO4', body: 'PO4', charge: -3, name: 'phosphate', poly: true },
];

const ACID_NAMES: Record<string, string> = {
  F: 'hydrofluoric acid',
  Cl: 'hydrochloric acid',
  Br: 'hydrobromic acid',
  I: 'hydroiodic acid',
  S: 'hydrogen sulfide',
  OH: 'water',
  O: 'water',
  NO3: 'nitric acid',
  NO2: 'nitrous acid',
  ClO: 'hypochlorous acid',
  MnO4: 'permanganic acid',
  CO3: 'carbonic acid',
  SO4: 'sulfuric acid',
  SO3: 'sulfurous acid',
  PO4: 'phosphoric acid',
};

/** Combinations that balance on paper but do not exist as stable compounds (or are better described otherwise). */
const NOT_STABLE: Record<string, string> = {
  'H+N': 'H⁺ and N³⁻ would give NH₃ — but ammonia is a covalent molecule, not an acid.',
  'H+HCO3': 'This would be carbonic acid again (H₂CO₃) — choose carbonate instead.',
  'NH4+O': 'Ammonium oxide does not exist: NH₄⁺ and O²⁻ react to give ammonia and water.',
  'NH4+N': 'Ammonium nitride does not exist.',
  'Al+CO3': 'Aluminium carbonate is not a stable compound — it breaks down in water.',
  'Fe3+CO3': 'Iron(III) carbonate is not a stable compound — it breaks down in water.',
  'Cr3+CO3': 'Chromium(III) carbonate is not a stable compound.',
  'Al+HCO3': 'Aluminium hydrogencarbonate is not a stable solid.',
  'Fe3+I': 'Iron(III) iodide is unstable: Fe³⁺ oxidises I⁻ to iodine.',
  'Cu2+I': 'Copper(II) iodide is unstable: it gives copper(I) iodide and iodine.',
  'H+CO3': 'Carbonic acid exists only in solution (fizzy water); it falls apart into CO₂ and water.',
};

export function cationById(id: string): IonDef | null {
  return CATIONS.find((c) => c.id === id) ?? null;
}

export function anionById(id: string): IonDef | null {
  return ANIONS.find((a) => a.id === id) ?? null;
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

export interface IonicCompound {
  cation: IonDef;
  anion: IonDef;
  nCation: number;
  nAnion: number;
  /** ASCII, parseable: "Al2(SO4)3" */
  formula: string;
  name: string;
  /** H⁺ combinations are acids (covalent molecules that form ions in water) */
  acid: boolean;
  warning: string | null;
}

function part(ion: IonDef, n: number): string {
  if (n === 1) return ion.body;
  return ion.poly ? `(${ion.body})${n}` : `${ion.body}${n}`;
}

/** Combine a cation and an anion so the charges cancel. */
export function combineIons(cation: IonDef, anion: IonDef): IonicCompound {
  const qc = cation.charge;
  const qa = -anion.charge;
  const l = (qc * qa) / gcd(qc, qa);
  const nCation = l / qc;
  const nAnion = l / qa;
  const acid = cation.id === 'H';
  const formula = acid && (anion.id === 'OH' || anion.id === 'O') ? 'H2O' : part(cation, nCation) + part(anion, nAnion);
  const name = acid ? ACID_NAMES[anion.id] ?? `hydrogen ${anion.name}` : `${cation.name} ${anion.name}`;
  return { cation, anion, nCation, nAnion, formula, name, acid, warning: NOT_STABLE[`${cation.id}+${anion.id}`] ?? null };
}

// ---------- covalent (prefix) names ----------

const PREFIX = ['', 'mono', 'di', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa', 'nona', 'deca'];
const IDE: Record<string, string> = { H: 'hydride', C: 'carbide', N: 'nitride', O: 'oxide', F: 'fluoride', P: 'phosphide', S: 'sulfide', Cl: 'chloride', Se: 'selenide', Br: 'bromide', I: 'iodide' };
const NONMETALS = new Set(['H', 'B', 'C', 'N', 'O', 'F', 'Si', 'P', 'S', 'Cl', 'Se', 'Br', 'I', 'Xe']);

function withPrefix(n: number, word: string, first: boolean): string {
  if (first && n === 1) return word;
  const p = PREFIX[n] ?? `${n}-`;
  // tetra + oxide → tetroxide, mono + oxide → monoxide
  return /^[ao]$/.test(p.slice(-1)) && /^o/.test(word) ? p.slice(0, -1) + word : p + word;
}

/** Prefix name for a binary covalent compound written in the usual order, e.g. N2O4 → dinitrogen tetroxide. */
export function covalentName(sp: Species): string | null {
  if (sp.charge !== 0 || sp.counts.size !== 2) return null;
  const [a, b] = [...sp.counts.keys()];
  if (!NONMETALS.has(a) || !NONMETALS.has(b) || !IDE[b]) return null;
  return `${withPrefix(sp.counts.get(a)!, elementBySymbol(a)!.name.toLowerCase(), true)} ${withPrefix(sp.counts.get(b)!, IDE[b], false)}`;
}

// ---------- everyday compound library ----------

export type CompoundType = 'ionic' | 'molecular' | 'acid' | 'giant';

export const TYPE_LABEL: Record<CompoundType, string> = {
  ionic: 'Ionic compound',
  molecular: 'Molecular (covalent) compound',
  acid: 'Acid (covalent molecule that forms H⁺ ions in water)',
  giant: 'Giant covalent structure',
};

export interface LibraryCompound {
  formula: string;
  name: string;
  common?: string;
  use: string;
  type: CompoundType;
}

export const COMPOUNDS: LibraryCompound[] = [
  { formula: 'H2O', name: 'water', use: 'Covers 71 % of the Earth; about 60 % of your body.', type: 'molecular' },
  { formula: 'CO2', name: 'carbon dioxide', use: 'You breathe it out; the bubbles in fizzy drinks; a greenhouse gas.', type: 'molecular' },
  { formula: 'CO', name: 'carbon monoxide', use: 'A poisonous gas made when fuels burn without enough oxygen.', type: 'molecular' },
  { formula: 'O3', name: 'ozone', use: 'The ozone layer absorbs harmful UV light from the Sun.', type: 'molecular' },
  { formula: 'NH3', name: 'ammonia', use: 'Made from nitrogen and hydrogen to produce fertilisers; in cleaning products.', type: 'molecular' },
  { formula: 'CH4', name: 'methane', common: 'natural gas', use: 'Cooking and heating fuel; also a strong greenhouse gas.', type: 'molecular' },
  { formula: 'C3H8', name: 'propane', use: 'Camping-stove and barbecue gas.', type: 'molecular' },
  { formula: 'C2H5OH', name: 'ethanol', common: 'alcohol', use: 'In drinks, hand sanitiser and as a fuel.', type: 'molecular' },
  { formula: 'C6H12O6', name: 'glucose', use: 'The sugar in your blood; made by plants in photosynthesis.', type: 'molecular' },
  { formula: 'C12H22O11', name: 'sucrose', common: 'table sugar', use: 'Sugar from cane or beet.', type: 'molecular' },
  { formula: 'H2O2', name: 'hydrogen peroxide', use: 'Disinfectant and hair bleach.', type: 'molecular' },
  { formula: 'SO2', name: 'sulfur dioxide', use: 'Preservative in dried fruit; causes acid rain.', type: 'molecular' },
  { formula: 'NO2', name: 'nitrogen dioxide', use: 'Brown gas in traffic smog.', type: 'molecular' },
  { formula: 'N2O', name: 'dinitrogen monoxide', common: 'laughing gas', use: 'Used as an anaesthetic and in whipped-cream canisters.', type: 'molecular' },
  { formula: 'CH3COOH', name: 'ethanoic acid', common: 'acetic acid', use: 'The acid in vinegar.', type: 'acid' },
  { formula: 'HCl', name: 'hydrochloric acid', use: 'The acid in your stomach (as a solution of HCl in water).', type: 'acid' },
  { formula: 'H2SO4', name: 'sulfuric acid', use: 'Car batteries; the most-produced industrial chemical.', type: 'acid' },
  { formula: 'HNO3', name: 'nitric acid', use: 'Making fertilisers and explosives.', type: 'acid' },
  { formula: 'NaCl', name: 'sodium chloride', common: 'table salt', use: 'Seasoning food; about 3.5 % of sea water is dissolved salts, mostly this.', type: 'ionic' },
  { formula: 'NaHCO3', name: 'sodium hydrogencarbonate', common: 'baking soda', use: 'Makes cakes rise by giving off CO₂.', type: 'ionic' },
  { formula: 'CaCO3', name: 'calcium carbonate', common: 'chalk, limestone', use: 'Chalk, limestone, marble, eggshells and seashells.', type: 'ionic' },
  { formula: 'NaOH', name: 'sodium hydroxide', common: 'caustic soda', use: 'Soap making and drain cleaner — very corrosive.', type: 'ionic' },
  { formula: 'Ca(OH)2', name: 'calcium hydroxide', common: 'slaked lime', use: 'Limewater (turns cloudy with CO₂); neutralises acidic soil.', type: 'ionic' },
  { formula: 'NaClO', name: 'sodium hypochlorite', common: 'bleach', use: 'Household bleach (dissolved in water).', type: 'ionic' },
  { formula: 'NaF', name: 'sodium fluoride', use: 'Added to toothpaste to strengthen teeth.', type: 'ionic' },
  { formula: 'KNO3', name: 'potassium nitrate', common: 'saltpetre', use: 'Fertiliser; an ingredient of gunpowder.', type: 'ionic' },
  { formula: 'NH4NO3', name: 'ammonium nitrate', use: 'A major nitrogen fertiliser.', type: 'ionic' },
  { formula: 'CuSO4', name: 'copper(II) sulfate', use: 'Forms bright blue crystals (with water, CuSO₄·5H₂O); kills fungi.', type: 'ionic' },
  { formula: 'MgSO4', name: 'magnesium sulfate', common: 'Epsom salt', use: 'Bath salts (as a hydrate).', type: 'ionic' },
  { formula: 'CaSO4', name: 'calcium sulfate', common: 'gypsum, plaster', use: 'Plaster and plasterboard (as hydrates).', type: 'ionic' },
  { formula: 'KMnO4', name: 'potassium permanganate', use: 'Deep purple; used as a disinfectant and in titrations.', type: 'ionic' },
  { formula: 'Fe2O3', name: 'iron(III) oxide', common: 'rust', use: 'Rust (real rust also contains water); red pigment.', type: 'ionic' },
  { formula: 'Al2O3', name: 'aluminium oxide', use: 'Protects aluminium from corrosion; rubies and sapphires are this with traces of other metals.', type: 'ionic' },
  { formula: 'SiO2', name: 'silicon dioxide', common: 'silica, sand', use: 'Sand, quartz and glass.', type: 'giant' },
];

// ---------- lookup and description ----------

let ionicByHill: Map<string, IonicCompound> | null = null;

function ionicIndex(): Map<string, IonicCompound> {
  if (!ionicByHill) {
    ionicByHill = new Map();
    for (const c of CATIONS)
      for (const a of ANIONS) {
        const ic = combineIons(c, a);
        if (ic.warning && c.id === 'H') continue;
        const key = hillKey(parseSpecies(ic.formula));
        if (!ionicByHill.has(key)) ionicByHill.set(key, ic);
      }
  }
  return ionicByHill;
}

export interface PercentRow {
  symbol: string;
  atoms: number;
  mass: number;
  percent: number;
}

/** Percent by mass of each element. */
export function percentComposition(sp: Species): PercentRow[] {
  const total = molarMass(sp).value;
  return [...sp.counts.entries()].map(([symbol, atoms]) => {
    const mass = elementBySymbol(symbol)!.weight * atoms;
    return { symbol, atoms, mass, percent: (100 * mass) / total };
  });
}

export interface CompoundInfo {
  species: Species;
  pretty: string;
  name: string | null;
  common: string | null;
  use: string | null;
  type: CompoundType | null;
  ions: IonicCompound | null;
  molarMass: number;
  approxMass: boolean;
  percent: PercentRow[];
  /** how the name was worked out */
  rule: string | null;
}

/** Everything the app knows about a formula. Throws FormulaError for unparseable input. */
export function describeCompound(text: string): CompoundInfo {
  const species = parseSpecies(text);
  const key = hillKey(species);
  const lib = COMPOUNDS.find((c) => c.formula === species.formula) ?? COMPOUNDS.find((c) => hillKey(parseSpecies(c.formula)) === key && !['C2H5OH', 'CH3COOH'].includes(c.formula)) ?? null;
  const ions = species.charge === 0 ? ionicIndex().get(key) ?? null : null;
  const cov = covalentName(species);
  const mm = molarMass(species);
  let name = lib?.name ?? ions?.name ?? cov ?? null;
  let type: CompoundType | null = lib?.type ?? (ions ? (ions.acid ? 'acid' : 'ionic') : cov ? 'molecular' : null);
  if (ions?.acid && ions.formula === 'H2O') {
    name = 'water';
    type = 'molecular';
  }
  let rule: string | null = null;
  if (ions && !ions.acid && type === 'ionic')
    rule = `Ionic: name the positive ion first (${ions.cation.name}), then the negative ion (${ions.anion.name}).${ions.cation.name.includes('(') ? ' The Roman numeral gives the charge of the metal ion, because this metal can form more than one ion.' : ''}${ions.anion.poly ? ' Polyatomic ions keep their own names.' : ' A single non-metal ion ends in “-ide”.'}`;
  else if (ions?.acid && name !== 'water') rule = 'Acids: compounds of hydrogen ions with a negative ion have their own traditional names (-ide → hydro…ic acid, -ate → …ic acid, -ite → …ous acid).';
  else if (cov && type === 'molecular' && !lib) rule = 'Covalent (two non-metals): use prefixes mono-, di-, tri-, tetra- … for the numbers of atoms, and “-ide” on the second element. Mono- is left off the first element.';
  else if (cov && lib && lib.name === cov) rule = 'Covalent (two non-metals): prefixes give the number of each atom; “-ide” on the second element.';
  return {
    species,
    pretty: prettyFormula(species),
    name,
    common: lib?.common ?? null,
    use: lib?.use ?? null,
    type,
    ions,
    molarMass: mm.value,
    approxMass: mm.approx,
    percent: percentComposition(species),
    rule,
  };
}
