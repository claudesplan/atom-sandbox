import { classifyBond } from '../chem/bonding';
import { checkBalance, type Equation } from '../chem/equation';
import { prettyFormula } from '../chem/formula';
import { structureFor, type Structure } from '../chem/structures';
import type { ViewOptions } from '../state/store';
import { badge, drawGrid } from './atomScene';
import { atomColor, atomRadius, C, textOn, withAlpha } from './colors';

/** At most this many copies of one species are drawn. */
export const MAX_DRAWN = 40;

interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface PlacedAtom {
  el: string;
  x: number;
  y: number;
  term: number;
}

export interface TermLayout {
  term: number;
  structure: Structure;
  rect: { x: number; y: number; w: number; h: number };
  copies: { x: number; y: number }[];
  hidden: number;
}

export interface ReactionLayout {
  scale: number;
  terms: TermLayout[];
  plus: { x: number; y: number }[];
  arrow: { x0: number; x1: number; y: number };
  atoms: { left: PlacedAtom[]; right: PlacedAtom[] };
  truncated: boolean;
}

function bbox(s: Structure): Box {
  if (!s.atoms.length) return { minX: -0.3, minY: -0.3, maxX: 0.3, maxY: 0.3 };
  const b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const a of s.atoms) {
    const r = atomRadius(a.el) + (a.charge ? 0.25 : 0.05);
    b.minX = Math.min(b.minX, a.x - r);
    b.maxX = Math.max(b.maxX, a.x + r);
    b.minY = Math.min(b.minY, a.y - r);
    b.maxY = Math.max(b.maxY, a.y + r);
  }
  if (s.groups.length) {
    b.minX -= 0.25;
    b.maxX += 0.45;
    b.minY -= 0.2;
    b.maxY += 0.1;
  }
  return b;
}

const TOP = 70;
const LABEL_H = 40;
const PLUS_W = 30;
const ARROW_GAP = 34;

export function layoutReaction(eq: Equation, coefs: number[], w: number, h: number): ReactionLayout {
  const structs = eq.terms.map((t) => structureFor(t.species));
  const boxes = structs.map(bbox);
  const cell = boxes.map((b) => ({ w: b.maxX - b.minX + 0.55, h: b.maxY - b.minY + 0.45 }));
  const n = eq.terms.map((_, i) => Math.min(MAX_DRAWN, Math.max(0, coefs[i] ?? 1)));
  const sideIdx = (s: 'left' | 'right') => eq.terms.map((t, i) => (t.side === s ? i : -1)).filter((i) => i >= 0);
  const sides = { left: sideIdx('left'), right: sideIdx('right') };
  const pad = 16;
  const sideW = w / 2 - ARROW_GAP - pad;
  const availH = Math.max(40, h - TOP - LABEL_H - 30);

  const fit = (idx: number[], s: number): { cols: number[]; width: number } | null => {
    const cols: number[] = [];
    let width = PLUS_W * Math.max(0, idx.length - 1);
    for (const i of idx) {
      const perCol = Math.floor(availH / (cell[i].h * s));
      if (perCol < 1) return null;
      const c = Math.ceil(n[i] / perCol);
      cols.push(c);
      width += c * cell[i].w * s;
    }
    return width <= sideW ? { cols, width } : null;
  };
  let lo = 3;
  let hi = 70;
  for (let k = 0; k < 30; k++) {
    const mid = (lo + hi) / 2;
    if (fit(sides.left, mid) && fit(sides.right, mid)) lo = mid;
    else hi = mid;
  }
  const s = lo;
  const terms: TermLayout[] = [];
  const plus: ReactionLayout['plus'] = [];
  const atoms: ReactionLayout['atoms'] = { left: [], right: [] };
  const midY = TOP + availH / 2;

  for (const side of ['left', 'right'] as const) {
    const idx = sides[side];
    const f = fit(idx, s) ?? { cols: idx.map(() => 1), width: sideW };
    let x = side === 'left' ? pad + (sideW - f.width) / 2 : w / 2 + ARROW_GAP + (sideW - f.width) / 2;
    idx.forEach((i, k) => {
      const cols = f.cols[k];
      const rows = Math.max(1, Math.ceil(n[i] / cols));
      const gw = cols * cell[i].w * s;
      const gh = rows * cell[i].h * s;
      const y0 = midY - gh / 2;
      const b = boxes[i];
      const copies: TermLayout['copies'] = [];
      for (let c = 0; c < n[i]; c++) {
        const col = Math.floor(c / rows);
        const row = c % rows;
        const ox = x + (col + 0.5) * cell[i].w * s - ((b.minX + b.maxX) / 2) * s;
        const oy = y0 + (row + 0.5) * cell[i].h * s - ((b.minY + b.maxY) / 2) * s;
        copies.push({ x: ox, y: oy });
        for (const a of structs[i].atoms) atoms[side].push({ el: a.el, x: ox + a.x * s, y: oy + a.y * s, term: i });
      }
      terms.push({ term: i, structure: structs[i], rect: { x, y: y0, w: gw, h: gh }, copies, hidden: Math.max(0, (coefs[i] ?? 1) - n[i]) });
      x += gw;
      if (k < idx.length - 1) {
        plus.push({ x: x + PLUS_W / 2, y: midY });
        x += PLUS_W;
      }
    });
  }
  terms.sort((a, b) => a.term - b.term);
  return {
    scale: s,
    terms,
    plus,
    arrow: { x0: w / 2 - ARROW_GAP + 6, x1: w / 2 + ARROW_GAP - 6, y: midY },
    atoms,
    truncated: terms.some((t) => t.hidden > 0),
  };
}

export function hitReaction(L: ReactionLayout, x: number, y: number): number | null {
  for (const t of L.terms) {
    const r = t.rect;
    if (x >= r.x - 6 && x <= r.x + r.w + 6 && y >= r.y - 6 && y <= r.y + r.h + LABEL_H) return t.term;
  }
  return null;
}

function drawAtom(ctx: CanvasRenderingContext2D, el: string, x: number, y: number, s: number, alpha = 1, charge?: number) {
  const r = atomRadius(el) * s;
  const col = atomColor(el);
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, withAlpha('#ffffff', 0.5 * alpha));
  g.addColorStop(0.4, withAlpha(col, alpha));
  g.addColorStop(1, withAlpha(col, 0.8 * alpha));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(0,0,0,${0.4 * alpha})`;
  ctx.lineWidth = 1;
  ctx.stroke();
  if (r >= 6.5) {
    ctx.fillStyle = withAlpha(textOn(col) === '#111418' ? '#111418' : '#f0f3f6', alpha);
    ctx.font = `600 ${Math.max(8, Math.min(16, r * 0.95))}px ui-sans-serif, system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(el, x, y + 0.5);
  }
  if (charge) chargeLabel(ctx, charge, x + r * 0.8, y - r * 0.8, s, alpha);
}

function chargeLabel(ctx: CanvasRenderingContext2D, q: number, x: number, y: number, s: number, alpha = 1) {
  const txt = `${Math.abs(q) === 1 ? '' : Math.abs(q)}${q > 0 ? '+' : '−'}`;
  ctx.font = `600 ${Math.max(9, Math.min(14, s * 0.32))}px ui-sans-serif, system-ui`;
  ctx.fillStyle = withAlpha(q > 0 ? '#ff8a8a' : '#8cc8ff', alpha);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(txt, x, y);
}

function drawStructure(ctx: CanvasRenderingContext2D, st: Structure, ox: number, oy: number, s: number, alpha = 1, bondTypes = false) {
  if (st.kind === 'electron') {
    ctx.fillStyle = withAlpha(C.electron, 0.2 * alpha);
    ctx.beginPath();
    ctx.arc(ox, oy, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = withAlpha(C.electron, alpha);
    ctx.beginPath();
    ctx.arc(ox, oy, Math.max(3, s * 0.1), 0, Math.PI * 2);
    ctx.fill();
    chargeLabel(ctx, -1, ox + s * 0.12, oy - s * 0.15, s, alpha);
    return;
  }
  for (const b of st.bonds) {
    const a1 = st.atoms[b.a];
    const a2 = st.atoms[b.b];
    const x1 = ox + a1.x * s;
    const y1 = oy + a1.y * s;
    const x2 = ox + a2.x * s;
    const y2 = oy + a2.y * s;
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    const cls = bondTypes && !b.ionic ? classifyBond(a1.el, a2.el) : null;
    const polar = cls != null && cls.type !== 'nonpolar-covalent';
    ctx.strokeStyle = b.ionic ? withAlpha('#c9a0ff', (bondTypes ? 0.9 : 0.55) * alpha) : polar ? withAlpha('#f0a33a', 0.95 * alpha) : withAlpha('#c9d1d9', 0.85 * alpha);
    ctx.lineWidth = Math.max(1.2, s * 0.06);
    ctx.setLineDash(b.ionic ? [3, 3] : []);
    const gap = Math.max(2.5, s * 0.1);
    const offsets = b.order === 1 ? [0] : b.order === 2 ? [-gap / 2, gap / 2] : [-gap, 0, gap];
    for (const o of offsets) {
      ctx.beginPath();
      ctx.moveTo(x1 + nx * o, y1 + ny * o);
      ctx.lineTo(x2 + nx * o, y2 + ny * o);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  for (const a of st.atoms) drawAtom(ctx, a.el, ox + a.x * s, oy + a.y * s, s, alpha, a.charge);
  if (bondTypes) {
    // partial charges: net direction of the polar bonds each atom takes part in
    const net = st.atoms.map(() => 0);
    for (const b of st.bonds) {
      if (b.ionic) continue;
      const x = st.atoms[b.a].el;
      const y = st.atoms[b.b].el;
      const c = classifyBond(x, y);
      if (c.type === 'nonpolar-covalent' || !c.negative) continue;
      const negIdx = c.negative === x ? b.a : b.b;
      const posIdx = negIdx === b.a ? b.b : b.a;
      net[negIdx] -= 1;
      net[posIdx] += 1;
    }
    st.atoms.forEach((a, i) => {
      if (!net[i] || a.charge) return;
      const r = atomRadius(a.el) * s;
      ctx.font = `600 ${Math.max(9, Math.min(13, s * 0.3))}px ui-sans-serif, system-ui`;
      ctx.fillStyle = withAlpha(net[i] < 0 ? '#8cc8ff' : '#ff8a8a', alpha);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(net[i] < 0 ? 'δ−' : 'δ+', ox + a.x * s - r * 0.7, oy + a.y * s - r * 0.95);
    });
  }
  for (const g of st.groups) {
    const xs = g.atoms.map((i) => st.atoms[i]);
    const r = Math.max(...xs.map((a) => atomRadius(a.el)));
    const x0 = ox + (Math.min(...xs.map((a) => a.x)) - r - 0.12) * s;
    const x1 = ox + (Math.max(...xs.map((a) => a.x)) + r + 0.12) * s;
    const y0 = oy + (Math.min(...xs.map((a) => a.y)) - r - 0.1) * s;
    const y1 = oy + (Math.max(...xs.map((a) => a.y)) + r + 0.1) * s;
    const tick = Math.max(3, s * 0.12);
    ctx.strokeStyle = withAlpha('#c9d1d9', 0.6 * alpha);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0 + tick, y0);
    ctx.lineTo(x0, y0);
    ctx.lineTo(x0, y1);
    ctx.lineTo(x0 + tick, y1);
    ctx.moveTo(x1 - tick, y0);
    ctx.lineTo(x1, y0);
    ctx.lineTo(x1, y1);
    ctx.lineTo(x1 - tick, y1);
    ctx.stroke();
    chargeLabel(ctx, g.charge, x1 + 2, y0 + 2, s, alpha);
  }
}

function arrow(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, reversible: boolean) {
  ctx.strokeStyle = C.text;
  ctx.fillStyle = C.text;
  ctx.lineWidth = 2;
  if (reversible) {
    ctx.beginPath();
    ctx.moveTo(x0, y - 4);
    ctx.lineTo(x1, y - 4);
    ctx.lineTo(x1 - 8, y - 10);
    ctx.moveTo(x1, y + 4);
    ctx.lineTo(x0, y + 4);
    ctx.lineTo(x0 + 8, y + 10);
    ctx.stroke();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x0, y);
  ctx.lineTo(x1 - 8, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x1 - 10, y - 6);
  ctx.lineTo(x1 - 10, y + 6);
  ctx.closePath();
  ctx.fill();
}

export interface ReactionAnim {
  start: number;
}

const ANIM_MS = 2600;

function matchAtoms(L: ReactionLayout) {
  const pairs: { el: string; from: PlacedAtom; to: PlacedAtom }[] = [];
  const lost: PlacedAtom[] = [];
  const created: PlacedAtom[] = [];
  const els = new Set([...L.atoms.left, ...L.atoms.right].map((a) => a.el));
  for (const el of els) {
    const order = (a: PlacedAtom, b: PlacedAtom) => a.y - b.y || a.x - b.x;
    const l = L.atoms.left.filter((a) => a.el === el).sort(order);
    const r = L.atoms.right.filter((a) => a.el === el).sort(order);
    const k = Math.min(l.length, r.length);
    for (let i = 0; i < k; i++) pairs.push({ el, from: l[i], to: r[i] });
    lost.push(...l.slice(k));
    created.push(...r.slice(k));
  }
  return { pairs, lost, created };
}

/** Returns false when the animation has finished. */
function drawAnimation(ctx: CanvasRenderingContext2D, L: ReactionLayout, anim: ReactionAnim, now: number): boolean {
  const u = (now - anim.start) / ANIM_MS;
  if (u >= 1) return false;
  const { pairs, lost, created } = matchAtoms(L);
  const s = L.scale;
  const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const leftFade = 1 - ease(u / 0.2);
  const move = ease((u - 0.2) / 0.55);
  const rightIn = ease((u - 0.75) / 0.2);
  for (const t of L.terms) {
    const side = t.structure;
    const isLeft = L.atoms.left.some((a) => a.term === t.term);
    const alpha = isLeft ? leftFade * 0.6 : rightIn;
    if (alpha > 0.01) for (const c of t.copies) drawStructure(ctx, { ...side, atoms: side.atoms.map((a) => ({ ...a, charge: undefined })), groups: [] }, c.x, c.y, s, alpha);
  }
  for (const p of pairs) {
    const x = p.from.x + (p.to.x - p.from.x) * move;
    const y = p.from.y + (p.to.y - p.from.y) * move - Math.sin(Math.PI * move) * 28;
    drawAtom(ctx, p.el, x, y, s, 1);
  }
  const ghost = 0.5 + 0.5 * Math.sin(now / 90);
  for (const a of lost) {
    drawAtom(ctx, a.el, a.x, a.y, s, Math.max(0, 1 - move));
    if (move > 0.2) mark(ctx, a.x, a.y - atomRadius(a.el) * s - 8, '✘ vanished?', ghost);
  }
  for (const a of created) {
    drawAtom(ctx, a.el, a.x, a.y, s, move * 0.8);
    if (move > 0.2) mark(ctx, a.x, a.y - atomRadius(a.el) * s - 8, '✘ from nowhere?', ghost);
  }
  return true;
}

function mark(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, a: number) {
  ctx.fillStyle = withAlpha(C.bad, 0.5 + 0.5 * a);
  ctx.font = '600 11px ui-sans-serif, system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(text, x, y);
}

export function drawReactionScene(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  now: number,
  eq: Equation | null,
  error: string | null,
  coefs: number[],
  view: ViewOptions,
  hover: number | null,
  anim: ReactionAnim | null,
): { layout: ReactionLayout | null; animating: boolean } {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, w, h);
  if (!eq) {
    ctx.fillStyle = C.bad;
    ctx.font = '14px ui-sans-serif, system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(error ?? 'No equation', w / 2, h / 2);
    ctx.fillStyle = C.dim;
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.fillText('Pick a reaction on the left, or type one such as  CH4 + O2 -> CO2 + H2O', w / 2, h / 2 + 24);
    return { layout: null, animating: false };
  }
  const L = layoutReaction(eq, coefs, w, h);
  const s = L.scale;

  ctx.font = '600 10px ui-sans-serif, system-ui';
  ctx.fillStyle = C.dim;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('REACTANTS  (what you start with)', w / 4, 44);
  ctx.fillText('PRODUCTS  (what you end up with)', (3 * w) / 4, 44);

  arrow(ctx, L.arrow.x0, L.arrow.x1, L.arrow.y, eq.reversible);
  ctx.fillStyle = C.text;
  ctx.font = '22px ui-sans-serif, system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const p of L.plus) ctx.fillText('+', p.x, p.y);

  const animating = !!anim && drawAnimation(ctx, L, anim, now);
  for (const t of L.terms) {
    const r = t.rect;
    if (!animating) {
      if (hover === t.term) {
        ctx.fillStyle = 'rgba(61,157,243,0.08)';
        ctx.strokeStyle = 'rgba(61,157,243,0.6)';
        ctx.lineWidth = 1;
        ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
        ctx.strokeRect(r.x - 3.5, r.y - 3.5, r.w + 7, r.h + 7);
      }
      for (const c of t.copies) drawStructure(ctx, t.structure, c.x, c.y, s, 1, view.bondTypes);
    }
    // label: coefficient + formula
    const sp = eq.terms[t.term].species;
    const coef = coefs[t.term] ?? 1;
    const ly = Math.max(r.y + r.h + 8, L.arrow.y + 8);
    const cxl = r.x + r.w / 2;
    if (view.formulas) {
      ctx.textBaseline = 'top';
      ctx.font = '600 15px ui-sans-serif, system-ui';
      const ft = prettyFormula(sp);
      const coefTxt = String(coef);
      const cw = ctx.measureText(coefTxt).width;
      const fw = ctx.measureText(ft).width;
      const x0 = cxl - (cw + 4 + fw) / 2;
      ctx.textAlign = 'left';
      ctx.fillStyle = C.accent;
      ctx.fillText(coefTxt, x0, ly + Math.min(0, 0));
      ctx.fillStyle = '#e6edf3';
      ctx.fillText(ft, x0 + cw + 4, ly);
      ctx.font = '10.5px ui-sans-serif, system-ui';
      ctx.fillStyle = C.faint;
      ctx.textAlign = 'center';
      ctx.fillText(t.hidden ? `${MAX_DRAWN} drawn, ${t.hidden} more not shown` : coef === 1 ? '1 unit' : `${coef} units`, cxl, ly + 20);
    }
  }

  const chk = checkBalance(eq, coefs);
  const off = chk.elements.filter((e) => e.left !== e.right).map((e) => e.symbol);
  if (chk.balanced) badge(ctx, chk.lowestTerms ? 'BALANCED ✔' : 'BALANCED ✔ · can be simplified', w - 10, 10, C.ok);
  else badge(ctx, `NOT BALANCED · ${off.length ? off.join(' ') : 'charge'}`, w - 10, 10, C.warn);
  badge(ctx, 'FLAT 2D DRAWINGS ≈', 10, 10, C.dim, false);

  const kinds = new Set(L.terms.map((t) => t.structure.kind));
  const notes: string[] = [];
  if (kinds.has('ionic')) notes.push('Ionic solids are drawn as one formula unit (really a giant lattice) ≈');
  if (kinds.has('metal')) notes.push('Metals are drawn as single atoms ≈');
  if (kinds.has('unknown')) notes.push('Unknown structures are drawn as loose groups of atoms');
  if (view.bondTypes) notes.push('Bonds: grey non-polar · orange polar covalent · dotted purple ionic');
  ctx.fillStyle = C.faint;
  ctx.font = '10.5px ui-sans-serif, system-ui';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(
    [`Click a group to add one more (right-click or Shift+click: one fewer)`, ...notes].join('  ·  '),
    12,
    h - 10,
  );
  return { layout: L, animating };
}
