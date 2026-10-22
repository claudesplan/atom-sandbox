import { useEffect, useState } from 'react';
import { ANIONS, anionById, CATIONS, cationById, combineIons, COMPOUNDS, describeCompound, TYPE_LABEL, type CompoundInfo, type IonDef } from '../chem/compounds';
import { FormulaError, prettyFormula } from '../chem/formula';
import { atomColor } from '../render/colors';
import { useStore, type CompoundSel } from '../state/store';
import { Readout, Section } from './widgets';

export function compoundFormula(sel: CompoundSel): string {
  if (sel.kind === 'formula') return sel.text;
  const c = cationById(sel.cation);
  const a = anionById(sel.anion);
  return c && a ? combineIons(c, a).formula : '';
}

let cacheKey = '';
let cacheVal: { info: CompoundInfo | null; error: string | null } = { info: null, error: null };

/** Description of the current selection (cached by formula). */
export function compoundInfo(sel: CompoundSel): { info: CompoundInfo | null; error: string | null } {
  const f = compoundFormula(sel);
  if (f !== cacheKey) {
    cacheKey = f;
    try {
      cacheVal = { info: describeCompound(f), error: null };
    } catch (e) {
      if (!(e instanceof FormulaError)) throw e;
      cacheVal = { info: null, error: e.message };
    }
  }
  return cacheVal;
}

function ionText(ion: IonDef): string {
  return prettyFormula({ formula: ion.body, charge: ion.charge, isElectron: false });
}

function IonChips({ list, selected, onPick }: { list: IonDef[]; selected: string | null; onPick: (id: string) => void }) {
  return (
    <div className="ionchips">
      {list.map((ion) => (
        <button key={ion.id} className={`ionchip${selected === ion.id ? ' on' : ''}${ion.charge > 0 ? ' pos' : ' neg'}`} title={ion.name} onClick={() => onPick(ion.id)}>
          {ionText(ion)}
        </button>
      ))}
    </div>
  );
}

export function CompoundLeft() {
  const sel = useStore((s) => s.doc.compound);
  const ionsSel = sel.kind === 'ions' ? sel : null;
  const [draft, setDraft] = useState(sel.kind === 'formula' ? sel.text : '');
  useEffect(() => {
    if (sel.kind === 'formula') setDraft(sel.text);
  }, [sel]);
  const setIons = (cation: string, anion: string) => useStore.getState().setCompound({ kind: 'ions', cation, anion });
  let preview: string | null = null;
  try {
    preview = draft.trim() ? (describeCompound(draft).name ?? 'formula OK — no name in this app') : null;
  } catch (e) {
    preview = e instanceof FormulaError ? `⚠ ${e.message}` : null;
  }
  return (
    <>
      <Section title="Build from ions">
        <div className="cfg-label">Positive ion (cation)</div>
        <IonChips list={CATIONS} selected={ionsSel?.cation ?? null} onPick={(id) => setIons(id, ionsSel?.anion ?? 'Cl')} />
        <div className="cfg-label">Negative ion (anion)</div>
        <IonChips list={ANIONS} selected={ionsSel?.anion ?? null} onPick={(id) => setIons(ionsSel?.cation ?? 'Na', id)} />
        <div className="hint dim">Pick one of each. The app works out how many of each ion are needed for the charges to cancel.</div>
      </Section>
      <Section title="Look up a formula">
        <input
          className="textfield"
          value={draft}
          placeholder="e.g. CaCO3, N2O4, Fe2(SO4)3"
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && draft.trim()) useStore.getState().setCompound({ kind: 'formula', text: draft.trim() });
          }}
        />
        {preview && <div className={`hint ${preview.startsWith('⚠') ? 'bad' : ''}`}>{preview}</div>}
        <div className="hint dim">Press Enter to show it. Capitals matter: Co is cobalt, CO is carbon monoxide.</div>
      </Section>
      <Section title="Everyday compounds">
        <div className="matlist">
          {COMPOUNDS.map((c) => (
            <div
              key={c.formula}
              className={`mat rx${sel.kind === 'formula' && sel.text === c.formula ? ' active' : ''}`}
              onClick={() => useStore.getState().setCompound({ kind: 'formula', text: c.formula })}
              title={c.use}
            >
              <span className="mname">
                {prettyFormula({ formula: c.formula, charge: 0, isElectron: false })} <span className="dim">· {c.common ?? c.name}</span>
              </span>
              <span className="mmeta">{c.name}</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

export function CompoundRight() {
  const sel = useStore((s) => s.doc.compound);
  const { info, error } = compoundInfo(sel);
  if (!info)
    return (
      <Section title="Compound">
        <div className="hint bad">{error}</div>
      </Section>
    );
  const ic = info.ions;
  const atoms = [...info.species.counts.values()].reduce((a, b) => a + b, 0);
  return (
    <>
      <Section title="Compound">
        <div className="elcard">
          <span className="elsym" style={{ fontSize: 24 }}>
            {info.pretty}
          </span>
          <span className="elname">{info.name ?? 'no name in this app'}</span>
        </div>
        {info.common && <Readout label="Everyday name" value={info.common} />}
        {info.type && <div className="hint">{TYPE_LABEL[info.type]}</div>}
        {info.use && <div className="hint dim">{info.use}</div>}
        {ic?.warning && <div className="hint warn">⚠ {ic.warning}</div>}
      </Section>
      {info.rule && (
        <Section title="How the name works">
          <div className="hint">{info.rule}</div>
        </Section>
      )}
      {ic && !ic.acid && (
        <Section title="The ions">
          <Readout label={`Positive ion · ${ic.cation.name}`} value={ionText(ic.cation)} />
          <Readout label={`Negative ion · ${ic.anion.name}`} value={ionText(ic.anion)} />
          <Readout label="Ratio (positive : negative)" value={`${ic.nCation} : ${ic.nAnion}`} />
          <Readout label="Total charge" value={`${ic.nCation * ic.cation.charge} − ${ic.nAnion * -ic.anion.charge} = 0`} />
        </Section>
      )}
      <Section title="Mass">
        <Readout label="Atoms in one formula unit" value={String(atoms)} />
        <Readout label="Molar mass" value={info.molarMass.toFixed(3)} unit="g/mol" approx={info.approxMass} title="Sum of the standard atomic weights of all its atoms" />
        <div className="cfg-label">Percent by mass</div>
        {info.percent.map((p) => (
          <div key={p.symbol} className="pctrow" title={`${p.atoms} × ${(p.mass / p.atoms).toFixed(3)} = ${p.mass.toFixed(3)} g/mol`}>
            <span>
              <span className="edot" style={{ background: atomColor(p.symbol) }} /> {p.symbol} × {p.atoms}
            </span>
            <span className="pctbar">
              <i style={{ width: `${p.percent}%`, background: atomColor(p.symbol) }} />
            </span>
            <span className="mono">{p.percent.toFixed(1)} %</span>
          </div>
        ))}
        <div className="hint dim small">% = (atoms × atomic weight) ÷ molar mass × 100.</div>
      </Section>
      <Section title="Model notes" defaultOpen={false}>
        <div className="notes small">
          <ul>
            <li>
              <b>Exact:</b> formulas from charge balance, names, molar masses and percentages (from standard atomic weights).
            </li>
            <li>
              <b>≈</b> The ion list is a teaching selection, and matching charges does not guarantee the compound exists — known exceptions are flagged.
            </li>
            <li>
              <b>≈</b> Charge tiles are a counting aid: real ionic compounds are 3D lattices with many ions.
            </li>
          </ul>
        </div>
      </Section>
    </>
  );
}

const RULES: [string, string][] = [
  ['Ionic', 'Metal (positive ion) first, then non-metal: sodium chloride, NaCl.'],
  ['-ide', 'A single non-metal ion: chloride Cl⁻, oxide O²⁻, sulfide S²⁻, nitride N³⁻.'],
  ['-ate / -ite', 'Polyatomic ions with oxygen: sulfate SO₄²⁻, sulfite SO₃²⁻, nitrate NO₃⁻, nitrite NO₂⁻.'],
  ['(II), (III)', 'For metals with several possible charges the Roman numeral is the charge: iron(III) = Fe³⁺.'],
  ['Brackets', 'Used when more than one polyatomic ion is needed: Ca(OH)₂, Al₂(SO₄)₃.'],
  ['Covalent', 'Two non-metals: prefixes mono-, di-, tri-, tetra-, penta-, hexa-: dinitrogen tetroxide, N₂O₄.'],
  ['Acids', 'hydro…ic acid (HCl), …ic acid from -ate (H₂SO₄), …ous acid from -ite (HNO₂).'],
];

export function NamingGuide() {
  const sel = useStore((s) => s.doc.compound);
  const { info } = compoundInfo(sel);
  return (
    <div className="inventory">
      <div className="panel-title">Naming rules</div>
      <table className="inv rules">
        <tbody>
          {RULES.map(([k, v]) => (
            <tr key={k}>
              <td className="rk">{k}</td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {info?.name && (
        <div className="hint">
          Current: <b>{info.pretty}</b> = <b>{info.name}</b>
        </div>
      )}
    </div>
  );
}
