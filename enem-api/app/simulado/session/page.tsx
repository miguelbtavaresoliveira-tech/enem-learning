'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    DISCIPLINE_LABELS,
    type SimuladoSession,
    type SimuladoQuestion,
} from '@/lib/simulado/types';
import {
    loadSession,
    saveSession,
    saveResult,
    markQuestionsAsSeen,
    clearSession,
} from '@/lib/simulado/storage';

export default function SimuladoSessionPage() {
    const router = useRouter();
    const [session, setSession] = useState<SimuladoSession | null>(null);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const s = loadSession();
        if (!s) {
            router.replace('/simulado');
            return;
        }
        setSession(s);
        if (s.config.timerEnabled) {
            setTimeLeft(s.config.timerMinutes * 60);
        }
    }, [router]);

    useEffect(() => {
        if (timeLeft === null) return;
        if (timeLeft <= 0) {
            handleFinish();
            return;
        }
        timerRef.current = setTimeout(
            () => setTimeLeft(t => (t !== null ? t - 1 : null)),
            1000,
        );
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft]);

    const handleAnswer = useCallback(
        (questionId: string, letter: string) => {
            if (!session) return;
            const revealMode = session.config.revealMode;
            const alreadyAnswered = session.answers[questionId];
            if (revealMode === 'immediate' && alreadyAnswered) return;

            const updated: SimuladoSession = {
                ...session,
                answers: { ...session.answers, [questionId]: letter },
            };
            setSession(updated);
            saveSession(updated);
        },
        [session],
    );

    const handleFinish = useCallback(() => {
        if (!session) return;
        if (timerRef.current) clearTimeout(timerRef.current);

        const finished: SimuladoSession = {
            ...session,
            finishedAt: new Date().toISOString(),
        };

        markQuestionsAsSeen(session.questions.map(q => q.id));
        saveResult(finished);
        clearSession();
        saveSession(finished);
        router.push('/simulado/results');
    }, [session, router]);

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
                <p className="text-gray-400">Carregando...</p>
            </div>
        );
    }

    const questions = session.questions;
    const current = questions[currentIdx];
    const answered = Object.keys(session.answers).length;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex flex-col">
            {/* Top bar */}
            <header className="bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-10">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0">
                        {currentIdx + 1}/{questions.length}
                    </span>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-neutral-700 rounded-full min-w-[80px]">
                        <div
                            className="h-2 bg-blue-600 rounded-full transition-all"
                            style={{
                                width: `${((currentIdx + 1) / questions.length) * 100}%`,
                            }}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {timeLeft !== null && (
                        <TimerBadge seconds={timeLeft} />
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            if (
                                confirm(
                                    'Tem certeza que deseja finalizar o simulado?',
                                )
                            )
                                handleFinish();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                    >
                        Finalizar
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Question area */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    <QuestionCard
                        question={current}
                        selectedAnswer={session.answers[current.id] ?? null}
                        revealMode={session.config.revealMode}
                        onAnswer={letter => handleAnswer(current.id, letter)}
                    />

                    {/* Navigation */}
                    <div className="flex justify-between mt-6">
                        <button
                            type="button"
                            onClick={() =>
                                setCurrentIdx(i => Math.max(0, i - 1))
                            }
                            disabled={currentIdx === 0}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-neutral-700 text-sm font-medium disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-700 dark:text-gray-300"
                        >
                            ← Anterior
                        </button>
                        {currentIdx < questions.length - 1 ? (
                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentIdx(i =>
                                        Math.min(questions.length - 1, i + 1),
                                    )
                                }
                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                            >
                                Próxima →
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    const unanswered =
                                        questions.length - answered;
                                    if (
                                        unanswered > 0 &&
                                        !confirm(
                                            `Você ainda tem ${unanswered} questão(ões) sem resposta. Finalizar mesmo assim?`,
                                        )
                                    )
                                        return;
                                    handleFinish();
                                }}
                                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                            >
                                Enviar Simulado ✓
                            </button>
                        )}
                    </div>
                </main>

                {/* Answer card sidebar */}
                <aside className="hidden lg:flex w-56 flex-col border-l border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-y-auto p-4">
                    <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        Cartão de Respostas
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                        {questions.map((q, i) => {
                            const ans = session.answers[q.id];
                            const isActive = i === currentIdx;
                            const isCorrect = ans === q.correctAlternative;
                            const reveal =
                                session.config.revealMode === 'immediate' &&
                                !!ans;

                            let cls =
                                'w-8 h-8 rounded-lg text-xs font-semibold flex items-center justify-center cursor-pointer border transition-colors ';

                            if (isActive) {
                                cls +=
                                    'border-blue-500 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-400';
                            } else if (reveal) {
                                cls += isCorrect
                                    ? 'border-green-500 bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-300'
                                    : 'border-red-500 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300';
                            } else if (ans) {
                                cls +=
                                    'border-gray-400 bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300';
                            } else {
                                cls +=
                                    'border-gray-200 dark:border-neutral-700 text-gray-400 dark:text-gray-600 hover:border-blue-300';
                            }

                            return (
                                <button
                                    key={q.id}
                                    type="button"
                                    className={cls}
                                    onClick={() => setCurrentIdx(i)}
                                    title={`Questão ${i + 1}${ans ? ` — ${ans}` : ''}`}
                                >
                                    {ans ?? i + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800 text-xs text-gray-400 space-y-1">
                        <p>
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                                {answered}
                            </span>{' '}
                            / {questions.length} respondidas
                        </p>
                        <p>
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                                {questions.length - answered}
                            </span>{' '}
                            em branco
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}

function TimerBadge({ seconds }: { seconds: number }) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const isUrgent = seconds < 300;
    return (
        <span
            className={`font-mono text-sm font-semibold px-2 py-1 rounded-lg ${
                isUrgent
                    ? 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300'
            }`}
        >
            {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </span>
    );
}

function QuestionCard({
    question,
    selectedAnswer,
    revealMode,
    onAnswer,
}: {
    question: SimuladoQuestion;
    selectedAnswer: string | null;
    revealMode: 'immediate' | 'end';
    onAnswer: (letter: string) => void;
}) {
    const revealed = revealMode === 'immediate' && !!selectedAnswer;

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6 space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
                    {DISCIPLINE_LABELS[question.discipline]}
                </span>
                <span className="text-xs text-gray-400">
                    ENEM {question.year} · Q.{question.index}
                </span>
            </div>

            {question.context && (
                <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 leading-relaxed border-l-4 border-blue-200 dark:border-blue-800 pl-4">
                    {question.context.split('\n').map((line, i) => (
                        <p key={i} className="mb-1">
                            {line}
                        </p>
                    ))}
                </div>
            )}

            {question.files.map((file, i) => (
                <div key={i} className="relative w-full max-h-80 overflow-hidden rounded-lg">
                    <Image
                        src={file}
                        alt={`Imagem ${i + 1}`}
                        width={700}
                        height={400}
                        className="object-contain w-full"
                        unoptimized
                    />
                </div>
            ))}

            {question.alternativesIntroduction && (
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {question.alternativesIntroduction}
                </p>
            )}

            <div className="space-y-2">
                {question.alternatives.map(alt => {
                    const isSelected = selectedAnswer === alt.letter;
                    const isCorrect = alt.letter === question.correctAlternative;

                    let cls =
                        'flex items-start gap-3 w-full text-left p-3 rounded-xl border transition-colors ';

                    if (revealed) {
                        if (isCorrect) {
                            cls +=
                                'border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-200';
                        } else if (isSelected && !isCorrect) {
                            cls +=
                                'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200';
                        } else {
                            cls +=
                                'border-gray-200 dark:border-neutral-700 text-gray-500 dark:text-gray-500 opacity-60';
                        }
                    } else if (isSelected) {
                        cls +=
                            'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-200';
                    } else {
                        cls +=
                            'border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:bg-blue-50/50 dark:hover:bg-blue-950/20';
                    }

                    return (
                        <button
                            key={alt.letter}
                            type="button"
                            className={cls}
                            onClick={() => onAnswer(alt.letter)}
                            disabled={revealed}
                        >
                            <span className="shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold border-current">
                                {alt.letter}
                            </span>
                            <span className="text-sm leading-relaxed">
                                {alt.text}
                                {alt.file && (
                                    <Image
                                        src={alt.file}
                                        alt={`Alt ${alt.letter}`}
                                        width={400}
                                        height={200}
                                        className="mt-2 max-h-40 object-contain"
                                        unoptimized
                                    />
                                )}
                            </span>
                            {revealed && isCorrect && (
                                <span className="ml-auto text-green-600 dark:text-green-400 shrink-0">
                                    ✓
                                </span>
                            )}
                            {revealed && isSelected && !isCorrect && (
                                <span className="ml-auto text-red-500 shrink-0">
                                    ✗
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {revealed && (
                <div
                    className={`rounded-xl px-4 py-3 text-sm ${
                        selectedAnswer === question.correctAlternative
                            ? 'bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-900'
                            : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900'
                    }`}
                >
                    {selectedAnswer === question.correctAlternative ? (
                        <span>✓ Correto! A alternativa {question.correctAlternative} está certa.</span>
                    ) : (
                        <span>
                            ✗ Incorreto. A resposta certa é{' '}
                            <strong>{question.correctAlternative}</strong>.
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
