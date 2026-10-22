/**
 * Bonds view: dot-and-cross diagrams (covalent), electron transfer (ionic) and the electron "sea" (metallic).
 * These are the standard classroom pictures: outer shells only, drawn flat ≈.
 */
import { chargeSymbol } from '../chem/atom';
import { BOND_LABEL, classifyBond, isMetal, outerElectrons, pairCompound, type Compound } from '../chem/bonding';
import { elementBySymbol } from '../chem/elements';
import type { ViewOptions } from '../state/store';
import { badge, drawGrid } from './atomScene';
import { atomColor, C, withAlpha } from './colors';

const DOT = '#4fb3ff';
const CROSS = '#f0a33a';

type Mark = 'dot' | 'cross';

function electron(ctx: CanvasRenderingContext2D, x: number, y: number, mark: Mark, s: number, alpha = 1) {
  if (mark === 'dot') {
    ctx.fillStyle = withAlpha(DOT, alpha);
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = withAlpha(CROSS, alpha);
    ctx.lineWidth = Math.max(1.6, s * 0.55);
    ctx.beginPath();
    ctx.moveTo(x - s, y - s);
    ctx.lineTo(x + s, y + s);
    ctx.moveTo(x + s, y - s);
    ctx.lineTo(x - s, y + s);
    ctx.stroke();
  }
}

function shell(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, symbol: string, alpha = 1, dashed = false) {
  ctx.fillStyle = withAlpha(atomColor(symbol), 0.1 * alpha);
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = withAlpha('#c9d1d9', 0.55 * alpha);
  ctx.lineWidth = 1.3;
  ctx.setLineDash(dashed ? [4, 4] : []);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = withAlpha('#e6edf3', alpha);
  ctx.font = `600 ${Math.round(R * 0.42)}px ui-sans-serif, system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(symbol, x, y);
}

/** Positions for `n` electrons around a circle, in pairs, centred on `around` (radians), avoiding nothing. */
function ringSlots(n: number, around: number, spread: number): number[] {
  // pairs first (octet picture): put electrons in pairs at evenly spaced angles
  const pairs = Math.ceil(n / 2);
  const out: number[] = [];
  for (let p = 0; p < pairs; p++) {
    const a = pairs === 1 ? around : around - spread / 2 + (spread * p) / (pairs - 1);
    out.push(a - 0.13);
    if (out.length < n) out.push(a + 0.13);
  }
  return out.slice(0, n);
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, size = 12, align: CanvasTextAlign = 'center', weight = '') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ui-sans-serif, system-ui`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function bracket(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, charge: number, alpha: number) {
  const h = R * 1.2;
  const w = R * 1.2;
  ctx.strokeStyle = withAlpha('#c9d1d9', 0.7 * alpha);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - w + 8, y - h);
  ctx.lineTo(x - w, y - h);
  ctx.lineTo(x - w, y + h);
  ctx.lineTo(x - w + 8, y + h);
  ctx.moveTo(x + w - 8, y - h);
  ctx.lineTo(x + w, y - h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w - 8, y + h);
  ctx.stroke();
  text(ctx, chargeSymbol(charge), x + w + 4, y - h + 4, charge > 0 ? '#ff8a8a' : '#8cc8ff', Math.max(13, R * 0.32), 'left', '600');
}

// ---------- covalent ----------

function drawCovalent(ctx: CanvasRenderingContext2D, w: number, h: number, c: Extract<Compound, { kind: 'molecule' }>, pairA: string, R: number) {
  const cx = w / 2;
  const cy = h / 2 + 10;
  const d = R * 1.56;
  const ec = elementBySymbol(c.central)!;
  const centralMark: Mark = c.central === pairA ? 'dot' : 'cross';
  const termMark: Mark = centralMark === 'dot' ? 'cross' : 'dot';
  const es = Math.max(3, R * 0.075);
  if (!c.terminal) {
    // diatomic X2: left atom dots, right atom crosses
    const xL = cx - d / 2;
    const xR = cx + d / 2;
    shell(ctx, xL, cy, R, c.central);
    shell(ctx, xR, cy, R, c.central);
    for (let j = 0; j < c.order; j++) {
      const off = (j - (c.order - 1) / 2) * R * 0.34;
      electron(ctx, cx - R * 0.09, cy + off, 'dot', es);
      electron(ctx, cx + R * 0.09, cy + off, 'cross', es);
    }
    const lone = outerElectrons(ec) - c.order;
    ringSlots(lone, Math.PI, Math.PI * 1.1).forEach((a) => electron(ctx, xL + R * Math.cos(a), cy + R * Math.sin(a), 'dot', es));
    ringSlots(lone, 0, Math.PI * 1.1).forEach((a) => electron(ctx, xR + R * Math.cos(a), cy + R * Math.sin(a), 'cross', es));
    return;
  }
  const et = elementBySymbol(c.terminal)!;
  const angles = c.terminals === 1 ? [0] : c.terminals === 2 ? [Math.PI, 0] : c.terminals === 3 ? [Math.PI, 0, -Math.PI / 2] : [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const Rt = c.terminal === 'H' ? R * 0.78 : R;
  const dd = R + Rt - R * 0.44;
  for (const a of angles) shell(ctx, cx + dd * Math.cos(a), cy + dd * Math.sin(a), Rt, c.terminal);
  shell(ctx, cx, cy, R, c.central);
  for (const a of angles) {
    const tx = cx + dd * Math.cos(a);
    const ty = cy + dd * Math.sin(a);
    // shared pairs in the overlap, spread perpendicular to the bond
    const mx = cx + (R - (R + Rt - dd) / 2) * Math.cos(a);
    const my = cy + (R - (R + Rt - dd) / 2) * Math.sin(a);
    const px = -Math.sin(a);
    const py = Math.cos(a);
    for (let j = 0; j < c.order; j++) {
      const off = (j - (c.order - 1) / 2) * R * 0.3;
      electron(ctx, mx + px * off - Math.cos(a) * R * 0.08, my + py * off - Math.sin(a) * R * 0.08, centralMark, es);
      electron(ctx, mx + px * off + Math.cos(a) * R * 0.08, my + py * off + Math.sin(a) * R * 0.08, termMark, es);
    }
    const loneT = outerElectrons(et) - c.order;
    ringSlots(loneT, a, Math.PI * 1.0).forEach((b) => electron(ctx, tx + Rt * Math.cos(b), ty + Rt * Math.sin(b), termMark, es));
  }
  // central lone electrons in the free directions
  const loneC = outerElectrons(ec) - c.terminals * c.order;
  if (loneC > 0) {
    const all = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    const free = all.filter((f) => !angles.some((a) => Math.abs(Math.atan2(Math.sin(a - f), Math.cos(a - f))) < 0.1));
    let k = 0;
    for (const f of free) {
      const n = Math.min(2, loneC - k);
      if (n <= 0) break;
      ringSlots(n, f, 0).forEach((b) => electron(ctx, cx + R * Math.cos(b), cy + R * Math.sin(b), centralMark, es));
      k += n;
    }
  }
}

// ---------- ionic ----------

interface IonSlot {
  symbol: string;
  charge: number;
  x: number;
}

function drawIonic(ctx: CanvasRenderingContext2D, w: number, h: number, c: Extract<Compound, { kind: 'ionic' }>, pairA: string, R: number, t: number, animate: boolean) {
  const cy = h / 2 + 10;
  const nc = c.cation.count;
  const na = c.anion.count;
  const ions: IonSlot[] = [];
  let i = 0;
  let j = 0;
  while (i < nc || j < na) {
    const takeA = j < na && (i >= nc || (na > nc ? (i + j) % 2 === 0 : (i + j) % 2 === 1));
    if (takeA) (ions.push({ symbol: c.anion.symbol, charge: c.anion.charge, x: 0 }), j++);
    else (ions.push({ symbol: c.cation.symbol, charge: c.cation.charge, x: 0 }), i++);
  }
  R = Math.min(R, (w - 60) / (ions.length * 2.9));
  const gap = R * 2.9;
  ions.forEach((ion, k) => (ion.x = w / 2 + (k - (ions.length - 1) / 2) * gap));
  const metalMark: Mark = c.cation.symbol === pairA ? 'dot' : 'cross';
  const nonMark: Mark = metalMark === 'dot' ? 'cross' : 'dot';
  const es = Math.max(3, R * 0.075);
  // which anion receives each transferred electron
  const transfers: { from: IonSlot; fromIdx: number; to: IonSlot; toIdx: number }[] = [];
  const need = new Map(ions.filter((x) => x.charge < 0).map((x) => [x, -x.charge]));
  for (const cat of ions.filter((x) => x.charge > 0)) {
    for (let e = 0; e < cat.charge; e++) {
      const target = [...need.entries()].filter(([, n]) => n > 0).sort((a, b) => Math.abs(a[0].x - cat.x) - Math.abs(b[0].x - cat.x))[0];
      if (!target) break;
      const toIdx = -target[0].charge - target[1];
      transfers.push({ from: cat, fromIdx: e, to: target[0], toIdx });
      need.set(target[0], target[1] - 1);
    }
  }
  // animation timeline (seconds, looping)
  const period = 6;
  const u = animate ? (t % period) / period : 1;
  const move = Math.max(0, Math.min(1, (u - 0.2) / 0.3));
  const ease = move * move * (3 - 2 * move);
  const after = move >= 1;
  const anEl = elementBySymbol(c.anion.symbol)!;
  const ownAnion = outerElectrons(anEl);
  for (const ion of ions) {
    const el = elementBySymbol(ion.symbol)!;
    if (ion.charge > 0) {
      // the cation's emptied outer shell fades; its full inner shell remains
      shell(ctx, ion.x, cy, R, ion.symbol, after ? 0.25 : 1, after);
      if (after && el.group != null && el.group <= 2 && el.Z > 2) {
        const inner = R * 0.68;
        ctx.strokeStyle = withAlpha('#c9d1d9', 0.5);
        ctx.beginPath();
        ctx.arc(ion.x, cy, inner, 0, Math.PI * 2);
        ctx.stroke();
        const n = el.Z <= 4 ? 2 : 8;
        ringSlots(n, -Math.PI / 2, Math.PI * 1.6).forEach((b) => electron(ctx, ion.x + inner * Math.cos(b), cy + inner * Math.sin(b), metalMark, es * 0.8, 0.6));
      }
      if (after) bracket(ctx, ion.x, cy, R, ion.charge, 1);
    } else {
      shell(ctx, ion.x, cy, R, ion.symbol);
      const slots = ringSlots(8, -Math.PI / 2, Math.PI * 1.75);
      slots.slice(0, ownAnion).forEach((b) => electron(ctx, ion.x + R * Math.cos(b), cy + R * Math.sin(b), nonMark, es));
      if (after) bracket(ctx, ion.x, cy, R, ion.charge, 1);
    }
  }
  // transferred electrons
  const anSlots = ringSlots(8, -Math.PI / 2, Math.PI * 1.75);
  for (const tr of transfers) {
    const a0 = (tr.from.x < tr.to.x ? 0 : Math.PI) + (tr.fromIdx - (tr.from.charge - 1) / 2) * 0.5;
    const x0 = tr.from.x + R * Math.cos(a0);
    const y0 = cy + R * Math.sin(a0);
    const b = anSlots[ownAnion + tr.toIdx] ?? 0;
    const x1 = tr.to.x + R * Math.cos(b);
    const y1 = cy + R * Math.sin(b);
    const x = x0 + (x1 - x0) * ease;
    const y = y0 + (y1 - y0) * ease - Math.sin(Math.PI * ease) * R * 0.6;
    electron(ctx, x, y, metalMark, es);
    if (!animate) {
      ctx.strokeStyle = withAlpha(CROSS, 0.35);
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - R, x1, y1);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  const caption = after ? `Ions formed: ${c.cation.symbol}${chargeSymbol(c.cation.charge)} and ${c.anion.symbol}${chargeSymbol(c.anion.charge)} — now both have full outer shells` : move > 0 ? 'Electrons are transferred from the metal to the non-metal…' : 'Atoms before bonding';
  text(ctx, caption, w / 2, cy + R * 1.75, after ? C.ok : C.text, 13);
}

// ---------- metallic ----------

function drawMetallic(ctx: CanvasRenderingContext2D, w: number, h: number, metals: string[], R: number, t: number, animate: boolean) {
  const cols = 6;
  const rows = 3;
  const r = R * 0.55;
  const gap = r * 2.6;
  const x0 = w / 2 - ((cols - 1) * gap) / 2;
  const y0 = h / 2 + 10 - ((rows - 1) * gap) / 2;
  const els = metals.map((m) => elementBySymbol(m)!);
  const val = Math.max(1, Math.min(3, outerElectrons(els[0])));
  // background sea
  ctx.fillStyle = withAlpha(DOT, 0.06);
  ctx.fillRect(x0 - gap * 0.7, y0 - gap * 0.7, (cols - 1) * gap + gap * 1.4, (rows - 1) * gap + gap * 1.4);
  for (let rr = 0; rr < rows; rr++)
    for (let cc = 0; cc < cols; cc++) {
      const sym = metals[(rr + cc) % metals.length];
      const x = x0 + cc * gap;
      const y = y0 + rr * gap;
      ctx.fillStyle = withAlpha(atomColor(sym), 0.35);
      ctx.beginPath();
      ctx.arc(x, y, sym === metals[0] ? r : r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha('#c9d1d9', 0.5);
      ctx.stroke();
      text(ctx, `${sym}${chargeSymbol(Math.max(1, Math.min(3, outerElectrons(elementBySymbol(sym)!))))}`, x, y, '#e6edf3', Math.round(r * 0.55), 'center', '600');
    }
  const n = Math.min(54, cols * rows * val);
  const W = (cols - 1) * gap + gap;
  const H = (rows - 1) * gap + gap;
  for (let k = 0; k < n; k++) {
    // deterministic wandering paths
    const s1 = Math.sin(k * 12.9898) * 43758.5453;
    const s2 = Math.sin(k * 78.233) * 12345.678;
    const f1 = s1 - Math.floor(s1);
    const f2 = s2 - Math.floor(s2);
    const tt = animate ? t : 0;
    const x = x0 - gap / 2 + ((f1 * W + tt * (25 + 30 * f2) * (k % 2 ? 1 : -1)) % W + W) % W;
    const y = y0 - gap / 2 + ((f2 * H + Math.sin(tt * (0.8 + f1) + k) * gap * 0.4) % H + H) % H;
    electron(ctx, x, y, 'dot', Math.max(2.5, R * 0.06), 0.9);
  }
  text(ctx, 'Positive metal ions in a “sea” of delocalised electrons (free to move — that is why metals conduct)', w / 2, y0 + (rows - 1) * gap + gap * 1.1, C.text, 12.5);
}

// ---------- giant / none ----------

export function drawGiant(ctx: CanvasRenderingContext2D, w: number, h: number, a: string, b: string, R: number) {
  const r = R * 0.3;
  const step = R * 0.95;
  const cx = w / 2;
  const cy = h / 2 + 10;
  const pts: [number, number][] = [];
  for (let row = -2; row <= 2; row++)
    for (let col = -4; col <= 4; col++) {
      const x = cx + col * step * 0.866 * 2 + (row % 2 ? step * 0.866 : 0);
      const y = cy + row * step * 1.5;
      pts.push([x, y - step / 2], [x, y + step / 2]);
    }
  const uniq = pts.filter((p, i) => pts.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 1) === i);
  ctx.strokeStyle = withAlpha('#c9d1d9', 0.5);
  ctx.lineWidth = 1.4;
  for (let i = 0; i < uniq.length; i++)
    for (let j = i + 1; j < uniq.length; j++) {
      const dd = Math.hypot(uniq[i][0] - uniq[j][0], uniq[i][1] - uniq[j][1]);
      if (dd < step * 1.05) {
        ctx.beginPath();
        ctx.moveTo(uniq[i][0], uniq[i][1]);
        ctx.lineTo(uniq[j][0], uniq[j][1]);
        ctx.stroke();
      }
    }
  uniq.forEach(([x, y], i) => {
    const sym = a === b ? a : i % 2 ? a : b;
    ctx.fillStyle = atomColor(sym);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  text(ctx, 'Giant covalent structure — every atom is bonded to its neighbours (flattened sketch ≈)', cx, cy + step * 4.4, C.text, 12.5);
}

export function drawBondScene(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, pair: [string, string], view: ViewOptions) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, w, h);
  const [a, b] = pair;
  const cls = classifyBond(a, b);
  const comp = pairCompound(a, b);
  const R = Math.max(30, Math.min(70, Math.min(w, h) * 0.11));
  const ea = elementBySymbol(a)!;
  const eb = elementBySymbol(b)!;
  // header
  text(ctx, `${ea.name} + ${eb.name}`, 16, 26, '#e6edf3', 18, 'left', '600');
  text(ctx, `${BOND_LABEL[cls.type]} bonding${comp.formula ? ` → ${comp.formula}` : ''}`, 16, 50, cls.type === 'none' ? C.dim : '#e7c76a', 14, 'left');
  badge(ctx, 'DOT-AND-CROSS · outer shells only ≈', w - 10, 10, C.warn);
  if (comp.kind === 'molecule' || comp.kind === 'ionic') {
    // legend
    electron(ctx, 22, h - 40, 'dot', 4);
    text(ctx, `electrons from ${a}`, 32, h - 40, C.dim, 11.5, 'left');
    electron(ctx, 22, h - 22, 'cross', 4);
    text(ctx, a === b ? `electrons from the other ${b} atom` : `electrons from ${b}`, 32, h - 22, C.dim, 11.5, 'left');
  }
  if (comp.kind === 'molecule') {
    drawCovalent(ctx, w, h, comp, a, R);
    const bondWord = comp.order === 1 ? 'single bond (1 shared pair)' : comp.order === 2 ? 'double bond (2 shared pairs)' : 'triple bond (3 shared pairs)';
    text(ctx, `Each ${comp.terminal ?? comp.central}–${comp.central} link is a ${bondWord}. Every atom ends up with a full outer shell.`, w / 2, h - 60, C.text, 12.5);
    if (cls.type === 'polar-covalent' && cls.negative && view.labels) {
      const neg = cls.negative;
      text(ctx, `δ− on ${neg} (pulls the shared electrons harder),  δ+ on ${neg === a ? b : a}`, w / 2, h - 80, '#8cc8ff', 12.5);
    }
    if (comp.note) text(ctx, comp.note, w / 2, h - 100, C.warn, 12);
  } else if (comp.kind === 'ionic') {
    drawIonic(ctx, w, h, comp, a, R, t, view.animate);
  } else if (comp.kind === 'metallic') {
    drawMetallic(ctx, w, h, comp.metals, R, t, view.animate);
  } else if (comp.kind === 'giant-covalent') {
    if (comp.formula === a || comp.formula === 'SiO₂') drawGiant(ctx, w, h, a, b, R);
    text(ctx, comp.note, w / 2, h - 60, C.text, 12.5);
  } else {
    // no bond: show both atoms with their outer shells
    const pos = [w / 2 - R * 1.6, w / 2 + R * 1.6];
    [ea, eb].forEach((el, k) => {
      shell(ctx, pos[k], h / 2 + 10, R, el.symbol);
      const n = el.category === 'noble-gas' ? (el.Z === 2 ? 2 : 8) : outerElectrons(el);
      ringSlots(n, -Math.PI / 2, Math.PI * 1.75).forEach((ang) => electron(ctx, pos[k] + R * Math.cos(ang), h / 2 + 10 + R * Math.sin(ang), k === 0 ? 'dot' : 'cross', Math.max(3, R * 0.075)));
    });
    text(ctx, comp.note, w / 2, h / 2 + R * 1.9, C.dim, 12.5);
    if (cls.caveat) text(ctx, cls.caveat, w / 2, h / 2 + R * 2.3, C.warn, 12);
  }
  if (isMetal(ea) && isMetal(eb) && a !== b) text(ctx, 'Alloy: a mixture of metal atoms, still metallic bonding', w / 2, 80, C.dim, 12);
}
