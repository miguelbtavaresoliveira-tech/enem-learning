import type { Discipline, QuestionRef, Question, DifficultyLevel, SimuladoConfig, Letter } from './types';

const PRIMARY = import.meta.env.VITE_ENEM_API_URL || 'https://api.enem.dev/v1';
const FALLBACK = import.meta.env.VITE_ENEM_API_FALLBACK || '/v1';

// api.enem.dev allows 10 requests per 10s per IP; stay one below.
const WINDOW_MS = 10_000;
const MAX_PER_WINDOW = 9;
const PAGE_SIZE = 50;
const PRIMARY_COOLDOWN_MS = 60_000;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const stamps = new Map<string, number[]>();
let queue: Promise<void> = Promise.resolve();

function acquire(base: string): Promise<void> {
  const run = queue.then(async () => {
    const q = stamps.get(base) ?? [];
    stamps.set(base, q);
    for (;;) {
      const now = Date.now();
      while (q.length && now - q[0] >= WINDOW_MS) q.shift();
      if (q.length < MAX_PER_WINDOW) { q.push(now); return; }
      await sleep(WINDOW_MS - (now - q[0]) + 50);
    }
  });
  queue = run.catch(() => undefined);
  return run;
}

async function requestFrom<T>(base: string, path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    await acquire(base);
    const res = await fetch(`${base}${path}`);
    if (res.status === 429 && attempt < 3) {
      await sleep((WINDOW_MS / 2) * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new HttpError(res.status, `API retornou ${res.status}`);
    return res.json() as Promise<T>;
  }
}

let primaryDownUntil = 0;

export async function apiFetch<T>(path: string): Promise<T> {
  const usePrimary = FALLBACK === PRIMARY || Date.now() >= primaryDownUntil;
  if (usePrimary) {
    try {
      return await requestFrom<T>(PRIMARY, path);
    } catch (e) {
      if (e instanceof HttpError && e.status === 404) throw e;
      if (FALLBACK === PRIMARY) throw toFriendly(e);
      primaryDownUntil = Date.now() + PRIMARY_COOLDOWN_MS;
    }
  }
  try {
    return await requestFrom<T>(FALLBACK, path);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) throw e;
    throw toFriendly(e);
  }
}

function toFriendly(e: unknown): Error {
  if (e instanceof HttpError && e.status === 429) {
    return new Error('A API do ENEM está recebendo muitas requisições. Aguarde alguns segundos e tente novamente.');
  }
  return new Error('Não foi possível acessar a API do ENEM. Verifique sua conexão e tente novamente.');
}

interface ExamMeta {
  year: number;
  questions: Array<{ index: number; discipline: string; language: string | null }>;
  languages: Array<{ value: string }>;
}

interface RawQuestion {
  title: string;
  year: number;
  index: number;
  discipline: string;
  language: string | null;
  context: string | null;
  files: string[] | null;
  correctAlternative: Letter;
  alternativesIntroduction: string | null;
  alternatives: Array<{ letter: Letter; text: string | null; file: string | null; isCorrect: boolean }>;
}

const examKey = (year: number) => `simulado:exam:v1:${year}`;

async function getExam(year: number): Promise<ExamMeta> {
  try {
    const cached = localStorage.getItem(examKey(year));
    if (cached) return JSON.parse(cached) as ExamMeta;
  } catch { /* storage unavailable */ }

  const exam = await apiFetch<ExamMeta>(`/exams/${year}`);
  const slim: ExamMeta = {
    year: exam.year,
    languages: exam.languages.map(l => ({ value: l.value })),
    questions: exam.questions.map(({ index, discipline, language }) => ({ index, discipline, language })),
  };
  try { localStorage.setItem(examKey(year), JSON.stringify(slim)); } catch { /* storage unavailable */ }
  return slim;
}

function pickLanguage(exam: ExamMeta): string | null {
  if (exam.languages.length === 0) return null;
  return exam.languages.find(l => l.value === 'ingles')?.value ?? exam.languages[0].value;
}

const pageCache = new Map<string, Promise<RawQuestion[]>>();

function getPage(year: number, offset: number, language: string | null): Promise<RawQuestion[]> {
  const key = `${year}|${offset}|${language ?? ''}`;
  let p = pageCache.get(key);
  if (!p) {
    const lang = language ? `&language=${encodeURIComponent(language)}` : '';
    p = apiFetch<{ questions: RawQuestion[] }>(`/exams/${year}/questions?limit=${PAGE_SIZE}&offset=${offset}${lang}`)
      .then(r => r.questions ?? []);
    p.catch(() => pageCache.delete(key));
    pageCache.set(key, p);
  }
  return p;
}

// The API pages by question index: offset N returns indices N..N+limit.
const pageOffset = (index: number) => Math.floor((index - 1) / PAGE_SIZE) * PAGE_SIZE;

const filled = (s: string | null | undefined) => typeof s === 'string' && s.trim().length > 0;

function isComplete(q: RawQuestion): boolean {
  const alts = q.alternatives ?? [];
  if (alts.length !== 5) return false;
  if (!alts.every(a => filled(a.text) || filled(a.file))) return false;
  if (!alts.some(a => a.letter === q.correctAlternative)) return false;
  return filled(q.context) || filled(q.alternativesIntroduction) || (q.files?.length ?? 0) > 0;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function difficultySlice<T>(items: T[], level: DifficultyLevel): T[] {
  if (level === 'all') return items;
  const t = Math.floor(items.length / 3);
  if (level === 'easy') return items.slice(0, t);
  if (level === 'medium') return items.slice(t, t * 2);
  return items.slice(t * 2);
}

function toQuestion(raw: RawQuestion, ref: QuestionRef): Question {
  return {
    id: `${ref.year}-${ref.index}`,
    year: ref.year,
    index: ref.index,
    discipline: ref.discipline,
    language: raw.language,
    title: raw.title,
    context: raw.context,
    files: raw.files ?? [],
    correctAlternative: raw.correctAlternative,
    alternativesIntroduction: raw.alternativesIntroduction,
    alternatives: raw.alternatives,
  };
}

export async function loadSimuladoQuestions(
  config: Pick<SimuladoConfig, 'years' | 'disciplines' | 'questionCount' | 'onlyNew' | 'difficulty'>,
  seenIds: Set<string>,
  onProgress?: (done: number, total: number) => void,
): Promise<Question[]> {
  const { years, disciplines, questionCount, difficulty, onlyNew } = config;
  let done = 0;
  let total = years.length;
  const tick = () => onProgress?.(++done, total);
  onProgress?.(0, total);

  const exams = await Promise.all(
    years.map(y => getExam(y).then(e => { tick(); return e; }, () => { tick(); return null; })),
  );
  if (exams.every(e => e === null)) {
    throw new Error('Não foi possível acessar a API do ENEM. Verifique sua conexão e tente novamente.');
  }

  const langByYear = new Map<number, string | null>();
  const pools: QuestionRef[][] = disciplines.map(() => []);

  exams.forEach((exam, i) => {
    if (!exam) return;
    const year = years[i];
    const lang = pickLanguage(exam);
    langByYear.set(year, lang);
    disciplines.forEach((d, di) => {
      const refs = exam.questions
        .filter(q => q.discipline === d && (!q.language || q.language === lang))
        .map(q => ({ year, index: q.index, discipline: d as Discipline, language: q.language }));
      // Slice per year so "easy" doesn't collapse into the earliest years only.
      pools[di].push(...difficultySlice(refs, difficulty));
    });
  });

  const queues = pools.map(pool =>
    shuffle(onlyNew ? pool.filter(r => !seenIds.has(`${r.year}-${r.index}`)) : pool),
  );

  const perDisc = Math.floor(questionCount / disciplines.length);
  const remainder = questionCount % disciplines.length;
  const quota = disciplines.map((_, i) => perDisc + (i < remainder ? 1 : 0));
  const got = disciplines.map(() => 0);
  const result: Question[] = [];

  for (;;) {
    const batch: Array<{ ref: QuestionRef; di: number }> = [];
    queues.forEach((q, di) => {
      for (const ref of q.splice(0, quota[di] - got[di])) batch.push({ ref, di });
    });
    if (batch.length === 0) break;

    const pages = new Map<string, { year: number; offset: number }>();
    for (const { ref } of batch) {
      const offset = pageOffset(ref.index);
      pages.set(`${ref.year}|${offset}`, { year: ref.year, offset });
    }
    total += pages.size;

    const byId = new Map<string, RawQuestion>();
    await Promise.all([...pages.values()].map(async ({ year, offset }) => {
      const page = await getPage(year, offset, langByYear.get(year) ?? null);
      tick();
      for (const q of page) byId.set(`${year}-${q.index}`, q);
    }));

    for (const { ref, di } of batch) {
      const raw = byId.get(`${ref.year}-${ref.index}`);
      if (raw && isComplete(raw)) {
        result.push(toQuestion(raw, ref));
        got[di]++;
      }
    }
  }

  if (result.length === 0) throw new Error('Nenhuma questão encontrada com esses filtros.');
  return shuffle(result);
}
