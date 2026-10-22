/**
 * Compounds view. Ionic compounds: "charge tiles" — each ion is a tile as wide as its charge, so the
 * positive row and the negative row are exactly the same length when the formula is right.
 * Molecules: the 2D drawing from the structure library.
 */
import { TYPE_LABEL, type CompoundInfo, type IonDef } from '../chem/compounds';
import { prettyFormula } from '../chem/formula';
import { structureFor } from '../chem/structures';
import type { ViewOptions } from '../state/store';
import { badge, drawGrid } from './atomScene';
import { drawGiant } from './bondScene';
import { C, withAlpha } from './colors';
import { drawStructure } from './reactionScene';

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, size = 12, align: CanvasTextAlign = 'center', weight = '') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ui-sans-serif, system-ui`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ionPretty(body: string): string {
  return prettyFormula({ formula: body, charge: 0, isElectron: false });
}

function ionLabel(ion: IonDef): string {
  return prettyFormula({ formula: ion.body, charge: ion.charge, isElectron: false });
}

function drawTiles(ctx: CanvasRenderingContext2D, w: number, h: number, info: CompoundInfo, t: number, animate: boolean) {
  const ic = info.ions!;
  const total = ic.nCation * ic.cation.charge;
  const unit = Math.max(26, Math.min(90, (w - 120) / total));
  const rowW = unit * total;
  const x0 = (w - rowW) / 2;
  const tileH = Math.max(46, Math.min(74, h * 0.12));
  const yTop = h / 2 - tileH - 6;
  // slide the negative row into place
  const u = animate ? Math.min(1, ((t % 6) / 1.2)) : 1;
  const e = 1 - (1 - u) ** 3;
  const yBot = h / 2 + 6 + (1 - e) * 60;
  const rows: { ion: IonDef; n: number; y: number; fill: string; edge: string }[] = [
    { ion: ic.cation, n: ic.nCation, y: yTop, fill: 'rgba(224,93,93,0.22)', edge: '#e05d5d' },
    { ion: ic.anion, n: ic.nAnion, y: yBot, fill: 'rgba(79,179,255,0.18)', edge: '#4fb3ff' },
  ];
  for (const r of rows) {
    const q = Math.abs(r.ion.charge);
    for (let k = 0; k < r.n; k++) {
      const x = x0 + k * q * unit;
      roundRect(ctx, x + 2, r.y, q * unit - 4, tileH, 8);
      ctx.fillStyle = r.fill;
      ctx.fill();
      ctx.strokeStyle = withAlpha(r.edge, 0.9);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      text(ctx, ionLabel(r.ion), x + (q * unit) / 2, r.y + tileH * 0.4, '#e6edf3', Math.max(13, Math.min(20, unit * 0.32)), 'center', '600');
      // one pip per unit of charge
      for (let p = 0; p < q; p++) text(ctx, r.ion.charge > 0 ? '+' : '−', x + (p + 0.5) * unit, r.y + tileH * 0.78, r.edge, 13, 'center', '700');
    }
  }
  const fits = e >= 1;
  text(ctx, `${ic.nCation} × (${ic.cation.charge > 0 ? '+' : ''}${ic.cation.charge})  =  +${total}`, x0 - 12, yTop + tileH / 2, '#ff8a8a', 13, 'right');
  text(ctx, `${ic.nAnion} × (${ic.anion.charge})  =  −${total}`, x0 - 12, yBot + tileH / 2, '#8cc8ff', 13, 'right');
  text(
    ctx,
    fits ? `The rows are the same length: the charges cancel (+${total} − ${total} = 0), so the formula is ${info.pretty}` : 'Fitting the charges together…',
    w / 2,
    yBot + tileH + 34,
    fits ? C.ok : C.dim,
    13.5,
  );
  if (ic.anion.poly && ic.nAnion > 1) text(ctx, `Brackets: (${ionPretty(ic.anion.body)}) is one ion, so ${prettyFormula({ formula: `(${ic.anion.body})${ic.nAnion}`, charge: 0, isElectron: false })} means ${ic.nAnion} whole ${ic.anion.name} ions.`, w / 2, yBot + tileH + 56, C.dim, 12.5);
  if (ic.cation.poly && ic.nCation > 1) text(ctx, `Brackets: (${ionPretty(ic.cation.body)}) is one ion, used ${ic.nCation} times.`, w / 2, yBot + tileH + 76, C.dim, 12.5);
  if (ic.warning) text(ctx, `⚠ ${ic.warning}`, w / 2, yTop - 30, C.warn, 12.5);
}

export function drawCompoundScene(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, info: CompoundInfo | null, error: string | null, view: ViewOptions) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  drawGrid(ctx, w, h);
  if (!info) {
    text(ctx, error ?? 'Choose two ions or type a formula', w / 2, h / 2, C.bad, 14);
    return;
  }
  text(ctx, info.name ? info.name[0].toUpperCase() + info.name.slice(1) : 'Unnamed compound', 16, 26, '#e6edf3', 18, 'left', '600');
  text(ctx, `${info.pretty}${info.common ? `  ·  “${info.common}”` : ''}${info.type ? `  ·  ${TYPE_LABEL[info.type]}` : ''}`, 16, 50, '#e7c76a', 13.5, 'left');
  const ionic = info.ions && !info.ions.acid && info.type !== 'molecular';
  if (ionic) {
    badge(ctx, 'CHARGE TILES · each tile is as wide as its charge', w - 10, 10, C.warn);
    drawTiles(ctx, w, h, info, t, view.animate);
    return;
  }
  badge(ctx, 'FLAT 2D DRAWING ≈', w - 10, 10, C.dim);
  if (info.type === 'giant') {
    const els = [...info.species.counts.keys()];
    drawGiant(ctx, w, h, els[0], els[1] ?? els[0], Math.max(30, Math.min(70, Math.min(w, h) * 0.11)));
    return;
  }
  const st = structureFor(info.species);
  if (!st.atoms.length) return;
  const xs = st.atoms.map((a) => a.x);
  const ys = st.atoms.map((a) => a.y);
  const bw = Math.max(...xs) - Math.min(...xs) + 1.4;
  const bh = Math.max(...ys) - Math.min(...ys) + 1.4;
  const s = Math.max(14, Math.min(90, (w * 0.7) / bw, (h * 0.55) / bh));
  const ox = w / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * s;
  const oy = h / 2 + 10 - ((Math.max(...ys) + Math.min(...ys)) / 2) * s;
  drawStructure(ctx, st, ox, oy, s, 1, view.bondTypes);
  if (st.note) text(ctx, st.note, w / 2, h - 34, C.dim, 12.5);
}
