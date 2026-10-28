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
import { AppleNav, NavBackBtn, NavTextBtn, GroupSection, GroupRow, ScoreRing } from '../_ui';

const DISC_COLOR: Record<Discipline, string> = {
    'ciencias-humanas': '#FF6B35',
    'ciencias-natureza': '#34C759',
    linguagens: '#007AFF',
    matematica: '#AF52DE',
};

export default function SimuladoResultsPage() {
    const router = useRouter();
    const [session, setSession] = useState<SimuladoSession | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
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
            <div
                className="flex min-h-screen items-center justify-center"
                style={{ background: 'var(--sys-bg)' }}
            >
                <p
                    className="text-[15px]"
                    style={{ color: 'var(--secondary-label)' }}
                >
                    Carregando…
                </p>
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

    const byDiscipline = questions.reduce<
        Partial<Record<Discipline, SimuladoQuestion[]>>
    >((acc, q) => {
        if (!acc[q.discipline]) acc[q.discipline] = [];
        acc[q.discipline]!.push(q);
        return acc;
    }, {});

    const date = new Date(session.startedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });

    const reviewPrompt = buildReviewPrompt(wrong, answers);

    async function copyPrompt() {
        try {
            await navigator.clipboard.writeText(reviewPrompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback: select all text
        }
    }

    return (
        <div
            className="min-h-screen"
            style={{ background: 'var(--sys-bg)' }}
        >
            <AppleNav
                title="Resultado"
                left={<NavBackBtn label="Início" href="/" />}
                right={
                    <NavTextBtn
                        label="Novo"
                        onClick={() => {
                            clearSession();
                            router.push('/simulado');
                        }}
                    />
                }
            />

            {/* Large title */}
            <div className="px-4 pb-2 pt-6">
                <h1
                    className="text-[34px] font-bold tracking-tight"
                    style={{ color: 'var(--label)' }}
                >
                    Resultado
                </h1>
                <p
                    className="mt-1 text-[15px]"
                    style={{ color: 'var(--secondary-label)' }}
                >
                    {date}
                </p>
            </div>

            <div className="space-y-0 px-4 pb-12">
                {/* Score hero */}
                <div
                    className="mt-4 overflow-hidden rounded-2xl p-6"
                    style={{ background: 'var(--card-bg)' }}
                >
                    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-between">
                        <ScoreRing score={score} size={140} strokeWidth={12} />
                        <div className="flex flex-1 justify-around sm:justify-end sm:gap-8">
                            <StatBadge
                                label="Acertos"
                                value={correct}
                                color="var(--green)"
                            />
                            <StatBadge
                                label="Erros"
                                value={wrong.length}
                                color="var(--red)"
                            />
                            <StatBadge
                                label="Em branco"
                                value={blank.length}
                                color="var(--secondary-label)"
                            />
                        </div>
                    </div>
                </div>

                {/* Por disciplina */}
                <GroupSection header="Desempenho por Área">
                    {(
                        Object.entries(byDiscipline) as [
                            Discipline,
                            SimuladoQuestion[],
                        ][]
                    ).map(([disc, qs], i, arr) => {
                        const c = qs.filter(
                            q => answers[q.id] === q.correctAlternative,
                        ).length;
                        const pct =
                            qs.length > 0
                                ? Math.round((c / qs.length) * 100)
                                : 0;
                        const color = DISC_COLOR[disc];
                        return (
                            <GroupRow
                                key={disc}
                                separator={i < arr.length - 1}
                                label={
                                    <div className="w-full space-y-2 py-1">
                                        <div className="flex items-center justify-between">
                                            <span
                                                className="text-[15px]"
                                                style={{
                                                    color: 'var(--label)',
                                                }}
                                            >
                                                {DISCIPLINE_LABELS[disc]}
                                            </span>
                                            <span
                                                className="text-[15px] font-semibold tabular-nums"
                                                style={{ color }}
                                            >
                                                {c}/{qs.length}{' '}
                                                <span
                                                    style={{
                                                        color: 'var(--secondary-label)',
                                                        fontWeight: 400,
                                                    }}
                                                >
                                                    ({pct}%)
                                                </span>
                                            </span>
                                        </div>
                                        <div
                                            className="h-2 w-full overflow-hidden rounded-full"
                                            style={{
                                                background: 'var(--seg-bg)',
                                            }}
                                        >
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${pct}%`,
                                                    background: color,
                                                }}
                                            />
                                        </div>
                                    </div>
                                }
                            />
                        );
                    })}
                </GroupSection>

                {/* Erros */}
                {wrong.length > 0 && (
                    <GroupSection
                        header={`Questões Erradas (${wrong.length})`}
                    >
                        {wrong.map((q, i) => (
                            <WrongRow
                                key={q.id}
                                question={q}
                                selectedAnswer={answers[q.id]}
                                index={i + 1}
                                expanded={expandedId === q.id}
                                onToggle={() =>
                                    setExpandedId(
                                        expandedId === q.id ? null : q.id,
                                    )
                                }
                                separator={i < wrong.length - 1 || expandedId === q.id}
                            />
                        ))}
                    </GroupSection>
                )}

                {/* Em branco */}
                {blank.length > 0 && (
                    <GroupSection
                        header={`Em branco (${blank.length})`}
                    >
                        {blank.map((q, i) => (
                            <GroupRow
                                key={q.id}
                                separator={i < blank.length - 1}
                                label={
                                    <span style={{ color: 'var(--label)' }}>
                                        Q. {q.index} — {DISCIPLINE_LABELS[q.discipline]}{' '}
                                        <span
                                            style={{
                                                color: 'var(--secondary-label)',
                                            }}
                                        >
                                            {q.year}
                                        </span>
                                    </span>
                                }
                                right={
                                    <span
                                        className="rounded-full px-2 py-0.5 text-[12px] font-medium"
                                        style={{
                                            background: 'var(--seg-bg)',
                                            color: 'var(--secondary-label)',
                                        }}
                                    >
                                        Sem resposta
                                    </span>
                                }
                            />
                        ))}
                    </GroupSection>
                )}

                {/* Prompt de revisão */}
                {wrong.length > 0 && (
                    <GroupSection
                        header="Prompt de Revisão"
                        footer="Cole esse texto em qualquer IA para receber uma revisão personalizada dos seus erros."
                    >
                        <GroupRow
                            label="Copiar prompt de revisão"
                            right={
                                copied ? (
                                    <span
                                        className="text-[15px]"
                                        style={{ color: 'var(--green)' }}
                                    >
                                        Copiado ✓
                                    </span>
                                ) : (
                                    <span
                                        className="text-[15px]"
                                        style={{ color: 'var(--blue)' }}
                                    >
                                        Copiar
                                    </span>
                                )
                            }
                            onClick={copyPrompt}
                            chevron={false}
                            separator={false}
                        />
                    </GroupSection>
                )}

                {/* Histórico link */}
                <GroupSection>
                    <GroupRow
                        label="Ver histórico de simulados"
                        onClick={() => router.push('/simulado/historico')}
                        chevron
                        separator={false}
                    />
                </GroupSection>
            </div>
        </div>
    );
}

function StatBadge({
    label,
    value,
    color,
}: {
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className="flex flex-col items-center gap-1">
            <span
                className="text-[36px] font-bold tabular-nums leading-none"
                style={{ color }}
            >
                {value}
            </span>
            <span
                className="text-[12px] uppercase tracking-wide"
                style={{ color: 'var(--secondary-label)' }}
            >
                {label}
            </span>
        </div>
    );
}

function WrongRow({
    question,
    selectedAnswer,
    index,
    expanded,
    onToggle,
    separator,
}: {
    question: SimuladoQuestion;
    selectedAnswer: string;
    index: number;
    expanded: boolean;
    onToggle: () => void;
    separator: boolean;
}) {
    const correctAlt = question.alternatives.find(
        a => a.letter === question.correctAlternative,
    );
    const wrongAlt = question.alternatives.find(
        a => a.letter === selectedAnswer,
    );
    const color = DISC_COLOR[question.discipline];

    return (
        <>
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full min-h-[52px] items-center gap-3 px-4 text-left transition-opacity active:opacity-60"
                style={
                    separator && !expanded
                        ? { borderBottom: '0.5px solid var(--separator)' }
                        : {}
                }
            >
                <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                    style={{
                        background: 'rgba(255,59,48,0.12)',
                        color: 'var(--red)',
                    }}
                >
                    {index}
                </span>
                <div className="flex-1 py-2.5 min-w-0">
                    <p
                        className="text-[15px] leading-snug"
                        style={{ color: 'var(--label)' }}
                    >
                        ENEM {question.year} · Q. {question.index}
                    </p>
                    <p
                        className="text-[13px] mt-0.5"
                        style={{ color: 'var(--secondary-label)' }}
                    >
                        {DISCIPLINE_LABELS[question.discipline]} ·{' '}
                        <span style={{ color: 'var(--red)' }}>
                            {selectedAnswer}
                        </span>{' '}
                        →{' '}
                        <span style={{ color: 'var(--green)' }}>
                            {question.correctAlternative}
                        </span>
                    </p>
                </div>
                <svg
                    width="12"
                    height="8"
                    viewBox="0 0 12 8"
                    fill="none"
                    className="shrink-0 transition-transform duration-200"
                    style={{
                        transform: expanded
                            ? 'rotate(180deg)'
                            : 'rotate(0deg)',
                    }}
                >
                    <path
                        d="M1 1.5L6 6.5L11 1.5"
                        stroke="var(--tertiary-label)"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>

            {expanded && (
                <div
                    className="px-4 pb-4 space-y-3"
                    style={
                        separator
                            ? { borderBottom: '0.5px solid var(--separator)' }
                            : {}
                    }
                >
                    {/* Context snippet */}
                    {question.context && (
                        <div
                            className="rounded-xl p-3 text-[13px] leading-relaxed"
                            style={{
                                background: `${color}0D`,
                                color: 'var(--secondary-label)',
                            }}
                        >
                            {question.context.slice(0, 300)}
                            {question.context.length > 300 ? '…' : ''}
                        </div>
                    )}

                    {/* Wrong answer */}
                    <div
                        className="flex items-start gap-2.5 rounded-xl p-3"
                        style={{
                            background: 'rgba(255,59,48,0.08)',
                        }}
                    >
                        <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                            style={{
                                background: 'var(--red)',
                                color: '#fff',
                            }}
                        >
                            {selectedAnswer}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p
                                className="text-[12px] font-semibold mb-1"
                                style={{ color: 'var(--red)' }}
                            >
                                Sua resposta
                            </p>
                            <p
                                className="text-[13px] leading-relaxed"
                                style={{ color: 'var(--label)' }}
                            >
                                {wrongAlt?.text ?? '—'}
                            </p>
                        </div>
                    </div>

                    {/* Correct answer */}
                    <div
                        className="flex items-start gap-2.5 rounded-xl p-3"
                        style={{
                            background: 'rgba(52,199,89,0.08)',
                        }}
                    >
                        <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                            style={{
                                background: 'var(--green)',
                                color: '#fff',
                            }}
                        >
                            {question.correctAlternative}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p
                                className="text-[12px] font-semibold mb-1"
                                style={{ color: 'var(--green)' }}
                            >
                                Resposta correta
                            </p>
                            <p
                                className="text-[13px] leading-relaxed"
                                style={{ color: 'var(--label)' }}
                            >
                                {correctAlt?.text ?? '—'}
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
        </>
    );
}

function buildReviewPrompt(
    wrong: SimuladoQuestion[],
    answers: Record<string, string>,
): string {
    const lines: string[] = [
        'Olá! Acabei de fazer um simulado do ENEM e preciso revisar os conteúdos em que errei.',
        'Para cada questão abaixo, explique por que a alternativa correta está certa e por que a minha resposta estava errada. Ao final, faça um resumo dos tópicos que preciso estudar.',
        '',
    ];

    wrong.forEach((q, i) => {
        const myAns = answers[q.id];
        const myAlt = q.alternatives.find(a => a.letter === myAns);
        const correctAlt = q.alternatives.find(
            a => a.letter === q.correctAlternative,
        );

        lines.push(
            `--- Questão ${i + 1} (ENEM ${q.year}, Q.${q.index} — ${DISCIPLINE_LABELS[q.discipline]}) ---`,
        );
        if (q.context)
            lines.push(
                `Contexto: ${q.context.slice(0, 300)}${q.context.length > 300 ? '…' : ''}`,
            );
        if (q.alternativesIntroduction)
            lines.push(`Enunciado: ${q.alternativesIntroduction}`);
        lines.push(`Minha resposta (${myAns}): ${myAlt?.text ?? '—'}`);
        lines.push(
            `Resposta correta (${q.correctAlternative}): ${correctAlt?.text ?? '—'}`,
        );
        lines.push('');
    });

    lines.push('---');
    lines.push(
        'Por favor: (1) explique cada erro individualmente, (2) liste os tópicos que preciso revisar por área, (3) sugira uma ordem de estudo para corrigir essas lacunas.',
    );

    return lines.join('\n');
}
