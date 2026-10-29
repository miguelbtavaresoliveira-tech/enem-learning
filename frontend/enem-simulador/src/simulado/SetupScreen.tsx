import { useState } from 'react';
import type { SimuladoConfig, Discipline, DifficultyLevel } from './types';
import { ALL_DISCIPLINES, AVAILABLE_YEARS } from './types';
import { C, TopNav, NavTextBtn, FormSection, DisciplineCard, Chip, SegmentedControl, Toggle, PrimaryBtn } from './ui';

const DISC_META: Record<Discipline, { label: string; subtitle: string; color: string }> = {
  'ciencias-humanas': { label: 'Ciências Humanas e suas Tecnologias', subtitle: 'História, Geografia, Filosofia e Sociologia', color: '#C2410C' },
  'ciencias-natureza': { label: 'Ciências da Natureza e suas Tecnologias', subtitle: 'Física, Química e Biologia', color: '#15803D' },
  linguagens: { label: 'Linguagens, Códigos e suas Tecnologias', subtitle: 'Língua Portuguesa, Literatura, Inglês e Espanhol', color: '#1D4ED8' },
  matematica: { label: 'Matemática e suas Tecnologias', subtitle: 'Aritmética, Álgebra, Geometria e Estatística', color: '#6D28D9' },
};

const Q_COUNTS = [5, 10, 20, 30, 45, 60, 90];
const TIMER_OPTS = [15, 30, 45, 60, 90, 120, 180];

const DEFAULT: SimuladoConfig = {
  disciplines: [...ALL_DISCIPLINES],
  years: AVAILABLE_YEARS.slice(0, 5),
  questionCount: 20,
  onlyNew: false,
  difficulty: 'all',
  revealMode: 'immediate',
  timerEnabled: false,
  timerMinutes: 30,
};

export function SetupScreen({ onStart, onHistory, onHome }: {
  onStart: (c: SimuladoConfig) => void;
  onHistory: () => void;
  onHome?: () => void;
}) {
  const [cfg, setCfg] = useState<SimuladoConfig>(DEFAULT);
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

  return (
    <div style={{ minHeight: '100dvh', background: C.surface, fontFamily: "'Inter', sans-serif" }}>
      <TopNav
        title="Configuração de Simulado"
        left={onHome ? <NavTextBtn label="← Início" onClick={onHome} /> : <span />}
        right={<NavTextBtn label="Histórico" onClick={onHistory} />}
      />

      <main style={{ paddingTop: 64, maxWidth: 880, margin: '0 auto', padding: '80px 1.5rem 60px' }}>

        {/* Banner */}
        <div style={{ background: C.surfaceLow, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, border: `1px solid ${C.outlineVariant}66` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: C.primaryFixed, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🎯</div>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: C.onSurface, margin: '0 0 2px' }}>Parâmetros de Treinamento</h2>
              <p style={{ fontSize: 13, color: C.onSurfaceVariant, margin: 0 }}>Calibre a bateria de exercícios de acordo com sua meta pedagógica e tempo disponível.</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: C.surfaceLowest, borderRadius: 8, border: `1px solid ${C.outlineVariant}66`, flexShrink: 0 }}>
            <span style={{ fontSize: 13 }}>✅</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: C.onSurface }}>Matriz de Referência ENEM</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Disciplines */}
          <FormSection label="Áreas do Conhecimento" hint="Selecione uma ou mais disciplinas para compor o caderno de questões.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
              {ALL_DISCIPLINES.map(d => (
                <DisciplineCard
                  key={d} discipline={d}
                  label={DISC_META[d].label} subtitle={DISC_META[d].subtitle}
                  color={DISC_META[d].color}
                  checked={cfg.disciplines.includes(d)}
                  onChange={() => toggleDisc(d)}
                />
              ))}
            </div>
          </FormSection>

          {/* Years */}
          <FormSection label="Anos de Aplicação" hint="Escolha os cadernos de questões por ano do ENEM.">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              {AVAILABLE_YEARS.map(y => (
                <Chip key={y} label={String(y)} active={cfg.years.includes(y)} onClick={() => toggleYear(y)} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, borderTop: `1px solid ${C.outlineVariant}66`, paddingTop: 10 }}>
              {[
                { label: 'Todos', fn: () => set('years', [...AVAILABLE_YEARS]) },
                { label: 'Últimos 3', fn: () => set('years', AVAILABLE_YEARS.slice(0, 3)) },
                { label: 'Últimos 5', fn: () => set('years', AVAILABLE_YEARS.slice(0, 5)) },
              ].map(btn => (
                <button key={btn.label} onClick={btn.fn} style={{ background: 'none', border: 'none', color: C.primaryContainer, fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: '2px 0' }}>{btn.label}</button>
              ))}
            </div>
          </FormSection>

          {/* Quantity */}
          <FormSection label="Quantidade de Questões">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {Q_COUNTS.map(n => (
                <Chip key={n} label={String(n)} active={cfg.questionCount === n} onClick={() => set('questionCount', n)} />
              ))}
            </div>
          </FormSection>

          {/* Difficulty */}
          <FormSection label="Nível de Dificuldade" hint="Baseado na posição da questão no caderno oficial (heurística TRI).">
            <SegmentedControl
              options={[{ value: 'all', label: 'Todas' }, { value: 'easy', label: 'Fácil' }, { value: 'medium', label: 'Média' }, { value: 'hard', label: 'Difícil' }] as { value: DifficultyLevel; label: string }[]}
              value={cfg.difficulty}
              onChange={v => set('difficulty', v)}
            />
          </FormSection>

          {/* Options */}
          <FormSection label="Opções de Sessão">
            {([
              { label: 'Apenas questões novas', sub: 'Filtra questões que você ainda não respondeu', key: 'onlyNew' as const, type: 'toggle' },
              { label: 'Ver gabarito imediatamente', sub: 'Mostra acerto/erro ao selecionar a alternativa', key: 'revealMode' as const, type: 'reveal' },
              { label: 'Cronômetro regressivo', sub: 'Define tempo máximo para a sessão', key: 'timerEnabled' as const, type: 'toggle' },
            ] as const).map((opt, i, arr) => (
              <div key={opt.key}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? `1px solid ${C.outlineVariant}66` : 'none' }}>
                  <div>
                    <div style={{ fontSize: 15, color: C.onSurface, fontWeight: 500 }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: C.onSurfaceVariant, marginTop: 1 }}>{opt.sub}</div>
                  </div>
                  {opt.type === 'reveal'
                    ? <Toggle checked={cfg.revealMode === 'immediate'} onChange={v => set('revealMode', v ? 'immediate' : 'end')} />
                    : <Toggle checked={cfg[opt.key] as boolean} onChange={v => set(opt.key, v as SimuladoConfig[typeof opt.key])} />
                  }
                </div>
                {opt.key === 'timerEnabled' && cfg.timerEnabled && (
                  <div style={{ paddingBottom: 12 }}>
                    <SegmentedControl
                      options={TIMER_OPTS.map(m => ({ value: String(m), label: `${m}m` }))}
                      value={String(cfg.timerMinutes)}
                      onChange={v => set('timerMinutes', Number(v))}
                    />
                  </div>
                )}
              </div>
            ))}
          </FormSection>

          <PrimaryBtn label="Iniciar Sessão de Treinamento →" onClick={() => onStart(cfg)} disabled={cfg.disciplines.length === 0 || cfg.years.length === 0} />
        </div>
      </main>
    </div>
  );
}
