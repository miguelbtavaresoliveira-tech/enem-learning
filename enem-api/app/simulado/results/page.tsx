'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    DISCIPLINE_LABELS,
    type SimuladoSession,
    type SimuladoQuestion,
    type Discipline,
} from '@/lib/simulado/types';
import { loadSession, clearSession } from '@/lib/simulado/storage';

export default function SimuladoResultsPage() {
    const router = useRouter();
    const [session, setSession] = useState<SimuladoSession | null>(null);
    const [expandedQuestion, setExpandedQuestion] = useState<string | null>(
        null,
    );
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const s = loadSession();
        if (!s || !s.finishedAt) {
            router.replace('/simulado');
            return;
        }
        setSession(s);
    }, [router]);

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950">
                <p className="text-gray-400">Carregando resultados...</p>
            </div>
        );
    }

    const { questions, answers } = session;
    const total = questions.length;
    const correct = questions.filter(
        q => answers[q.id] === q.correctAlternative,
    ).length;
    const wrong = questions.filter(
        q => answers[q.id] && answers[q.id] !== q.correctAlternative,
    );
    const blank = questions.filter(q => !answers[q.id]);
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    const byDiscipline = questions.reduce<Partial<Record<Discipline, SimuladoQuestion[]>>>(
        (acc, q) => {
            if (!acc[q.discipline]) acc[q.discipline] = [];
            acc[q.discipline]!.push(q);
            return acc;
        },
        {},
    );

    const reviewPrompt = buildReviewPrompt(wrong, answers);

    async function copyPrompt() {
        await navigator.clipboard.writeText(reviewPrompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    function handleNewSimulado() {
        clearSession();
        router.push('/simulado');
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 py-10 px-4">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                            Resultado do Simulado
                        </h1>
                        <p className="text-gray-400 text-sm mt-1">
                            {new Date(session.startedAt).toLocaleDateString(
                                'pt-BR',
                                {
                                    day: '2-digit',
                                    month: 'long',
                                    year: 'numeric',
                                },
                            )}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleNewSimulado}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                    >
                        Novo Simulado
                    </button>
                </div>

                {/* Score card */}
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                        <ScoreCircle score={score} />
                        <div className="flex-1 grid grid-cols-3 gap-4 w-full">
                            <StatCard
                                label="Acertos"
                                value={correct}
                                color="green"
                            />
                            <StatCard
                                label="Erros"
                                value={wrong.length}
                                color="red"
                            />
                            <StatCard
                                label="Em branco"
                                value={blank.length}
                                color="gray"
                            />
                        </div>
                    </div>
                </div>

                {/* Por disciplina */}
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6">
                    <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                        Desempenho por Área
                    </h2>
                    <div className="space-y-3">
                        {(
                            Object.entries(byDiscipline) as [
                                Discipline,
                                SimuladoQuestion[],
                            ][]
                        ).map(([disc, qs]) => {
                            const c = qs.filter(
                                q =>
                                    answers[q.id] === q.correctAlternative,
                            ).length;
                            const pct =
                                qs.length > 0
                                    ? Math.round((c / qs.length) * 100)
                                    : 0;
                            return (
                                <div key={disc}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-700 dark:text-gray-300">
                                            {DISCIPLINE_LABELS[disc]}
                                        </span>
                                        <span className="font-medium text-gray-900 dark:text-white">
                                            {c}/{qs.length} ({pct}%)
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-100 dark:bg-neutral-800 rounded-full">
                                        <div
                                            className={`h-2 rounded-full transition-all ${
                                                pct >= 70
                                                    ? 'bg-green-500'
                                                    : pct >= 50
                                                      ? 'bg-yellow-500'
                                                      : 'bg-red-500'
                                            }`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Questões erradas */}
                {wrong.length > 0 && (
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6">
                        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                            Questões Erradas ({wrong.length})
                        </h2>
                        <div className="space-y-3">
                            {wrong.map((q, i) => (
                                <WrongQuestionCard
                                    key={q.id}
                                    question={q}
                                    selectedAnswer={answers[q.id]}
                                    index={i + 1}
                                    expanded={expandedQuestion === q.id}
                                    onToggle={() =>
                                        setExpandedQuestion(
                                            expandedQuestion === q.id
                                                ? null
                                                : q.id,
                                        )
                                    }
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Questões em branco */}
                {blank.length > 0 && (
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-5">
                        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                            Questões sem resposta ({blank.length})
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {blank.map((q, i) => (
                                <span
                                    key={q.id}
                                    className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-neutral-800 text-sm text-gray-600 dark:text-gray-400"
                                >
                                    Q.{i + 1} — {DISCIPLINE_LABELS[q.discipline]} {q.year}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Prompt de revisão */}
                {wrong.length > 0 && (
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200 dark:border-neutral-800 p-6">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                Prompt de Revisão
                            </h2>
                            <button
                                type="button"
                                onClick={copyPrompt}
                                className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 transition-colors"
                            >
                                {copied ? '✓ Copiado!' : 'Copiar'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                            Cole esse prompt em qualquer IA (ChatGPT, Claude,
                            etc.) para revisar os conteúdos que você errou.
                        </p>
                        <pre className="text-xs bg-gray-50 dark:bg-neutral-950 border border-gray-200 dark:border-neutral-800 rounded-xl p-4 whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed max-h-72 overflow-y-auto">
                            {reviewPrompt}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}

function ScoreCircle({ score }: { score: number }) {
    const color =
        score >= 70
            ? 'text-green-500'
            : score >= 50
              ? 'text-yellow-500'
              : 'text-red-500';
    return (
        <div className="flex flex-col items-center">
            <div
                className={`text-5xl font-bold ${color} tabular-nums`}
            >
                {score}%
            </div>
            <div className="text-xs text-gray-400 mt-1">aproveitamento</div>
        </div>
    );
}

function StatCard({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: 'green' | 'red' | 'gray';
}) {
    const colorMap = {
        green: 'text-green-600 dark:text-green-400',
        red: 'text-red-600 dark:text-red-400',
        gray: 'text-gray-500 dark:text-gray-400',
    };
    return (
        <div className="text-center">
            <div
                className={`text-3xl font-bold tabular-nums ${colorMap[color]}`}
            >
                {value}
            </div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
        </div>
    );
}

function WrongQuestionCard({
    question,
    selectedAnswer,
    index,
    expanded,
    onToggle,
}: {
    question: SimuladoQuestion;
    selectedAnswer: string;
    index: number;
    expanded: boolean;
    onToggle: () => void;
}) {
    const correctAlt = question.alternatives.find(
        a => a.letter === question.correctAlternative,
    );
    const wrongAlt = question.alternatives.find(
        a => a.letter === selectedAnswer,
    );

    return (
        <div className="border border-red-200 dark:border-red-900/50 rounded-xl overflow-hidden">
            <button
                type="button"
                className="w-full flex items-center justify-between p-4 text-left hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                onClick={onToggle}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center">
                        {index}
                    </span>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                            ENEM {question.year} · Q.{question.index}
                        </p>
                        <p className="text-xs text-gray-400">
                            {DISCIPLINE_LABELS[question.discipline]} · Você:{' '}
                            <strong className="text-red-500">
                                {selectedAnswer}
                            </strong>{' '}
                            · Correto:{' '}
                            <strong className="text-green-500">
                                {question.correctAlternative}
                            </strong>
                        </p>
                    </div>
                </div>
                <span className="text-gray-400 shrink-0 ml-2">
                    {expanded ? '▲' : '▼'}
                </span>
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-red-100 dark:border-red-900/30 pt-4">
                    {question.context && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 border-l-2 border-gray-200 dark:border-neutral-700 pl-3 leading-relaxed">
                            {question.context.slice(0, 400)}
                            {question.context.length > 400 ? '...' : ''}
                        </div>
                    )}

                    <div className="space-y-2">
                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
                            <span className="shrink-0 w-5 h-5 rounded-full border-2 border-red-400 text-red-500 text-xs font-bold flex items-center justify-center">
                                {selectedAnswer}
                            </span>
                            <p className="text-xs text-red-700 dark:text-red-300">
                                {wrongAlt?.text ?? '—'}{' '}
                                <span className="font-medium">(sua resposta)</span>
                            </p>
                        </div>

                        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40">
                            <span className="shrink-0 w-5 h-5 rounded-full border-2 border-green-500 text-green-600 text-xs font-bold flex items-center justify-center">
                                {question.correctAlternative}
                            </span>
                            <p className="text-xs text-green-700 dark:text-green-300">
                                {correctAlt?.text ?? '—'}{' '}
                                <span className="font-medium">(correto)</span>
                            </p>
                            {correctAlt?.file && (
                                <Image
                                    src={correctAlt.file}
                                    alt="Alternativa correta"
                                    width={300}
                                    height={150}
                                    className="mt-2 max-h-32 object-contain"
                                    unoptimized
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function buildReviewPrompt(
    wrong: SimuladoQuestion[],
    answers: Record<string, string>,
): string {
    const lines: string[] = [
        'Olá! Acabei de fazer um simulado do ENEM e preciso revisar os conteúdos em que errei.',
        'Por favor, para cada questão abaixo, explique por que a alternativa correta está certa e por que a minha resposta estava errada. Em seguida, faça um resumo dos principais conteúdos que preciso estudar.',
        '',
    ];

    wrong.forEach((q, i) => {
        const myAns = answers[q.id];
        const myAlt = q.alternatives.find(a => a.letter === myAns);
        const correctAlt = q.alternatives.find(
            a => a.letter === q.correctAlternative,
        );

        lines.push(`--- Questão ${i + 1} (ENEM ${q.year}, Q.${q.index} — ${DISCIPLINE_LABELS[q.discipline]}) ---`);
        if (q.context) {
            lines.push(`Contexto: ${q.context.slice(0, 300)}${q.context.length > 300 ? '...' : ''}`);
        }
        if (q.alternativesIntroduction) {
            lines.push(`Enunciado: ${q.alternativesIntroduction}`);
        }
        lines.push(`Minha resposta (${myAns}): ${myAlt?.text ?? '—'}`);
        lines.push(`Resposta correta (${q.correctAlternative}): ${correctAlt?.text ?? '—'}`);
        lines.push('');
    });

    lines.push('---');
    lines.push(
        'Por favor: (1) explique cada erro individualmente, (2) liste os tópicos que preciso revisar por área, (3) sugira uma ordem de estudo para corrigir essas lacunas.',
    );

    return lines.join('\n');
}
