import { NextRequest, NextResponse } from 'next/server';
import { getExamDetails } from '@/lib/api/exams/get-exam-details';
import { getQuestionDetails } from '@/lib/api/questions/get-question-details';
import type {
    Discipline,
    DifficultyLevel,
    SimuladoQuestion,
} from '@/lib/simulado/types';

export const dynamic = 'force-dynamic';

interface RequestBody {
    years: number[];
    disciplines: Discipline[];
    questionCount: number;
    onlyNew: boolean;
    seenIds: string[];
    difficulty: DifficultyLevel;
}

function getDifficultyRange(total: number, level: DifficultyLevel) {
    if (level === 'all') return [0, total];
    const third = Math.floor(total / 3);
    if (level === 'easy') return [0, third];
    if (level === 'medium') return [third, third * 2];
    return [third * 2, total];
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export async function POST(request: NextRequest) {
    try {
        const body: RequestBody = await request.json();
        const { years, disciplines, questionCount, onlyNew, seenIds, difficulty } =
            body;

        if (!years?.length || !disciplines?.length || !questionCount) {
            return NextResponse.json(
                { error: 'Parâmetros inválidos' },
                { status: 400 },
            );
        }

        const seenSet = new Set(seenIds ?? []);

        type Candidate = {
            year: number;
            index: number;
            discipline: Discipline;
            language: string | null;
        };

        const candidatesByDiscipline: Record<string, Candidate[]> = {};
        for (const d of disciplines) {
            candidatesByDiscipline[d] = [];
        }

        for (const year of years) {
            const exam = await getExamDetails(year);
            if (!exam) continue;

            for (const d of disciplines) {
                // T-03: pick a single language for foreign-language questions to avoid duplicates
        const defaultLang = exam.languages?.length > 0 ? exam.languages[0].value : null;

        const disciplineQuestions = exam.questions
            .filter(q => q.discipline === d)
            .filter(q => !q.language || q.language === defaultLang);

                const [start, end] = getDifficultyRange(
                    disciplineQuestions.length,
                    difficulty,
                );
                const inRange = disciplineQuestions.slice(start, end);

                for (const q of inRange) {
                    const id = `${year}-${q.index}-${q.language ?? 'none'}`;
                    if (onlyNew && seenSet.has(id)) continue;
                    candidatesByDiscipline[d].push({
                        year,
                        index: q.index,
                        discipline: d,
                        language: q.language,
                    });
                }
            }
        }

        const perDiscipline = Math.floor(questionCount / disciplines.length);
        const remainder = questionCount % disciplines.length;

        const selected: Candidate[] = [];
        disciplines.forEach((d, i) => {
            const count = perDiscipline + (i < remainder ? 1 : 0);
            const shuffled = shuffle(candidatesByDiscipline[d]);
            selected.push(...shuffled.slice(0, count));
        });

        const finalSelected = shuffle(selected);

        const questions: SimuladoQuestion[] = [];

        for (const candidate of finalSelected) {
            const detail = await getQuestionDetails({
                year: candidate.year,
                index: candidate.index,
                language: candidate.language,
            });
            if (!detail) continue;

            questions.push({
                id: `${candidate.year}-${candidate.index}`,
                year: candidate.year,
                index: candidate.index,
                discipline: candidate.discipline,
                title: detail.title,
                context: detail.context,
                files: detail.files,
                correctAlternative: detail.correctAlternative,
                alternativesIntroduction: detail.alternativesIntroduction,
                alternatives: detail.alternatives,
            });
        }

        return NextResponse.json({ questions });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: 'Erro interno ao gerar simulado' },
            { status: 500 },
        );
    }
}
