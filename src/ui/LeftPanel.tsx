import { useEffect, useState } from 'react';
import { LIMITS } from '../chem/atom';
import { elementBySymbol, elementByZ } from '../chem/elements';
import { balance, equationToText } from '../chem/equation';
import { DECAY_LABEL, formatHalfLife, listedIsotopes, superscript } from '../chem/nuclides';
import { REACTIONS } from '../chem/reactions';
import { classifyBond, BOND_LABEL } from '../chem/bonding';
import { CHALLENGES, LEVELS, type Difficulty } from '../game/challenges';
import { DIFFICULTY_LABEL, DIFFICULTY_POINTS, type PracticeKind } from '../game/generator';
import { practiceStats } from '../game/progress';
import { parsedEquation, useStore, type Tool } from '../state/store';
import { addParticle, removeParticle } from './actions';
import { Icon } from './icons';
import { IconButton, NumberField, Section } from './widgets';

const TOOLS: { id: Tool; title: string; icon: keyof typeof Icon; key: string }[] = [
  { id: 'proton', title: 'Add protons — click the canvas (right-click removes one)', icon: 'proton', key: 'P' },
  { id: 'neutron', title: 'Add neutrons — click the canvas (right-click removes one)', icon: 'neutron', key: 'N' },
  { id: 'electron', title: 'Add electrons — click the canvas (right-click removes one)', icon: 'electron', key: 'E' },
  { id: 'remove', title: 'Remove — click a particle to take it away', icon: 'remove', key: 'X' },
];

export function ToolStrip() {
  const mode = useStore((s) => s.mode);
  const tool = useStore((s) => s.tool);
  const active = useStore((s) => s.activeChallenge);
  if (mode === 'atom')
    return (
      <div className="toolstrip">
        {TOOLS.map((t) => {
          const I = Icon[t.icon];
          return (
            <IconButton key={t.id} title={`${t.title} (${t.key})`} active={tool === t.id} onClick={() => useStore.setState({ tool: t.id })}>
              <I />
            </IconButton>
          );
        })}
        <div className="ts-sep" />
        <IconButton title="Clear: remove every particle" onClick={() => useStore.getState().setAtom(() => ({ protons: 0, neutrons: 0, electrons: 0 }))}>
          <Icon.clear />
        </IconButton>
      </div>
    );
  if (mode === 'bonds')
    return (
      <div className="toolstrip">
        <IconButton title="Replay the bonding animation (A)" onClick={() => useStore.setState({ animateBond: useStore.getState().animateBond + 1 })}>
          <Icon.play />
        </IconButton>
        <IconButton title="Swap the two elements" onClick={() => useStore.getState().commit((d) => ({ ...d, pair: [d.pair[1], d.pair[0]] }))}>
          <Icon.swap />
        </IconButton>
      </div>
    );
  return (
    <div className="toolstrip">
      <IconButton title="Animate: watch the atoms rearrange from reactants to products (A)" onClick={animateReaction}>
        <Icon.play />
      </IconButton>
      <IconButton title={active ? 'Show the answer (this challenge then earns no points)' : 'Auto-balance with the smallest whole numbers'} onClick={autoBalance}>
        <Icon.balance />
      </IconButton>
      <div className="ts-sep" />
      <IconButton title="Set every coefficient back to 1" onClick={() => useStore.getState().commit((d) => ({ ...d, coefs: d.coefs.map(() => 1) }))}>
        <Icon.clear />
      </IconButton>
    </div>
  );
}

export function animateReaction(): void {
  const st = useStore.getState();
  const p = parsedEquation(st.doc.eqText);
  if (!p.ok) return;
  if (st.doc.coefs.some((c) => c > 40)) return st.notify('Too many molecules to animate — reduce the coefficients.', 'warn');
  useStore.setState({ animateReaction: st.animateReaction + 1, view: { ...st.view, animate: true } });
}

export function autoBalance(): void {
  const st = useStore.getState();
  if (st.activeChallenge) {
    if (!st.completed && !confirm('Show the answer? This challenge will then earn no points (you can replay it later).')) return;
    return st.revealAnswer();
  }
  const p = parsedEquation(st.doc.eqText);
  if (!p.ok) return st.notify(p.error, 'error');
  const b = balance(p.eq);
  if (b.ok) {
    st.commit((d) => ({ ...d, coefs: b.coefs }));
    st.notify(`Balanced: ${equationToText(p.eq, b.coefs)}`);
  } else st.notify(b.message, 'warn');
}

export function LeftPanel() {
  const mode = useStore((s) => s.mode);
  return (
    <div className="sidebar left">
      {mode === 'atom' && (
        <>
          <ParticlesSection />
          <IsotopeList />
        </>
      )}
      {mode === 'reaction' && (
        <>
          <EquationInput />
          <ReactionLibrary />
        </>
      )}
      {mode === 'bonds' && <PairPicker />}
      <PracticeSection />
      <ChallengeList />
    </div>
  );
}

function ParticleRow({ label, k, kind, color, max }: { label: string; k: 'protons' | 'neutrons' | 'electrons'; kind: 'p' | 'n' | 'e'; color: string; max: number }) {
  const v = useStore((s) => s.doc.atom[k]);
  return (
    <div className="prow">
      <span className="pdot" style={{ background: color }} />
      <label>{label}</label>
      <button className="pbtn" title={`Remove one (Shift+${kind.toUpperCase()})`} disabled={v <= 0} onClick={() => removeParticle(kind)}>
        −
      </button>
      <NumberField value={v} min={0} max={max} step={1} digits={4} onCommit={(n) => useStore.getState().setAtom((a) => ({ ...a, [k]: Math.round(n) }))} />
      <button className="pbtn" title={`Add one (${kind.toUpperCase()})`} disabled={v >= max} onClick={() => addParticle(kind)}>
        +
      </button>
    </div>
  );
}

function ParticlesSection() {
  const atom = useStore((s) => s.doc.atom);
  return (
    <Section title="Particles">
      <ParticleRow label="Protons" k="protons" kind="p" color="#e05d5d" max={LIMITS.protons} />
      <ParticleRow label="Neutrons" k="neutrons" kind="n" color="#8a9aab" max={LIMITS.neutrons} />
      <ParticleRow label="Electrons" k="electrons" kind="e" color="#4fb3ff" max={LIMITS.electrons} />
      <div className="btnrow">
        <button className="tbtn small" disabled={atom.electrons === atom.protons} title="Set electrons = protons (charge 0)" onClick={() => useStore.getState().setAtom((a) => ({ ...a, electrons: a.protons }))}>
          Make neutral
        </button>
        <button className="tbtn small" title="Previous element ( [ )" disabled={atom.protons <= 1} onClick={() => stepElement(-1)}>
          ◀ Z−1
        </button>
        <button className="tbtn small" title="Next element ( ] )" disabled={atom.protons >= 118} onClick={() => stepElement(1)}>
          Z+1 ▶
        </button>
      </div>
      <div className="hint dim">The number of protons decides the element. Neutrons change the isotope, electrons change the charge.</div>
    </Section>
  );
}

export function stepElement(dz: number): void {
  const st = useStore.getState();
  const Z = Math.max(1, Math.min(118, st.doc.atom.protons + dz));
  const el = elementByZ(Z)!;
  st.setAtom(() => ({ protons: Z, neutrons: el.refA - Z, electrons: Z }));
}

function IsotopeList() {
  const Z = useStore((s) => s.doc.atom.protons);
  const N = useStore((s) => s.doc.atom.neutrons);
  const el = elementByZ(Z);
  if (!el) return null;
  const list = listedIsotopes(Z);
  return (
    <Section title={`Isotopes of ${el.name.toLowerCase()}`} right={<span className="dim">{list.length} listed</span>}>
      <div className="matlist">
        {list.map((iso) => (
          <div
            key={iso.A}
            className={`mat iso${iso.A - Z === N ? ' active' : ''}`}
            title={iso.stable ? 'Stable: no decay has ever been observed' : `${DECAY_LABEL[iso.entry!.modes[0]]}${iso.entry!.note ? `\n${iso.entry!.note}` : ''}`}
            onClick={() => useStore.getState().setAtom((a) => ({ ...a, neutrons: iso.A - Z }))}
          >
            <span className="swatch" style={{ background: iso.stable ? '#4cc38a' : '#f0a33a', borderRadius: 6 }} />
            <span className="mname">
              {superscript(iso.A)}
              {el.symbol} <span className="dim">· {iso.A - Z} n</span>
            </span>
            <span className="mmeta">{iso.stable ? 'stable' : `${iso.entry!.uncertain ? '≈' : ''}${formatHalfLife(iso.entry!.halfLife)}`}</span>
            <span />
          </div>
        ))}
      </div>
      <div className="hint dim">Green: stable. Amber: radioactive (half-life shown). Other neutron numbers are estimated ≈.</div>
    </Section>
  );
}

function EquationInput() {
  const text = useStore((s) => s.doc.eqText);
  const active = useStore((s) => s.activeChallenge);
  const [draft, setDraft] = useState(text);
  useEffect(() => setDraft(text), [text]);
  const p = parsedEquation(draft);
  const commit = () => {
    if (draft === text) return;
    if (active && !confirm('Typing a new equation leaves the current challenge. Continue?')) return setDraft(text);
    if (active) useStore.getState().exitChallenge();
    useStore.getState().setEquation(draft);
  };
  return (
    <Section title="Your equation">
      <textarea
        className="textfield eq-input"
        value={draft}
        spellCheck={false}
        rows={2}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') setDraft(text);
        }}
      />
      {p.ok ? <div className="hint eq-preview">{equationToText(p.eq, p.eq.typedCoefs)}</div> : <div className="hint bad">{p.error}</div>}
      <div className="hint dim">
        Type formulas with capitals: <code>CH4 + O2 -&gt; CO2 + H2O</code>. Charges: <code>Fe^3+</code>, <code>SO4^2-</code>, <code>Na+</code>, electrons <code>e-</code>. Separate ions with spaces: <code>Na+ + Cl-</code>. Press Enter to load.
      </div>
    </Section>
  );
}

function ReactionLibrary() {
  const text = useStore((s) => s.doc.eqText);
  const active = useStore((s) => s.activeChallenge);
  return (
    <Section title="Reaction library" defaultOpen={true}>
      <div className="matlist">
        {REACTIONS.map((r) => (
          <div
            key={r.id}
            className={`mat rx${r.equation === text ? ' active' : ''}`}
            title={`${r.description}\nClick to load it unbalanced (all coefficients 1).`}
            onClick={() => {
              if (active) {
                if (!confirm('Loading a library reaction leaves the current challenge. Continue?')) return;
                useStore.getState().exitChallenge();
              }
              const p = parsedEquation(r.equation);
              useStore.getState().setEquation(r.equation, p.ok ? p.eq.terms.map(() => 1) : undefined);
            }}
          >
            <span className="mname">{r.name}</span>
            <span className="mmeta">{r.equation.replace('->', '→')}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

function ChallengeList() {
  const progress = useStore((s) => s.progress);
  const active = useStore((s) => s.activeChallenge);
  return (
    <Section title="Challenges" right={<span className="dim">progress saved in this browser</span>}>
      {LEVELS.map((lv) => {
        const list = CHALLENGES.filter((c) => c.level === lv.n);
        const solved = list.filter((c) => progress.results[c.id] && !progress.results[c.id].revealed).length;
        return (
          <div key={lv.n} className="level">
            <div className="level-head">
              <span>
                Level {lv.n} · {lv.name}
              </span>
              <span className="dim">
                {solved}/{list.length}
              </span>
            </div>
            {list.map((c) => {
              const r = progress.results[c.id];
              const stars = r && !r.revealed ? r.stars : 0;
              return (
                <div key={c.id} className={`chrow${active === c.id ? ' active' : ''}`} onClick={() => useStore.getState().startChallenge(c.id)} title={c.goal}>
                  <span className={`chkind ${c.kind}`}>{c.kind === 'atom' ? '⚛' : '⇄'}</span>
                  <span className="chtitle">{c.title}</span>
                  <span className={`stars${stars ? '' : ' none'}`}>{r?.revealed ? 'shown' : '★'.repeat(stars) + '☆'.repeat(3 - stars)}</span>
                </div>
              );
            })}
          </div>
        );
      })}
    </Section>
  );
}

const PRESET_PAIRS: { a: string; b: string; why: string }[] = [
  { a: 'Na', b: 'Cl', why: 'table salt' },
  { a: 'Mg', b: 'O', why: '2+ and 2− ions' },
  { a: 'Al', b: 'O', why: 'Al₂O₃: charges must cancel' },
  { a: 'Ca', b: 'Cl', why: 'CaCl₂' },
  { a: 'H', b: 'H', why: 'single bond' },
  { a: 'O', b: 'O', why: 'double bond' },
  { a: 'N', b: 'N', why: 'triple bond' },
  { a: 'H', b: 'Cl', why: 'polar bond' },
  { a: 'O', b: 'H', why: 'water' },
  { a: 'N', b: 'H', why: 'ammonia' },
  { a: 'C', b: 'H', why: 'methane' },
  { a: 'C', b: 'O', why: 'carbon dioxide' },
  { a: 'Cu', b: 'Cu', why: 'a metal' },
  { a: 'Cu', b: 'Zn', why: 'brass (alloy)' },
  { a: 'C', b: 'C', why: 'diamond' },
  { a: 'Ne', b: 'Ne', why: 'noble gas' },
];

function PairPicker() {
  const pair = useStore((s) => s.doc.pair);
  const slot = useStore((s) => s.pickSlot);
  return (
    <>
      <Section title="Two elements">
        <div className="pairpick">
          {[0, 1].map((k) => {
            const el = elementBySymbol(pair[k])!;
            return (
              <button key={k} className={`pairslot${slot === k ? ' on' : ''}`} onClick={() => useStore.setState({ pickSlot: k as 0 | 1 })} title="Select this slot, then click an element on the periodic table">
                <span className="pz">{k === 0 ? 'A' : 'B'}</span>
                <span className="psym">{el.symbol}</span>
                <span className="pname">{el.name}</span>
              </button>
            );
          })}
        </div>
        <div className="hint dim">Click A or B, then click an element on the periodic table below. Right-click an element to set B directly.</div>
      </Section>
      <Section title="Examples">
        <div className="matlist">
          {PRESET_PAIRS.map((p) => {
            const t = classifyBond(p.a, p.b).type;
            return (
              <div
                key={p.a + p.b}
                className={`mat rx${pair[0] === p.a && pair[1] === p.b ? ' active' : ''}`}
                onClick={() => {
                  useStore.getState().commit((d) => ({ ...d, pair: [p.a, p.b] }));
                  useStore.setState({ animateBond: useStore.getState().animateBond + 1 });
                }}
              >
                <span className="mname">
                  {p.a} + {p.b} <span className="dim">· {p.why}</span>
                </span>
                <span className="mmeta">{BOND_LABEL[t]}</span>
              </div>
            );
          })}
        </div>
      </Section>
    </>
  );
}

const KINDS: { value: PracticeKind; label: string }[] = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'atom', label: 'Atoms' },
  { value: 'equation', label: 'Equations' },
  { value: 'quiz', label: 'Bonds' },
];

function PracticeSection() {
  const practice = useStore((s) => s.practice);
  const progress = useStore((s) => s.progress);
  const st = practiceStats(progress);
  const [code, setCode] = useState('');
  return (
    <Section title="Practice (random)" right={<span className="dim">streak {st.streak} · best {st.bestStreak}</span>}>
      <div className="seg small-seg">
        {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
          <button key={d} className={`seg-btn${practice.difficulty === d ? ' on' : ''}`} onClick={() => useStore.getState().setPractice({ difficulty: d })} title={`${DIFFICULTY_POINTS[d]} points each`}>
            {DIFFICULTY_LABEL[d]}
          </button>
        ))}
      </div>
      <div className="seg small-seg">
        {KINDS.map((k) => (
          <button key={k.value} className={`seg-btn${practice.kind === k.value ? ' on' : ''}`} onClick={() => useStore.getState().setPractice({ kind: k.value })}>
            {k.label}
          </button>
        ))}
      </div>
      <div className="btnrow">
        <button className="tbtn primary" onClick={() => useStore.getState().startPractice()} title="Generate a new random challenge (G)">
          <Icon.dice /> New random challenge
        </button>
      </div>
      <div className="coderow">
        <input
          className="textfield"
          placeholder="Practice code, e.g. MQ-4821"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              if (!useStore.getState().startPractice(code)) useStore.getState().notify('Practice codes look like EA-123 (Easy/Medium/Hard + Atom/eQuation/Bond + number)', 'warn');
              else setCode('');
            }
          }}
        />
      </div>
      <div className="hint dim">
        Solved: {st.solved.easy} easy · {st.solved.medium} medium · {st.solved.hard} hard · {st.points} pts. Share a code so someone else gets the same challenge.
      </div>
    </Section>
  );
}
