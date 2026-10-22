import { chargeSymbol, describeAtom } from '../chem/atom';
import { orbitalBoxes, prettyConfig } from '../chem/configuration';
import { CATEGORY_LABEL, COMMON_IONS } from '../chem/elements';
import { checkBalance } from '../chem/equation';
import { molarMass, prettyFormula, totalAtoms } from '../chem/formula';
import { DECAY_EXPLAIN, DECAY_LABEL, daughter, type DecayMode } from '../chem/nuclides';
import { structureFor } from '../chem/structures';
import { parsedEquation, useStore } from '../state/store';
import { decay } from './actions';
import { BondPanels, ReactionBondSections } from './BondPanels';
import { CompoundRight } from './CompoundPanels';
import { Readout, Section } from './widgets';

export function RightPanel() {
  const mode = useStore((s) => s.mode);
  return <div className="sidebar right">{mode === 'atom' ? <AtomPanels /> : mode === 'bonds' ? <BondPanels /> : mode === 'compounds' ? <CompoundRight /> : <ReactionPanels />}</div>;
}

function fmtCharge(q: number): string {
  return q === 0 ? '0' : q > 0 ? `+${q}` : `−${-q}`;
}

function AtomPanels() {
  const atom = useStore((s) => s.doc.atom);
  const d = describeAtom(atom);
  const el = d.element;
  const n = d.nucleus;
  const boxes = orbitalBoxes(d.config);
  const decayable = n.status === 'stable' || n.status === 'empty' ? [] : n.modes.filter((m) => m !== 'SF');
  return (
    <>
      <Section title="Element">
        {el ? (
          <>
            <div className="elcard">
              <span className="elz">{el.Z}</span>
              <span className="elsym">{el.symbol}</span>
              <span className="elname">{el.name}</span>
            </div>
            <Readout label="Atomic number Z" value={String(el.Z)} title="Number of protons. This alone decides which element it is." />
            <Readout label="Group · period" value={`${el.group ?? 'f-block'} · ${el.period}`} />
            <Readout label="Block" value={el.block} title="Which kind of subshell (s, p, d, f) is being filled across this part of the table" />
            <Readout label="Category" value={`${CATEGORY_LABEL[el.category]}${el.predicted ? ' (predicted)' : ''}`} approx={el.predicted} title={el.predicted ? 'Only a few atoms have been made; chemical properties are predictions.' : undefined} />
            <Readout
              label={el.weightIsMassNumber ? 'Longest-lived isotope' : 'Standard atomic weight'}
              value={el.weightIsMassNumber ? `[${el.weight}]` : String(el.weight)}
              unit={el.weightIsMassNumber ? 'mass no.' : 'u'}
              title={el.weightIsMassNumber ? 'No stable isotope, so no standard atomic weight: mass number of the longest-lived isotope.' : 'Average mass of the atoms in a natural sample (IUPAC abridged value).'}
            />
          </>
        ) : (
          <div className="hint dim">{atom.neutrons || atom.electrons ? 'No protons, so this is not an element.' : 'Add protons to make an element.'}</div>
        )}
      </Section>

      <Section title="Nucleus">
        <Readout label="Protons Z" value={String(d.Z)} />
        <Readout label="Neutrons N" value={String(d.N)} />
        <Readout label="Mass number A = Z + N" value={String(d.A)} />
        {el && <Readout label="Isotope" value={`${d.isotopeName} (${d.isotopeSymbol})`} />}
        {d.Z > 0 && <Readout label="Neutron / proton ratio" value={(d.N / d.Z).toFixed(2)} title="Light stable nuclei have N ≈ Z; heavy ones need more neutrons (about 1.5 × Z for lead)." />}
        <div className={`stability ${n.status}`}>
          {n.estimate && <span className="approx" title="Estimated with the liquid-drop (semi-empirical mass) formula — not measured data">≈ </span>}
          {n.summary}
        </div>
        {n.modes.length > 0 && n.status !== 'stable' && n.status !== 'empty' && (
          <>
            {n.modes.map((m) => (
              <div key={m} className="hint small" title={DECAY_EXPLAIN[m]}>
                <b>{DECAY_LABEL[m]}</b>
                {n.estimate ? ' (estimated ≈)' : ''}: {DECAY_EXPLAIN[m]}
              </div>
            ))}
          </>
        )}
        {n.note && <div className="hint dim">{n.note}</div>}
        {decayable.length > 0 && (
          <div className="btnrow">
            {decayable.map((m) => (
              <DecayButton key={m} mode={m} Z={d.Z} N={d.N} />
            ))}
          </div>
        )}
        {d.bindingPerNucleon != null && d.bindingPerNucleon > 0 && n.status !== 'unbound' && (
          <Readout label="Binding energy per nucleon" value={d.bindingPerNucleon.toFixed(2)} unit="MeV" approx title="Liquid-drop (semi-empirical mass formula) estimate. Typical error a few %, worse for light nuclei." />
        )}
        {d.A > 0 && <Readout label="Mass of the atom" value={`≈ ${d.A}`} unit="u" approx title="Mass number approximation: protons and neutrons each weigh about 1 u, electrons about 1/1836 u. Real isotope masses differ by up to ~1 % (binding energy)." />}
      </Section>

      <Section title="Electrons">
        <Readout label="Electrons" value={String(atom.electrons)} />
        <Readout label="Charge (protons − electrons)" value={fmtCharge(d.charge)} />
        <Readout label="Symbol" value={d.ionSymbol} />
        <div className="hint">
          {d.kindName}
          {d.isCommonIon && <span className="ok"> · a common ion</span>}
          {el && d.charge !== 0 && !d.isCommonIon && atom.electrons > 0 && (
            <span className="dim" title="Typical charges in compounds (teaching list)">
              {' '}
              · unusual ion{COMMON_IONS[el.Z] ? ` (common: ${COMMON_IONS[el.Z].map((q) => el.symbol + chargeSymbol(q)).join(', ')})` : ''}
            </span>
          )}
        </div>
        {d.Z > 0 && atom.electrons > 0 && (
          <>
            <div className="cfg-label">
              Configuration
              {!d.configMeasured && (
                <span className="approx" title={d.Z >= 104 ? 'Theoretical prediction for a superheavy element' : 'Ion configuration from the “remove the highest-n electrons first” rule; real d/f-block ions can differ'}>
                  ≈
                </span>
              )}
              {d.configException && <span className="tag" title="Measured ground state differs from the simple filling order">exception</span>}
            </div>
            <div className="cfg mono">{prettyConfig(d.configShort)}</div>
            {d.configShort !== d.configFull && <div className="cfg mono dim small">{prettyConfig(d.configFull)}</div>}
            <Readout label="Bohr shells (n = 1, 2, …)" value={d.shells.join(', ')} approx title="Electrons grouped by principal quantum number n. The ring picture itself is a teaching model." />
            <Readout label="Outer-shell electrons" value={String(d.outerElectrons)} />
            {d.nobleGasLike && <div className="hint ok">Same electron arrangement as the noble gas {d.nobleGasLike} — a full outer shell.</div>}
            <div className="cfg-label">Orbital boxes{boxes.core ? ` (after [${boxes.core}])` : ''}</div>
            <div className="oboxes">
              {boxes.rows.map((r) => (
                <div key={r.label} className="obrow">
                  <span className="oblabel">{r.label}</span>
                  {r.boxes.map((b, i) => (
                    <span key={i} className="obox">
                      {b >= 1 ? '↑' : ''}
                      {b === 2 ? '↓' : ''}
                    </span>
                  ))}
                </div>
              ))}
              {!boxes.rows.length && <span className="dim small">all electrons are in the [{boxes.core}] core</span>}
            </div>
          </>
        )}
      </Section>

      <Section title="Model notes" defaultOpen={false}>
        <div className="notes small">
          <ul>
            <li>
              <b>Exact:</b> element from proton count, mass number, charge, stable/radioactive status and half-lives from nuclear data, electron configurations of neutral atoms from spectroscopy.
            </li>
            <li>
              <b>≈ Bohr rings</b> are a teaching picture: electrons do not orbit in circles; they occupy orbitals (clouds of probability). Ring counts = electrons per principal quantum number n.
            </li>
            <li>
              <b>≈ Not to scale:</b> the nucleus is ~10,000–100,000× smaller than the atom.
            </li>
            <li>
              <b>≈ Estimates</b> for nuclei not in the data table use the liquid-drop model.
            </li>
          </ul>
        </div>
      </Section>
    </>
  );
}

function DecayButton({ mode, Z, N }: { mode: DecayMode; Z: number; N: number }) {
  const d = daughter(Z, N, mode);
  if (!d || d.Z < 0 || d.N < 0) return null;
  return (
    <button className="tbtn small decay" title={`Let one nucleus decay: ${DECAY_EXPLAIN[mode]}`} onClick={() => decay(mode)}>
      ☢ Decay ({DECAY_LABEL[mode]})
    </button>
  );
}

function ReactionPanels() {
  const text = useStore((s) => s.doc.eqText);
  const coefs = useStore((s) => s.doc.coefs);
  const p = parsedEquation(text);
  if (!p.ok)
    return (
      <Section title="Equation">
        <div className="hint bad">{p.error}</div>
      </Section>
    );
  const eq = p.eq;
  const chk = checkBalance(eq, coefs);
  const mass = (side: 'left' | 'right') => eq.terms.reduce((t, term, i) => (term.side === side ? t + coefs[i] * molarMass(term.species).value : t), 0);
  const approxMass = eq.terms.some((t) => molarMass(t.species).approx);
  const ml = mass('left');
  const mr = mass('right');
  const notes = [...new Set(eq.terms.map((t) => structureFor(t.species).note).filter(Boolean))] as string[];
  return (
    <>
      <Section title="Coefficients">
        {(['left', 'right'] as const).map((side) => (
          <div key={side} className="side-block">
            <div className="cfg-label">{side === 'left' ? 'Reactants' : 'Products'}</div>
            {eq.terms.map((t, i) =>
              t.side !== side ? null : (
                <div key={i} className="coefrow">
                  <button className="pbtn" disabled={coefs[i] <= 1} onClick={() => useStore.getState().setCoef(i, coefs[i] - 1)} title="One fewer">
                    −
                  </button>
                  <span className="coef mono">{coefs[i]}</span>
                  <button className="pbtn" onClick={() => useStore.getState().setCoef(i, coefs[i] + 1)} title="One more">
                    +
                  </button>
                  <span className="formula">{prettyFormula(t.species, t.species.state)}</span>
                  <span className="dim small">{totalAtoms(t.species) || ''}</span>
                </div>
              ),
            )}
          </div>
        ))}
        <div className={`stability ${chk.balanced ? 'stable' : 'radioactive'}`}>
          {chk.balanced ? (chk.lowestTerms ? 'Balanced ✔' : 'Balanced ✔ — but all numbers can be divided by a common factor') : 'Not balanced yet'}
        </div>
        <div className="hint dim">Change the big numbers (coefficients) only. Changing the small numbers would make a different substance!</div>
      </Section>
      <Section title="Conservation">
        <Readout label="Atoms on the left" value={String(chk.elements.reduce((t, e) => t + e.left, 0))} />
        <Readout label="Atoms on the right" value={String(chk.elements.reduce((t, e) => t + e.right, 0))} />
        <Readout label="Charge left / right" value={`${fmtCharge(chk.chargeLeft)} / ${fmtCharge(chk.chargeRight)}`} />
        <Readout label="Mass left" value={ml.toFixed(3)} unit="g/mol" approx={approxMass} title="Sum of coefficient × molar mass, from standard atomic weights" />
        <Readout label="Mass right" value={mr.toFixed(3)} unit="g/mol" approx={approxMass} />
        <div className={`hint ${Math.abs(ml - mr) < 1e-9 ? 'ok' : 'dim'}`}>
          {Math.abs(ml - mr) < 1e-9 ? 'Mass is conserved because every atom is accounted for.' : `Mass differs by ${Math.abs(ml - mr).toFixed(3)} g/mol — atoms are missing on one side.`}
        </div>
        <div className="hint dim small">
          (Chemical energy changes the mass by less than a billionth — far too small to show. ≈)
        </div>
      </Section>
      <ReactionBondSections eq={eq} coefs={coefs} />
      <Section title="Molar masses" defaultOpen={false}>
        {eq.terms.map((t, i) => {
          const m = molarMass(t.species);
          return <Readout key={i} label={prettyFormula(t.species)} value={m.value.toFixed(3)} unit="g/mol" approx={m.approx} />;
        })}
      </Section>
      <Section title="Model notes" defaultOpen={false}>
        <div className="notes small">
          <ul>
            <li>
              <b>Exact:</b> atom counts, charge and the balancing (exact fractions, no rounding). Molar masses use IUPAC standard atomic weights.
            </li>
            <li>
              <b>≈ Drawings</b> are flat “displayed formulas”; real molecules are 3D.
            </li>
            <li>A balanced equation gives the ratio in which substances react — not whether the reaction really happens, how fast, or how much energy it releases.</li>
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      </Section>
    </>
  );
}

