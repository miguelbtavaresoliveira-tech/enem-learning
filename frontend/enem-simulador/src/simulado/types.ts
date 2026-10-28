export type Discipline = 'ciencias-humanas' | 'ciencias-natureza' | 'linguagens' | 'matematica';
export type DifficultyLevel = 'all' | 'easy' | 'medium' | 'hard';
export type AnswerRevealMode = 'immediate' | 'end';
export type Letter = 'A' | 'B' | 'C' | 'D' | 'E';

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  'ciencias-humanas': 'Ciências Humanas',
  'ciencias-natureza': 'Ciências da Natureza',
  linguagens: 'Linguagens',
  matematica: 'Matemática',
};

export const DISCIPLINE_COLORS: Record<Discipline, string> = {
  'ciencias-humanas': '#FF6B35',
  'ciencias-natureza': '#34C759',
  linguagens: '#007AFF',
  matematica: '#AF52DE',
};

export const DISCIPLINE_ICONS: Record<Discipline, string> = {
  'ciencias-humanas': '🏛',
  'ciencias-natureza': '🔬',
  linguagens: '📖',
  matematica: '📐',
};

export const ALL_DISCIPLINES: Discipline[] = [
  'ciencias-humanas',
  'ciencias-natureza',
  'linguagens',
  'matematica',
];

export const AVAILABLE_YEARS = [2023,2022,2021,2020,2019,2018,2017,2016,2015,2014,2013,2012,2011,2010,2009];

export interface SimuladoConfig {
  disciplines: Discipline[];
  years: number[];
  questionCount: number;
  onlyNew: boolean;
  difficulty: DifficultyLevel;
  revealMode: AnswerRevealMode;
  timerEnabled: boolean;
  timerMinutes: number;
}

export interface Alternative {
  letter: Letter;
  text: string | null;
  file: string | null;
  isCorrect: boolean;
}

export interface Question {
  id: string; // "year-index"
  year: number;
  index: number;
  discipline: Discipline;
  language: string | null;
  title: string;
  context: string | null;
  files: string[];
  correctAlternative: Letter;
  alternativesIntroduction: string | null;
  alternatives: Alternative[];
}

export interface QuestionRef {
  year: number;
  index: number;
  discipline: Discipline;
  language: string | null;
}

export interface SimuladoSession {
  id: string;
  config: SimuladoConfig;
  questionRefs: QuestionRef[];
  loadedQuestions: Record<string, Question>; // id -> Question
  answers: Record<string, Letter>;
  startedAt: string;
  finishedAt?: string;
}

export interface DisciplineScore {
  discipline: Discipline;
  correct: number;
  total: number;
}

export interface SimuladoResult {
  id: string;
  config: SimuladoConfig;
  totalQuestions: number;
  correct: number;
  disciplineScores: DisciplineScore[];
  wrongAnswers: Array<{ questionId: string; year: number; index: number; discipline: Discipline; selected: Letter; correct: Letter; title: string }>;
  startedAt: string;
  finishedAt: string;
  elapsedSeconds: number;
}
