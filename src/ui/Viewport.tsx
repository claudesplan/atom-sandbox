import { useEffect, useRef } from 'react';
import { describeAtom } from '../chem/atom';
import { drawAtomScene, hitAtom, type ParticleKind } from '../render/atomScene';
import { drawBondScene } from '../render/bondScene';
import { drawCompoundScene } from '../render/compoundScene';
import { compoundInfo } from './CompoundPanels';
import { drawReactionScene, hitReaction, MAX_DRAWN, type ReactionAnim, type ReactionLayout } from '../render/reactionScene';
import { parsedEquation, useStore } from '../state/store';
import { addParticle, removeParticle, viewportInfo } from './actions';

export function Viewport() {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let w = 0;
    let h = 0;
    let raf = 0;
    let mouse: { x: number; y: number } | null = null;
    let reactionLayout: ReactionLayout | null = null;
    let anim: ReactionAnim | null = null;
    let lastAnimToken = useStore.getState().animateReaction;
    let lastBondToken = useStore.getState().animateBond;
    let bondStart = performance.now();
    const t0 = performance.now();

    const resize = () => {
      const r = wrap.current!.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      w = Math.max(1, Math.floor(r.width));
      h = Math.max(1, Math.floor(r.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      viewportInfo.w = w;
      viewportInfo.h = h;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap.current!);
    resize();

    const frame = (now: number) => {
      const st = useStore.getState();
      const t = (now - t0) / 1000;
      if (st.mode === 'compounds') {
        if (st.animateBond !== lastBondToken) {
          lastBondToken = st.animateBond;
          bondStart = now;
        }
        const ci = compoundInfo(st.doc.compound);
        drawCompoundScene(ctx, w, h, (now - bondStart) / 1000, ci.info, ci.error, st.view);
        canvas.style.cursor = 'default';
      } else if (st.mode === 'bonds') {
        if (st.animateBond !== lastBondToken) {
          lastBondToken = st.animateBond;
          bondStart = now;
        }
        drawBondScene(ctx, w, h, (now - bondStart) / 1000, st.doc.pair, st.view);
        canvas.style.cursor = 'default';
      } else if (st.mode === 'atom') {
        const d = describeAtom(st.doc.atom);
        let hover: ParticleKind | null = null;
        if (mouse && st.tool === 'remove' && viewportInfo.layout) hover = hitAtom(viewportInfo.layout, mouse.x, mouse.y)?.kind ?? null;
        viewportInfo.layout = drawAtomScene(ctx, w, h, t, now, d, st.view, hover);
        canvas.style.cursor = st.tool === 'remove' ? (hover ? 'pointer' : 'default') : 'crosshair';
      } else {
        const p = parsedEquation(st.doc.eqText);
        if (st.animateReaction !== lastAnimToken) {
          lastAnimToken = st.animateReaction;
          anim = { start: now };
        }
        const hover = mouse && reactionLayout && !anim ? hitReaction(reactionLayout, mouse.x, mouse.y) : null;
        const res = drawReactionScene(ctx, w, h, now, p.ok ? p.eq : null, p.ok ? null : p.error, st.doc.coefs, st.view, hover, anim);
        reactionLayout = res.layout;
        if (!res.animating) anim = null;
        canvas.style.cursor = hover != null ? 'pointer' : 'default';
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const pos = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: MouseEvent) => (mouse = pos(e));
    const onLeave = () => (mouse = null);
    const onDown = (e: MouseEvent) => {
      const st = useStore.getState();
      const p = pos(e);
      const minus = e.button === 2 || e.shiftKey;
      if (st.mode === 'bonds' || st.mode === 'compounds') return;
      if (st.mode === 'atom') {
        if (st.tool === 'remove' || minus) {
          const hit = viewportInfo.layout ? hitAtom(viewportInfo.layout, p.x, p.y) : null;
          const kind: ParticleKind | null = st.tool === 'remove' ? (hit?.kind ?? null) : st.tool === 'proton' ? 'p' : st.tool === 'neutron' ? 'n' : 'e';
          if (kind) removeParticle(kind, p);
        } else addParticle(st.tool === 'proton' ? 'p' : st.tool === 'neutron' ? 'n' : 'e', p);
      } else if (reactionLayout) {
        const i = hitReaction(reactionLayout, p.x, p.y);
        if (i == null) return;
        const c = st.doc.coefs[i] ?? 1;
        if (!minus && c >= MAX_DRAWN * 2) return st.notify('That is plenty — coefficients above 80 are not needed here.', 'warn');
        st.setCoef(i, c + (minus ? -1 : 1));
      }
    };
    const onCtx = (e: MouseEvent) => e.preventDefault();
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('contextmenu', onCtx);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('contextmenu', onCtx);
    };
  }, []);

  return (
    <div className="viewport" ref={wrap}>
      <canvas ref={ref} tabIndex={0} />
    </div>
  );
}
