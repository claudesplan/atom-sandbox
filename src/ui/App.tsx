import { useEffect, useState } from 'react';
import { describeAtom } from '../chem/atom';
import { checkBalance } from '../chem/equation';
import { challengeById, CHALLENGES } from '../game/challenges';
import { practiceStats, totals } from '../game/progress';
import { parsedEquation, useStore, type Tool } from '../state/store';
import { addParticle, removeParticle } from './actions';
import { BottomPanel } from './BottomPanel';
import { Dialogs } from './Dialogs';
import { animateReaction, autoBalance, LeftPanel, stepElement, ToolStrip } from './LeftPanel';
import { RightPanel } from './RightPanel';
import { Toolbar } from './Toolbar';
import { Viewport } from './Viewport';

const TOOL_KEYS: Record<string, Tool> = { x: 'remove' };

function useKeyboard() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      const st = useStore.getState();
      if (st.dialog) return;
      const k = e.key.toLowerCase();
      if (e.ctrlKey || e.metaKey) {
        if (k === 'z' && !e.shiftKey) st.undo();
        else if ((k === 'z' && e.shiftKey) || k === 'y') st.redo();
        else return;
        e.preventDefault();
        return;
      }
      if (k === '1') st.setMode('atom');
      else if (k === '2') st.setMode('reaction');
      else if (k === '3') st.setMode('bonds');
      else if (k === 'g') st.startPractice();
      else if (st.mode === 'bonds' && k === 'a') useStore.setState({ animateBond: st.animateBond + 1 });
      else if (k === '?') useStore.setState({ dialog: 'help' });
      else if (k === 'h') st.showHint();
      else if (st.mode === 'atom' && (k === 'p' || k === 'n' || k === 'e')) {
        const kind = k as 'p' | 'n' | 'e';
        if (e.shiftKey) removeParticle(kind);
        else addParticle(kind);
      } else if (st.mode === 'atom' && TOOL_KEYS[k]) useStore.setState({ tool: TOOL_KEYS[k] });
      else if (st.mode === 'atom' && (k === '[' || k === ']')) stepElement(k === ']' ? 1 : -1);
      else if (st.mode === 'reaction' && k === 'a') animateReaction();
      else if (st.mode === 'reaction' && k === 'b') autoBalance();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function StatusBar() {
  const mode = useStore((s) => s.mode);
  const atom = useStore((s) => s.doc.atom);
  const text = useStore((s) => s.doc.eqText);
  const coefs = useStore((s) => s.doc.coefs);
  const tool = useStore((s) => s.tool);
  const progress = useStore((s) => s.progress);
  const active = useStore((s) => s.activeChallenge);
  const pair = useStore((s) => s.doc.pair);
  const tot = totals(progress);
  const prac = practiceStats(progress);
  const d = describeAtom(atom);
  const p = parsedEquation(text);
  return (
    <div className="statusbar">
      <span>mode: {mode === 'atom' ? 'atom builder' : mode === 'bonds' ? 'bonds' : 'reactions'}</span>
      {mode === 'atom' ? (
        <>
          <span>tool: {tool}</span>
          <span>
            {d.element ? `${d.element.symbol} Z=${d.Z} A=${d.A} q=${d.charge}` : 'no element'} · {atom.protons + atom.neutrons + atom.electrons} particles
          </span>
        </>
      ) : mode === 'bonds' ? (
        <span>
          pair {pair[0]} + {pair[1]}
        </span>
      ) : (
        <span>{p.ok ? `${p.eq.terms.length} species · ${checkBalance(p.eq, coefs).balanced ? 'balanced' : 'not balanced'}` : 'equation error'}</span>
      )}
      <span>{active ? `challenge: ${challengeById(active)?.title}` : 'free play'}</span>
      <span className="tb-spacer" />
      <span>
        levels {tot.solved}/{CHALLENGES.length} · {tot.points} pts · practice {prac.solved.easy + prac.solved.medium + prac.solved.hard} solved, {prac.points} pts, streak {prac.streak} (saved in this browser)
      </span>
    </div>
  );
}

function Toast() {
  const toast = useStore((s) => s.toast);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), toast.kind === 'win' ? 4000 : 3200);
    return () => clearTimeout(t);
  }, [toast]);
  if (!toast || !visible) return null;
  return <div className={`toast ${toast.kind}`}>{toast.text}</div>;
}

export function App() {
  useKeyboard();
  return (
    <div className="app">
      <Toolbar />
      <div className="main">
        <ToolStrip />
        <LeftPanel />
        <div className="center">
          <Viewport />
        </div>
        <RightPanel />
      </div>
      <BottomPanel />
      <StatusBar />
      <Dialogs />
      <Toast />
    </div>
  );
}
