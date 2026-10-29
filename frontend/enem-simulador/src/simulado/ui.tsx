import { useState } from 'react';
import type { Discipline } from './types';

/* ---- MD3 Token helpers ---- */
const C = {
  primary: '#0037b0',
  primaryContainer: '#1d4ed8',
  primaryFixed: '#dce1ff',
  primaryFixedDim: '#b7c4ff',
  onPrimary: '#ffffff',
  onPrimaryFixed: '#001551',

  secondary: '#006d30',
  secondaryContainer: '#92f5a4',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#007233',

  tertiary: '#5800c0',
  tertiaryContainer: '#712edd',
  onTertiary: '#ffffff',

  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',

  bg: '#faf8ff',
  surface: '#faf8ff',
  surfaceLowest: '#ffffff',
  surfaceLow: '#f2f3ff',
  surfaceContainer: '#eaedff',
  surfaceHigh: '#e2e7ff',
  surfaceHighest: '#dae2fd',
  surfaceDim: '#d2d9f4',
  inverseSurface: '#283044',
  inverseOnSurface: '#eef0ff',

  onSurface: '#131b2e',
  onSurfaceVariant: '#434655',
  outline: '#747686',
  outlineVariant: '#c4c5d7',
};

export const DISC_COLORS: Record<Discipline, string> = {
  'ciencias-humanas': '#C2410C',
  'ciencias-natureza': '#15803D',
  linguagens: '#1D4ED8',
  matematica: '#6D28D9',
};

export { C };

/* ---- Top nav bar ---- */
export function TopNav({ title, left, right }: { title: string; left?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      background: C.surfaceLowest, borderBottom: `1px solid ${C.outlineVariant}40`,
      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
      height: 64,
    }}>
      <div style={{
        maxWidth: 1152, margin: '0 auto', padding: '0 2rem',
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24,
      }}>
        <div style={{ minWidth: 140 }}>{left}</div>
        <span style={{ fontSize: 16, fontWeight: 600, color: C.onSurface, letterSpacing: '-0.01em' }}>{title}</span>
        <div style={{ minWidth: 140, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
      </div>
    </header>
  );
}

export function NavTextBtn({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '6px 12px', borderRadius: 12, border: 'none',
      background: 'transparent', cursor: 'pointer',
      color: primary ? C.primaryContainer : C.onSurfaceVariant,
      fontSize: 14, fontWeight: 500,
      transition: 'background 0.15s',
    }}
      onMouseOver={e => (e.currentTarget.style.background = C.surfaceLow)}
      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
    >{label}</button>
  );
}

/* ---- Card container ---- */
export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.surfaceLowest, borderRadius: 12,
      border: `1px solid ${C.outlineVariant}66`,
      boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
      ...style,
    }}>{children}</div>
  );
}

/* ---- Section with label ---- */
export function FormSection({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: C.surfaceLowest, borderRadius: 12, padding: '20px 24px', border: `1px solid ${C.outlineVariant}66`, boxShadow: '0 1px 2px rgba(15,23,42,0.05)' }}>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: C.onSurface, margin: 0 }}>{label}</h3>
        {hint && <p style={{ fontSize: 13, color: C.onSurfaceVariant, margin: '4px 0 0' }}>{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/* ---- Discipline checkbox card ---- */
export function DisciplineCard({ label, subtitle, color, checked, onChange }: {
  discipline?: Discipline; label: string; subtitle: string; color: string; checked: boolean; onChange: () => void;
}) {
  return (
    <label style={{
      display: 'flex', alignItems: 'flex-start', padding: '14px 16px', borderRadius: 8,
      border: `1px solid ${checked ? color + '66' : C.outlineVariant + '66'}`,
      background: checked ? color + '08' : C.surfaceLowest,
      cursor: 'pointer', transition: 'all 0.15s', gap: 12,
    }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ display: 'none' }} />
      <div style={{
        width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 2,
        background: checked ? C.primaryContainer : 'transparent',
        border: checked ? 'none' : `2px solid ${C.outlineVariant}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: C.onPrimary, fontSize: 13, transition: 'all 0.15s',
      }}>
        {checked && '✓'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
          <span style={{ fontSize: 16, fontWeight: 600, color: C.onSurface, letterSpacing: '-0.01em' }}>{label}</span>
        </div>
        <p style={{ fontSize: 13, color: C.onSurfaceVariant, margin: 0 }}>{subtitle}</p>
      </div>
    </label>
  );
}

/* ---- Chip ---- */
export function Chip({ label, active, color, onClick }: { label: string; active: boolean; color?: string; onClick: () => void }) {
  const ac = color ?? C.primaryContainer;
  return (
    <button onClick={onClick} style={{
      padding: '5px 12px', borderRadius: 8, border: `1px solid ${active ? ac : C.outlineVariant + '66'}`,
      background: active ? ac + '22' : 'transparent',
      color: active ? ac : C.onSurfaceVariant,
      fontSize: 13, fontWeight: active ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s',
    }}>{label}</button>
  );
}

/* ---- Segmented control ---- */
export function SegmentedControl<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', background: C.surfaceLow, borderRadius: 8, padding: 3, gap: 2, border: `1px solid ${C.outlineVariant}66` }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          flex: 1, padding: '6px 0', border: 'none', borderRadius: 6, cursor: 'pointer',
          background: value === o.value ? C.surfaceLowest : 'transparent',
          color: value === o.value ? C.onSurface : C.onSurfaceVariant,
          fontSize: 14, fontWeight: value === o.value ? 600 : 400,
          boxShadow: value === o.value ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
          transition: 'all 0.15s',
        }}>{o.label}</button>
      ))}
    </div>
  );
}

/* ---- Toggle ---- */
export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!checked)} style={{
      width: 48, height: 28, borderRadius: 14, cursor: 'pointer',
      background: checked ? C.primaryContainer : C.outlineVariant,
      position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: checked ? 22 : 3,
        width: 22, height: 22, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,.25)', transition: 'left 0.2s',
      }} />
    </div>
  );
}

/* ---- Primary button ---- */
export function PrimaryBtn({ label, onClick, disabled, variant = 'filled' }: {
  label: string; onClick: () => void; disabled?: boolean;
  variant?: 'filled' | 'tonal' | 'outlined' | 'text' | 'destructive';
}) {
  let bg = C.primaryContainer, color = C.onPrimary, border = 'none';
  if (variant === 'tonal') { bg = C.primaryFixed; color = C.onPrimaryFixed; }
  if (variant === 'outlined') { bg = 'transparent'; color = C.primaryContainer; border = `1px solid ${C.outlineVariant}`; }
  if (variant === 'text') { bg = 'transparent'; color = C.primaryContainer; }
  if (variant === 'destructive') { bg = C.errorContainer; color = C.onErrorContainer; }
  if (disabled) { bg = C.surfaceContainer; color = C.onSurfaceVariant; }
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width: '100%', padding: '12px 0', border, borderRadius: 12,
      background: bg, color, fontSize: 14, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: !disabled && variant === 'filled' ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
      transition: 'all 0.15s',
    }}>{label}</button>
  );
}

/* ---- Progress bar ---- */
export function ProgressBar({ value, color }: { value: number; color?: string }) {
  return (
    <div style={{ width: '100%', height: 2, background: C.primaryFixed, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color ?? C.primaryContainer, transition: 'width 0.3s' }} />
    </div>
  );
}

/* ---- Score ring ---- */
export function ScoreRing({ pct, size = 80 }: { pct: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 70 ? C.secondary : pct >= 50 ? '#d97706' : C.error;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.surfaceHighest} strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: `${size / 2}px ${size / 2}px` }}
        fill={C.onSurface} fontSize={size * 0.2} fontWeight={700}>{Math.round(pct)}%</text>
    </svg>
  );
}

/* ---- Pill badge ---- */
export function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 10px', borderRadius: 8, background: bg, color, fontSize: 12, fontWeight: 500 }}>
      {label}
    </span>
  );
}

/* ---- Timer pill ---- */
export function TimerPill({ timeStr }: { timeStr: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 12,
      background: C.surfaceLow, border: `1px solid ${C.outlineVariant}66`,
      color: C.onSurfaceVariant, fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums',
    }}>
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
      </svg>
      {timeStr}
    </div>
  );
}

/* ---- Wrong answer overlay modal ---- */
interface WrongAnswer {
  questionId: string;
  year: number;
  index: number;
  discipline: Discipline;
  selected: string;
  correct: string;
  title: string;
}

export function WrongAnswerModal({ items, startIndex, session, onClose }: {
  items: WrongAnswer[];
  startIndex: number;
  session: { loadedQuestions: Record<string, { context: string | null; alternatives: Array<{ letter: string; text: string | null; isCorrect: boolean }> }> };
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [copied, setCopied] = useState(false);
  const item = items[idx];
  const q = item ? session.loadedQuestions[item.questionId] : null;

  const copyPrompt = () => {
    if (!item) return;
    const text = `Errei a questão ${item.index} do ENEM ${item.year} (${item.discipline}). Enunciado: "${item.title}". Selecionei ${item.selected} mas o correto é ${item.correct}. Explique o raciocínio da alternativa ${item.correct} e por que as demais estão erradas.`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // fallback: create temp textarea
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!item) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(19,27,46,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.surfaceLowest, borderRadius: 16,
          maxWidth: 680, width: '100%', maxHeight: '90dvh',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(15,23,42,0.18)',
          overflow: 'hidden',
        }}
      >
        {/* Modal header */}
        <div style={{
          padding: '16px 20px', borderBottom: `1px solid ${C.outlineVariant}66`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: DISC_COLORS[item.discipline], flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: C.onSurfaceVariant }}>
              ENEM {item.year} · Q{item.index}
            </span>
            <span style={{ fontSize: 13, color: C.outlineVariant }}>·</span>
            <span style={{ fontSize: 13, color: C.error }}>Selecionado: {item.selected}</span>
            <span style={{ fontSize: 13, color: C.secondary }}>Correto: {item.correct}</span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 6, borderRadius: 8,
            color: C.onSurfaceVariant, fontSize: 18, lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: C.onSurface, marginBottom: 16, letterSpacing: '-0.01em' }}>
            {item.title}
          </p>

          {q?.context && (
            <div style={{
              background: C.surfaceLow, border: `1px solid ${C.outlineVariant}66`,
              borderRadius: 8, padding: 14, marginBottom: 16,
              fontSize: 14, color: C.onSurfaceVariant, lineHeight: 1.6,
            }}>
              {q.context}
            </div>
          )}

          {q && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.alternatives.map(alt => {
                const isCorrect = alt.isCorrect;
                const isSelected = alt.letter === item.selected;
                let bg = C.surfaceLowest, border = `1px solid ${C.outlineVariant}66`, color = C.onSurface;
                if (isCorrect) { bg = C.secondaryContainer + '33'; border = `2px solid ${C.secondary}`; }
                else if (isSelected) { bg = C.errorContainer + '33'; border = `2px solid ${C.error}`; color = C.error; }
                return (
                  <div key={alt.letter} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, background: bg, border, borderRadius: 10 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
                      background: isCorrect ? C.secondary : isSelected ? C.error : C.surfaceContainer,
                      color: isCorrect || isSelected ? '#fff' : C.onSurfaceVariant,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700,
                    }}>{alt.letter}</span>
                    <span style={{ fontSize: 14, color, lineHeight: 1.5 }}>{alt.text}</span>
                    {isCorrect && <span style={{ marginLeft: 'auto', fontSize: 11, color: C.secondary, fontWeight: 600, flexShrink: 0 }}>✓ Correta</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal footer: copy + nav */}
        <div style={{
          padding: '14px 20px', borderTop: `1px solid ${C.outlineVariant}66`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, gap: 12,
        }}>
          <button onClick={copyPrompt} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 8, border: `1px solid ${C.outlineVariant}66`, background: C.surfaceLow,
            color: C.onSurfaceVariant, fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}>
            {copied ? '✓ Copiado' : '📋 Copiar prompt de estudo'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => { setIdx(i => Math.max(0, i - 1)); setCopied(false); }} disabled={idx === 0} style={{
              padding: '8px 14px', borderRadius: 8, border: `1px solid ${C.outlineVariant}66`,
              background: C.surfaceLow, color: idx === 0 ? C.outlineVariant : C.onSurface,
              fontSize: 13, fontWeight: 500, cursor: idx === 0 ? 'not-allowed' : 'pointer',
            }}>← Anterior</button>
            <span style={{ fontSize: 13, color: C.onSurfaceVariant, fontVariantNumeric: 'tabular-nums' }}>{idx + 1}/{items.length}</span>
            <button onClick={() => { setIdx(i => Math.min(items.length - 1, i + 1)); setCopied(false); }} disabled={idx === items.length - 1} style={{
              padding: '8px 14px', borderRadius: 8, border: 'none',
              background: idx === items.length - 1 ? C.surfaceContainer : C.primaryContainer,
              color: idx === items.length - 1 ? C.onSurfaceVariant : C.onPrimary,
              fontSize: 13, fontWeight: 600, cursor: idx === items.length - 1 ? 'not-allowed' : 'pointer',
            }}>Próxima →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
