/** Library of example reactions, written unbalanced. `answer` is the balanced set (checked by tests). */
export interface LibraryReaction {
  id: string;
  name: string;
  equation: string;
  answer: number[];
  description: string;
}

export const REACTIONS: LibraryReaction[] = [
  { id: 'water', name: 'Making water', equation: 'H2 + O2 -> H2O', answer: [2, 1, 2], description: 'Hydrogen burns in oxygen. Used in fuel cells and rocket engines.' },
  { id: 'methane', name: 'Burning methane', equation: 'CH4 + O2 -> CO2 + H2O', answer: [1, 2, 1, 2], description: 'Natural gas in a cooker or boiler.' },
  { id: 'nacl', name: 'Sodium + chlorine', equation: 'Na + Cl2 -> NaCl', answer: [2, 1, 2], description: 'A soft metal and a toxic gas make table salt.' },
  { id: 'haber', name: 'Making ammonia', equation: 'N2 + H2 -> NH3', answer: [1, 3, 2], description: 'The Haber process, used to make fertiliser.' },
  { id: 'mgo', name: 'Burning magnesium', equation: 'Mg + O2 -> MgO', answer: [2, 1, 2], description: 'Magnesium ribbon burns with a brilliant white flame.' },
  { id: 'rust', name: 'Iron oxide (rust)', equation: 'Fe + O2 -> Fe2O3', answer: [4, 3, 2], description: 'Iron combines with oxygen. (Real rust also contains water.)' },
  { id: 'propane', name: 'Burning propane', equation: 'C3H8 + O2 -> CO2 + H2O', answer: [1, 5, 3, 4], description: 'Camping gas and barbecue fuel.' },
  { id: 'h2o2', name: 'Peroxide decomposition', equation: 'H2O2 -> H2O + O2', answer: [2, 2, 1], description: 'Hydrogen peroxide slowly breaks down into water and oxygen.' },
  { id: 'caco3', name: 'Heating limestone', equation: 'CaCO3 -> CaO + CO2', answer: [1, 1, 1], description: 'Making quicklime for cement. Already balanced!' },
  { id: 'neutral', name: 'Acid + alkali', equation: 'HCl + NaOH -> NaCl + H2O', answer: [1, 1, 1, 1], description: 'Neutralisation makes a salt and water.' },
  { id: 'zinc', name: 'Zinc + acid', equation: 'Zn + HCl -> ZnCl2 + H2', answer: [1, 2, 1, 1], description: 'A metal dissolves in acid and gives off hydrogen gas.' },
  { id: 'caoh', name: 'Calcium + water', equation: 'Ca + H2O -> Ca(OH)2 + H2', answer: [1, 2, 1, 1], description: 'Brackets: the 2 after (OH) doubles both O and H.' },
  { id: 'al2o3', name: 'Aluminium oxide', equation: 'Al + O2 -> Al2O3', answer: [4, 3, 2], description: 'The thin oxide layer that protects aluminium.' },
  { id: 'kclo3', name: 'Potassium chlorate', equation: 'KClO3 -> KCl + O2', answer: [2, 2, 3], description: 'Heating it releases oxygen (used in emergency oxygen candles).' },
  { id: 'ethanol', name: 'Burning ethanol', equation: 'C2H5OH + O2 -> CO2 + H2O', answer: [1, 3, 2, 3], description: 'Alcohol burns with a blue flame.' },
  { id: 'thermite', name: 'Thermite', equation: 'Al + Fe2O3 -> Al2O3 + Fe', answer: [2, 1, 1, 2], description: 'Aluminium steals oxygen from iron oxide; hot enough to weld rails.' },
  { id: 'photo', name: 'Photosynthesis', equation: 'CO2 + H2O -> C6H12O6 + O2', answer: [6, 6, 1, 6], description: 'Plants use light energy to make glucose. (The real process has many steps.)' },
  { id: 'respire', name: 'Respiration', equation: 'C6H12O6 + O2 -> CO2 + H2O', answer: [1, 6, 6, 6], description: 'Your cells release energy from glucose — photosynthesis in reverse.' },
  { id: 'ozone', name: 'Ozone to oxygen', equation: 'O3 -> O2', answer: [2, 3], description: 'Only one element — but still has to balance.' },
  { id: 'no2', name: 'Nitrogen dioxide', equation: 'NO + O2 -> NO2', answer: [2, 1, 2], description: 'Brown smog gas formed from car exhaust.' },
  { id: 'so3', name: 'Sulfur trioxide', equation: 'SO2 + O2 -> SO3', answer: [2, 1, 2], description: 'A step in making sulfuric acid (and in acid rain).' },
  { id: 'octane', name: 'Burning octane', equation: 'C8H18 + O2 -> CO2 + H2O', answer: [2, 25, 16, 18], description: 'Petrol in a car engine. A tough one!' },
  { id: 'agcl', name: 'Silver chloride (ions)', equation: 'Ag+ + Cl- -> AgCl', answer: [1, 1, 1], description: 'A white solid precipitates when the ions meet. Charge must balance too.' },
  { id: 'feoh', name: 'Iron(III) hydroxide (ions)', equation: 'Fe^3+ + OH- -> Fe(OH)3', answer: [1, 3, 1], description: 'A rust-brown precipitate. The charges cancel out.' },
  { id: 'cuzn', name: 'Zinc + copper ions', equation: 'Zn + Cu^2+ -> Zn^2+ + Cu', answer: [1, 1, 1, 1], description: 'Zinc gives two electrons to a copper ion (a redox reaction).' },
  { id: 'fe3e', name: 'Gaining an electron', equation: 'Fe^3+ + e- -> Fe^2+', answer: [1, 1, 1], description: 'A half-equation: electrons are counted like particles to balance charge.' },
  { id: 'pbi2', name: 'Lead iodide (ions)', equation: 'Pb^2+ + I- -> PbI2', answer: [1, 2, 1], description: 'A bright yellow precipitate forms when lead and iodide ions meet.' },
  { id: 'alcu', name: 'Aluminium + copper ions', equation: 'Al + Cu^2+ -> Al^3+ + Cu', answer: [2, 3, 2, 3], description: 'Each Al gives 3 electrons, each Cu²⁺ takes 2 — charge decides the numbers.' },
  { id: 'cl2e', name: 'Chlorine gains electrons', equation: 'Cl2 + e- -> Cl-', answer: [1, 2, 2], description: 'A half-equation: each chlorine atom takes one electron.' },
  { id: 'mno4', name: 'Permanganate + iron(II)', equation: 'MnO4- + H+ + Fe^2+ -> Mn^2+ + Fe^3+ + H2O', answer: [1, 8, 5, 1, 5, 4], description: 'A classic redox titration. Expert level: balance atoms AND charge.' },
];

export function reactionById(id: string): LibraryReaction | null {
  return REACTIONS.find((r) => r.id === id) ?? null;
}
