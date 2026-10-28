'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    DISCIPLINE_LABELS,
    type SimuladoSession,
    type Discipline,
} from '@/lib/simulado/types';
import {
    getResults,
    clearSeenQuestions,
    saveSession,
} from '@/lib/simulado/storage';
import {
    AppleNav,
    NavBackBtn,
    GroupSection,
    GroupRow,
    ScoreRing,
    AppleBtn,
} from '../_ui';

const DISC_COLOR: Record<Discipline, string> = {
    'ciencias-humanas': '#FF6B35',
    'ciencias-natureza': '#34C759',
    linguagens: '#007AFF',
    matematica: '#AF52DE',
};

export default function HistoricoPage() {
    const router = useRouter();
    const [results, setResults] = useState<SimuladoSession[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        setResults(getResults());
    }, []);

    function handleDelete(id: string) {
        const updated = results.filter(r => r.id !== id);
        setResults(updated);
        try {
            localStorage.setItem('simulado:results', JSON.stringify(updated));
        } catch {}
    }

    function handleClearSeen() {
        if (
            window.confirm(
                'Limpar o histórico de questões vistas? Isso permite que questões já respondidas apareçam novamente.',
            )
        ) {
            clearSeenQuestions();
        }
    }

    function handleReview(session: SimuladoSession) {
        saveSession(session);
        router.push('/simulado/results');
    }

    return (
        <div
            className="min-h-screen"
            style={{ background: 'var(--sys-bg)' }}
        >
            <AppleNav
                title="Histórico"
                left={<NavBackBtn label="Simulado" href="/simulado" />}
            />

            {/* Large title */}
            <div className="px-4 pb-2 pt-6">
                <h1
                    className="text-[34px] font-bold tracking-tight"
                    style={{ color: 'var(--label)' }}
                >
                    Histórico
                </h1>
                <p
                    className="mt-1 text-[15px]"
                    style={{ color: 'var(--secondary-label)' }}
                >
                    {results.length > 0
                        ? `${results.length} simulado${results.length > 1 ? 's' : ''} realizado${results.length > 1 ? 's' : ''}`
                        : 'Nenhum simulado ainda'}
                </p>
            </div>

            <div className="space-y-0 px-4 pb-12">
                {results.length === 0 ? (
                    <EmptyState onStart={() => router.push('/simulado')} />
                ) : (
                    <>
                        {/* Stats summary */}
                        <SummaryCard results={results} />

                        {/* Session list */}
                        <GroupSection header="Simulados Anteriores">
                            {results.map((session, i) => (
                                <SessionRow
                                    key={session.id}
                                    session={session}
                                    expanded={expandedId === session.id}
                                    onToggle={() =>
                                        setExpandedId(
                                            expandedId === session.id
                                                ? null
                                                : session.id,
                                        )
                                    }
                                    onDelete={() => handleDelete(session.id)}
                                    onReview={() => handleReview(session)}
                                    separator={
                                        i < results.length - 1 ||
                                        expandedId === session.id
                                    }
                                />
                            ))}
                        </GroupSection>

                        {/* Danger zone */}
                        <GroupSection header="Configurações">
                            <GroupRow
                                label="Limpar histórico de questões vistas"
                                sublabel="Permite que questões já respondidas reapareçam"
                                separator={false}
                                onClick={handleClearSeen}
                                right={
                                    <span style={{ color: 'var(--orange)' }}>
                                        Limpar
                                    </span>
                                }
                            />
                        </GroupSection>
                    </>
                )}
            </div>
        </div>
    );
}

function EmptyState({ onStart }: { onStart: () => void }) {
    return (
        <div
            className="mt-4 flex flex-col items-center gap-5 rounded-2xl py-12 px-6 text-center"
            style={{ background: 'var(--card-bg)' }}
        >
            <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl text-[32px]"
                style={{ background: 'rgba(0,122,255,0.1)' }}
            >
                📋
            </div>
            <div>
                <p
                    className="text-[17px] font-semibold"
                    style={{ color: 'var(--label)' }}
                >
                    Nenhum simulado ainda
                </p>
                <p
                    className="mt-1 text-[15px]"
                    style={{ color: 'var(--secondary-label)' }}
                >
                    Complete um simulado para ver seu histórico aqui
                </p>
            </div>
            <AppleBtn onClick={onStart}>Fazer primeiro simulado</AppleBtn>
        </div>
    );
}

function SummaryCard({ results }: { results: SimuladoSession[] }) {
    const allScores = results.map(s => {
        const total = s.questions.length;
        if (!total) return 0;
        const correct = s.questions.filter(
            q => s.answers[q.id] === q.correctAlternative,
        ).length;
        return Math.round((correct / total) * 100);
    });

    const avgScore = Math.round(
        allScores.reduce((a, b) => a + b, 0) / allScores.length,
    );
    const best = Math.max(...allScores);
    const totalQuestions = results.reduce(
        (sum, s) => sum + s.questions.length,
        0,
    );

    return (
        <div
            className="mb-0 overflow-hidden rounded-2xl p-5 mt-4"
            style={{ background: 'var(--card-bg)' }}
        >
            <p
                className="mb-4 text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--secondary-label)' }}
            >
                Resumo
            </p>
            <div className="grid grid-cols-3 gap-4">
                <MiniStat
                    label="Média"
                    value={`${avgScore}%`}
                    color={
                        avgScore >= 70
                            ? 'var(--green)'
                            : avgScore >= 50
                              ? 'var(--orange)'
                              : 'var(--red)'
                    }
                />
                <MiniStat
                    label="Melhor"
                    value={`${best}%`}
                    color="var(--blue)"
                />
                <MiniStat
                    label="Questões"
                    value={String(totalQuestions)}
                    color="var(--label)"
                />
            </div>
        </div>
    );
}

function MiniStat({
    label,
    value,
    color,
}: {
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div className="flex flex-col items-center gap-1">
            <span
                className="text-[26px] font-bold tabular-nums leading-none"
                style={{ color }}
            >
                {value}
            </span>
            <span
                className="text-[11px] uppercase tracking-wide"
                style={{ color: 'var(--secondary-label)' }}
            >
                {label}
            </span>
        </div>
    );
}

function SessionRow({
    session,
    expanded,
    onToggle,
    onDelete,
    onReview,
    separator,
}: {
    session: SimuladoSession;
    expanded: boolean;
    onToggle: () => void;
    onDelete: () => void;
    onReview: () => void;
    separator: boolean;
}) {
    const total = session.questions.length;
    const correct = session.questions.filter(
        q => session.answers[q.id] === q.correctAlternative,
    ).length;
    const score = total > 0 ? Math.round((correct / total) * 100) : 0;

    const date = new Date(session.startedAt).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });

    const duration =
        session.finishedAt
            ? Math.round(
                  (new Date(session.finishedAt).getTime() -
                      new Date(session.startedAt).getTime()) /
                      60000,
              )
            : null;

    const disciplines = Array.from(
        new Set(session.questions.map(q => q.discipline)),
    ) as Discipline[];

    return (
        <>
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-center gap-4 px-4 text-left transition-opacity active:opacity-60"
                style={
                    separator && !expanded
                        ? {
                              borderBottom: '0.5px solid var(--separator)',
                          }
                        : {}
                }
            >
                {/* Mini ring */}
                <div className="shrink-0 py-3">
                    <ScoreRing score={score} size={50} strokeWidth={5} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 py-3">
                    <p
                        className="text-[15px] font-medium"
                        style={{ color: 'var(--label)' }}
                    >
                        {total} questões ·{' '}
                        <span
                            className={
                                score >= 70
                                    ? ''
                                    : score >= 50
                                      ? ''
                                      : ''
                            }
                            style={{
                                color:
                                    score >= 70
                                        ? 'var(--green)'
                                        : score >= 50
                                          ? 'var(--orange)'
                                          : 'var(--red)',
                            }}
                        >
                            {score}%
                        </span>
                    </p>
                    <p
                        className="text-[13px] mt-0.5"
                        style={{ color: 'var(--secondary-label)' }}
                    >
                        {date}
                        {duration !== null && ` · ${duration} min`}
                    </p>

                    {/* Discipline chips */}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {disciplines.map(d => (
                            <span
                                key={d}
                                className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                                style={{
                                    background: `${DISC_COLOR[d]}18`,
                                    color: DISC_COLOR[d],
                                }}
                            >
                                {DISCIPLINE_LABELS[d].split(' ')[0]}
                            </span>
                        ))}
                    </div>
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
                            ? {
                                  borderBottom:
                                      '0.5px solid var(--separator)',
                              }
                            : {}
                    }
                >
                    {/* Per-discipline breakdown */}
                    <div
                        className="rounded-xl p-3 space-y-2.5"
                        style={{ background: 'var(--seg-bg)' }}
                    >
                        {disciplines.map(d => {
                            const dqs = session.questions.filter(
                                q => q.discipline === d,
                            );
                            const dc = dqs.filter(
                                q =>
                                    session.answers[q.id] ===
                                    q.correctAlternative,
                            ).length;
                            const dpct =
                                dqs.length > 0
                                    ? Math.round((dc / dqs.length) * 100)
                                    : 0;
                            return (
                                <div key={d} className="space-y-1">
                                    <div className="flex justify-between">
                                        <span
                                            className="text-[13px]"
                                            style={{
                                                color: 'var(--label)',
                                            }}
                                        >
                                            {DISCIPLINE_LABELS[d]}
                                        </span>
                                        <span
                                            className="text-[13px] font-semibold tabular-nums"
                                            style={{
                                                color: DISC_COLOR[d],
                                            }}
                                        >
                                            {dc}/{dqs.length} ({dpct}%)
                                        </span>
                                    </div>
                                    <div
                                        className="h-1.5 overflow-hidden rounded-full"
                                        style={{
                                            background:
                                                'rgba(120,120,128,0.2)',
                                        }}
                                    >
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${dpct}%`,
                                                background: DISC_COLOR[d],
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onReview}
                            className="flex-1 rounded-xl py-2.5 text-[15px] font-semibold transition-opacity active:opacity-60"
                            style={{
                                background: 'rgba(0,122,255,0.1)',
                                color: 'var(--blue)',
                            }}
                        >
                            Ver resultado
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (
                                    window.confirm(
                                        'Remover este simulado do histórico?',
                                    )
                                )
                                    onDelete();
                            }}
                            className="rounded-xl px-4 py-2.5 text-[15px] font-semibold transition-opacity active:opacity-60"
                            style={{
                                background: 'rgba(255,59,48,0.1)',
                                color: 'var(--red)',
                            }}
                        >
                            Excluir
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
