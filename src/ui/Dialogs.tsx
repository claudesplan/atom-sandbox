import { useEffect, type ReactNode } from 'react';
import { CHALLENGES } from '../game/challenges';
import { totals } from '../game/progress';
import { useStore } from '../state/store';

function Modal({ title, children, onClose, wide }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={onClose}>
      <div className={`modal${wide ? ' wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span>{title}</span>
          <button className="xbtn" onClick={onClose} title="Close (Esc)">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Dialogs() {
  const dialog = useStore((s) => s.dialog);
  const close = () => useStore.setState({ dialog: null });
  if (dialog === 'help') return <HelpDialog onClose={close} />;
  if (dialog === 'settings') return <SettingsDialog onClose={close} />;
  return null;
}

const SHORTCUTS: [string, string][] = [
  ['1 / 2 / 3', 'Atom builder / Reactions / Bonds'],
  ['G', 'New random practice challenge'],
  ['P N E', 'Add a proton / neutron / electron'],
  ['Shift + P N E', 'Remove one'],
  ['X', 'Remove tool (click a particle)'],
  ['[ / ]', 'Previous / next element'],
  ['Click canvas', 'Atom builder: add a particle with the active tool'],
  ['Right-click canvas', 'Atom builder: remove one of the active kind'],
  ['Click a molecule group', 'Reactions: coefficient +1 (right-click or Shift: −1)'],
  ['A', 'Reactions: animate the atoms rearranging · Bonds: replay'],
  ['Click / right-click element', 'Bonds: set element A (or the selected slot) / set B'],
  ['B', 'Reactions: auto-balance (in a challenge: show answer)'],
  ['H', 'Show the next hint for the current challenge'],
  ['Ctrl+Z / Ctrl+Shift+Z', 'Undo / redo'],
  ['?', 'This help'],
];

function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Help — controls and model notes" onClose={onClose} wide>
      <div className="settings-grid">
        <div>
          <h4>Keyboard and mouse</h4>
          <table className="shortcuts">
            <tbody>
              {SHORTCUTS.map(([k, d]) => (
                <tr key={k}>
                  <td>
                    <kbd>{k}</kbd>
                  </td>
                  <td>{d}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h4>How to play</h4>
          <div className="notes">
            <ul>
              <li>Pick a challenge on the left. The checklist in the bottom-right turns green as you meet each goal.</li>
              <li>Each challenge is worth 100 points and 3 stars. Every hint costs 25 points and a star; showing the answer gives 0.</li>
              <li>Your best result per challenge is saved in this browser (localStorage). Reset it in Settings.</li>
              <li>
                <b>Practice</b> makes random challenges (atoms, equations or bond questions) at Easy, Medium or Hard. Easy is worth 50 points, Medium 100, Hard 150; hints and wrong answers cost a quarter each. Each one has a code (e.g. MQ-4821) that gives exactly the same challenge again — handy for a class.
              </li>
            </ul>
          </div>
        </div>
        <div className="notes">
          <h4>What is exact</h4>
          <ul>
            <li>The element is decided by the number of protons; mass number = protons + neutrons; charge = protons − electrons.</li>
            <li>Which nuclei are stable (251 nuclides with no observed decay) and the half-lives and decay modes in the data table (rounded).</li>
            <li>Ground-state electron configurations of neutral atoms, including exceptions such as Cr and Cu (from atomic spectra).</li>
            <li>Atom and charge counting in equations, and balancing (exact fractions, no rounding). Molar masses from IUPAC standard atomic weights.</li>
          </ul>
          <h4>
            Simplified models <span className="approx">≈</span>
          </h4>
          <ul>
            <li>
              <b>Bohr rings</b> are a teaching picture. Electrons do not travel on circular orbits; quantum mechanics describes them as orbitals — clouds where an electron is likely to be found. The “Cloud” view is only an impression of that.
            </li>
            <li>The atom is drawn hugely out of scale: the nucleus is 10,000–100,000 times smaller than the atom.</li>
            <li>Nuclei that are not in the data table are classified with the liquid-drop (semi-empirical mass) formula — marked ≈, and unreliable for very light nuclei.</li>
            <li>Ion configurations use “remove the highest-n electrons first”; this is right for main-group ions and Fe²⁺/Fe³⁺/Cu²⁺, but some heavy d/f-block ions differ (marked ≈).</li>
            <li>“Common ions” is a teaching list; O²⁻ and N³⁻, for example, only exist inside crystals or solutions.</li>
            <li>Molecules are flat “displayed formulas” with rough angles; ionic solids are drawn as one formula unit, metals as single atoms — the real substances are giant lattices.</li>
            <li>A balanced equation says nothing about whether a reaction happens or how fast. The energy estimate uses average bond enthalpies for gases (≈ a few % for simple gas reactions).</li>
            <li>
              <b>Bond types</b> follow the classroom rule (metal + non-metal ionic, non-metals covalent, metals metallic) with the electronegativity difference shown alongside. Real bonds lie on a continuum; the app warns where the simple rule is shaky (e.g. AlCl₃, HF).
            </li>
            <li>Dot-and-cross diagrams show outer shells only and no 3D shape; simple formulas use the octet rule, which many real compounds break.</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}

function SettingsDialog({ onClose }: { onClose: () => void }) {
  const progress = useStore((s) => s.progress);
  const t = totals(progress);
  return (
    <Modal title="Settings and progress" onClose={onClose}>
      <h4>Progress</h4>
      <div className="hint">
        Solved {t.solved} of {CHALLENGES.length} challenges · {t.stars} of {CHALLENGES.length * 3} stars · {t.points} points.
      </div>
      <div className="hint dim">Saved only in this browser on this computer (localStorage). Clearing browser data removes it.</div>
      <div className="modal-actions">
        <button
          className="tbtn small"
          onClick={() => {
            if (confirm('Reset all challenge progress? This cannot be undone.')) useStore.getState().resetProgress();
          }}
        >
          Reset all progress
        </button>
      </div>
    </Modal>
  );
}
