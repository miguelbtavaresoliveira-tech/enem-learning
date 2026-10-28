import { useCallback, useEffect, useRef, useState } from 'react';
import type { SimuladoConfig, SimuladoSession, QuestionRef, Question, Letter } from './types';
import { DISCIPLINE_COLORS, DISCIPLINE_LABELS } from './types';
import { AppleNav, NavBtn, ProgressBar } from './ui';
import { buildQuestionRefs, fetchQuestion } from './api';
import { saveSession, getSeenIds } from './storage';

type Phase = 'loading' | 'exam' | 'error';

interface Props {
  config: SimuladoConfig;
  onFinish: (session: SimuladoSession) => void;
  onBack: () => void;
}

const PREFETCH = 2;

export function ExamScreen({ config, onFinish, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [loadProgress, setLoadProgress] = useState({ done: 0, total: 1 });
  const [errorMsg, setErrorMsg] = useState('');
  const [session, setSession] = useState<SimuladoSession | null>(null);
  const [current, setCurrent] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const timerRef = useRef<number | null>(null);
  const sessionRef = useRef<SimuladoSession | null>(null);

  // Timer
  useEffect(() => {
    timerRef.current = window.setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Build refs + load first questions
  useEffect(() => {
    async function init() {
      try {
        const seenIds = config.onlyNew ? getSeenIds() : new Set<string>();
        const refs = await buildQuestionRefs(
          config.years, config.disciplines, config.questionCount,
          config.difficulty, config.onlyNew, seenIds,
          (done, total) => setLoadProgress({ done, total }),
        );
        if (refs.length === 0) throw new Error('Nenhuma questão encontrada com esses filtros.');

        const sess: SimuladoSession = {
          id: `${Date.now()}`,
          config,
          questionRefs: refs,
          loadedQuestions: {},
          answers: {},
          startedAt: new Date().toISOString(),
        };
        sessionRef.current = sess;
        setSession(sess);
        setPhase('exam');
        prefetchAhead(sess, 0);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Erro ao carregar questões.');
        setPhase('error');
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prefetchAhead = useCallback(async (sess: SimuladoSession, idx: number) => {
    for (let i = idx; i <= Math.min(idx + PREFETCH, sess.questionRefs.length - 1); i++) {
      const ref = sess.questionRefs[i];
      const id = `${ref.year}-${ref.index}`;
      if (sess.loadedQuestions[id]) continue;
      try {
        const q = await fetchQuestion(ref);
        setSession(s => {
          if (!s) return s;
          const updated = { ...s, loadedQuestions: { ...s.loadedQuestions, [id]: q } };
          sessionRef.current = updated;
          saveSession(updated);
          return updated;
        });
      } catch { /* skip on prefetch error */ }
    }
  }, []);

  const currentRef: QuestionRef | null = session ? session.questionRefs[current] ?? null : null;
  const currentId = currentRef ? `${currentRef.year}-${currentRef.index}` : '';
  const currentQ: Question | null = session?.loadedQuestions[currentId] ?? null;

  const navigate = (dir: number) => {
    if (!session) return;
    const next = current + dir;
    if (next < 0 || next >= session.questionRefs.length) return;
    setCurrent(next);
    prefetchAhead(session, next);
  };

  const answer = (letter: Letter) => {
    if (!session || !currentId) return;
    setSession(s => {
      if (!s) return s;
      const updated = { ...s, answers: { ...s.answers, [currentId]: letter } };
      sessionRef.current = updated;
      saveSession(updated);
      return updated;
    });
    if (config.revealMode === 'immediate') {
      setRevealed(r => ({ ...r, [currentId]: true }));
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navigate(1);
      if (e.key === 'ArrowLeft') navigate(-1);
      const letters: Letter[] = ['A', 'B', 'C', 'D', 'E'];
      const idx = letters.indexOf(e.key.toUpperCase() as Letter);
      if (idx >= 0 && currentQ && currentQ.alternatives[idx]) answer(letters[idx]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const handleFinish = () => {
    if (!session) return;
    const finished = { ...session, finishedAt: new Date().toISOString() };
    onFinish(finished);
  };

  // Timer display
  const timeStr = config.timerEnabled
    ? `${String(Math.floor(Math.max(0, config.timerMinutes * 60 - elapsed) / 60)).padStart(2, '0')}:${String(Math.max(0, config.timerMinutes * 60 - elapsed) % 60).padStart(2, '0')}`
    : `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  // Auto-finish if timer runs out
  useEffect(() => {
    if (config.timerEnabled && elapsed >= config.timerMinutes * 60) {
      handleFinish();
    }
  });

  if (phase === 'loading') {
    const pct = loadProgress.total > 0 ? (loadProgress.done / loadProgress.total) * 100 : 0;
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--sys-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 }}>
        <div style={{ fontSize: 17, color: 'var(--label)' }}>Preparando questões…</div>
        <div style={{ width: '100%', maxWidth: 300 }}>
          <ProgressBar value={pct} />
        </div>
        <div style={{ fontSize: 14, color: 'var(--secondary-label)' }}>
          {loadProgress.done} / {loadProgress.total} anos carregados
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={{ minHeight: '100dvh', background: 'var(--sys-bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div style={{ fontSize: 17, color: 'var(--red)', textAlign: 'center' }}>{errorMsg}</div>
        <button onClick={onBack} style={{ color: 'var(--blue)', background: 'none', border: 'none', fontSize: 17, cursor: 'pointer' }}>Voltar</button>
      </div>
    );
  }

  if (!session) return null;

  const totalQ = session.questionRefs.length;
  const answered = Object.keys(session.answers).length;
  const progressPct = (current / Math.max(1, totalQ - 1)) * 100;
  const discColor = currentRef ? DISCIPLINE_COLORS[currentRef.discipline] : 'var(--blue)';

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--sys-bg)', display: 'flex', flexDirection: 'column' }}>
      <AppleNav
        title={`${current + 1} / ${totalQ}`}
        left={<NavBtn label="Sair" onClick={onBack} />}
        right={<span style={{ fontSize: 15, color: 'var(--secondary-label)', fontVariantNumeric: 'tabular-nums' }}>{timeStr}</span>}
      />
      <ProgressBar value={progressPct} color={discColor} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 120px', maxWidth: 720, margin: '0 auto', width: '100%' }}>
        {/* Discipline stripe */}
        {currentRef && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: discColor }} />
            <span style={{ fontSize: 13, color: discColor, fontWeight: 600 }}>{DISCIPLINE_LABELS[currentRef.discipline]}</span>
            <span style={{ fontSize: 13, color: 'var(--tertiary-label)' }}>· ENEM {currentRef?.year}</span>
          </div>
        )}

        {!currentQ ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--secondary-label)' }}>Carregando questão…</div>
        ) : (
          <QuestionCard
            question={currentQ}
            selected={session.answers[currentId]}
            revealed={config.revealMode === 'immediate' ? revealed[currentId] : false}
            onAnswer={answer}
          />
        )}
      </div>

      {/* Bottom navigation */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--nav-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: '0.5px solid var(--separator)',
        padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
        display: 'flex', gap: 12, alignItems: 'center',
      }}>
        <button onClick={() => navigate(-1)} disabled={current === 0} style={{
          flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--separator)',
          background: 'var(--card-bg)', color: current === 0 ? 'var(--tertiary-label)' : 'var(--label)',
          fontSize: 17, cursor: current === 0 ? 'not-allowed' : 'pointer',
        }}>← Anterior</button>

        {current < totalQ - 1 ? (
          <button onClick={() => navigate(1)} style={{
            flex: 1, padding: 12, borderRadius: 12, border: 'none',
            background: 'var(--blue)', color: '#fff', fontSize: 17, fontWeight: 600, cursor: 'pointer',
          }}>Próxima →</button>
        ) : (
          <button onClick={handleFinish} style={{
            flex: 1, padding: 12, borderRadius: 12, border: 'none',
            background: answered === totalQ ? 'var(--green)' : 'var(--blue)',
            color: '#fff', fontSize: 17, fontWeight: 600, cursor: 'pointer',
          }}>Finalizar ({answered}/{totalQ})</button>
        )}
      </div>
    </div>
  );
}

function QuestionCard({ question, selected, revealed, onAnswer }: {
  question: Question; selected: Letter | undefined; revealed: boolean; onAnswer: (l: Letter) => void;
}) {
  return (
    <div>
      {question.context && (
        <div style={{ background: 'var(--card-bg)', borderRadius: 12, padding: 16, marginBottom: 12, fontSize: 15, lineHeight: 1.6, color: 'var(--label)', border: '0.5px solid var(--separator)' }}>
          {question.context}
        </div>
      )}
      {question.files?.map((url, i) => (
        <img key={i} src={url} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: 8 }} />
      ))}
      <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--label)', marginBottom: 16 }}>
        {question.title}
      </div>
      {question.alternativesIntroduction && (
        <div style={{ fontSize: 14, color: 'var(--secondary-label)', marginBottom: 8 }}>{question.alternativesIntroduction}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {question.alternatives.map(alt => {
          const isSelected = selected === alt.letter;
          const isCorrect = alt.isCorrect;
          let bg = 'var(--card-bg)';
          let border = '1px solid var(--separator)';
          let color = 'var(--label)';
          if (revealed) {
            if (isCorrect) { bg = 'rgba(52,199,89,0.12)'; border = '1.5px solid var(--green)'; }
            else if (isSelected && !isCorrect) { bg = 'rgba(255,59,48,0.12)'; border = '1.5px solid var(--red)'; color = 'var(--red)'; }
          } else if (isSelected) {
            bg = 'rgba(0,122,255,0.08)'; border = '1.5px solid var(--blue)'; color = 'var(--blue)';
          }
          return (
            <button key={alt.letter} onClick={() => !revealed && onAnswer(alt.letter)} style={{
              display: 'flex', alignItems: 'flex-start', gap: 12, padding: 14,
              background: bg, border, borderRadius: 12, cursor: revealed ? 'default' : 'pointer',
              textAlign: 'left', color, transition: 'all 0.15s',
            }}>
              <span style={{ fontWeight: 700, fontSize: 15, flexShrink: 0, width: 22 }}>{alt.letter}</span>
              <div style={{ fontSize: 15, lineHeight: 1.5 }}>
                {alt.text}
                {alt.file && <img src={alt.file} alt="" style={{ maxWidth: '100%', borderRadius: 6, marginTop: 6 }} />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
