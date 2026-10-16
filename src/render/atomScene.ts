import type { AtomDescription } from '../chem/atom';
import type { ViewOptions } from '../state/store';
import { C, withAlpha } from './colors';

export type ParticleKind = 'p' | 'n' | 'e';

export interface AtomLayout {
  cx: number;
  cy: number;
  rp: number;
  nucleusR: number;
  particles: { kind: 'p' | 'n'; x: number; y: number; index: number }[];
  shellR: number[];
  electrons: { x: number; y: number; shell: number; index: number }[];
}

/** Transient animations: particles flying in or out. Canvas coordinates. */
export interface Fx {
  kind: ParticleKind | 'alpha' | 'positron';
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  start: number;
  dur: number;
  label?: string;
}

export const fxList: Fx[] = [];

const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Fixed pseudo-random score per slot, so protons and neutrons look well mixed (no spiral pattern). */
function slotScore(k: number): number {
  const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Which of the A slots hold protons: the Z slots with the lowest scores. */
function protonSlots(Z: number, A: number): boolean[] {
  const idx = Array.from({ length: A }, (_, k) => k).sort((a, b) => slotScore(a) - slotScore(b));
  const out = new Array<boolean>(A).fill(false);
  for (let i = 0; i < Z; i++) out[idx[i]] = true;
  return out;
}

export function layoutAtom(d: AtomDescription, w: number, h: number, t: number, view: ViewOptions): AtomLayout {
  const cx = w / 2;
  const cy = h / 2 + 10;
  const A = d.Z + d.N;
  const shells = d.Z > 0 ? d.shells : d.state.electrons > 0 ? [d.state.electrons] : [];
  const S = Math.max(1, shells.length);
  const Rmax = Math.max(60, Math.min(w, h) / 2 - 34);
  const rp = Math.max(2.4, Math.min(12, (0.3 * Rmax) / Math.sqrt(Math.max(A, 1)) / 1.05));
  const c = rp * 1.02;
  const nucleusR = A ? c * Math.sqrt(A) + rp : 0;
  const particles: AtomLayout['particles'] = [];
  let pi = 0;
  let ni = 0;
  const isP = protonSlots(d.Z, A);
  for (let k = 0; k < A; k++) {
    const r = c * Math.sqrt(k + 0.5);
    const th = k * GOLDEN;
    const jig = view.animate ? 0.35 * rp * Math.sin(t * 7 + k * 1.7) : 0;
    const kind = isP[k] ? 'p' : 'n';
    particles.push({ kind, x: cx + (r + jig) * Math.cos(th), y: cy + (r + jig) * Math.sin(th), index: kind === 'p' ? pi++ : ni++ });
  }
  const r1 = nucleusR + Math.max(22, rp * 3);
  const step = Math.min(85, Math.max(16, (Rmax - r1) / Math.max(1, S - 0.4)));
  const shellR = shells.map((_, i) => r1 + i * step);
  const electrons: AtomLayout['electrons'] = [];
  let ei = 0;
  shells.forEach((count, i) => {
    const omega = view.animate ? 0.5 / (i + 1) : 0;
    const off = i * 0.7 + t * omega;
    for (let j = 0; j < count; j++) {
      const th = (2 * Math.PI * j) / count + off;
      electrons.push({ x: cx + shellR[i] * Math.cos(th), y: cy + shellR[i] * Math.sin(th), shell: i, index: ei++ });
    }
  });
  return { cx, cy, rp, nucleusR, particles, shellR, electrons };
}

export function hitAtom(L: AtomLayout, x: number, y: number): { kind: ParticleKind } | null {
  for (const e of L.electrons) if (Math.hypot(e.x - x, e.y - y) < 9) return { kind: 'e' };
  // nucleus: pick the particle drawn on top (inner ones are drawn last)
  for (let i = 0; i < L.particles.length; i++) {
    const p = L.particles[i];
    if (Math.hypot(p.x - x, p.y - y) < Math.max(L.rp, 4)) return { kind: p.kind };
  }
  return null;
}

function ball(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, withAlpha('#ffffff', 0.55 * alpha));
  g.addColorStop(0.35, withAlpha(color, alpha));
  g.addColorStop(1, withAlpha(color, 0.75 * alpha));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(0,0,0,${0.35 * alpha})`;
  ctx.lineWidth = 0.8;
  ctx.stroke();
}

function electronDot(ctx: CanvasRenderingContext2D, x: number, y: number, r = 4.2, alpha = 1) {
  ctx.fillStyle = withAlpha(C.electron, 0.18 * alpha);
  ctx.beginPath();
  ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
  ctx.fill();
  ball(ctx, x, y, r, C.electron, alpha);
}

/** Seeded PRNG so the electron cloud is stable from frame to frame. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.lineWidth = 1;
  for (let x = 0, i = 0; x < w; x += 24, i++) {
    ctx.strokeStyle = i % 5 === 0 ? C.gridMajor : C.grid;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
    ctx.stroke();
  }
  for (let y = 0, i = 0; y < h; y += 24, i++) {
    ctx.strokeStyle = i % 5 === 0 ? C.gridMajor : C.grid;
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
    ctx.stroke();
  }
}

export function badge(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, alignRight = true) {
  ctx.font = '600 10px ui-monospace, Menlo, monospace';
  const tw = ctx.measureText(text).width;
  const bx = alignRight ? x - tw - 12 : x;
  ctx.fillStyle = 'rgba(15,18,21,0.85)';
  ctx.fillRect(bx, y, tw + 12, 18);
  ctx.strokeStyle = withAlpha(color, 0.6);
  ctx.strokeRect(bx + 0.5, y + 0.5, tw + 11, 17);
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, bx + 6, y + 9.5);
}

export function drawAtomScene(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, now: number, d: AtomDescription, view: ViewOptions, hover: ParticleKind | null): AtomLayout {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, w, h);
  const L = layoutAtom(d, w, h, t, view);
  const { cx, cy } = L;
  const empty = d.Z + d.N + d.state.electrons === 0;

  // shells or cloud
  if (view.cloud) {
    L.shellR.forEach((r, i) => {
      const count = L.electrons.filter((e) => e.shell === i).length;
      const rand = rng(1000 + i * 77);
      const dots = Math.min(900, 70 * count);
      const spin = view.animate ? t * 0.05 : 0;
      for (let k = 0; k < dots; k++) {
        // radial spread ~ a broad hump around the shell radius (impressionistic, ≈)
        const u = (rand() + rand() + rand()) / 3;
        const rr = r * (0.45 + 1.1 * u);
        const th = rand() * Math.PI * 2 + spin * (i % 2 ? 1 : -1);
        ctx.fillStyle = withAlpha(C.electron, 0.32);
        ctx.fillRect(cx + rr * Math.cos(th), cy + rr * Math.sin(th), 1.8, 1.8);
      }
    });
  } else {
    ctx.lineWidth = 1;
    L.shellR.forEach((r, i) => {
      ctx.strokeStyle = C.shell;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      if (view.labels) {
        const count = L.electrons.filter((e) => e.shell === i).length;
        ctx.fillStyle = C.dim;
        ctx.font = '10px ui-monospace, Menlo, monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const a = -Math.PI / 4 + (i % 2 ? 0.22 : 0) - Math.min(0.5, i * 0.06);
        ctx.fillText(d.Z > 0 ? `n=${i + 1} · ${count}e⁻` : `${count}e⁻ (free)`, cx + r * Math.cos(a) + 6, cy + r * Math.sin(a) - 6);
      }
    });
  }

  // nucleus glow by stability
  const st = d.nucleus.status;
  if (L.nucleusR > 0) {
    const pulse = view.animate ? 0.5 + 0.5 * Math.sin(t * (st === 'unbound' ? 14 : 4)) : 0.6;
    const col = st === 'stable' ? C.ok : st === 'unbound' || st === 'neutrons' ? C.bad : C.warn;
    const glowA = st === 'stable' ? 0.1 : 0.12 + 0.18 * pulse;
    const g = ctx.createRadialGradient(cx, cy, L.nucleusR * 0.6, cx, cy, L.nucleusR + 18);
    g.addColorStop(0, withAlpha(col, glowA));
    g.addColorStop(1, withAlpha(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, L.nucleusR + 18, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = L.particles.length - 1; i >= 0; i--) {
    const p = L.particles[i];
    const hl = hover === p.kind;
    ball(ctx, p.x, p.y, L.rp, p.kind === 'p' ? C.proton : C.neutron, hl ? 0.6 : 1);
    if (L.rp >= 7 && view.labels) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `600 ${Math.round(L.rp * 1.05)}px ui-sans-serif, system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.kind === 'p' ? '+' : '', p.x, p.y + 0.5);
    }
  }
  if (!view.cloud) for (const e of L.electrons) electronDot(ctx, e.x, e.y, 4.2, hover === 'e' ? 0.55 : 1);

  if (view.labels && L.nucleusR > 0) {
    ctx.fillStyle = C.dim;
    ctx.font = '10.5px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${d.Z} p⁺ · ${d.N} n⁰`, cx, cy + L.nucleusR + 4);
  }

  // flying particles
  for (let i = fxList.length - 1; i >= 0; i--) {
    const f = fxList[i];
    const u = (now - f.start) / f.dur;
    if (u >= 1) {
      fxList.splice(i, 1);
      continue;
    }
    const e = 1 - (1 - u) ** 3;
    const x = f.x0 + (f.x1 - f.x0) * e;
    const y = f.y0 + (f.y1 - f.y0) * e;
    const fade = f.label ? Math.min(1, 3 * (1 - u)) : 1;
    if (f.kind === 'p') ball(ctx, x, y, Math.max(L.rp, 5), C.proton, fade);
    else if (f.kind === 'n') ball(ctx, x, y, Math.max(L.rp, 5), C.neutron, fade);
    else if (f.kind === 'e') electronDot(ctx, x, y, 4.2, fade);
    else if (f.kind === 'positron') {
      electronDot(ctx, x, y, 4.2, fade);
      ctx.strokeStyle = withAlpha('#ffffff', fade);
      ctx.beginPath();
      ctx.moveTo(x - 2.5, y);
      ctx.lineTo(x + 2.5, y);
      ctx.moveTo(x, y - 2.5);
      ctx.lineTo(x, y + 2.5);
      ctx.stroke();
    } else if (f.kind === 'alpha') {
      const r = Math.max(L.rp, 5);
      ball(ctx, x - r * 0.5, y - r * 0.5, r, C.proton, fade);
      ball(ctx, x + r * 0.5, y - r * 0.5, r, C.neutron, fade);
      ball(ctx, x - r * 0.5, y + r * 0.5, r, C.neutron, fade);
      ball(ctx, x + r * 0.5, y + r * 0.5, r, C.proton, fade);
    }
    if (f.label) {
      ctx.fillStyle = withAlpha(C.warn, fade);
      ctx.font = '11px ui-sans-serif, system-ui';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(f.label, x + 12, y);
    }
  }

  // ---- overlays ----
  if (d.element) {
    const el = d.element;
    const x = 16;
    const y = 18;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.font = '600 13px ui-monospace, Menlo, monospace';
    const aW = ctx.measureText(String(d.A)).width;
    const zW = ctx.measureText(String(d.Z)).width;
    const pad = Math.max(aW, zW);
    ctx.fillStyle = C.text;
    ctx.textAlign = 'right';
    ctx.fillText(String(d.A), x + pad, y + 14);
    ctx.fillText(String(d.Z), x + pad, y + 48);
    ctx.textAlign = 'left';
    ctx.font = '600 40px ui-sans-serif, system-ui';
    ctx.fillStyle = '#e6edf3';
    ctx.fillText(el.symbol, x + pad + 3, y + 42);
    const sw = ctx.measureText(el.symbol).width;
    if (d.charge) {
      ctx.font = '600 17px ui-sans-serif, system-ui';
      ctx.fillStyle = d.charge > 0 ? C.proton : C.electron;
      const q = Math.abs(d.charge);
      ctx.fillText(`${q === 1 ? '' : q}${d.charge > 0 ? '+' : '−'}`, x + pad + 5 + sw, y + 16);
    }
    ctx.font = '13px ui-sans-serif, system-ui';
    ctx.fillStyle = C.text;
    ctx.fillText(`${el.name} · ${d.isotopeName}`, x, y + 70);
    ctx.fillStyle = C.dim;
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.fillText(d.kindName, x, y + 88);
  }

  badge(ctx, view.cloud ? 'ELECTRON CLOUD · impression only ≈' : 'BOHR MODEL · teaching picture ≈', w - 10, 10, C.warn);
  const stText = st === 'stable' ? 'NUCLEUS STABLE' : st === 'radioactive' ? `NUCLEUS RADIOACTIVE${d.nucleus.estimate ? ' ≈' : ''}` : st === 'unbound' ? `NUCLEUS UNBOUND${d.nucleus.estimate ? ' ≈' : ''}` : st === 'neutron' ? 'FREE NEUTRON' : st === 'neutrons' ? 'NOT BOUND' : '';
  if (stText) badge(ctx, stText, w - 10, 34, st === 'stable' ? C.ok : st === 'radioactive' || st === 'neutron' ? C.warn : C.bad);

  if (empty) {
    ctx.fillStyle = C.dim;
    ctx.font = '14px ui-sans-serif, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Click to add protons, neutrons and electrons (keys P, N, E)', cx, cy - 10);
    ctx.fillText('or pick an element on the periodic table below', cx, cy + 12);
  } else if (L.nucleusR > 0 && d.Z > 0) {
    // scale note: nucleus radius ≈ 1.2 fm · A^(1/3), atom radius ~ 1e-10 m
    const nucM = 1.2e-15 * Math.cbrt(d.A);
    const atomPx = (1e-10 / nucM) * L.nucleusR * 2;
    const metres = atomPx * 0.00026; // ≈ 0.26 mm per CSS pixel
    ctx.fillStyle = C.faint;
    ctx.font = '10.5px ui-sans-serif, system-ui';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(
      `Not to scale ≈ — with the nucleus this size, the real atom would be about ${metres >= 1000 ? `${(metres / 1000).toPrecision(2)} km` : `${Math.round(metres)} m`} across.`,
      12,
      h - 10,
    );
  }
  return L;
}
