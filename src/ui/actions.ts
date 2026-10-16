import { describeAtom } from '../chem/atom';
import { daughter, DECAY_LABEL, type DecayMode } from '../chem/nuclides';
import { fxList, type AtomLayout, type Fx, type ParticleKind } from '../render/atomScene';
import { useStore } from '../state/store';

/** Latest atom layout drawn by the viewport (canvas coordinates), for animations. */
export const viewportInfo: { layout: AtomLayout | null; w: number; h: number } = { layout: null, w: 800, h: 500 };

const KEY: Record<ParticleKind, 'protons' | 'neutrons' | 'electrons'> = { p: 'protons', n: 'neutrons', e: 'electrons' };

function spawn(f: Omit<Fx, 'start'>) {
  if (!useStore.getState().view.animate) return;
  fxList.push({ ...f, start: performance.now() });
}

function edgePoint(): { x: number; y: number } {
  const { w, h } = viewportInfo;
  const a = Math.random() * Math.PI * 2;
  const r = Math.hypot(w, h) / 2;
  return { x: w / 2 + r * Math.cos(a), y: h / 2 + r * Math.sin(a) };
}

export function addParticle(kind: ParticleKind, from?: { x: number; y: number }): void {
  const st = useStore.getState();
  const before = st.doc.atom[KEY[kind]];
  st.setAtom((a) => ({ ...a, [KEY[kind]]: a[KEY[kind]] + 1 }));
  if (useStore.getState().doc.atom[KEY[kind]] === before) return;
  const L = viewportInfo.layout;
  const src = from ?? edgePoint();
  const cx = L?.cx ?? viewportInfo.w / 2;
  const cy = L?.cy ?? viewportInfo.h / 2;
  let to = { x: cx, y: cy };
  if (kind === 'e') {
    const r = L?.shellR.length ? L.shellR[L.shellR.length - 1] : (L?.nucleusR ?? 0) + 40;
    const a = Math.atan2(src.y - cy, src.x - cx);
    to = { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  }
  spawn({ kind, x0: src.x, y0: src.y, x1: to.x, y1: to.y, dur: 380 });
}

export function removeParticle(kind: ParticleKind, at?: { x: number; y: number }): void {
  const st = useStore.getState();
  if (st.doc.atom[KEY[kind]] <= 0) return;
  st.setAtom((a) => ({ ...a, [KEY[kind]]: a[KEY[kind]] - 1 }));
  const L = viewportInfo.layout;
  const src = at ?? { x: L?.cx ?? viewportInfo.w / 2, y: L?.cy ?? viewportInfo.h / 2 };
  const out = edgePoint();
  spawn({ kind, x0: src.x, y0: src.y, x1: out.x, y1: out.y, dur: 500 });
}

const EMITTED: Partial<Record<DecayMode, { kind: Fx['kind']; label: string; count: number }>> = {
  'β-': { kind: 'e', label: 'β⁻ electron (+ antineutrino)', count: 1 },
  'β+': { kind: 'positron', label: 'β⁺ positron (+ neutrino)', count: 1 },
  α: { kind: 'alpha', label: 'α particle', count: 1 },
  '2α': { kind: 'alpha', label: 'α particle', count: 1 },
  n: { kind: 'n', label: 'neutron', count: 1 },
  '2n': { kind: 'n', label: 'neutrons', count: 2 },
  p: { kind: 'p', label: 'proton', count: 1 },
  '2p': { kind: 'p', label: 'protons', count: 2 },
  '2β-': { kind: 'e', label: 'two β⁻ electrons', count: 2 },
};

/** Apply one decay of the given mode to the current atom. */
export function decay(mode: DecayMode): void {
  const st = useStore.getState();
  const { protons: Z, neutrons: N, electrons: e } = st.doc.atom;
  const d = daughter(Z, N, mode);
  if (!d || d.Z < 0 || d.N < 0) return;
  const before = describeAtom(st.doc.atom);
  const captured = mode === 'EC' ? 1 : mode === '2EC' ? 2 : 0;
  st.setAtom(() => ({ protons: d.Z, neutrons: d.N, electrons: Math.max(0, e - captured) }));
  const after = describeAtom(useStore.getState().doc.atom);
  const L = viewportInfo.layout;
  const cx = L?.cx ?? viewportInfo.w / 2;
  const cy = L?.cy ?? viewportInfo.h / 2;
  const em = EMITTED[mode];
  if (em) {
    for (let i = 0; i < em.count; i++) {
      const out = edgePoint();
      spawn({ kind: em.kind, x0: cx, y0: cy, x1: out.x, y1: out.y, dur: 1600, label: i === 0 ? em.label : undefined });
    }
  }
  if (captured && L?.shellR.length) {
    for (let i = 0; i < captured; i++) spawn({ kind: 'e', x0: cx + L.shellR[0], y0: cy, x1: cx, y1: cy, dur: 700 });
  }
  let msg = `${before.isotopeName} → ${after.isotopeName} by ${DECAY_LABEL[mode]}.`;
  if (after.charge !== 0 && after.element) msg += ` The atom is left as a ${after.ionSymbol} ion until it gains or loses electrons.`;
  st.notify(msg);
}
