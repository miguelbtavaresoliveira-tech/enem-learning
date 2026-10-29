import type { Discipline, QuestionRef, Question, DifficultyLevel, SimuladoConfig } from './types';

const PRIMARY = import.meta.env.VITE_ENEM_API_URL ?? 'https://api.enem.dev/v1';
const FALLBACK = import.meta.env.VITE_ENEM_API_FALLBACK ?? '/v1';

// Sliding-window rate limiter: max 9 requests per 10 s
const WINDOW_MS = 10_000;
const MAX_REQ = 9;
const reqTimestamps: number[] = [];

async function waitForSlot(): Promise<void> {
  for (;;) {
    const now = Date.now();
    // Remove timestamps older than the window
    while (reqTimestamps.length > 0 && now - reqTimestamps[0] >= WINDOW_MS) {
      reqTimestamps.shift();
    }
    if (reqTimestamps.length < MAX_REQ) {
      reqTimestamps.push(now);
      return;
    }
    // Wait until the oldest slot expires
    const wait = WINDOW_MS - (now - reqTimestamps[0]) + 50;
    await new Promise(r => setTimeout(r, wait));
  }
}

async function rawFetch(base: string, path: string): Promise<Response> {
  return fetch(`${base}${path}`);
}

async function apiFetch<T>(path: string): Promise<T> {
  await waitForSlot();

  let primaryRes: Response | null = null;
  try {
    primaryRes = await rawFetch(PRIMARY, path);
  } catch {
    // Network error — try fallback immediately
  }

  if (primaryRes) {
    if (primaryRes.status === 404) throw new Error(`Não encontrado: ${path}`);
    if (primaryRes.status === 429) {
      // Retry up to 3 times with back-off
      for (let attempt = 0; attempt < 3; attempt++) {
        await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
        await waitForSlot();
        try {
          primaryRes = await rawFetch(PRIMARY, path);
          if (primaryRes.ok) return primaryRes.json() as Promise<T>;
          if (primaryRes.status !== 429) break;
        } catch { /* try fallback below */ }
      }
    }
    if (primaryRes.ok) return primaryRes.json() as Promise<T>;
    // 5xx or persistent 429 → try fallback
  }

  // Fallback
  await waitForSlot();
  let fbRes: Response;
  try {
    fbRes = await rawFetch(FALLBACK, path);
  } catch {
    throw new Error('Sem conexão com a API. Verifique sua internet.');
  }
  if (!fbRes.ok) throw new Error(`API retornou ${fbRes.status}`);
  return fbRes.json() as Promise<T>;
}

// ---- Types ----

interface ExamMeta {
  year: number;
  questions: Array<{ index: number; discipline: string; language: string | null }>;
  languages: string[];
}

interface RawQuestion {
  title: string; year: number; index: number; discipline: string;
  language: string | null; context: string | null; files: string[];
  correctAlternative: Letter; alternativesIntroduction: string | null;
  alternatives: Array<{ letter: Letter; text: string | null; file: string | null; isCorrect: boolean }>;
}
type Letter = 'A' | 'B' | 'C' | 'D' | 'E';

interface PageResponse {
  questions: RawQuestion[];
  metadata: { limit: number; offset: number; total: number; hasMore: boolean };
}

// ---- Cache ----

const metaCache = new Map<number, ExamMeta>();
const pageCache = new Map<string, RawQuestion[]>();

function metaCacheKey(year: number) { return `enem_meta_${year}`; }

function loadMetaFromStorage(year: number): ExamMeta | null {
  try {
    const raw = localStorage.getItem(metaCacheKey(year));
    if (!raw) return null;
    return JSON.parse(raw) as ExamMeta;
  } catch { return null; }
}

function saveMetaToStorage(meta: ExamMeta) {
  try { localStorage.setItem(metaCacheKey(meta.year), JSON.stringify(meta)); } catch { /* ignore */ }
}

async function getExamMeta(year: number): Promise<ExamMeta> {
  if (metaCache.has(year)) return metaCache.get(year)!;
  const cached = loadMetaFromStorage(year);
  if (cached) { metaCache.set(year, cached); return cached; }

  const raw = await apiFetch<{ year: number; questions: ExamMeta['questions']; languages: Array<{ value: string }> }>(`/exams/${year}`);
  const meta: ExamMeta = {
    year: raw.year,
    questions: raw.questions,
    languages: raw.languages.map(l => l.value),
  };
  metaCache.set(year, meta);
  saveMetaToStorage(meta);
  return meta;
}

// ---- Helpers ----

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function difficultySlice(items: QuestionRef[], level: DifficultyLevel): QuestionRef[] {
  if (level === 'all') return items;
  const t = Math.floor(items.length / 3);
  if (level === 'easy') return items.slice(0, t);
  if (level === 'medium') return items.slice(t, t * 2);
  return items.slice(t * 2);
}

function isComplete(q: RawQuestion): boolean {
  if (!q.alternatives || q.alternatives.length < 5) return false;
  if (!q.correctAlternative) return false;
  const hasCorrect = q.alternatives.some(a => a.letter === q.correctAlternative);
  if (!hasCorrect) return false;
  const altOk = q.alternatives.every(a => a.text || a.file);
  if (!altOk) return false;
  const hasBody = !!(q.context || q.alternativesIntroduction || (q.files && q.files.length > 0));
  return hasBody;
}

function rawToQuestion(raw: RawQuestion, discipline: Discipline): Question {
  return {
    id: `${raw.year}-${raw.index}`,
    year: raw.year,
    index: raw.index,
    discipline,
    language: raw.language,
    title: raw.title,
    context: raw.context,
    files: raw.files ?? [],
    correctAlternative: raw.correctAlternative,
    alternativesIntroduction: raw.alternativesIntroduction,
    alternatives: raw.alternatives,
  };
}

async function fetchPage(year: number, offset: number, lang: string | null): Promise<RawQuestion[]> {
  const langParam = lang ? `&language=${lang}` : '';
  const key = `${year}:${offset}:${lang ?? ''}`;
  if (pageCache.has(key)) return pageCache.get(key)!;

  const data = await apiFetch<PageResponse>(`/exams/${year}/questions?limit=50&offset=${offset}${langParam}`);
  const qs = data.questions ?? [];
  pageCache.set(key, qs);
  return qs;
}

// ---- Main export ----

export async function loadSimuladoQuestions(
  config: Pick<SimuladoConfig, 'years' | 'disciplines' | 'questionCount' | 'onlyNew' | 'difficulty'>,
  seenIds: Set<string>,
  onProgress?: (done: number, total: number) => void,
): Promise<Question[]> {
  const { years, disciplines, questionCount, onlyNew, difficulty } = config;

  // Step 1: fetch metadata for each year
  const byDisc: Record<string, QuestionRef[]> = {};
  for (const d of disciplines) byDisc[d] = [];

  let metaDone = 0;
  const metaTotal = years.length;

  for (const year of years) {
    try {
      const meta = await getExamMeta(year);
      // Pick language: prefer 'ingles', else first
      const lang = meta.languages.includes('ingles')
        ? 'ingles'
        : meta.languages[0] ?? null;

      for (const disc of disciplines) {
        const qs = meta.questions
          .filter(q => q.discipline === disc)
          .filter(q => !q.language || q.language === lang)
          .map(q => ({ year, index: q.index, discipline: disc as Discipline, language: q.language }));
        byDisc[disc].push(...qs);
      }
    } catch { /* skip year on error */ }
    metaDone++;
    onProgress?.(metaDone, metaTotal + questionCount);
  }

  // Step 2: sample refs per discipline
  const perDisc = Math.floor(questionCount / disciplines.length);
  const remainder = questionCount % disciplines.length;
  const poolByDisc: Record<string, QuestionRef[]> = {};

  disciplines.forEach((d) => {
    let pool = difficultySlice(byDisc[d], difficulty);
    if (onlyNew) pool = pool.filter(q => !seenIds.has(`${q.year}-${q.index}`));
    poolByDisc[d] = shuffle(pool);
  });

  // Step 3: fetch pages and validate, replacing incomplete questions
  const selected: Question[] = [];
  let fetchDone = 0;

  for (const disc of disciplines) {
    const count = perDisc + (disciplines.indexOf(disc) < remainder ? 1 : 0);
    const pool = poolByDisc[disc];
    const needed = count;
    let filled = 0;
    let poolIdx = 0;

    while (filled < needed && poolIdx < pool.length) {
      const ref = pool[poolIdx++];
      // Determine page offset (pages overlap by 1: floor((index-1)/50)*50)
      const offset = Math.floor((ref.index - 1) / 50) * 50;
      const lang = ref.language;

      let rawQ: RawQuestion | null = null;
      try {
        const page = await fetchPage(ref.year, offset, lang);
        rawQ = page.find(q => q.index === ref.index) ?? null;
      } catch { /* skip */ }

      fetchDone++;
      onProgress?.(metaDone + fetchDone, metaTotal + questionCount);

      if (!rawQ || !isComplete(rawQ)) continue;
      selected.push(rawToQuestion(rawQ, disc as Discipline));
      filled++;
    }
  }

  return shuffle(selected);
}
