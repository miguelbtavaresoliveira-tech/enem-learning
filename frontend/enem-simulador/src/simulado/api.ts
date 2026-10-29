import type { Discipline, QuestionRef, Question, DifficultyLevel, SimuladoConfig } from './types';

const BASE = import.meta.env.VITE_ENEM_API_URL ?? '/v1';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function apiFetch<T>(path: string, attempt = 0): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`);
  } catch {
    throw new Error('Sem conexão com a API. Verifique sua internet.');
  }
  if (res.status === 429 && attempt < 4) {
    await sleep(1200 * (attempt + 1));
    return apiFetch<T>(path, attempt + 1);
  }
  if (!res.ok) throw new Error(`API retornou ${res.status}`);
  return res.json() as Promise<T>;
}

interface ExamDetail {
  year: number;
  questions: Array<{ index: number; discipline: string; language: string | null }>;
  languages: Array<{ value: string }>;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function difficultySlice(items: QuestionRef[], level: DifficultyLevel): QuestionRef[] {
  if (level === 'all') return items;
  const t = Math.floor(items.length / 3);
  if (level === 'easy') return items.slice(0, t);
  if (level === 'medium') return items.slice(t, t * 2);
  return items.slice(t * 2);
}

export async function buildQuestionRefs(
  years: number[],
  disciplines: Discipline[],
  questionCount: number,
  difficulty: DifficultyLevel,
  onlyNew: boolean,
  seenIds: Set<string>,
  onProgress?: (done: number, total: number) => void,
): Promise<QuestionRef[]> {
  const byDiscipline: Record<string, QuestionRef[]> = {};
  for (const d of disciplines) byDiscipline[d] = [];

  // Fetch exam metadata for each year (parallel, max 4 concurrent)
  const CHUNK = 4;
  for (let i = 0; i < years.length; i += CHUNK) {
    const chunk = years.slice(i, i + CHUNK);
    const results = await Promise.allSettled(
      chunk.map(y => apiFetch<ExamDetail>(`/exams/${y}`))
    );
    results.forEach((r, idx) => {
      if (r.status !== 'fulfilled') return;
      const exam = r.value;
      const year = chunk[idx];
      // Pick default language for foreign language questions
      const defaultLang = exam.languages.length > 0 ? exam.languages[0].value : null;

      for (const disc of disciplines) {
        const qs = exam.questions
          .filter(q => q.discipline === disc)
          .filter(q => !q.language || q.language === defaultLang)
          .map(q => ({ year, index: q.index, discipline: disc as Discipline, language: q.language }));
        byDiscipline[disc].push(...qs);
      }
    });
    onProgress?.(Math.min(i + CHUNK, years.length), years.length);
    if (i + CHUNK < years.length) await sleep(200);
  }

  const perDisc = Math.floor(questionCount / disciplines.length);
  const remainder = questionCount % disciplines.length;
  const selected: QuestionRef[] = [];

  disciplines.forEach((d, i) => {
    const count = perDisc + (i < remainder ? 1 : 0);
    let pool = difficultySlice(byDiscipline[d], difficulty);
    if (onlyNew) pool = pool.filter(q => !seenIds.has(`${q.year}-${q.index}`));
    selected.push(...shuffle(pool).slice(0, count));
  });

  return shuffle(selected);
}

export async function fetchSimuladoQuestions(
  config: Pick<SimuladoConfig, 'years' | 'disciplines' | 'questionCount' | 'onlyNew' | 'difficulty'>,
  seenIds: Set<string>,
): Promise<Question[]> {
  const res = await fetch('/api/simulado/questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      years: config.years,
      disciplines: config.disciplines,
      questionCount: config.questionCount,
      onlyNew: config.onlyNew,
      seenIds: Array.from(seenIds),
      difficulty: config.difficulty,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? `Erro ${res.status} ao gerar simulado`);
  }
  const data = await res.json() as { questions: Question[] };
  return data.questions;
}

export async function fetchQuestion(ref: QuestionRef): Promise<Question> {
  interface RawQuestion {
    title: string; year: number; index: number; discipline: string;
    language: string | null; context: string | null; files: string[];
    correctAlternative: Letter; alternativesIntroduction: string | null;
    alternatives: Array<{ letter: Letter; text: string | null; file: string | null; isCorrect: boolean }>;
  }
  type Letter = 'A'|'B'|'C'|'D'|'E';

  const path = ref.language
    ? `/exams/${ref.year}/questions/${ref.index}-${ref.language}`
    : `/exams/${ref.year}/questions/${ref.index}`;

  const raw = await apiFetch<RawQuestion>(path);
  return {
    id: `${ref.year}-${ref.index}`,
    year: ref.year,
    index: ref.index,
    discipline: ref.discipline,
    language: ref.language,
    title: raw.title,
    context: raw.context,
    files: raw.files ?? [],
    correctAlternative: raw.correctAlternative,
    alternativesIntroduction: raw.alternativesIntroduction,
    alternatives: raw.alternatives,
  };
}
