import { useState } from 'react';
import type { SimuladoConfig, Discipline, DifficultyLevel } from './types';
import { ALL_DISCIPLINES, AVAILABLE_YEARS, DISCIPLINE_LABELS, DISCIPLINE_COLORS } from './types';
import { AppleNav, NavBtn, GroupSection, GroupRow, AppleToggle, SegmentedControl, AppleBtn, Chip } from './ui';

const DEFAULT_CONFIG: SimuladoConfig = {
  disciplines: [...ALL_DISCIPLINES],
  years: AVAILABLE_YEARS.slice(0, 5),
  questionCount: 20,
  onlyNew: false,
  difficulty: 'all',
  revealMode: 'immediate',
  timerEnabled: false,
  timerMinutes: 30,
};

const QUESTION_COUNTS = [5, 10, 20, 30, 45, 60, 90];
const TIMER_OPTIONS = [15, 30, 45, 60, 90, 120, 180];

export function SetupScreen({ onStart, onHistory, onHome }: { onStart: (config: SimuladoConfig) => void; onHistory: () => void; onHome?: () => void }) {
  const [cfg, setCfg] = useState<SimuladoConfig>(DEFAULT_CONFIG);

  const set = <K extends keyof SimuladoConfig>(k: K, v: SimuladoConfig[K]) => setCfg(c => ({ ...c, [k]: v }));

  const toggleDisc = (d: Discipline) => {
    const has = cfg.disciplines.includes(d);
    if (has && cfg.disciplines.length === 1) return;
    set('disciplines', has ? cfg.disciplines.filter(x => x !== d) : [...cfg.disciplines, d]);
  };

  const toggleYear = (y: number) => {
    const has = cfg.years.includes(y);
    if (has && cfg.years.length === 1) return;
    set('years', has ? cfg.years.filter(x => x !== y) : [...cfg.years, y]);
  };

  const canStart = cfg.disciplines.length > 0 && cfg.years.length > 0;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--sys-bg)' }}>
      <AppleNav
        title="Simulado"
        left={onHome ? <NavBtn label="← Início" onClick={onHome} /> : undefined}
        right={<NavBtn label="Histórico" onClick={onHistory} />}
      />

      <div style={{ padding: '20px 16px 40px', maxWidth: 600, margin: '0 auto' }}>

        {/* Disciplines */}
        <GroupSection header="Disciplinas">
          {ALL_DISCIPLINES.map((d, i) => (
            <GroupRow key={d} label={DISCIPLINE_LABELS[d]} last={i === ALL_DISCIPLINES.length - 1}
              onClick={() => toggleDisc(d)}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%', border: '2px solid',
                borderColor: cfg.disciplines.includes(d) ? DISCIPLINE_COLORS[d] : 'var(--separator)',
                background: cfg.disciplines.includes(d) ? DISCIPLINE_COLORS[d] : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {cfg.disciplines.includes(d) && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
              </div>
            </GroupRow>
          ))}
        </GroupSection>

        {/* Years */}
        <GroupSection header="Anos">
          <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {AVAILABLE_YEARS.map(y => (
              <Chip key={y} label={String(y)} active={cfg.years.includes(y)} onClick={() => toggleYear(y)} />
            ))}
          </div>
          <div style={{ borderTop: '0.5px solid var(--separator)', padding: '8px 16px', display: 'flex', gap: 8 }}>
            <button onClick={() => set('years', [...AVAILABLE_YEARS])} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 14, cursor: 'pointer', padding: '4px 0' }}>Todos</button>
            <button onClick={() => set('years', AVAILABLE_YEARS.slice(0, 3))} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 14, cursor: 'pointer', padding: '4px 0' }}>Últimos 3</button>
            <button onClick={() => set('years', AVAILABLE_YEARS.slice(0, 5))} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 14, cursor: 'pointer', padding: '4px 0' }}>Últimos 5</button>
          </div>
        </GroupSection>

        {/* Questions */}
        <GroupSection header="Quantidade de questões">
          <div style={{ padding: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {QUESTION_COUNTS.map(n => (
              <Chip key={n} label={String(n)} active={cfg.questionCount === n} onClick={() => set('questionCount', n)} />
            ))}
          </div>
        </GroupSection>

        {/* Difficulty */}
        <GroupSection header="Dificuldade">
          <div style={{ padding: 12 }}>
            <SegmentedControl
              options={[{ value: 'all', label: 'Todas' }, { value: 'easy', label: 'Fácil' }, { value: 'medium', label: 'Média' }, { value: 'hard', label: 'Difícil' }]}
              value={cfg.difficulty as DifficultyLevel}
              onChange={v => set('difficulty', v)}
            />
          </div>
        </GroupSection>

        {/* Options */}
        <GroupSection header="Opções">
          <GroupRow label="Apenas questões novas">
            <AppleToggle checked={cfg.onlyNew} onChange={v => set('onlyNew', v)} />
          </GroupRow>
          <GroupRow label="Ver gabarito imediatamente">
            <AppleToggle checked={cfg.revealMode === 'immediate'} onChange={v => set('revealMode', v ? 'immediate' : 'end')} />
          </GroupRow>
          <GroupRow label="Cronômetro" last={!cfg.timerEnabled}>
            <AppleToggle checked={cfg.timerEnabled} onChange={v => set('timerEnabled', v)} />
          </GroupRow>
          {cfg.timerEnabled && (
            <div style={{ borderTop: '0.5px solid var(--separator)', padding: 12 }}>
              <SegmentedControl
                options={TIMER_OPTIONS.map(m => ({ value: String(m), label: `${m}m` }))}
                value={String(cfg.timerMinutes)}
                onChange={v => set('timerMinutes', Number(v))}
              />
            </div>
          )}
        </GroupSection>

        <AppleBtn label="Começar Simulado" onClick={() => onStart(cfg)} disabled={!canStart} />
      </div>
    </div>
  );
}
