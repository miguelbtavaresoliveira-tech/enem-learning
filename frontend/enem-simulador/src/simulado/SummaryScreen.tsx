import { useEffect, useState } from 'react';
import type { SimuladoSession, SimuladoResult, WrongAnswer, DisciplineScore, Discipline, Letter, Question } from './types';
import { ALL_DISCIPLINES, DISCIPLINE_LABELS, DISCIPLINE_COLORS } from './types';
import { TopNav, ScoreRing } from './ui';
import { QuestionContent } from './QuestionContent';
import { markSeen, saveResult } from './storage';

function previewText(w: WrongAnswer): string {
  const plain = (w.alternativesIntroduction || w.context || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/[*_#>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return 'Questão com imagem — toque para ver completa';
  return plain.length > 120 ? `${plain.slice(0, 120)}…` : plain;
}

// MD3 tokens
const C = {
  primary: '#0037b0',
  primaryContainer: '#1d4ed8',
  primaryFixed: '#dce1ff',
  onPrimary: '#ffffff',
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
  onSurface: '#131b2e',
  onSurfaceVariant: '#434655',
  outlineVariant: '#c4c5d7',
  outline: '#747686',
};

interface Props {
  session: SimuladoSession;
  onNewSimulado: () => void;
  onHistory: () => void;
}

/* ---- Clipboard helper ---- */
function copyText(text: string, onDone: () => void) {
  const doFallback = () => {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand('copy'); onDone(); } catch { /* noop */ }
    document.body.removeChild(ta);
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(onDone).catch(doFallback);
  } else {
    doFallback();
  }
}

type WrongItem = WrongAnswer;

function stripImages(text: string | null): string {
  if (!text) return '';
  return text.replace(/!\[.*?\]\(.*?\)/g, '[imagem]');
}

/** Builds a single-question block for the study-plan prompt */
function makePrompt(w: WrongItem, n: number): string {
  const disc = DISCIPLINE_LABELS[w.discipline];
  const myAnswer = w.selected ?? '(em branco)';
  const altsText = w.alternatives
    .map(a => `${a.letter}) ${a.text ?? '[imagem]'}`)
    .join('\n');
  const imageNote = w.hasImage ? '\n(Esta questão contém figura — a imagem não está disponível neste texto.)' : '';

  return `=== Questão ${n} — ENEM ${w.year}, Q${w.index} — ${disc} ===
Texto-base: ${stripImages(w.context) || '(sem texto-base)'}
Comando: ${stripImages(w.alternativesIntroduction) || w.title}${imageNote}
Alternativas:
${altsText}
Minha resposta: ${myAnswer}
Resposta correta: ${w.correct}`;
}

/** Builds the full study-plan prompt for all review items */
function buildStudyPrompt(items: WrongItem[]): string {
  if (!items.length) return '';

  const header = `Sou estudante e fiz um simulado do ENEM. Errei ou deixei em branco as questões abaixo.

Para CADA questão:
1. Diga qual conteúdo/assunto do ENEM ela cobra.
2. Explique por que a alternativa correta está certa e por que a minha está errada (ou por que eu deveria saber respondê-la).

Depois, monte um PLANO DE ESTUDO:
- Liste os conteúdos agrupados por área, do mais urgente ao menos urgente.
- Distribua em um cronograma de 14 dias (1–2 h por dia), com o que estudar e que tipo de exercício fazer.
- Termine com 3 dicas de estratégia de prova para essas áreas.

`;

  return header + items.map((w, i) => makePrompt(w, i + 1)).join('\n\n');
}

/* ---- Wrong answer overlay modal ---- */
function WrongAnswerModal({
  wrongs,
  startIdx,
  session,
  onClose,
}: {
  wrongs: WrongItem[];
  startIdx: number;
  session: SimuladoSession;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const [copied, setCopied] = useState(false);
  const w = wrongs[idx];
  const q: Question | undefined = w ? session.loadedQuestions[w.questionId] : undefined;
  const discColor = w ? DISCIPLINE_COLORS[w.discipline] : C.primary;
  const discLabel = w ? DISCIPLINE_LABELS[w.discipline] : '';

  const handleCopy = () => {
    if (!w) return;
    copyText(makePrompt(w, idx + 1), () => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  if (!w) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(19,27,46,0.55)', zIndex: 100, backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}
      />

      {/* Card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', inset: '12px', zIndex: 101, maxWidth: 760, margin: '0 auto',
          background: C.surfaceLowest, borderRadius: 12,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: `1px solid ${C.outlineVariant}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', borderBottom: `1px solid ${C.outlineVariant}`, flexShrink: 0,
          background: C.surfaceContainerLow,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 18, borderRadius: 2, background: discColor }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: discColor }}>{discLabel}</span>
            <span style={{ fontSize: 13, color: C.outline }}>· ENEM {w.year} · Q{w.index}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={handleCopy} style={{
              background: 'none', border: `1px solid ${C.outlineVariant}`, borderRadius: 6,
              padding: '4px 10px', color: C.primary, fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}>
              {copied ? '✓ Copiado' : '📋 Copiar prompt de estudo'}
            </button>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', fontSize: 22, lineHeight: 1,
              color: C.onSurfaceVariant, cursor: 'pointer',
            }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Answer verdict */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <div style={{ padding: '6px 14px', borderRadius: 6, background: C.errorContainer, border: `1px solid ${C.error}`, fontSize: 14, color: C.error }}>
              Marquei: <strong>{w.selected ?? '(em branco)'}</strong>
            </div>
            <div style={{ padding: '6px 14px', borderRadius: 6, background: C.secondaryContainer, border: `1px solid ${C.secondary}`, fontSize: 14, color: C.secondary }}>
              Correto: <strong>{w.correct}</strong>
            </div>
          </div>

          {!q ? (
            <div style={{ color: C.onSurfaceVariant, padding: 24, textAlign: 'center' }}>
              Questão não carregada durante o simulado.
            </div>
          ) : (
            <QuestionContent
              question={q}
              selected={w.selected ?? undefined}
              revealed={true}
              readOnly={true}
            />
          )}
        </div>

        {/* Footer navigation */}
        <div style={{
          display: 'flex', gap: 12, padding: '12px 20px',
          borderTop: `1px solid ${C.outlineVariant}`, flexShrink: 0, alignItems: 'center',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
          background: C.surfaceContainerLow,
        }}>
          <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} style={{
            flex: 1, padding: '10px 0', borderRadius: 8,
            border: `1px solid ${idx === 0 ? C.outlineVariant : C.outline}`,
            background: C.surfaceLowest, color: idx === 0 ? C.outline : C.onSurface,
            fontSize: 14, fontWeight: 500, cursor: idx === 0 ? 'not-allowed' : 'pointer',
          }}>â† Anterior</button>
          <span style={{ fontSize: 13, color: C.onSurfaceVariant, whiteSpace: 'nowrap', minWidth: 48, textAlign: 'center' }}>{idx + 1} / {wrongs.length}</span>
          <button onClick={() => setIdx(i => Math.min(wrongs.length - 1, i + 1))} disabled={idx === wrongs.length - 1} style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
            background: idx === wrongs.length - 1 ? C.outlineVariant : C.primaryContainer,
            color: C.onPrimary, fontSize: 14, fontWeight: 600,
            cursor: idx === wrongs.length - 1 ? 'not-allowed' : 'pointer',
          }}>Próxima →</button>
        </div>
      </div>
    </>
  );
}

export function SummaryScreen({ session, onNewSimulado, onHistory }: Props) {
  const [copiedAll, setCopiedAll] = useState(false);
  const [modalState, setModalState] = useState<{ open: boolean; idx: number }>({ open: false, idx: 0 });
  const [result] = useState<SimuladoResult>(() => buildResult(session));

  useEffect(() => {
    const ids = session.questionRefs.map(r => `${r.year}-${r.index}`);
    markSeen(ids);
    saveResult(result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pct = result.totalQuestions > 0 ? (result.correct / result.totalQuestions) * 100 : 0;
  const elapsed = result.elapsedSeconds;
  const timeStr = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;

  const reviewItems = result.wrongAnswers;

  const copyAllPrompt = () => {
    const text = buildStudyPrompt(reviewItems);
    copyText(text, () => { setCopiedAll(true); setTimeout(() => setCopiedAll(false), 2000); });
  };

  // Group wrong answers by discipline
  const byDiscipline: Record<string, WrongItem[]> = {};
  for (const w of result.wrongAnswers) {
    if (!byDiscipline[w.discipline]) byDiscipline[w.discipline] = [];
    byDiscipline[w.discipline].push(w);
  }
  const disciplinesWithErrors = ALL_DISCIPLINES.filter(d => byDiscipline[d]?.length > 0);

  const scoreColor = pct >= 70 ? C.secondary : pct >= 50 ? '#e65100' : C.error;

  return (
    <div style={{ minHeight: '100dvh', background: C.surface }}>
      <TopNav
        title="Resultado"
        right={<button onClick={onHistory} style={{ background: 'none', border: 'none', color: C.primary, fontSize: 16, cursor: 'pointer', fontWeight: 500 }}>Histórico</button>}
      />

      <div style={{ padding: '24px 16px 48px', maxWidth: 640, margin: '0 auto' }}>

        {/* Score hero */}
        <div style={{ background: C.surfaceLowest, borderRadius: 12, padding: 24, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24, border: `1px solid ${C.outlineVariant}` }}>
          <ScoreRing pct={pct} size={90} />
          <div>
            <div style={{ fontSize: 28, fontWeight: 700, color: scoreColor, letterSpacing: '-0.02em' }}>{result.correct} / {result.totalQuestions}</div>
            <div style={{ fontSize: 15, color: C.onSurfaceVariant, marginTop: 4 }}>acertos · {timeStr}</div>
            <div style={{ fontSize: 13, color: C.outline, marginTop: 4 }}>
              {new Date(result.startedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Per discipline */}
        <div style={{ background: C.surfaceLowest, borderRadius: 12, overflow: 'hidden', marginBottom: 24, border: `1px solid ${C.outlineVariant}` }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.outlineVariant}`, fontSize: 14, fontWeight: 600, color: C.onSurface }}>Por disciplina</div>
          {result.disciplineScores.map((ds, i) => {
            const dp = ds.total > 0 ? (ds.correct / ds.total) * 100 : 0;
            return (
              <div key={ds.discipline} style={{ padding: '12px 16px', borderBottom: i < result.disciplineScores.length - 1 ? `1px solid ${C.outlineVariant}` : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, color: DISCIPLINE_COLORS[ds.discipline], fontWeight: 600 }}>{DISCIPLINE_LABELS[ds.discipline]}</span>
                  <span style={{ fontSize: 14, color: C.onSurfaceVariant }}>{ds.correct}/{ds.total}</span>
                </div>
                <div style={{ height: 6, background: C.surfaceContainer, borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${dp}%`, background: DISCIPLINE_COLORS[ds.discipline], borderRadius: 3, transition: 'width 0.6s' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Wrong answers grouped by discipline */}
        {result.wrongAnswers.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 16, fontWeight: 600, color: C.onSurface }}>Questões a revisar ({result.wrongAnswers.length})</span>
              <button onClick={copyAllPrompt} style={{
                background: 'none', border: `1px solid ${C.outlineVariant}`, borderRadius: 6,
                padding: '5px 12px', color: C.primary, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>
                {copiedAll ? '✓ Copiado' : '📋 Copiar todos para IA'}
              </button>
            </div>

            {disciplinesWithErrors.map(disc => {
              const items = byDiscipline[disc];
              const color = DISCIPLINE_COLORS[disc];
              return (
                <div key={disc} style={{ background: C.surfaceLowest, borderRadius: 10, overflow: 'hidden', marginBottom: 12, border: `1px solid ${C.outlineVariant}` }}>
                  {/* Discipline header */}
                  <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.outlineVariant}`, display: 'flex', alignItems: 'center', gap: 8, background: C.surfaceContainerLow }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 13, fontWeight: 700, color }}>{DISCIPLINE_LABELS[disc]}</span>
                    <span style={{ fontSize: 12, color: C.outline }}>({items.length} para revisar)</span>
                  </div>
                  {items.map((w, itemIdx) => {
                    const globalIdx = result.wrongAnswers.indexOf(w);
                    return (
                      <div
                        key={w.questionId}
                        onClick={() => setModalState({ open: true, idx: globalIdx })}
                        style={{
                          padding: '12px 16px', cursor: 'pointer',
                          borderBottom: itemIdx < items.length - 1 ? `1px solid ${C.outlineVariant}` : 'none',
                          display: 'flex', alignItems: 'center', gap: 12,
                          transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = C.surfaceContainerLow)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, color: C.outline, marginBottom: 2 }}>ENEM {w.year} · Questão {w.index}</div>
                          <div style={{ fontSize: 14, color: C.onSurface, lineHeight: 1.4 }}>{previewText(w)}</div>
                          <div style={{ fontSize: 12, marginTop: 4, display: 'flex', gap: 10 }}>
                            <span style={{ color: C.error }}>{w.selected ? <>Marquei: <strong>{w.selected}</strong></> : <em>Em branco</em>}</span>
                            <span style={{ color: C.secondary }}>Correto: <strong>{w.correct}</strong></span>
                          </div>
                        </div>
                        <span style={{ color: C.outline, fontSize: 20 }}>›</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        <button onClick={onNewSimulado} style={{
          width: '100%', padding: '14px 0', borderRadius: 8, border: 'none',
          background: C.primaryContainer, color: C.onPrimary,
          fontSize: 16, fontWeight: 600, cursor: 'pointer',
        }}>Novo Simulado</button>
      </div>

      {/* Overlay modal */}
      {modalState.open && (
        <WrongAnswerModal
          wrongs={result.wrongAnswers}
          startIdx={modalState.idx}
          session={session}
          onClose={() => setModalState(s => ({ ...s, open: false }))}
        />
      )}
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
    const sel = answers[id] as Letter | undefined;
    if (!q) continue;
    disciplineMap[ref.discipline].total++;
    if (sel === q.correctAlternative) {
      correct++;
      disciplineMap[ref.discipline].correct++;
    } else {
      wrongAnswers.push({
        questionId: id,
        year: ref.year,
        index: ref.index,
        discipline: ref.discipline,
        selected: sel ?? null,
        correct: q.correctAlternative,
        title: q.title,
        context: q.context,
        alternativesIntroduction: q.alternativesIntroduction,
        alternatives: q.alternatives.map(a => ({ letter: a.letter, text: a.text })),
        hasImage: q.files.length > 0 || q.alternatives.some(a => a.file),
      });
    }
  }

  const disciplineScores = config.disciplines.map(d => disciplineMap[d]).filter(ds => ds.total > 0);

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
