import { useEffect, useState } from 'react';
import type { SimuladoSession, SimuladoResult, DisciplineScore, Discipline } from './types';
import { ALL_DISCIPLINES, DISCIPLINE_LABELS, DISCIPLINE_COLORS } from './types';
import { AppleNav, ScoreRing, AppleBtn } from './ui';
import { markSeen, saveResult } from './storage';

interface Props {
  session: SimuladoSession;
  onNewSimulado: () => void;
  onHistory: () => void;
}

export function SummaryScreen({ session, onNewSimulado, onHistory }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [result] = useState<SimuladoResult>(() => buildResult(session));

  useEffect(() => {
    // Mark all answered questions as seen
    const ids = session.questionRefs.map(r => `${r.year}-${r.index}`);
    markSeen(ids);
    saveResult(result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = result.totalQuestions > 0 ? (result.correct / result.totalQuestions) * 100 : 0;
  const elapsed = result.elapsedSeconds;
  const timeStr = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  const copyPrompt = () => {
    const wrong = result.wrongAnswers;
    const lines = wrong.map(w => `- ENEM ${w.year}, questão ${w.index}: marquei ${w.selected}, correto era ${w.correct}. "${w.title.slice(0, 80)}..."`);
    const text = `Errei ${wrong.length} questões no simulado ENEM. Me ajude a revisar:\n\n${lines.join('\n')}`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  };

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--sys-bg)' }}>
      <AppleNav
        title="Resultado"
        right={<button onClick={onHistory} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 17, cursor: 'pointer' }}>Histórico</button>}
      />

      <div style={{ padding: '24px 16px 40px', maxWidth: 600, margin: '0 auto' }}>

        {/* Score hero */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 20, padding: 24, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20, border: '0.5px solid var(--separator)' }}>
          <ScoreRing pct={pct} size={90} />
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--label)' }}>{result.correct} / {result.totalQuestions}</div>
            <div style={{ fontSize: 15, color: 'var(--secondary-label)', marginTop: 2 }}>acertos · {timeStr}</div>
            <div style={{ fontSize: 13, color: 'var(--tertiary-label)', marginTop: 4 }}>
              {new Date(result.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </div>
          </div>
        </div>

        {/* Per discipline */}
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, overflow: 'hidden', marginBottom: 24, border: '0.5px solid var(--separator)' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--separator)', fontSize: 15, fontWeight: 600, color: 'var(--label)' }}>Por disciplina</div>
          {result.disciplineScores.map((ds, i) => {
            const dp = ds.total > 0 ? (ds.correct / ds.total) * 100 : 0;
            return (
              <div key={ds.discipline} style={{ padding: '12px 16px', borderBottom: i < result.disciplineScores.length - 1 ? '0.5px solid var(--separator)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 15, color: DISCIPLINE_COLORS[ds.discipline], fontWeight: 600 }}>{DISCIPLINE_LABELS[ds.discipline]}</span>
                  <span style={{ fontSize: 15, color: 'var(--secondary-label)' }}>{ds.correct}/{ds.total}</span>
                </div>
                <div style={{ height: 6, background: 'var(--sys-bg)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${dp}%`, background: DISCIPLINE_COLORS[ds.discipline], borderRadius: 3, transition: 'width 0.6s' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Wrong answers */}
        {result.wrongAnswers.length > 0 && (
          <div style={{ background: 'var(--card-bg)', borderRadius: 16, overflow: 'hidden', marginBottom: 24, border: '0.5px solid var(--separator)' }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid var(--separator)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--label)' }}>Questões erradas ({result.wrongAnswers.length})</span>
              <button onClick={copyPrompt} style={{ background: 'none', border: 'none', color: 'var(--blue)', fontSize: 14, cursor: 'pointer' }}>
                {copied ? '✓ Copiado' : 'Copiar prompt IA'}
              </button>
            </div>
            {result.wrongAnswers.map((w, i) => {
              const key = w.questionId;
              const open = expanded[key];
              const q = session.loadedQuestions[key];
              return (
                <div key={key} style={{ borderBottom: i < result.wrongAnswers.length - 1 ? '0.5px solid var(--separator)' : 'none' }}>
                  <div onClick={() => setExpanded(e => ({ ...e, [key]: !open }))} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 4, flexShrink: 0, height: 20, borderRadius: 2, background: DISCIPLINE_COLORS[w.discipline], marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: 'var(--secondary-label)', marginBottom: 2 }}>ENEM {w.year} · {DISCIPLINE_LABELS[w.discipline]}</div>
                      <div style={{ fontSize: 15, color: 'var(--label)', lineHeight: 1.4 }}>{w.title.slice(0, 100)}{w.title.length > 100 ? '…' : ''}</div>
                      <div style={{ fontSize: 13, marginTop: 4 }}>
                        <span style={{ color: 'var(--red)' }}>Marquei: {w.selected}</span>
                        <span style={{ color: 'var(--secondary-label)' }}> · </span>
                        <span style={{ color: 'var(--green)' }}>Correto: {w.correct}</span>
                      </div>
                    </div>
                    <span style={{ color: 'var(--secondary-label)', fontSize: 17 }}>{open ? '▲' : '▼'}</span>
                  </div>
                  {open && q && (
                    <div style={{ padding: '0 16px 12px 32px', fontSize: 14, color: 'var(--secondary-label)', lineHeight: 1.5 }}>
                      {q.context && <div style={{ marginBottom: 8, fontStyle: 'italic' }}>{q.context.slice(0, 200)}…</div>}
                      {q.alternatives.map(a => (
                        <div key={a.letter} style={{ padding: '4px 0', color: a.isCorrect ? 'var(--green)' : w.selected === a.letter ? 'var(--red)' : 'var(--secondary-label)', fontWeight: a.isCorrect ? 600 : 400 }}>
                          {a.letter}) {a.text?.slice(0, 80)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <AppleBtn label="Novo Simulado" onClick={onNewSimulado} />
      </div>
    </div>
  );
}

function buildResult(session: SimuladoSession): SimuladoResult {
  const { questionRefs, loadedQuestions, answers, config, startedAt, finishedAt } = session;
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const elapsedSeconds = Math.floor((end - start) / 1000);

  const disciplineMap: Record<Discipline, DisciplineScore> = {} as Record<Discipline, DisciplineScore>;
  for (const d of ALL_DISCIPLINES) disciplineMap[d] = { discipline: d, correct: 0, total: 0 };

  let correct = 0;
  const wrongAnswers: SimuladoResult['wrongAnswers'] = [];

  for (const ref of questionRefs) {
    const id = `${ref.year}-${ref.index}`;
    const q = loadedQuestions[id];
    const sel = answers[id];
    if (!q) continue;
    disciplineMap[ref.discipline].total++;
    if (sel === q.correctAlternative) {
      correct++;
      disciplineMap[ref.discipline].correct++;
    } else if (sel) {
      wrongAnswers.push({ questionId: id, year: ref.year, index: ref.index, discipline: ref.discipline, selected: sel, correct: q.correctAlternative, title: q.title });
    }
  }

  const disciplineScores = config.disciplines
    .map(d => disciplineMap[d])
    .filter(ds => ds.total > 0);

  return {
    id: session.id,
    config,
    totalQuestions: Object.keys(answers).length,
    correct,
    disciplineScores,
    wrongAnswers,
    startedAt,
    finishedAt: finishedAt ?? new Date().toISOString(),
    elapsedSeconds,
  };
}
