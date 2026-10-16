import { CHALLENGES } from '../game/challenges';
import { totals } from '../game/progress';
import { useStore, type Mode, type ViewOptions } from '../state/store';
import { Icon } from './icons';
import { IconButton } from './widgets';

export function Toolbar() {
  const mode = useStore((s) => s.mode);
  const canUndo = useStore((s) => s.canUndo);
  const canRedo = useStore((s) => s.canRedo);
  const progress = useStore((s) => s.progress);
  const tot = totals(progress);

  return (
    <div className="toolbar">
      <div className="tb-group">
        <span className="brand" title="Atom Sandbox — build atoms and balance reactions">
          ⚛ AtomSandbox
        </span>
        <div className="seg">
          <ModeButton m="atom" label="Atom builder" k="1" icon={<Icon.atom />} />
          <ModeButton m="reaction" label="Reactions" k="2" icon={<Icon.reaction />} />
        </div>
      </div>
      <div className="tb-sep" />
      <div className="tb-group">
        <IconButton title="Undo (Ctrl+Z)" disabled={!canUndo} onClick={() => useStore.getState().undo()}>
          <Icon.undo />
        </IconButton>
        <IconButton title="Redo (Ctrl+Shift+Z / Ctrl+Y)" disabled={!canRedo} onClick={() => useStore.getState().redo()}>
          <Icon.redo />
        </IconButton>
      </div>
      <div className="tb-sep" />
      <div className="tb-group toggles">
        <Toggle k="labels" label="Labels" title="Shell, particle and count labels" />
        <Toggle k="animate" label="Motion" title="Animate electrons, nucleus jiggle and flying particles" />
        {mode === 'atom' ? (
          <Toggle k="cloud" label="Cloud ≈" title="Show an impression of the electron cloud instead of Bohr rings. Real electrons are spread out in orbitals, not on circular orbits — both pictures are simplified." />
        ) : (
          <Toggle k="formulas" label="Formulas" title="Coefficient and formula under each group of molecules" />
        )}
      </div>
      <div className="tb-spacer" />
      <div className="tb-group">
        <span className="score-pill" title="Challenges solved · stars · points (saved in this browser)">
          <Icon.trophy /> {tot.solved}/{CHALLENGES.length} · {tot.stars}★ · {tot.points} pts
        </span>
        <IconButton title="Settings and progress" onClick={() => useStore.setState({ dialog: 'settings' })}>
          <Icon.settings />
        </IconButton>
        <IconButton title="Help, controls and model notes (?)" onClick={() => useStore.setState({ dialog: 'help' })}>
          <Icon.help />
        </IconButton>
      </div>
    </div>
  );
}

function ModeButton({ m, label, k, icon }: { m: Mode; label: string; k: string; icon: React.ReactNode }) {
  const mode = useStore((s) => s.mode);
  return (
    <button className={`seg-btn${mode === m ? ' on' : ''}`} title={`${label} (${k})`} onClick={() => useStore.getState().setMode(m)}>
      {icon} {label}
    </button>
  );
}

function Toggle({ k, label, title }: { k: keyof ViewOptions; label: string; title: string }) {
  const on = useStore((s) => s.view[k]);
  return (
    <button className={`toggle${on ? ' on' : ''}`} title={title} onClick={() => useStore.getState().setView({ [k]: !on })}>
      {label}
    </button>
  );
}
