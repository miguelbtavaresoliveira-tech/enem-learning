'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    DISCIPLINE_LABELS,
    type SimuladoSession,
    type SimuladoQuestion,
    type Discipline,
} from '@/lib/simulado/types';
import {
    loadSession,
    saveSession,
    saveResult,
    markQuestionsAsSeen,
    clearSession,
} from '@/lib/simulado/storage';
import { AppleNav, NavBackBtn, ScoreRing } from '../_ui';

const DISC_COLOR: Record<Discipline, string> = {
    'ciencias-humanas': '#FF6B35',
    'ciencias-natureza': '#34C759',
    linguagens: '#007AFF',
    matematica: '#AF52DE',
};

export default function SimuladoSessionPage() {
    const router = useRouter();
    const [session, setSession] = useState<SimuladoSession | null>(null);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [showCard, setShowCard] = useState(false);
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
            if (
                session.config.revealMode === 'immediate' &&
                session.answers[questionId]
            )
                return;
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
            <div
                className="flex min-h-screen items-center justify-center"
                style={{ background: 'var(--sys-bg)' }}
            >
                <div
                    className="text-[15px]"
                    style={{ color: 'var(--secondary-label)' }}
                >
                    Carregando…
                </div>
            </div>
        );
    }

    const questions = session.questions;
    const current = questions[currentIdx];
    const answered = Object.keys(session.answers).length;
    const progress = (currentIdx + 1) / questions.length;

    return (
        <div
            className="flex min-h-screen flex-col"
            style={{ background: 'var(--sys-bg)' }}
        >
            {/* Nav */}
            <AppleNav
                title={
                    <div className="flex flex-col items-center">
                        <span
                            className="text-[17px] font-semibold"
                            style={{ color: 'var(--label)' }}
                        >
                            {currentIdx + 1} / {questions.length}
                        </span>
                        <span
                            className="text-[11px]"
                            style={{ color: 'var(--secondary-label)' }}
                        >
                            {answered} respondidas
                        </span>
                    </div>
                }
                left={
                    <NavBackBtn
                        label="Config"
                        onClick={() => {
                            if (
                                window.confirm(
                                    'Sair do simulado? O progresso será perdido.',
                                )
                            ) {
                                clearSession();
                                router.push('/simulado');
                            }
                        }}
                    />
                }
                right={
                    <div className="flex items-center gap-3">
                        {timeLeft !== null && (
                            <TimerDisplay seconds={timeLeft} />
                        )}
                        <button
                            type="button"
                            onClick={() => setShowCard(c => !c)}
                            className="flex h-8 w-8 items-center justify-center rounded-full lg:hidden"
                            style={{ background: 'var(--seg-bg)' }}
                            title="Cartão de respostas"
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="none"
                            >
                                <rect
                                    x="1"
                                    y="1"
                                    width="6"
                                    height="6"
                                    rx="1.5"
                                    fill="var(--secondary-label)"
                                />
                                <rect
                                    x="9"
                                    y="1"
                                    width="6"
                                    height="6"
                                    rx="1.5"
                                    fill="var(--secondary-label)"
                                />
                                <rect
                                    x="1"
                                    y="9"
                                    width="6"
                                    height="6"
                                    rx="1.5"
                                    fill="var(--secondary-label)"
                                />
                                <rect
                                    x="9"
                                    y="9"
                                    width="6"
                                    height="6"
                                    rx="1.5"
                                    fill="var(--secondary-label)"
                                />
                            </svg>
                        </button>
                    </div>
                }
            />

            {/* Progress bar */}
            <div
                className="h-[3px] w-full"
                style={{ background: 'var(--seg-bg)' }}
            >
                <div
                    className="h-full transition-all duration-300"
                    style={{
                        width: `${progress * 100}%`,
                        background: 'var(--blue)',
                    }}
                />
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main */}
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-2xl px-4 py-6">
                        <QuestionCard
                            question={current}
                            selectedAnswer={
                                session.answers[current.id] ?? null
                            }
                            revealMode={session.config.revealMode}
                            onAnswer={letter =>
                                handleAnswer(current.id, letter)
                            }
                        />

                        {/* Bottom navigation */}
                        <div className="mt-6 flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() =>
                                    setCurrentIdx(i => Math.max(0, i - 1))
                                }
                                disabled={currentIdx === 0}
                                className="flex h-11 flex-1 items-center justify-center rounded-xl text-[17px] font-semibold disabled:opacity-30 transition-opacity active:opacity-60"
                                style={{
                                    background: 'var(--card-bg)',
                                    color: 'var(--blue)',
                                }}
                            >
                                ← Anterior
                            </button>

                            {currentIdx < questions.length - 1 ? (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setCurrentIdx(i =>
                                            Math.min(
                                                questions.length - 1,
                                                i + 1,
                                            ),
                                        )
                                    }
                                    className="flex h-11 flex-1 items-center justify-center rounded-xl text-[17px] font-semibold transition-opacity active:opacity-60"
                                    style={{
                                        background: 'var(--blue)',
                                        color: '#fff',
                                    }}
                                >
                                    Próxima →
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const blank =
                                            questions.length - answered;
                                        if (
                                            blank > 0 &&
                                            !window.confirm(
                                                `Ainda há ${blank} questão(ões) sem resposta. Finalizar mesmo assim?`,
                                            )
                                        )
                                            return;
                                        handleFinish();
                                    }}
                                    className="flex h-11 flex-1 items-center justify-center rounded-xl text-[17px] font-semibold transition-opacity active:opacity-60"
                                    style={{
                                        background: 'var(--green)',
                                        color: '#fff',
                                    }}
                                >
                                    Enviar ✓
                                </button>
                            )}
                        </div>
                    </div>
                </main>

                {/* Desktop answer card */}
                <aside
                    className="hidden w-52 shrink-0 overflow-y-auto border-l lg:block"
                    style={{
                        background: 'var(--card-bg)',
                        borderColor: 'var(--separator)',
                    }}
                >
                    <AnswerCard
                        session={session}
                        currentIdx={currentIdx}
                        onSelect={setCurrentIdx}
                        onFinish={handleFinish}
                    />
                </aside>
            </div>

            {/* Mobile answer card sheet */}
            {showCard && (
                <div
                    className="fixed inset-0 z-50 flex flex-col lg:hidden"
                    style={{ background: 'var(--sys-bg)' }}
                >
                    <AppleNav
                        title="Cartão de Respostas"
                        right={
                            <button
                                type="button"
                                onClick={() => setShowCard(false)}
                                className="text-[17px] font-semibold"
                                style={{ color: 'var(--blue)' }}
                            >
                                OK
                            </button>
                        }
                    />
                    <div className="flex-1 overflow-y-auto">
                        <AnswerCard
                            session={session}
                            currentIdx={currentIdx}
                            onSelect={i => {
                                setCurrentIdx(i);
                                setShowCard(false);
                            }}
                            onFinish={handleFinish}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function TimerDisplay({ seconds }: { seconds: number }) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const urgent = seconds < 300;
    return (
        <span
            className="rounded-lg px-2 py-1 text-[13px] font-semibold tabular-nums"
            style={{
                background: urgent
                    ? 'rgba(255,59,48,0.1)'
                    : 'var(--seg-bg)',
                color: urgent ? 'var(--red)' : 'var(--label)',
            }}
        >
            {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
        </span>
    );
}

function AnswerCard({
    session,
    currentIdx,
    onSelect,
    onFinish,
}: {
    session: SimuladoSession;
    currentIdx: number;
    onSelect: (i: number) => void;
    onFinish: () => void;
}) {
    const { questions, answers, config } = session;
    const answered = Object.keys(answers).length;

    return (
        <div className="p-4 space-y-4">
            <p
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--secondary-label)' }}
            >
                Cartão de Respostas
            </p>

            <div className="flex flex-wrap gap-1.5">
                {questions.map((q, i) => {
                    const ans = answers[q.id];
                    const isActive = i === currentIdx;
                    const reveal =
                        config.revealMode === 'immediate' && !!ans;
                    const isCorrect = ans === q.correctAlternative;

                    let bg = 'var(--seg-bg)';
                    let fg = 'var(--secondary-label)';
                    let ring = '';

                    if (isActive) {
                        bg = 'var(--blue)';
                        fg = '#fff';
                        ring = '';
                    } else if (reveal) {
                        bg = isCorrect
                            ? 'rgba(52,199,89,0.15)'
                            : 'rgba(255,59,48,0.12)';
                        fg = isCorrect ? 'var(--green)' : 'var(--red)';
                    } else if (ans) {
                        bg = 'rgba(0,122,255,0.1)';
                        fg = 'var(--blue)';
                    }

                    return (
                        <button
                            key={q.id}
                            type="button"
                            onClick={() => onSelect(i)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-semibold transition-transform active:scale-90"
                            style={{ background: bg, color: fg }}
                            title={`Q${i + 1}${ans ? ` → ${ans}` : ''}`}
                        >
                            {ans ?? i + 1}
                        </button>
                    );
                })}
            </div>

            <div
                className="rounded-xl p-3 space-y-1.5"
                style={{ background: 'var(--seg-bg)' }}
            >
                <StatRow
                    label="Respondidas"
                    value={answered}
                    color="var(--blue)"
                />
                <StatRow
                    label="Em branco"
                    value={questions.length - answered}
                    color="var(--secondary-label)"
                />
            </div>

            <button
                type="button"
                onClick={onFinish}
                className="w-full rounded-xl py-3 text-[15px] font-semibold transition-opacity active:opacity-60"
                style={{ background: 'var(--green)', color: '#fff' }}
            >
                Finalizar Simulado
            </button>
        </div>
    );
}

function StatRow({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className="flex items-center justify-between">
            <span
                className="text-[13px]"
                style={{ color: 'var(--secondary-label)' }}
            >
                {label}
            </span>
            <span
                className="text-[15px] font-semibold tabular-nums"
                style={{ color }}
            >
                {value}
            </span>
        </div>
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
    const color = DISC_COLOR[question.discipline];

    return (
        <div
            className="overflow-hidden rounded-2xl"
            style={{ background: 'var(--card-bg)' }}
        >
            {/* Header stripe */}
            <div
                className="h-1.5 w-full"
                style={{ background: color }}
            />

            <div className="p-5 space-y-5">
                {/* Metadata */}
                <div className="flex items-center gap-2 flex-wrap">
                    <span
                        className="rounded-full px-3 py-1 text-[12px] font-semibold"
                        style={{
                            background: `${color}18`,
                            color,
                        }}
                    >
                        {DISCIPLINE_LABELS[question.discipline]}
                    </span>
                    <span
                        className="text-[12px]"
                        style={{ color: 'var(--tertiary-label)' }}
                    >
                        ENEM {question.year} · Q. {question.index}
                    </span>
                </div>

                {/* Context */}
                {question.context && (
                    <div
                        className="rounded-xl p-4 text-[15px] leading-relaxed"
                        style={{
                            background: 'var(--seg-bg)',
                            color: 'var(--label)',
                        }}
                    >
                        {question.context.split('\n').map((line, i) => (
                            <p key={i} className="mb-1 last:mb-0">
                                {line}
                            </p>
                        ))}
                    </div>
                )}

                {/* Images */}
                {question.files.map((file, i) => (
                    <div
                        key={i}
                        className="overflow-hidden rounded-xl"
                    >
                        <Image
                            src={file}
                            alt={`Imagem ${i + 1}`}
                            width={700}
                            height={400}
                            className="w-full object-contain"
                            unoptimized
                        />
                    </div>
                ))}

                {/* Intro */}
                {question.alternativesIntroduction && (
                    <p
                        className="text-[15px] font-medium leading-snug"
                        style={{ color: 'var(--label)' }}
                    >
                        {question.alternativesIntroduction}
                    </p>
                )}

                {/* Alternatives */}
                <div className="space-y-2">
                    {question.alternatives.map(alt => {
                        const isSelected = selectedAnswer === alt.letter;
                        const isCorrect =
                            alt.letter === question.correctAlternative;

                        let bg = 'transparent';
                        let border = 'var(--separator)';
                        let textColor = 'var(--label)';
                        let letterBg = 'var(--seg-bg)';
                        let letterColor = 'var(--secondary-label)';

                        if (revealed) {
                            if (isCorrect) {
                                bg = 'rgba(52,199,89,0.1)';
                                border = 'var(--green)';
                                textColor = 'var(--label)';
                                letterBg = 'var(--green)';
                                letterColor = '#fff';
                            } else if (isSelected) {
                                bg = 'rgba(255,59,48,0.08)';
                                border = 'var(--red)';
                                textColor = 'var(--secondary-label)';
                                letterBg = 'var(--red)';
                                letterColor = '#fff';
                            } else {
                                textColor = 'var(--tertiary-label)';
                            }
                        } else if (isSelected) {
                            bg = 'rgba(0,122,255,0.08)';
                            border = 'var(--blue)';
                            letterBg = 'var(--blue)';
                            letterColor = '#fff';
                        }

                        return (
                            <button
                                key={alt.letter}
                                type="button"
                                onClick={() => onAnswer(alt.letter)}
                                disabled={revealed}
                                className="flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all duration-150 active:opacity-60 disabled:cursor-default"
                                style={{
                                    background: bg,
                                    borderColor: border,
                                }}
                            >
                                <span
                                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
                                    style={{
                                        background: letterBg,
                                        color: letterColor,
                                    }}
                                >
                                    {alt.letter}
                                </span>
                                <span
                                    className="flex-1 text-[15px] leading-relaxed"
                                    style={{ color: textColor }}
                                >
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
                                    <svg
                                        className="mt-1 shrink-0"
                                        width="18"
                                        height="18"
                                        viewBox="0 0 18 18"
                                        fill="none"
                                    >
                                        <circle
                                            cx="9"
                                            cy="9"
                                            r="9"
                                            fill="var(--green)"
                                        />
                                        <path
                                            d="M5 9l3 3 5-5"
                                            stroke="#fff"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                                {revealed && isSelected && !isCorrect && (
                                    <svg
                                        className="mt-1 shrink-0"
                                        width="18"
                                        height="18"
                                        viewBox="0 0 18 18"
                                        fill="none"
                                    >
                                        <circle
                                            cx="9"
                                            cy="9"
                                            r="9"
                                            fill="var(--red)"
                                        />
                                        <path
                                            d="M6 6l6 6M12 6l-6 6"
                                            stroke="#fff"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Feedback banner */}
                {revealed && (
                    <div
                        className="rounded-xl p-4 text-[15px] font-medium"
                        style={
                            selectedAnswer === question.correctAlternative
                                ? {
                                      background: 'rgba(52,199,89,0.1)',
                                      color: 'var(--green)',
                                  }
                                : {
                                      background: 'rgba(255,59,48,0.1)',
                                      color: 'var(--red)',
                                  }
                        }
                    >
                        {selectedAnswer === question.correctAlternative ? (
                            <>✓ Correto! A alternativa {question.correctAlternative} está certa.</>
                        ) : (
                            <>
                                ✗ Resposta incorreta. A alternativa correta é{' '}
                                <strong>{question.correctAlternative}</strong>.
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
