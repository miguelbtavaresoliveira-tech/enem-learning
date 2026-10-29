import { useState } from 'react';
import { TopNav, NavTextBtn, ScoreRing } from './ui';
import { getResults, deleteResult, clearResults, clearSeen } from './storage';
import type { SimuladoResult } from './types';
import { DISCIPLINE_LABELS, DISCIPLINE_COLORS } from './types';

export function HistoryScreen({ onBack }: { onBack: () => void }) {
  const [results, setResults] = useState<SimuladoResult[]>(() => getResults());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleDelete = (id: string) => {
    deleteResult(id);
    setResults(getResults());
  };

  const handleClearAll = () => {
    if (window.confirm('Apagar todo o histórico?')) {
      clearResults();
      setResults([]);
    }
  };

  const handleClearSeen = () => {
    if (window.confirm('Resetar todas as questões marcadas como vistas?')) {
      clearSeen();
    }
  };

  const totalQ = results.reduce((s, r) => s + r.totalQuestions, 0);
  const totalCorrect = results.reduce((s, r) => s + r.correct, 0);
  const avgPct = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;
  const bestPct = results.length > 0 ? Math.max(...results.map(r => r.totalQuestions > 0 ? Math.round((r.correct / r.totalQuestions) * 100) : 0)) : 0;

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--sys-bg)' }}>
      <TopNav title="Histórico" left={<NavTextBtn label="← Voltar" onClick={onBack} />} />

      <div style={{ padding: '20px 16px 40px', maxWidth: 600, margin: '0 auto' }}>

        {results.length > 0 && (
          <div style={{ background: 'var(--card-bg)', borderRadius: 16, padding: 20, marginBottom: 24, display: 'flex', justifyContent: 'space-around', border: '0.5px solid var(--separator)' }}>
            <StatTile label="Simulados" value={String(results.length)} />
            <StatTile label="Questões" value={String(totalQ)} />
            <StatTile label="Média" value={`${avgPct}%`} />
            <StatTile label="Melhor" value={`${bestPct}%`} />
          </div>
        )}

        {results.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--secondary-label)' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 17 }}>Nenhum simulado ainda</div>
          </div>
        ) : (
          results.map(r => {
            const pct = r.totalQuestions > 0 ? (r.correct / r.totalQuestions) * 100 : 0;
            const open = expanded[r.id];
            return (
              <div key={r.id} style={{ background: 'var(--card-bg)', borderRadius: 16, marginBottom: 12, overflow: 'hidden', border: '0.5px solid var(--separator)' }}>
                <div onClick={() => setExpanded(e => ({ ...e, [r.id]: !open }))} style={{ padding: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <ScoreRing pct={pct} size={56} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--label)' }}>{r.correct}/{r.totalQuestions} acertos</div>
                    <div style={{ fontSize: 13, color: 'var(--secondary-label)', marginTop: 2 }}>
                      {new Date(r.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' · '}{Math.floor(r.elapsedSeconds / 60)}m{r.elapsedSeconds % 60}s
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {r.disciplineScores.map(ds => (
                        <span key={ds.discipline} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: DISCIPLINE_COLORS[ds.discipline] + '22', color: DISCIPLINE_COLORS[ds.discipline] }}>
                          {DISCIPLINE_LABELS[ds.discipline].split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span style={{ color: 'var(--secondary-label)', fontSize: 13 }}>{open ? '▲' : '▼'}</span>
                </div>

                {open && (
                  <div style={{ borderTop: '0.5px solid var(--separator)', padding: '12px 16px' }}>
                    {r.disciplineScores.map(ds => {
                      const dp = ds.total > 0 ? (ds.correct / ds.total) * 100 : 0;
                      return (
                        <div key={ds.discipline} style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, color: DISCIPLINE_COLORS[ds.discipline] }}>{DISCIPLINE_LABELS[ds.discipline]}</span>
                            <span style={{ fontSize: 13, color: 'var(--secondary-label)' }}>{ds.correct}/{ds.total}</span>
                          </div>
                          <div style={{ height: 4, background: 'var(--sys-bg)', borderRadius: 2 }}>
                            <div style={{ height: '100%', width: `${dp}%`, background: DISCIPLINE_COLORS[ds.discipline], borderRadius: 2 }} />
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={() => handleDelete(r.id)} style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--red)', fontSize: 14, cursor: 'pointer', padding: 0 }}>
                      Apagar simulado
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {results.length > 0 && (
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button onClick={handleClearSeen} style={{ background: 'none', border: 'none', color: 'var(--orange)', fontSize: 15, cursor: 'pointer', padding: '12px 0' }}>
              Resetar questões vistas
            </button>
            <button onClick={handleClearAll} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 15, cursor: 'pointer', padding: '12px 0' }}>
              Limpar todo o histórico
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--label)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--secondary-label)', marginTop: 2 }}>{label}</div>
    </div>
  );
}
