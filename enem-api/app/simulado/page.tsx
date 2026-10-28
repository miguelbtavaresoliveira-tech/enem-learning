'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AVAILABLE_YEARS,
    ALL_DISCIPLINES,
    DISCIPLINE_LABELS,
    DIFFICULTY_LABELS,
    type Discipline,
    type DifficultyLevel,
    type AnswerRevealMode,
    type SimuladoConfig,
    type SimuladoSession,
} from '@/lib/simulado/types';
import { getSeenQuestionIds, saveSession } from '@/lib/simulado/storage';

export default function SimuladoConfigPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [disciplines, setDisciplines] = useState<Discipline[]>([
        ...ALL_DISCIPLINES,
    ]);
    const [years, setYears] = useState<number[]>([...AVAILABLE_YEARS]);
    const [questionCount, setQuestionCount] = useState(20);
    const [onlyNew, setOnlyNew] = useState(false);
    const [difficulty, setDifficulty] = useState<DifficultyLevel>('all');
    const [revealMode, setRevealMode] = useState<AnswerRevealMode>('end');
    const [timerEnabled, setTimerEnabled] = useState(false);
    const [timerMinutes, setTimerMinutes] = useState(60);

    function toggleDiscipline(d: Discipline) {
        setDisciplines(prev =>
            prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d],
        );
    }

    function toggleYear(y: number) {
        setYears(prev =>
            prev.includes(y) ? prev.filter(x => x !== y) : [...prev, y],
        );
    }

    function toggleAllYears() {
        setYears(prev =>
            prev.length === AVAILABLE_YEARS.length ? [] : [...AVAILABLE_YEARS],
        );
    }

    async function handleStart() {
        if (!disciplines.length) {
            setError('Selecione ao menos uma área.');
            return;
        }
        if (!years.length) {
            setError('Selecione ao menos um ano.');
            return;
        }
        if (questionCount < 1 || questionCount > 180) {
            setError('Número de questões deve ser entre 1 e 180.');
            return;
        }

        setError('');
        setLoading(true);

        const config: SimuladoConfig = {
            disciplines,
            years,
            questionCount,
            onlyNew,
            difficulty,
            revealMode,
            timerEnabled,
            timerMinutes,
        };

        try {
            const seenIds = getSeenQuestionIds();
            const res = await fetch('/api/simulado/questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...config, seenIds }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Erro ao buscar questões');
            }

            const { questions } = await res.json();

            if (!questions.length) {
                setError(
                    'Nenhuma questão encontrada com os filtros selecionados. Tente ajustar os critérios.',
                );
                setLoading(false);
                return;
            }

            const session: SimuladoSession = {
                id: crypto.randomUUID(),
                config,
                questions,
                answers: {},
                startedAt: new Date().toISOString(),
            };

            saveSession(session);
            router.push('/simulado/session');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Erro inesperado');
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 py-10 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Novo Simulado
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        Configure seu simulado do ENEM
                    </p>
                </div>

                {/* Áreas */}
                <Section title="Áreas de conhecimento">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ALL_DISCIPLINES.map(d => (
                            <CheckCard
                                key={d}
                                label={DISCIPLINE_LABELS[d]}
                                checked={disciplines.includes(d)}
                                onChange={() => toggleDiscipline(d)}
                            />
                        ))}
                    </div>
                </Section>

                {/* Anos */}
                <Section title="Anos das provas">
                    <button
                        type="button"
                        onClick={toggleAllYears}
                        className="text-xs text-blue-600 dark:text-blue-400 underline mb-3 block"
                    >
                        {years.length === AVAILABLE_YEARS.length
                            ? 'Desmarcar todos'
                            : 'Selecionar todos'}
                    </button>
                    <div className="flex flex-wrap gap-2">
                        {AVAILABLE_YEARS.map(y => (
                            <button
                                key={y}
                                type="button"
                                onClick={() => toggleYear(y)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                                    years.includes(y)
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-neutral-700 hover:border-blue-400'
                                }`}
                            >
                                {y}
                            </button>
                        ))}
                    </div>
                </Section>

                {/* Número de questões */}
                <Section title="Número de questões">
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min={5}
                            max={90}
                            step={5}
                            value={questionCount}
                            onChange={e =>
                                setQuestionCount(Number(e.target.value))
                            }
                            className="flex-1 accent-blue-600"
                        />
                        <span className="w-16 text-center font-semibold text-gray-900 dark:text-white text-lg">
                            {questionCount}
                        </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                        Questões distribuídas igualmente entre as áreas
                        selecionadas
                    </p>
                </Section>

                {/* Dificuldade */}
                <Section title="Nível de dificuldade">
                    <p className="text-xs text-gray-400 mb-3">
                        Baseado na posição da questão dentro de cada área (início
                        = fácil, fim = difícil)
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        {(
                            Object.entries(DIFFICULTY_LABELS) as [
                                DifficultyLevel,
                                string,
                            ][]
                        ).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setDifficulty(key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                                    difficulty === key
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white dark:bg-neutral-900 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-neutral-700 hover:border-blue-400'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </Section>

                {/* Gabarito */}
                <Section title="Visualização do gabarito">
                    <div className="flex flex-col gap-3">
                        <RadioCard
                            label="Ao final do simulado"
                            description="Veja os acertos e erros só depois de enviar"
                            checked={revealMode === 'end'}
                            onChange={() => setRevealMode('end')}
                        />
                        <RadioCard
                            label="Imediato (ao responder)"
                            description="Feedback instantâneo em cada questão"
                            checked={revealMode === 'immediate'}
                            onChange={() => setRevealMode('immediate')}
                        />
                    </div>
                </Section>

                {/* Questões novas */}
                <Section title="Filtro de questões">
                    <label className="flex items-start gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={onlyNew}
                            onChange={e => setOnlyNew(e.target.checked)}
                            className="mt-0.5 accent-blue-600 w-4 h-4"
                        />
                        <div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                Apenas questões que nunca vi
                            </span>
                            <p className="text-xs text-gray-400 mt-0.5">
                                Exclui questões que já apareceram nos seus
                                simulados anteriores
                            </p>
                        </div>
                    </label>
                </Section>

                {/* Timer */}
                <Section title="Cronômetro">
                    <label className="flex items-start gap-3 cursor-pointer mb-3">
                        <input
                            type="checkbox"
                            checked={timerEnabled}
                            onChange={e => setTimerEnabled(e.target.checked)}
                            className="mt-0.5 accent-blue-600 w-4 h-4"
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                            Ativar cronômetro regressivo
                        </span>
                    </label>
                    {timerEnabled && (
                        <div className="flex items-center gap-4 mt-2">
                            <input
                                type="range"
                                min={10}
                                max={300}
                                step={10}
                                value={timerMinutes}
                                onChange={e =>
                                    setTimerMinutes(Number(e.target.value))
                                }
                                className="flex-1 accent-blue-600"
                            />
                            <span className="w-20 text-center font-semibold text-gray-900 dark:text-white">
                                {timerMinutes} min
                            </span>
                        </div>
                    )}
                </Section>

                {error && (
                    <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-4 py-3">
                        {error}
                    </p>
                )}

                <button
                    type="button"
                    onClick={handleStart}
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-base transition-colors"
                >
                    {loading ? 'Gerando simulado...' : 'Iniciar Simulado →'}
                </button>
            </div>
        </div>
    );
}

function Section({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-5 border border-gray-200 dark:border-neutral-800">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                {title}
            </h2>
            {children}
        </div>
    );
}

function CheckCard({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <label
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                checked
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-neutral-800 hover:border-blue-300'
            }`}
        >
            <input
                type="checkbox"
                checked={checked}
                onChange={onChange}
                className="accent-blue-600 w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {label}
            </span>
        </label>
    );
}

function RadioCard({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onChange: () => void;
}) {
    return (
        <label
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                checked
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-neutral-800 hover:border-blue-300'
            }`}
        >
            <input
                type="radio"
                checked={checked}
                onChange={onChange}
                className="mt-0.5 accent-blue-600 w-4 h-4"
            />
            <div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {label}
                </span>
                <p className="text-xs text-gray-400 mt-0.5">{description}</p>
            </div>
        </label>
    );
}
