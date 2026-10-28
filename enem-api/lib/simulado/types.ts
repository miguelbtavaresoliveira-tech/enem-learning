export type Discipline =
    | 'ciencias-humanas'
    | 'ciencias-natureza'
    | 'linguagens'
    | 'matematica';

export type DifficultyLevel = 'all' | 'easy' | 'medium' | 'hard';
export type AnswerRevealMode = 'immediate' | 'end';

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
    'ciencias-humanas': 'Ciências Humanas',
    'ciencias-natureza': 'Ciências da Natureza',
    linguagens: 'Linguagens',
    matematica: 'Matemática',
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
    all: 'Todas',
    easy: 'Fácil',
    medium: 'Médio',
    hard: 'Difícil',
};

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

export interface SimuladoAlternative {
    letter: string;
    text: string | null;
    file: string | null;
    isCorrect: boolean;
}

export interface SimuladoQuestion {
    id: string;
    year: number;
    index: number;
    discipline: Discipline;
    title: string;
    context: string | null;
    files: string[];
    correctAlternative: string;
    alternativesIntroduction: string | null;
    alternatives: SimuladoAlternative[];
}

export interface SimuladoSession {
    id: string;
    config: SimuladoConfig;
    questions: SimuladoQuestion[];
    answers: Record<string, string>;
    startedAt: string;
    finishedAt?: string;
}

export const AVAILABLE_YEARS = [
    2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020,
    2021, 2022, 2023,
];

export const ALL_DISCIPLINES: Discipline[] = [
    'ciencias-humanas',
    'ciencias-natureza',
    'linguagens',
    'matematica',
];
