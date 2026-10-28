import React from 'react';
import type { Discipline } from './types';
import { DISCIPLINE_COLORS } from './types';

/* ---- Nav ---- */
export function AppleNav({ title, left, right }: { title: string; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: 'var(--nav-bg)', backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderBottom: '0.5px solid var(--separator)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', height: 44, minHeight: 44,
    }}>
      <div style={{ minWidth: 60 }}>{left}</div>
      <span style={{ fontWeight: 600, fontSize: 17, color: 'var(--label)', textAlign: 'center' }}>{title}</span>
      <div style={{ minWidth: 60, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </nav>
  );
}

export function NavBtn({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer',
      color: primary ? 'var(--blue)' : 'var(--blue)', fontSize: 17, fontWeight: primary ? 600 : 400,
    }}>{label}</button>
  );
}

/* ---- Grouped sections (iOS Settings style) ---- */
export function GroupSection({ header, footer, children }: { header?: string; footer?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {header && <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--secondary-label)', textTransform: 'uppercase', letterSpacing: '0.04em', padding: '0 16px 6px' }}>{header}</div>}
      <div style={{ background: 'var(--card-bg)', borderRadius: 12, overflow: 'hidden', border: '0.5px solid var(--separator)' }}>
        {children}
      </div>
      {footer && <div style={{ fontSize: 13, color: 'var(--secondary-label)', padding: '6px 16px 0' }}>{footer}</div>}
    </div>
  );
}

export function GroupRow({ label, detail, onClick, children, last }: { label: string; detail?: string; onClick?: () => void; children?: React.ReactNode; last?: boolean }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px', cursor: onClick ? 'pointer' : undefined,
      borderBottom: last ? 'none' : '0.5px solid var(--separator)',
      minHeight: 44,
    }}>
      <span style={{ fontSize: 17, color: 'var(--label)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {detail && <span style={{ fontSize: 17, color: 'var(--secondary-label)' }}>{detail}</span>}
        {children}
      </div>
    </div>
  );
}

/* ---- Toggle ---- */
export function AppleToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: 51, height: 31, borderRadius: 15.5, cursor: 'pointer',
      background: checked ? 'var(--green)' : 'var(--toggle-off)',
      position: 'relative', transition: 'background 0.2s',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: checked ? 22 : 2,
        width: 27, height: 27, borderRadius: '50%',
        background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.3)',
        transition: 'left 0.2s',
      }} />
    </div>
  );
}

/* ---- Segmented control ---- */
export function SegmentedControl<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{
      display: 'flex', background: 'var(--seg-bg)', borderRadius: 9, padding: 2, gap: 2,
    }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          flex: 1, padding: '5px 0', border: 'none', borderRadius: 7, cursor: 'pointer',
          background: value === o.value ? 'var(--card-bg)' : 'transparent',
          color: 'var(--label)', fontSize: 13, fontWeight: value === o.value ? 600 : 400,
          boxShadow: value === o.value ? '0 1px 3px rgba(0,0,0,.15)' : 'none',
          transition: 'background 0.15s',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

/* ---- Primary button ---- */
export function AppleBtn({ label, onClick, disabled, variant = 'primary' }: { label: string; onClick: () => void; disabled?: boolean; variant?: 'primary' | 'destructive' | 'ghost' }) {
  const bg = variant === 'primary' ? 'var(--blue)' : variant === 'destructive' ? 'var(--red)' : 'var(--seg-bg)';
  const color = variant === 'ghost' ? 'var(--label)' : '#fff';
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '14px 0', border: 'none', borderRadius: 14,
      background: disabled ? 'var(--seg-bg)' : bg, color: disabled ? 'var(--secondary-label)' : color,
      fontSize: 17, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'opacity 0.15s',
    }}>{label}</button>
  );
}

/* ---- Score ring ---- */
export function ScoreRing({ pct, size = 80, discipline }: { pct: number; size?: number; discipline?: Discipline }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = discipline ? DISCIPLINE_COLORS[discipline] : (pct >= 70 ? 'var(--green)' : pct >= 50 ? 'var(--orange)' : 'var(--red)');
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--separator)" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size/2}px ${size/2}px` }}
        fill="var(--label)" fontSize={size * 0.22} fontWeight={700}>{Math.round(pct)}%</text>
    </svg>
  );
}

/* ---- Chip ---- */
export function Chip({ label, active, color, onClick }: { label: string; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 20, border: '1.5px solid',
      borderColor: active ? (color ?? 'var(--blue)') : 'var(--separator)',
      background: active ? (color ?? 'var(--blue)') + '22' : 'transparent',
      color: active ? (color ?? 'var(--blue)') : 'var(--secondary-label)',
      fontSize: 14, fontWeight: active ? 600 : 400, cursor: 'pointer',
      transition: 'all 0.15s',
    }}>{label}</button>
  );
}

/* ---- Progress bar ---- */
export function ProgressBar({ value, color = 'var(--blue)' }: { value: number; color?: string }) {
  return (
    <div style={{ width: '100%', height: 3, background: 'var(--separator)', borderRadius: 2 }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 2, transition: 'width 0.3s' }} />
    </div>
  );
}
