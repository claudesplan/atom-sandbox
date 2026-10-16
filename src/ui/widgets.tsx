import { useEffect, useRef, useState, type ReactNode } from 'react';
import { toPrecision } from '../core/format';

export interface NumberFieldProps {
  value: number;
  onCommit: (v: number) => void;
  /** displayed = value × scale */
  scale?: number;
  unit?: string;
  digits?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  title?: string;
  allowInfinity?: boolean;
  width?: number;
}

/** Compact numeric input: commits on Enter/blur, Esc reverts, ↑/↓ steps (Shift ×10). */
export function NumberField({ value, onCommit, scale = 1, unit, digits = 5, min, max, step, disabled, title, allowInfinity, width }: NumberFieldProps) {
  const display = Number.isFinite(value) ? toPrecision(value * scale, digits) : value > 0 ? '∞' : '-∞';
  const [text, setText] = useState(display);
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!focused) setText(display);
  }, [display, focused]);

  const parse = (t: string): number | null => {
    const s = t.trim().replace(',', '.');
    if (allowInfinity && (s === '∞' || /^inf/i.test(s))) return Infinity;
    // allow simple expressions like "2*9.81" or "1e-3"
    if (!/^[-+*/().\deE\s]+$/.test(s)) return null;
    try {
      const v = Function(`"use strict";return (${s})`)() as number;
      return Number.isFinite(v) ? v : null;
    } catch {
      return null;
    }
  };

  const commit = (t: string) => {
    const v = parse(t);
    if (v == null) {
      setText(display);
      return;
    }
    let si = Number.isFinite(v) ? v / scale : v;
    if (min != null) si = Math.max(min, si);
    if (max != null) si = Math.min(max, si);
    if (si !== value) onCommit(si);
    setText(Number.isFinite(si) ? toPrecision(si * scale, digits) : '∞');
  };

  return (
    <span className={`numfield${disabled ? ' disabled' : ''}`} title={title} style={width ? { width } : undefined}>
      <input
        ref={ref}
        value={text}
        disabled={disabled}
        spellCheck={false}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
        }}
        onBlur={(e) => {
          setFocused(false);
          commit(e.target.value);
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') ref.current?.blur();
          else if (e.key === 'Escape') {
            setText(display);
            setTimeout(() => ref.current?.blur());
          } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && step) {
            e.preventDefault();
            const cur = parse(text) ?? value * scale;
            const d = step * scale * (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1);
            commit(String(cur + d));
          }
        }}
      />
      {unit && <span className="unit">{unit}</span>}
    </span>
  );
}

export function Row({ label, title, children, approx }: { label: string; title?: string; children: ReactNode; approx?: boolean }) {
  return (
    <div className="row" title={title}>
      <label>
        {label}
        {approx && <span className="approx" title="Simplified estimate — not a validated result">≈</span>}
      </label>
      <div className="val">{children}</div>
    </div>
  );
}

export function Section({ title, children, right, defaultOpen = true }: { title: string; children: ReactNode; right?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section">
      <div className="section-head" onClick={() => setOpen(!open)}>
        <span className={`caret${open ? ' open' : ''}`}>▸</span>
        <span className="section-title">{title}</span>
        {right && (
          <span className="section-right" onClick={(e) => e.stopPropagation()}>
            {right}
          </span>
        )}
      </div>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

export function Readout({ label, value, unit, approx, title }: { label: string; value: string; unit?: string; approx?: boolean; title?: string }) {
  return (
    <div className="readout" title={title}>
      <span className="rl">
        {label}
        {approx && <span className="approx">≈</span>}
      </span>
      <span className="rv">{value}</span>
      {unit !== undefined && <span className="ru">{unit}</span>}
    </div>
  );
}

export function Select<T extends string>({ value, options, onChange, title, disabled }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; title?: string; disabled?: boolean }) {
  return (
    <select className="select" value={value} title={title} disabled={disabled} onChange={(e) => onChange(e.target.value as T)} onKeyDown={(e) => e.stopPropagation()}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Check({ checked, onChange, label, title, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; title?: string; disabled?: boolean }) {
  return (
    <label className="check" title={title}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label && <span>{label}</span>}
    </label>
  );
}

export function TextField({ value, onCommit, title, width }: { value: string; onCommit: (v: string) => void; title?: string; width?: number }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <input
      className="textfield"
      value={text}
      title={title}
      style={width ? { width } : undefined}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== value && onCommit(text)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setText(value);
      }}
    />
  );
}

export function IconButton({ onClick, title, children, active, disabled, className }: { onClick: () => void; title: string; children: ReactNode; active?: boolean; disabled?: boolean; className?: string }) {
  return (
    <button className={`ibtn${active ? ' active' : ''}${className ? ` ${className}` : ''}`} title={title} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
