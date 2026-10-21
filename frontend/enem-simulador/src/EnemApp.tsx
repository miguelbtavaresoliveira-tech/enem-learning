import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Flag,
  RotateCcw,
  Eye,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Tipos (espelham o schema oficial da API: GET /v1/exams/{year}/questions)   */
/* -------------------------------------------------------------------------- */

type Letter = 'A' | 'B' | 'C' | 'D' | 'E';

interface Alternative {
  letter: Letter;
  text: string | null;
  file: string | null; // URL de imagem (algumas alternativas são só imagem)
  isCorrect: boolean;
}

interface Question {
  title: string;
  index: number;
  discipline: string | null;
  language: string | null; // 'ingles' | 'espanhol' | null
  year: number;
  context: string | null; // Markdown (pode conter imagens)
  files: string[]; // URLs de imagens usadas na questão
  correctAlternative: Letter;
  alternativesIntroduction: string | null;
  alternatives: Alternative[];
}

interface QuestionsResponse {
  metadata: { limit: number; offset: number; total: number; hasMore: boolean };
  questions: Question[];
}

/* -------------------------------------------------------------------------- */
/*  Configuração e acesso à API                                               */
/* -------------------------------------------------------------------------- */

const API_URL = 'https://api.enem.dev/v1';
const PAGE_SIZE = 10; // questões por requisição (a API limita a 1 req/s)
const PREFETCH_AHEAD = 3; // carrega a próxima página quando faltam N questões
const YEARS = [2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015, 2014, 2013, 2012, 2011, 2010, 2009];

const DISCIPLINES: Record<string, string> = {
  linguagens: 'Linguagens',
  'ciencias-humanas': 'Ciências Humanas',
  'ciencias-natureza': 'Ciências da Natureza',
  matematica: 'Matemática',
};

class ApiError extends Error {}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPage(year: number, offset: number, attempt = 0): Promise<QuestionsResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/exams/${year}/questions?limit=${PAGE_SIZE}&offset=${offset}`);
  } catch {
    throw new ApiError('Não foi possível conectar à API. Verifique sua internet e tente novamente.');
  }

  // Limite da API: 1 req/s. Espera e tenta de novo automaticamente.
  if (res.status === 429 && attempt < 3) {
    await sleep(1500 * (attempt + 1));
    return fetchPage(year, offset, attempt + 1);
  }
  if (res.status === 404) throw new ApiError(`A prova de ${year} não foi encontrada na API.`);
  if (res.status === 429) throw new ApiError('Muitas requisições seguidas. Aguarde alguns segundos e tente novamente.');
  if (!res.ok) throw new ApiError(`A API respondeu com erro ${res.status}. Tente novamente em instantes.`);

  const data = (await res.json()) as QuestionsResponse;
  if (!data || !Array.isArray(data.questions) || !data.metadata) {
    throw new ApiError('Resposta inesperada da API.');
  }
  return data;
}

/* -------------------------------------------------------------------------- */
/*  Utilidades                                                                */
/* -------------------------------------------------------------------------- */

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
};

const questionKey = (q: Question) => `${q.year}-${q.index}-${q.language ?? 'x'}`;

/* Renderização do enunciado (Markdown) com imagens clicáveis em tamanho real */
const mdComponents: Components = {
  img: (props) => {
    const src = typeof props.src === 'string' ? props.src : undefined;
    if (!src) return null;
    return (
      <a href={src} target="_blank" rel="noreferrer" title="Clique para abrir em tamanho original">
        <img
          src={src}
          alt={props.alt ?? 'Imagem da questão'}
          loading="lazy"
          className="my-4 mx-auto block h-auto max-w-full rounded-lg border border-slate-200 bg-white"
        />
      </a>
    );
  },
  p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 underline">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-slate-300 pl-4 italic text-slate-600">{children}</blockquote>
  ),
  ul: ({ children }) => <ul className="my-3 list-disc pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal pl-6">{children}</ol>,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-slate-300 bg-slate-100 px-3 py-2 text-left">{children}</th>,
  td: ({ children }) => <td className="border border-slate-300 px-3 py-2">{children}</td>,
};

/* -------------------------------------------------------------------------- */
/*  Componente principal                                                      */
/* -------------------------------------------------------------------------- */

type View = 'setup' | 'exam' | 'summary';

export default function EnemApp() {
  // Configuração
  const [year, setYear] = useState<number>(2022);
  const [language, setLanguage] = useState<'ingles' | 'espanhol'>('ingles');

  // Estado da prova
  const [view, setView] = useState<View>('setup');
  const [reviewMode, setReviewMode] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Dados
  const [questions, setQuestions] = useState<Question[]>([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);

  // Respostas: { chaveDaQuestão: letraEscolhida }
  const [answers, setAnswers] = useState<Record<string, Letter>>({});
  const [currentIdx, setCurrentIdx] = useState(0);

  /* ---- Cronômetro ---- */
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  /* ---- Questões visíveis (filtra a língua estrangeira escolhida) ---- */
  const visible = useMemo(
    () => questions.filter((q) => !q.language || q.language === language),
    [questions, language],
  );
  const currentQ: Question | undefined = visible[currentIdx];
  const answeredLetter = currentQ ? answers[questionKey(currentQ)] : undefined;
  const isAnswered = !!answeredLetter;

  const stats = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    for (const q of visible) {
      const a = answers[questionKey(q)];
      if (!a) continue;
      if (a === q.correctAlternative) correct++;
      else wrong++;
    }
    return { correct, wrong, answered: correct + wrong };
  }, [visible, answers]);

  /* ---- Carregamento paginado ---- */
  const loadPage = useCallback(
    async (offset: number) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      try {
        const data = await fetchPage(year, offset);
        setQuestions((prev) => (offset === 0 ? data.questions : [...prev, ...data.questions]));
        setNextOffset(data.metadata.offset + data.questions.length);
        setHasMore(data.metadata.hasMore && data.questions.length > 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro desconhecido ao carregar questões.');
        setIsRunning(false);
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [year],
  );

  // Carrega a 1ª página e vai buscando as próximas conforme o aluno avança
  useEffect(() => {
    if (view !== 'exam' || !hasMore || loading || error) return;
    if (visible.length - currentIdx <= PREFETCH_AHEAD) {
      loadPage(nextOffset);
    }
  }, [view, hasMore, loading, error, visible.length, currentIdx, nextOffset, loadPage]);

  /* ---- Ações ---- */
  const startExam = () => {
    setView('exam');
    setReviewMode(false);
    setIsRunning(true);
  };

  const toggleTimer = () => {
    if (view === 'setup') return startExam();
    setIsRunning((r) => !r);
  };

  const finishExam = () => {
    setIsRunning(false);
    setView('summary');
  };

  const resetAll = () => {
    setView('setup');
    setReviewMode(false);
    setIsRunning(false);
    setTimeElapsed(0);
    setQuestions([]);
    setNextOffset(0);
    setHasMore(true);
    setError(null);
    setAnswers({});
    setCurrentIdx(0);
  };

  const retry = () => {
    setError(null);
    setIsRunning(true);
  };

  const selectAlternative = (letter: Letter) => {
    if (!currentQ || !isRunning || isAnswered) return;
    setAnswers((prev) => ({ ...prev, [questionKey(currentQ)]: letter }));
  };

  const goPrev = () => setCurrentIdx((i) => Math.max(0, i - 1));
  const goNext = () => setCurrentIdx((i) => Math.min(visible.length - 1, i + 1));

  /* ---- Atalhos de teclado: A–E responde, ← → navega ---- */
  useEffect(() => {
    if (view !== 'exam') return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const k = e.key.toUpperCase();
      if (k === 'A' || k === 'B' || k === 'C' || k === 'D' || k === 'E') selectAlternative(k);
      else if (e.key === 'ArrowRight') goNext();
      else if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                */
  /* ---------------------------------------------------------------------- */

  const paused = view === 'exam' && !isRunning && !reviewMode && !error;
  const extraFiles = currentQ ? currentQ.files.filter((f) => !(currentQ.context ?? '').includes(f)) : [];
  const answeredIsCorrect = currentQ && answeredLetter === currentQ.correctAlternative;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      {/* Cabeçalho */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center space-x-3">
            <div className="rounded bg-blue-600 p-2 text-xl font-bold leading-none text-white">ENEM</div>
            <div className="hidden sm:block">
              <p className="font-semibold leading-tight text-slate-700">Simulador {view !== 'setup' && year}</p>
              {view === 'exam' && (
                <p className="text-xs text-slate-500">
                  {stats.answered} respondidas · <span className="text-green-600">{stats.correct} acertos</span> ·{' '}
                  <span className="text-red-600">{stats.wrong} erros</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Tempo</span>
              <span className={`font-mono text-2xl font-bold ${isRunning ? 'text-blue-600' : 'text-slate-600'}`}>
                {formatTime(timeElapsed)}
              </span>
            </div>

            {view !== 'summary' && !reviewMode && (
              <button
                onClick={toggleTimer}
                className={`flex items-center space-x-2 rounded-lg px-4 py-2 font-medium transition-colors ${
                  isRunning
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                }`}
              >
                {isRunning ? <Pause size={18} /> : <Play size={18} />}
                <span>{isRunning ? 'Pausar' : view === 'setup' ? 'Iniciar' : 'Continuar'}</span>
              </button>
            )}

            {view === 'exam' && !reviewMode && (
              <button
                onClick={finishExam}
                className="flex items-center space-x-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
              >
                <Flag size={18} />
                <span className="hidden sm:inline">Finalizar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-grow flex-col p-4 sm:p-6 lg:p-8">
        {/* ---------------- Tela inicial ---------------- */}
        {view === 'setup' && (
          <div className="flex flex-grow flex-col items-center justify-center space-y-6 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100">
              <Play className="ml-2 text-blue-600" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-slate-800">Pronto para começar?</h2>
            <p className="max-w-md text-slate-600">
              Escolha a prova e clique em iniciar. O cronômetro começa junto e, ao marcar uma alternativa, você vê na
              hora se acertou ou errou.
            </p>

            <div className="flex flex-wrap items-end justify-center gap-4">
              <label className="text-left text-sm font-medium text-slate-600">
                Ano da prova
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-left text-sm font-medium text-slate-600">
                Língua estrangeira
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'ingles' | 'espanhol')}
                  className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800"
                >
                  <option value="ingles">Inglês</option>
                  <option value="espanhol">Espanhol</option>
                </select>
              </label>
              <button
                onClick={startExam}
                className="flex items-center space-x-2 rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white shadow-md hover:bg-blue-700"
              >
                <Play size={18} />
                <span>Iniciar simulado</span>
              </button>
            </div>
            <p className="text-xs text-slate-400">Atalhos: teclas A–E respondem · setas ← → navegam</p>
          </div>
        )}

        {/* ---------------- Resumo final ---------------- */}
        {view === 'summary' && (
          <div className="flex flex-grow flex-col items-center justify-center space-y-6 text-center">
            <h2 className="text-3xl font-bold text-slate-800">Simulado finalizado</h2>
            <div className="grid w-full max-w-md grid-cols-3 gap-4">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                <p className="text-3xl font-bold text-green-700">{stats.correct}</p>
                <p className="text-sm text-green-700">Acertos</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-3xl font-bold text-red-700">{stats.wrong}</p>
                <p className="text-sm text-red-700">Erros</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-3xl font-bold text-slate-700">{formatTime(timeElapsed)}</p>
                <p className="text-sm text-slate-500">Tempo</p>
              </div>
            </div>
            {stats.answered > 0 && (
              <p className="text-slate-600">
                Aproveitamento nas questões respondidas:{' '}
                <strong>{Math.round((stats.correct / stats.answered) * 100)}%</strong>
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setReviewMode(true);
                  setView('exam');
                }}
                className="flex items-center space-x-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-100"
              >
                <Eye size={18} />
                <span>Revisar questões</span>
              </button>
              <button
                onClick={resetAll}
                className="flex items-center space-x-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
              >
                <RotateCcw size={18} />
                <span>Novo simulado</span>
              </button>
            </div>
          </div>
        )}

        {/* ---------------- Prova ---------------- */}
        {view === 'exam' && (
          <>
            {error && (
              <div className="mb-6 flex items-start space-x-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
                <AlertCircle className="mt-0.5 shrink-0" size={20} />
                <div className="flex-grow">
                  <p className="text-sm">{error}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={retry} className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
                      Tentar novamente
                    </button>
                    <button onClick={resetAll} className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium hover:bg-red-100">
                      Voltar ao início
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!currentQ && loading && (
              <div className="flex flex-grow flex-col items-center justify-center text-blue-600">
                <Loader2 className="mb-4 animate-spin" size={48} />
                <p className="animate-pulse font-medium">Carregando questões do ENEM {year}...</p>
              </div>
            )}

            {currentQ && (
              <div className="flex flex-grow flex-col">
                {/* Navegador de questões */}
                <div className="mb-4 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
                  {visible.map((q, i) => {
                    const a = answers[questionKey(q)];
                    const color = !a
                      ? 'border-slate-200 bg-white text-slate-600'
                      : a === q.correctAlternative
                        ? 'border-green-500 bg-green-100 text-green-800'
                        : 'border-red-500 bg-red-100 text-red-800';
                    return (
                      <button
                        key={questionKey(q)}
                        onClick={() => setCurrentIdx(i)}
                        className={`h-8 w-8 rounded border text-xs font-semibold ${color} ${
                          i === currentIdx ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                        }`}
                      >
                        {q.index}
                      </button>
                    );
                  })}
                  {loading && <Loader2 className="ml-1 mt-1.5 animate-spin text-slate-400" size={18} />}
                </div>

                {/* Cartão da questão */}
                <div className="relative flex-grow rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                  {paused && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-white/95 text-center backdrop-blur-sm">
                      <Pause className="mb-3 text-slate-400" size={40} />
                      <p className="mb-4 font-medium text-slate-600">Cronômetro pausado</p>
                      <button
                        onClick={() => setIsRunning(true)}
                        className="flex items-center space-x-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
                      >
                        <Play size={18} />
                        <span>Continuar</span>
                      </button>
                    </div>
                  )}

                  <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-600">
                        Questão {currentQ.index}
                      </span>
                      {currentQ.discipline && (
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          {DISCIPLINES[currentQ.discipline] ?? currentQ.discipline}
                        </span>
                      )}
                    </div>
                    {isAnswered && (
                      <span
                        className={`flex items-center space-x-1 rounded-full px-3 py-1 text-sm font-bold ${
                          answeredIsCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {answeredIsCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                        <span>{answeredIsCorrect ? 'Acertou!' : 'Errou'}</span>
                      </span>
                    )}
                  </div>

                  {/* Enunciado (Markdown + imagens) */}
                  {currentQ.context && (
                    <div className="mb-4 text-base text-slate-800 sm:text-lg">
                      <ReactMarkdown components={mdComponents}>{currentQ.context}</ReactMarkdown>
                    </div>
                  )}

                  {/* Imagens que não estão embutidas no enunciado */}
                  {extraFiles.map((src) => (
                    <a key={src} href={src} target="_blank" rel="noreferrer">
                      <img
                        src={src}
                        alt="Imagem da questão"
                        loading="lazy"
                        className="mx-auto my-4 block h-auto max-w-full rounded-lg border border-slate-200"
                      />
                    </a>
                  ))}

                  {currentQ.alternativesIntroduction && (
                    <p className="mb-4 mt-6 font-semibold text-slate-800">{currentQ.alternativesIntroduction}</p>
                  )}

                  {/* Alternativas */}
                  <div className="mt-6 space-y-3">
                    {currentQ.alternatives.map((alt) => {
                      const isSelected = answeredLetter === alt.letter;
                      const isCorrectAlt = alt.letter === currentQ.correctAlternative;

                      let cls =
                        'flex w-full items-start space-x-4 rounded-lg border-2 p-4 text-left transition-all duration-200 ';
                      if (!isAnswered) {
                        cls += 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50';
                      } else if (isCorrectAlt) {
                        cls += 'border-green-500 bg-green-50';
                      } else if (isSelected) {
                        cls += 'border-red-500 bg-red-50';
                      } else {
                        cls += 'border-slate-100 bg-slate-50 opacity-60';
                      }

                      return (
                        <button
                          key={alt.letter}
                          onClick={() => selectAlternative(alt.letter)}
                          disabled={isAnswered || !isRunning}
                          className={cls}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white text-sm font-bold shadow-sm">
                            {alt.letter}
                          </span>
                          <span className="mt-1 flex-grow">
                            {alt.text && <span className="block whitespace-pre-line">{alt.text}</span>}
                            {alt.file && (
                              <img
                                src={alt.file}
                                alt={`Alternativa ${alt.letter}`}
                                loading="lazy"
                                className="mt-2 block h-auto max-w-full rounded border border-slate-200 bg-white"
                              />
                            )}
                          </span>
                          {isAnswered && isCorrectAlt && <CheckCircle2 className="mt-1 shrink-0 text-green-600" size={24} />}
                          {isAnswered && isSelected && !isCorrectAlt && (
                            <XCircle className="mt-1 shrink-0 text-red-500" size={24} />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Feedback explícito após responder */}
                  {isAnswered && (
                    <div
                      className={`mt-6 flex items-center space-x-3 rounded-lg border p-4 ${
                        answeredIsCorrect
                          ? 'border-green-200 bg-green-50 text-green-800'
                          : 'border-red-200 bg-red-50 text-red-800'
                      }`}
                    >
                      {answeredIsCorrect ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                      <p className="font-medium">
                        {answeredIsCorrect
                          ? `Parabéns, a alternativa ${currentQ.correctAlternative} está correta!`
                          : `Você marcou ${answeredLetter}. A resposta correta é a alternativa ${currentQ.correctAlternative}.`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Navegação */}
                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={goPrev}
                    disabled={currentIdx === 0}
                    className="flex items-center space-x-2 px-4 py-2 font-medium text-slate-600 hover:text-blue-600 disabled:opacity-50 disabled:hover:text-slate-600"
                  >
                    <ChevronLeft size={20} />
                    <span>Anterior</span>
                  </button>

                  <button
                    onClick={goNext}
                    disabled={currentIdx >= visible.length - 1}
                    className="flex items-center space-x-2 rounded-lg bg-slate-900 px-6 py-3 font-medium text-white shadow-md transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    <span>
                      {currentIdx >= visible.length - 1 && loading ? 'Carregando...' : 'Próxima Questão'}
                    </span>
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
