import {
  configString,
  configuration,
  isExceptionalConfiguration,
  isoelectronicNobleGas,
  outerShellElectrons,
  shellCounts,
  shorthand,
  type Configuration,
} from './configuration';
import { COMMON_IONS, elementByZ, ionName, type Element } from './elements';
import { classifyNucleus, semfBinding, superscript, type NucleusInfo } from './nuclides';

export interface AtomState {
  protons: number;
  neutrons: number;
  electrons: number;
}

export const LIMITS = { protons: 118, neutrons: 200, electrons: 120 };

export interface AtomDescription {
  state: AtomState;
  element: Element | null;
  Z: number;
  N: number;
  A: number;
  charge: number;
  /** e.g. "carbon-14" */
  isotopeName: string;
  /** e.g. "¹⁴C" */
  isotopeSymbol: string;
  /** e.g. "Na⁺", "O²⁻", "C" */
  ionSymbol: string;
  /** e.g. "sodium ion", "neutral carbon atom" */
  kindName: string;
  nucleus: NucleusInfo;
  config: Configuration;
  configFull: string;
  configShort: string;
  shells: number[];
  outerElectrons: number;
  nobleGasLike: string | null;
  isCommonIon: boolean;
  /** configuration from measured spectra (false: rule-of-thumb ion or Z ≥ 104 prediction) */
  configMeasured: boolean;
  /** neutral atom whose ground state breaks the simple filling order (Cr, Cu, …) */
  configException: boolean;
  /** liquid-drop estimate, MeV per nucleon (null for A < 4 where the formula is meaningless) */
  bindingPerNucleon: number | null;
}

export function chargeSymbol(charge: number): string {
  if (charge === 0) return '';
  const mag = Math.abs(charge) === 1 ? '' : String(Math.abs(charge));
  return superscript(`${mag}${charge > 0 ? '+' : '-'}`);
}

export function describeAtom(state: AtomState): AtomDescription {
  const { protons: Z, neutrons: N, electrons: e } = state;
  const A = Z + N;
  const element = elementByZ(Z);
  const charge = Z - e;
  const config = configuration(Z, e);
  const nucleus = classifyNucleus(Z, N);
  const isotopeName = element ? `${element.name.toLowerCase()}-${A}` : Z === 0 && N > 0 ? (N === 1 ? 'free neutron' : `${N} neutrons`) : '—';
  const isotopeSymbol = element ? `${superscript(A)}${element.symbol}` : '—';
  const ionSymbol = element ? `${element.symbol}${chargeSymbol(charge)}` : e > 0 ? (e === 1 ? 'e⁻' : `${e} e⁻`) : '—';
  let kindName = '—';
  if (element) {
    if (e === 0) kindName = Z === 1 && N === 0 ? 'bare proton (H⁺)' : Z === 2 && N === 2 ? 'α particle (bare helium-4 nucleus)' : 'bare nucleus (no electrons)';
    else if (charge === 0) kindName = `neutral ${element.name.toLowerCase()} atom`;
    else kindName = ionName(element, charge);
  } else if (e > 0) kindName = 'free electrons (no nucleus)';
  else if (N > 0) kindName = N === 1 ? 'free neutron' : 'free neutrons';
  const ng = isoelectronicNobleGas(config);
  const measured = !!element && Z < 104 && (charge === 0 || element.block === 's' || element.block === 'p' || e === 0);
  return {
    state,
    element,
    Z,
    N,
    A,
    charge,
    isotopeName,
    isotopeSymbol,
    ionSymbol,
    kindName,
    nucleus,
    config,
    configFull: configString(config),
    configShort: shorthand(config),
    shells: shellCounts(config),
    outerElectrons: outerShellElectrons(config),
    nobleGasLike: ng && ng.Z !== Z ? ng.symbol : null,
    isCommonIon: charge !== 0 && (COMMON_IONS[Z]?.includes(charge) ?? false),
    configMeasured: measured,
    configException: !!element && charge === 0 && isExceptionalConfiguration(Z),
    bindingPerNucleon: A >= 4 && Z >= 1 && N >= 0 ? semfBinding(Z, N) / A : null,
  };
}

export function clampAtom(s: AtomState): AtomState {
  const c = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));
  return { protons: c(s.protons, LIMITS.protons), neutrons: c(s.neutrons, LIMITS.neutrons), electrons: c(s.electrons, LIMITS.electrons) };
}

/** Neutral atom of element Z with its reference isotope (most abundant, or longest-lived). */
export function referenceAtom(Z: number): AtomState {
  const el = elementByZ(Z);
  if (!el) return { protons: 0, neutrons: 0, electrons: 0 };
  return { protons: Z, neutrons: el.refA - Z, electrons: Z };
}
