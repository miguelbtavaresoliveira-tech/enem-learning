import { useEffect, useRef, useState } from 'react';
import type { SimuladoConfig, SimuladoSession, Question, Letter } from './types';
import { DISCIPLINE_COLORS, DISCIPLINE_LABELS } from './types';
import { NavTextBtn, ProgressBar } from './ui';
import { loadSimuladoQuestions } from './api';
import { QuestionContent } from './QuestionContent';
import { saveSession, getSeenIds } from './storage';

// MD3 tokens
const C = {
  primary: '#0037b0',
  primaryContainer: '#1d4ed8',
  primaryFixed: '#dce1ff',
  onPrimary: '#ffffff',
  onPrimaryFixed: '#001551',
  secondary: '#006d30',
  secondaryContainer: '#92f5a4',
  onSecondary: '#ffffff',
  error: '#ba1a1a',
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  surface: '#faf8ff',
  surfaceLowest: '#ffffff',
  surfaceContainerLow: '#f2f3ff',
  surfaceContainer: '#eaedff',
  surfaceContainerHigh: '#e2e7ff',
  onSurface: '#131b2e',
  onSurfaceVariant: '#434655',
  outlineVariant: '#c4c5d7',
  outline: '#747686',
};

type Phase = 'loading' | 'exam' | 'error';

interface Props {
  config: SimuladoConfig;
  onFinish: (session: SimuladoSession) => void;
  onBack: () => void;
}


/* ---- Answer card ---- */
function AnswerCard({
  session,
  current,
  onNavigate,
  onClose,
  revealMode,
}: {
  session: SimuladoSession;
  current: number;
  onNavigate: (i: number) => void;
  onClose?: () => void;
  revealMode: string;
}) {
  const refs = session.questionRefs;
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: C.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: '0.01em' }}>
          CartÃ£o-Resposta
        </span>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: C.onSurfaceVariant, cursor: 'pointer', lineHeight: 1 }}>Ã—</button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {refs.map((ref, i) => {
          const id = `${ref.year}-${ref.index}`;
          const sel = session.answers[id];
          const q = session.loadedQuestions[id];
          const isCurrent = i === current;

          let bg = C.surfaceContainerLow;
          let color = C.onSurfaceVariant;
          let outline = 'none';

          if (sel) {
            if (revealMode === 'immediate' && q) {
              if (sel === q.correctAlternative) {
                bg = C.secondaryContainer; color = C.secondary;
              } else {
                bg = C.errorContainer; color = C.error;
              }
            } else {
              bg = C.primaryFixed; color = C.primary;
            }
          }
          if (isCurrent) outline = `2px solid ${C.primary}`;

          return (
            <button
              key={i}
              onClick={() => onNavigate(i)}
              style={{
                width: '100%', aspectRatio: '1', borderRadius: 8, border: 'none',
                outline, outlineOffset: 2,
                background: bg, color, fontSize: 13, fontWeight: isCurrent ? 700 : 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.12s',
              }}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 11, color: C.onSurfaceVariant }}>
        <span>â—‹ Sem resposta</span>
        <span style={{ color: C.primary }}>â— Respondida</span>
        {revealMode === 'immediate' && (
          <>
            <span style={{ color: C.secondary }}>â— Certa</span>
            <span style={{ color: C.error }}>â— Errada</span>
          </>
        )}
      </div>
    </div>
  );
}

export function ExamScreen({ config, onFinish, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [retryKey, setRetryKey] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [loadProgress, setLoadProgress] = useState({ done: 0, total: 0 });
  const [session, setSession] = useState<SimuladoSession | null>(null);
  const [current, setCurrent] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const sessionRef = useRef<SimuladoSession | null>(null);
  const finishedRef = useRef(false);
  const initGuard = useRef(false);

  // Timer starts only when exam is ready (T-12)
  useEffect(() => {
    if (phase !== 'exam') return;
    timerRef.current = window.setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  useEffect(() => {
    // Guard against StrictMode double-invoke
    if (initGuard.current) return;
    initGuard.current = true;

    async function init() {
      setPhase('loading');
      setLoadProgress({ done: 0, total: 0 });
      try {
        const seenIds = config.onlyNew ? getSeenIds() : new Set<string>();
        const questions = await loadSimuladoQuestions(config, seenIds, (done, total) => {
          setLoadProgress({ done, total });
        });
        if (questions.length === 0) throw new Error('Nenhuma questão encontrada com esses filtros.');

        const loadedQuestions: Record<string, Question> = {};
        for (const q of questions) loadedQuestions[q.id] = q;

        const sess: SimuladoSession = {
          id: `${Date.now()}`,
          config,
          questionRefs: questions.map(q => ({
            year: q.year,
            index: q.index,
            discipline: q.discipline,
            language: q.language,
          })),
          loadedQuestions,
          answers: {},
          startedAt: new Date().toISOString(),
        };
        sessionRef.current = sess;
        setSession(sess);
        setPhase('exam');
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Erro ao carregar questões.');
        setPhase('error');
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryKey]);

  const currentId = session ? `${session.questionRefs[current]?.year}-${session.questionRefs[current]?.index}` : '';
  const currentQ: Question | null = session?.loadedQuestions[currentId] ?? null;

  const navigate = (idx: number) => {
    if (!session) return;
    if (idx < 0 || idx >= session.questionRefs.length) return;
    setCurrent(idx);
    setSheetOpen(false);
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') navigate(current + 1);
      if (e.key === 'ArrowLeft') navigate(current - 1);
      // Block letter keys after gabarito is revealed
      if (revealed[currentId]) return;
      // Also block when answer already set in immediate mode and revealed
      if (config.revealMode === 'immediate' && session?.answers[currentId] && revealed[currentId]) return;
      const letters: Letter[] = ['A', 'B', 'C', 'D', 'E'];
      const idx = letters.indexOf(e.key.toUpperCase() as Letter);
      if (idx >= 0 && currentQ && currentQ.alternatives[idx]) answer(letters[idx]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const handleFinish = () => {
    if (!session || finishedRef.current) return;
    finishedRef.current = true;
    onFinish({ ...session, finishedAt: new Date().toISOString() });
  };

  const remaining = config.timerEnabled ? Math.max(0, config.timerMinutes * 60 - elapsed) : 0;
  const timeStr = config.timerEnabled
    ? `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
    : `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  // T-12: use ref to prevent double-fire from StrictMode
  useEffect(() => {
    if (phase === 'exam' && config.timerEnabled && elapsed >= config.timerMinutes * 60) handleFinish();
  });

  if (phase === 'loading') {
    const pct = loadProgress.total > 0 ? Math.round((loadProgress.done / loadProgress.total) * 100) : 0;
    const label = loadProgress.total > 0
      ? `Baixando questões… ${loadProgress.done}/${loadProgress.total}`
      : 'Preparando questões…';
    return (
      <div style={{ minHeight: '100dvh', background: C.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: 24 }}>
        <div style={{ fontSize: 17, color: C.onSurface, fontWeight: 500 }}>{label}</div>
        <div style={{ width: '100%', maxWidth: 320 }}>
          <ProgressBar value={pct} color={C.primaryContainer} />
        </div>
        <div style={{ fontSize: 14, color: C.onSurfaceVariant }}>{loadProgress.done} / {loadProgress.total} requisições</div>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={{ minHeight: '100dvh', background: C.surface, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div style={{ fontSize: 17, color: C.error, textAlign: 'center' }}>{errorMsg}</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onBack} style={{ color: C.onSurfaceVariant, background: 'none', border: `1px solid ${C.outlineVariant}`, borderRadius: 8, padding: '10px 20px', fontSize: 15, cursor: 'pointer' }}>Voltar</button>
          <button onClick={() => { finishedRef.current = false; initGuard.current = false; setErrorMsg(''); setRetryKey(k => k + 1); }}
            style={{ color: C.onPrimary, background: C.primaryContainer, border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const totalQ = session.questionRefs.length;
  const answered = Object.keys(session.answers).length;
  const progressPct = totalQ > 1 ? (current / (totalQ - 1)) * 100 : 100;
  const currentRef = session.questionRefs[current] ?? null;
  const discColor = currentRef ? DISCIPLINE_COLORS[currentRef.discipline] : C.primary;

  return (
    <div style={{ minHeight: '100dvh', background: C.surface, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        height: 64, background: C.surfaceLowest,
        borderBottom: `1px solid ${C.outlineVariant}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', flexShrink: 0,
      }}>
        <NavTextBtn label="â† Sair da sessÃ£o" onClick={onBack} />
        <span style={{ fontSize: 15, fontWeight: 600, color: C.onSurface }}>
          QuestÃ£o {current + 1} de {totalQ}
        </span>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: C.surfaceContainerLow, borderRadius: 20,
          padding: '4px 12px', fontSize: 14, fontWeight: 500,
          color: config.timerEnabled && remaining < 60 ? C.error : C.onSurfaceVariant,
        }}>
          ðŸ• {timeStr}
        </div>
      </header>

      {/* Progress bar */}
      <div style={{ height: 2, background: C.primaryFixed, flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: C.primaryContainer, transition: 'width 0.3s' }} />
      </div>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Question area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px 140px' }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            {/* Discipline tag */}
            {currentRef && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16,
                background: C.surfaceContainerLow, borderRadius: 20, padding: '4px 12px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: discColor }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: C.onSurfaceVariant }}>
                  {DISCIPLINE_LABELS[currentRef.discipline]}
                </span>
                <span style={{ fontSize: 12, color: C.outline }}>Â· ENEM {currentRef.year} Â· Q{currentRef.index}</span>
              </div>
            )}

            {currentQ && (
              <QuestionContent
                question={currentQ}
                selected={session.answers[currentId]}
                revealed={config.revealMode === 'immediate' ? revealed[currentId] : false}
                onAnswer={answer}
              />
            )}
          </div>
        </div>

        {/* Desktop sidebar */}
        <aside style={{
          width: 280, flexShrink: 0,
          borderLeft: `1px solid ${C.outlineVariant}`,
          overflowY: 'auto', background: C.surfaceLowest,
          display: 'none',
        }} className="exam-sidebar">
          <style>{`@media (min-width: 768px) { .exam-sidebar { display: block !important; } }`}</style>
          <AnswerCard session={session} current={current} onNavigate={navigate} revealMode={config.revealMode} />
        </aside>
      </div>

      {/* Mobile FAB */}
      <button className="exam-fab" onClick={() => setSheetOpen(true)} style={{
        position: 'fixed', bottom: 84, right: 16, zIndex: 20,
        background: C.primaryContainer, color: C.onPrimary,
        border: 'none', borderRadius: 20, padding: '10px 16px',
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,55,176,0.3)',
      }}>
        <style>{`@media (min-width: 768px) { .exam-fab { display: none !important; } }`}</style>
        ðŸ“‹ {answered}/{totalQ}
      </button>

      {/* Mobile bottom sheet */}
      {sheetOpen && (
        <>
          <div onClick={() => setSheetOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(19,27,46,0.5)', zIndex: 30 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
            background: C.surfaceLowest, borderRadius: '16px 16px 0 0',
            maxHeight: '70vh', overflowY: 'auto',
            paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
          }}>
            <div style={{ width: 32, height: 4, borderRadius: 2, background: C.outlineVariant, margin: '12px auto 0' }} />
            <AnswerCard session={session} current={current} onNavigate={navigate} onClose={() => setSheetOpen(false)} revealMode={config.revealMode} />
          </div>
        </>
      )}

      {/* Bottom navigation */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: C.surfaceLowest,
        borderTop: `1px solid ${C.outlineVariant}`,
        padding: '12px 16px',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
        display: 'flex', gap: 12,
      }}>
        <button onClick={() => navigate(current - 1)} disabled={current === 0} style={{
          flex: 1, padding: '12px 0', borderRadius: 8,
          border: `1px solid ${current === 0 ? C.outlineVariant : C.outline}`,
          background: C.surfaceLowest,
          color: current === 0 ? C.outline : C.onSurface,
          fontSize: 15, fontWeight: 500, cursor: current === 0 ? 'not-allowed' : 'pointer',
        }}>â† Anterior</button>

        {current < totalQ - 1 ? (
          <button onClick={() => navigate(current + 1)} style={{
            flex: 1, padding: '12px 0', borderRadius: 8, border: 'none',
            background: C.primaryContainer, color: C.onPrimary,
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>PrÃ³xima â†’</button>
        ) : (
          <button onClick={handleFinish} style={{
            flex: 1, padding: '12px 0', borderRadius: 8, border: 'none',
            background: answered === totalQ ? '#006d30' : C.primaryContainer,
            color: C.onPrimary, fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}>Finalizar ({answered}/{totalQ})</button>
        )}
      </div>
    </div>
  );
}


