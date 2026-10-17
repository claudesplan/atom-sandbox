import {
  BOND_EXPLAIN,
  BOND_LABEL,
  BOND_PROPERTIES,
  bondEnthalpy,
  bondLabel,
  classifyBond,
  electronegativity,
  estimateEnergy,
  pairCompound,
  type BondType,
} from '../chem/bonding';
import { CATEGORY_LABEL, elementBySymbol } from '../chem/elements';
import type { Equation } from '../chem/equation';
import { structureFor } from '../chem/structures';
import { useStore } from '../state/store';
import { Readout, Section } from './widgets';

const TYPE_COLOR: Record<BondType, string> = {
  ionic: '#c9a0ff',
  'polar-covalent': '#f0a33a',
  'nonpolar-covalent': '#c9d1d9',
  metallic: '#4fb3ff',
  none: '#7d8792',
};

/** Electronegativity-difference scale 0 … 3.3 with the classroom regions. */
function ENScale({ dEN }: { dEN: number | null }) {
  const max = 3.3;
  return (
    <div className="enscale" title="Rule of thumb: ΔEN < 0.4 non-polar, 0.4–1.7 polar covalent, > 1.7 mostly ionic. Real bonds change smoothly from one to the other ≈">
      <div className="enbar">
        <span style={{ width: `${(0.4 / max) * 100}%`, background: 'rgba(201,209,217,0.35)' }}>non-polar</span>
        <span style={{ width: `${((1.7 - 0.4) / max) * 100}%`, background: 'rgba(240,163,58,0.35)' }}>polar covalent</span>
        <span style={{ width: `${((max - 1.7) / max) * 100}%`, background: 'rgba(201,160,255,0.35)' }}>mostly ionic</span>
      </div>
      {dEN != null && <i className="enmark" style={{ left: `${Math.min(1, dEN / max) * 100}%` }} />}
      <div className="enticks">
        <span>0</span>
        <span style={{ left: `${(0.4 / max) * 100}%` }}>0.4</span>
        <span style={{ left: `${(1.7 / max) * 100}%` }}>1.7</span>
        <span style={{ left: '100%' }}>3.3</span>
      </div>
    </div>
  );
}

export function BondPanels() {
  const pair = useStore((s) => s.doc.pair);
  const [a, b] = pair;
  const ea = elementBySymbol(a)!;
  const eb = elementBySymbol(b)!;
  const cls = classifyBond(a, b);
  const comp = pairCompound(a, b);
  const be = comp.kind === 'molecule' ? bondEnthalpy(comp.central, comp.terminal ?? comp.central, comp.order) : null;
  return (
    <>
      <Section title="Bond type">
        <div className="bondtype" style={{ color: TYPE_COLOR[cls.type], borderColor: TYPE_COLOR[cls.type] }}>
          {BOND_LABEL[cls.type]}
          {comp.formula && <span className="bondformula"> → {comp.formula}</span>}
        </div>
        <div className="hint">{BOND_EXPLAIN[cls.type]}</div>
        {cls.caveat && <div className="hint warn">{cls.caveat}</div>}
        <div className="hint dim small">
          Rule used: metal + non-metal → ionic, non-metal + non-metal → covalent, metal + metal → metallic. This sorting is a classroom model <span className="approx">≈</span> — real bonds change smoothly from one type to another.
        </div>
      </Section>
      <Section title="Electronegativity">
        {[ea, eb].map((el, k) => (
          <Readout key={k} label={`${el.name} (${el.symbol}) · ${CATEGORY_LABEL[el.category].toLowerCase()}`} value={electronegativity(el.symbol)?.toFixed(2) ?? '—'} title="Pauling electronegativity: how strongly an atom pulls on shared electrons" />
        ))}
        <Readout label="Difference ΔEN" value={cls.dEN != null ? cls.dEN.toFixed(2) : '—'} />
        <ENScale dEN={cls.dEN} />
        {cls.negative && cls.type === 'polar-covalent' && (
          <div className="hint">
            {cls.negative} gets a partial negative charge (δ−); {cls.negative === a ? b : a} becomes δ+.
          </div>
        )}
      </Section>
      {comp.kind === 'molecule' && (
        <Section title="The covalent bond">
          <Readout label="Bond" value={`${comp.terminal ?? comp.central}${comp.order === 1 ? '–' : comp.order === 2 ? '=' : '≡'}${comp.central}`} />
          <Readout label="Shared electron pairs per bond" value={String(comp.order)} />
          <Readout label="Bonds in one molecule" value={String(comp.terminal ? comp.terminals : 1)} />
          {be != null && <Readout label="Average bond enthalpy" value={String(be)} unit="kJ/mol" approx title="Energy needed to break one mole of these bonds in gases, averaged over many molecules" />}
          <div className="hint dim small">Double and triple bonds are shorter and stronger than single bonds between the same atoms.</div>
        </Section>
      )}
      {comp.kind === 'ionic' && (
        <Section title="The ions">
          <Readout label="Positive ion (cation)" value={`${comp.cation.symbol}${comp.cation.charge > 1 ? comp.cation.charge : ''}+`} />
          <Readout label="Negative ion (anion)" value={`${comp.anion.symbol}${-comp.anion.charge > 1 ? -comp.anion.charge : ''}−`} />
          <Readout label="Ratio in the formula" value={`${comp.cation.count} : ${comp.anion.count}`} />
          <div className="hint">
            Charges cancel: {comp.cation.count} × (+{comp.cation.charge}) + {comp.anion.count} × ({comp.anion.charge}) = 0.
          </div>
        </Section>
      )}
      {cls.type !== 'none' && (
        <Section title="Typical properties ≈">
          {BOND_PROPERTIES[cls.type].map(([k, v]) => (
            <div key={k} className="proprow">
              <span className="dim">{k}</span>
              <span>{v}</span>
            </div>
          ))}
          <div className="hint dim small">General trends for substances with this kind of bonding — there are exceptions.</div>
        </Section>
      )}
      <Section title="Model notes" defaultOpen={false}>
        <div className="notes small">
          <ul>
            <li>
              <b>Exact:</b> electronegativities (Pauling scale) and ion charges from the teaching list.
            </li>
            <li>
              <b>≈ Dot-and-cross diagrams</b> show outer shells only and say nothing about the 3D shape of a molecule. Electrons are identical; dots and crosses only show where they came from.
            </li>
            <li>
              <b>≈ Simple formulas</b> use the octet rule (C makes 4 bonds, N 3, O 2, H and halogens 1). Many real compounds break it (e.g. SF₆, PCl₅).
            </li>
          </ul>
        </div>
      </Section>
    </>
  );
}

// ---------- reaction view additions ----------

export function ReactionBondSections({ eq, coefs }: { eq: Equation; coefs: number[] }) {
  const rows = new Map<string, { label: string; type: BondType; dEN: number | null; be: number | null; neg: string | null }>();
  for (const t of eq.terms) {
    const s = structureFor(t.species);
    for (const bd of s.bonds) {
      const x = s.atoms[bd.a].el;
      const y = s.atoms[bd.b].el;
      const cls = classifyBond(x, y);
      const type: BondType = bd.ionic ? 'ionic' : cls.type === 'ionic' ? 'polar-covalent' : cls.type;
      const label = bd.ionic ? bondLabel(x, y, 1).replace('–', ' ··· ') : bondLabel(x, y, bd.order);
      if (!rows.has(label)) rows.set(label, { label, type, dEN: cls.dEN, be: bd.ionic ? null : bondEnthalpy(x, y, bd.order), neg: cls.negative });
    }
  }
  const energy = estimateEnergy(eq, coefs);
  return (
    <>
      <Section title="Bonds in these substances">
        {rows.size === 0 && <div className="hint dim">No bonds drawn (single atoms or ions only).</div>}
        {[...rows.values()].map((r) => (
          <div key={r.label} className="bondrow" title={r.dEN != null ? `ΔEN = ${r.dEN.toFixed(2)}${r.neg && r.type === 'polar-covalent' ? `; δ− on ${r.neg}` : ''}` : undefined}>
            <span className="mono">{r.label}</span>
            <span style={{ color: TYPE_COLOR[r.type] }}>{BOND_LABEL[r.type]}</span>
            <span className="dim mono">{r.be != null ? `${r.be} kJ/mol` : ''}</span>
          </div>
        ))}
        <div className="hint dim small">Turn on “Bond types” in the toolbar to colour the bonds and show δ+/δ−.</div>
      </Section>
      <Section title="Energy from bond enthalpies ≈">
        {energy.ok ? (
          <>
            <div className="cfg-label">Bonds broken (reactants) — takes in energy</div>
            {energy.broken.map((b) => (
              <Readout key={b.label} label={`${b.count} × ${b.label}`} value={`+${b.count * b.each}`} unit="kJ" />
            ))}
            <div className="cfg-label">Bonds made (products) — gives out energy</div>
            {energy.formed.map((b) => (
              <Readout key={b.label} label={`${b.count} × ${b.label}`} value={`−${b.count * b.each}`} unit="kJ" />
            ))}
            <Readout label="ΔH = broken − made" value={`${energy.dH > 0 ? '+' : energy.dH < 0 ? '−' : ''}${Math.abs(energy.dH)}`} unit="kJ" approx title="Estimate from average bond enthalpies for gases. Measured values differ by a few %, more when liquids or solids are involved." />
            <div className={`hint ${energy.dH < 0 ? 'warn' : 'ok'}`}>
              {energy.dH < 0 ? 'Exothermic: making the new bonds releases more energy than breaking the old ones took — it gets hot.' : 'Endothermic: breaking the bonds takes more energy than making the new ones releases — it takes in heat.'}
            </div>
            <div className="hint dim small">For the equation exactly as balanced{coefs.some((c) => c !== 1) ? '' : ' (all coefficients 1)'}. Uses average bond enthalpies for gases ≈.</div>
          </>
        ) : (
          <div className="hint dim">{energy.reason}</div>
        )}
      </Section>
    </>
  );
}
