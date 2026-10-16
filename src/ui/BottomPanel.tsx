import { useEffect, useRef, useState } from 'react';
import { describeAtom, referenceAtom } from '../chem/atom';
import { CATEGORY_LABEL, ELEMENTS, elementBySymbol, elementByZ, type Category, type Element } from '../chem/elements';
import { checkBalance, equationToText } from '../chem/equation';
import { classifyNucleus, type DecayMode } from '../chem/nuclides';
import { CATEGORY_COLOR, C, atomColor } from '../render/colors';
import { challengeById, CHALLENGES, criteriaFor } from '../game/challenges';
import { parsedEquation, useStore } from '../state/store';
import { animateReaction } from './LeftPanel';

export function BottomPanel() {
  const mode = useStore((s) => s.mode);
  return (
    <div className="bottom">
      <SummaryStrip />
      {mode === 'atom' ? (
        <div className="bottom-body atom">
          <PeriodicTable />
          <NuclideChart />
          <ChallengePanel />
        </div>
      ) : (
        <div className="bottom-body reaction">
          <AtomInventory />
          <ChallengePanel />
        </div>
      )}
    </div>
  );
}

function SummaryStrip() {
  const mode = useStore((s) => s.mode);
  const atom = useStore((s) => s.doc.atom);
  const text = useStore((s) => s.doc.eqText);
  const coefs = useStore((s) => s.doc.coefs);
  if (mode === 'atom') {
    const d = describeAtom(atom);
    return (
      <div className="timeline">
        <span className="tl-info">
          <b className={d.nucleus.status === 'stable' ? 'live' : 'replay'}>{d.element ? d.isotopeSymbol + (d.charge ? ` ${d.ionSymbol}` : '') : '—'}</b> {d.isotopeName} · {atom.protons} p⁺ · {atom.neutrons} n⁰ · {atom.electrons} e⁻ · charge {d.charge > 0 ? '+' : d.charge < 0 ? '−' : ''}
          {Math.abs(d.charge)} · {d.nucleus.estimate ? '≈ ' : ''}
          {d.nucleus.summary}
        </span>
      </div>
    );
  }
  const p = parsedEquation(text);
  const chk = p.ok ? checkBalance(p.eq, coefs) : null;
  return (
    <div className="timeline">
      <button className="tbtn small" disabled={!p.ok} onClick={animateReaction} title="Watch the atoms rearrange (A)">
        ▶ Animate atoms
      </button>
      <span className="tl-info">
        {p.ok ? (
          <>
            <b className={chk!.balanced ? 'live' : 'replay'}>{chk!.balanced ? 'BALANCED' : 'NOT BALANCED'}</b> {equationToText(p.eq, coefs)}
          </>
        ) : (
          <span className="bad">{p.error}</span>
        )}
      </span>
    </div>
  );
}

// ---------- periodic table ----------

function PeriodicTable() {
  const Z = useStore((s) => s.doc.atom.protons);
  const [hover, setHover] = useState<Element | null>(null);
  const shown = hover ?? elementByZ(Z);
  const pick = (el: Element) => {
    const st = useStore.getState();
    st.setAtom(() => referenceAtom(el.Z));
  };
  return (
    <div className="ptable-wrap">
      <div className="ptable" onMouseLeave={() => setHover(null)}>
        {ELEMENTS.map((el) => (
          <button
            key={el.Z}
            className={`pcell${el.Z === Z ? ' current' : ''}${el.predicted ? ' predicted' : ''}`}
            style={{ gridColumn: el.col, gridRow: el.row, background: CATEGORY_COLOR[el.category] }}
            onMouseEnter={() => setHover(el)}
            onClick={() => pick(el)}
            title={`${el.Z} ${el.name} — click to build a neutral ${el.name.toLowerCase()}-${el.refA} atom`}
          >
            <span className="pz">{el.Z}</span>
            <span className="ps">{el.symbol}</span>
          </button>
        ))}
        <div className="pcell ph" style={{ gridColumn: 3, gridRow: 6 }}>
          57–71
        </div>
        <div className="pcell ph" style={{ gridColumn: 3, gridRow: 7 }}>
          89–103
        </div>
        <div className="pcard" style={{ gridColumn: '3 / 13', gridRow: '1 / 4' }}>
          {shown ? (
            <>
              <div className="pcard-main">
                <span className="pcard-sym" style={{ color: atomColor(shown.symbol) }}>
                  {shown.symbol}
                </span>
                <span>
                  <b>{shown.name}</b> · Z = {shown.Z}
                  <br />
                  <span className="dim">
                    {CATEGORY_LABEL[shown.category]}
                    {shown.predicted ? ' (predicted)' : ''} · {shown.weightIsMassNumber ? `[${shown.weight}]` : `${shown.weight} u`}
                  </span>
                </span>
              </div>
              <div className="legend">
                {(Object.keys(CATEGORY_COLOR) as Category[]).map((c) => (
                  <span key={c} className={`lg${shown.category === c ? ' on' : ''}`}>
                    <i style={{ background: CATEGORY_COLOR[c] }} />
                    {CATEGORY_LABEL[c]}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <span className="dim">Click an element to build its atom</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- nuclide chart ----------

const MODE_COLOR: Partial<Record<DecayMode, string>> = {
  'β-': '#4d8fe0',
  '2β-': '#4d8fe0',
  'β+': '#e05d5d',
  EC: '#e05d5d',
  '2EC': '#e05d5d',
  α: '#e7c76a',
  '2α': '#e7c76a',
  SF: '#4cc38a',
  n: '#9c7ac7',
  '2n': '#9c7ac7',
  p: '#d07ac0',
  '2p': '#d07ac0',
};

function NuclideChart() {
  const atom = useStore((s) => s.doc.atom);
  const [full, setFull] = useState(false);
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 280, h: 180 });

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      const r = wrap.current!.getBoundingClientRect();
      setSize({ w: Math.max(50, Math.floor(r.width)), h: Math.max(50, Math.floor(r.height)) });
    });
    ro.observe(wrap.current!);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const cv = ref.current!;
    const dpr = window.devicePixelRatio || 1;
    cv.width = size.w * dpr;
    cv.height = size.h * dpr;
    cv.style.width = `${size.w}px`;
    cv.style.height = `${size.h}px`;
    const ctx = cv.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, size.w, size.h);
    const padL = 26;
    const padB = 18;
    const W = size.w - padL - 6;
    const H = size.h - padB - 6;
    let n0: number, n1: number, z0: number, z1: number;
    if (full) {
      n0 = 0;
      n1 = 178;
      z0 = 0;
      z1 = 118;
    } else {
      const span = 9;
      const aspect = W / H;
      const zs = span;
      const ns = Math.round(span * aspect);
      z0 = Math.max(0, atom.protons - zs);
      z1 = z0 + 2 * zs;
      n0 = Math.max(0, atom.neutrons - ns);
      n1 = n0 + 2 * ns;
    }
    const cw = W / (n1 - n0 + 1);
    const ch = H / (z1 - z0 + 1);
    const cs = Math.min(cw, ch);
    const ox = padL;
    const oy = 6 + H;
    for (let z = Math.max(1, z0); z <= z1; z++) {
      for (let n = n0; n <= n1; n++) {
        const info = classifyNucleus(z, n);
        if (info.status === 'unbound' && info.estimate) continue;
        const x = ox + (n - n0) * cs;
        const y = oy - (z - z0 + 1) * cs;
        let col = '#e6edf3';
        if (info.status !== 'stable') col = MODE_COLOR[info.modes[0]] ?? '#888';
        ctx.globalAlpha = info.estimate ? 0.22 : 1;
        ctx.fillStyle = col;
        ctx.fillRect(x, y, Math.max(1, cs - (cs > 4 ? 1 : 0)), Math.max(1, cs - (cs > 4 ? 1 : 0)));
      }
    }
    ctx.globalAlpha = 1;
    // N = Z line
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    const lo = Math.max(n0, z0);
    const hi = Math.min(n1, z1);
    if (hi > lo) {
      ctx.moveTo(ox + (lo - n0 + 0.5) * cs, oy - (lo - z0 + 0.5) * cs);
      ctx.lineTo(ox + (hi - n0 + 0.5) * cs, oy - (hi - z0 + 0.5) * cs);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // current nuclide
    if (atom.protons >= z0 && atom.protons <= z1 && atom.neutrons >= n0 && atom.neutrons <= n1) {
      const x = ox + (atom.neutrons - n0) * cs;
      const y = oy - (atom.protons - z0 + 1) * cs;
      ctx.strokeStyle = C.accent;
      ctx.lineWidth = 2;
      const m = full ? 4 : 1;
      ctx.strokeRect(x - m, y - m, cs + 2 * m - 1, cs + 2 * m - 1);
    }
    ctx.fillStyle = C.dim;
    ctx.font = '10px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`N ${n0}…${n1} →`, ox, oy + 4);
    ctx.save();
    ctx.translate(10, oy);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`Z ${Math.max(1, z0)}…${z1} →`, 0, -2);
    ctx.restore();
  }, [atom.protons, atom.neutrons, full, size]);

  return (
    <div className="nchart">
      <div className="panel-title">
        Chart of nuclides
        <span className="ev-filters">
          <button className={`toggle small${!full ? ' on' : ''}`} onClick={() => setFull(false)}>
            Zoom
          </button>
          <button className={`toggle small${full ? ' on' : ''}`} onClick={() => setFull(true)}>
            All
          </button>
        </span>
      </div>
      <div className="nchart-canvas" ref={wrap}>
        <canvas ref={ref} />
      </div>
      <div className="nlegend">
        <span>
          <i style={{ background: '#e6edf3' }} />
          stable
        </span>
        <span>
          <i style={{ background: '#4d8fe0' }} />
          β⁻
        </span>
        <span>
          <i style={{ background: '#e05d5d' }} />
          β⁺/EC
        </span>
        <span>
          <i style={{ background: '#e7c76a' }} />α
        </span>
        <span>
          <i style={{ background: '#9c7ac7' }} />
          n/p drip
        </span>
        <span className="dim" title="Faint cells are liquid-drop estimates, not measured data">
          faint = ≈
        </span>
      </div>
    </div>
  );
}

// ---------- atom inventory (reaction mode) ----------

function AtomInventory() {
  const text = useStore((s) => s.doc.eqText);
  const coefs = useStore((s) => s.doc.coefs);
  const p = parsedEquation(text);
  if (!p.ok) return <div className="inventory pad dim">Fix the equation to see the atom count.</div>;
  const chk = checkBalance(p.eq, coefs);
  const max = Math.max(1, ...chk.elements.flatMap((e) => [e.left, e.right]));
  const hasCharge = p.eq.terms.some((t) => t.species.charge !== 0);
  return (
    <div className="inventory">
      <div className="panel-title">Atom count — every atom on the left must appear on the right</div>
      <table className="inv">
        <thead>
          <tr>
            <th>Element</th>
            <th className="r">Reactants</th>
            <th />
            <th>Products</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {chk.elements.map((e) => (
            <tr key={e.symbol} className={e.left === e.right ? '' : 'off'}>
              <td>
                <span className="edot" style={{ background: atomColor(e.symbol) }} /> {e.symbol} <span className="dim">{elementBySymbol(e.symbol)?.name}</span>
              </td>
              <td className="r">
                <span className="bar left" style={{ width: `${(e.left / max) * 100}%` }} />
                <b>{e.left}</b>
              </td>
              <td className="mid">{e.left === e.right ? '=' : e.left > e.right ? '>' : '<'}</td>
              <td>
                <b>{e.right}</b>
                <span className="bar right" style={{ width: `${(e.right / max) * 100}%` }} />
              </td>
              <td className={e.left === e.right ? 'ok' : 'bad'}>{e.left === e.right ? '✔' : `✘ ${e.left > e.right ? `${e.left - e.right} missing on the right` : `${e.right - e.left} extra on the right`}`}</td>
            </tr>
          ))}
          {hasCharge && (
            <tr className={chk.chargeBalanced ? '' : 'off'}>
              <td>Total charge</td>
              <td className="r">
                <b>{chk.chargeLeft > 0 ? `+${chk.chargeLeft}` : chk.chargeLeft}</b>
              </td>
              <td className="mid">{chk.chargeBalanced ? '=' : '≠'}</td>
              <td>
                <b>{chk.chargeRight > 0 ? `+${chk.chargeRight}` : chk.chargeRight}</b>
              </td>
              <td className={chk.chargeBalanced ? 'ok' : 'bad'}>{chk.chargeBalanced ? '✔' : '✘ charge must be conserved'}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ---------- challenge panel ----------

function ChallengePanel() {
  const id = useStore((s) => s.activeChallenge);
  const hints = useStore((s) => s.hintsShown);
  const completed = useStore((s) => s.completed);
  const atom = useStore((s) => s.doc.atom);
  const text = useStore((s) => s.doc.eqText);
  const coefs = useStore((s) => s.doc.coefs);
  const progress = useStore((s) => s.progress);
  const ch = challengeById(id);
  const st = useStore.getState();
  const nextUnsolved = () => {
    const idx = CHALLENGES.findIndex((c) => c.id === id);
    const order = [...CHALLENGES.slice(idx + 1), ...CHALLENGES.slice(0, Math.max(0, idx + 1))];
    return order.find((c) => !progress.results[c.id] || progress.results[c.id].revealed) ?? null;
  };
  if (!ch) {
    const next = nextUnsolved();
    return (
      <div className="challenge">
        <div className="panel-title">Challenge</div>
        <div className="hint">Free play. Pick a challenge on the left, or jump to the next unsolved one.</div>
        {next && (
          <button className="tbtn" onClick={() => st.startChallenge(next.id)}>
            Next challenge: {next.title} →
          </button>
        )}
        {!next && <div className="hint ok">You have solved every challenge. Well done!</div>}
      </div>
    );
  }
  const p = parsedEquation(text);
  const crit = criteriaFor(ch, atom, p.ok ? p.eq : null, coefs);
  const next = nextUnsolved();
  return (
    <div className="challenge">
      <div className="panel-title">
        Level {ch.level} · {ch.title}
        <span className="ev-filters">
          <button className="toggle small" onClick={() => st.restartChallenge()} title="Start this challenge again">
            Restart
          </button>
          <button className="toggle small" onClick={() => st.exitChallenge()} title="Back to free play">
            Exit
          </button>
        </span>
      </div>
      <div className="goal">{ch.goal}</div>
      <ul className="crit">
        {crit.map((c, i) => (
          <li key={i} className={c.pass ? 'ok' : ''}>
            {c.pass ? '✔' : '○'} {c.label}
          </li>
        ))}
      </ul>
      {ch.hints.slice(0, hints).map((h, i) => (
        <div key={i} className="hintbox">
          <b>Hint {i + 1}:</b> {h}
        </div>
      ))}
      {completed ? (
        <div className="done">
          {completed.revealed ? (
            <span className="warn">Answer shown — no points this time.</span>
          ) : (
            <span className="ok">
              ✔ Complete! <span className="stars big">{'★'.repeat(completed.stars) + '☆'.repeat(3 - completed.stars)}</span> +{completed.points} pts
            </span>
          )}
          {ch.fact && <div className="hint fact">💡 {ch.fact}</div>}
          <div className="btnrow">
            {ch.kind === 'equation' && (
              <button className="tbtn small" onClick={animateReaction}>
                ▶ Watch the atoms move
              </button>
            )}
            {next && (
              <button className="tbtn small primary" onClick={() => st.startChallenge(next.id)}>
                Next: {next.title} →
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="btnrow">
          <button className="tbtn small" disabled={hints >= ch.hints.length} onClick={() => st.showHint()} title="Each hint lowers the points for this challenge by 25 (H)">
            Hint {Math.min(hints + 1, ch.hints.length)}/{ch.hints.length} (−25 pts)
          </button>
          <button
            className="tbtn small"
            onClick={() => {
              if (confirm('Show the answer? This challenge will then earn no points (you can replay it later).')) st.revealAnswer();
            }}
          >
            Show answer
          </button>
        </div>
      )}
    </div>
  );
}
