'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    AVAILABLE_YEARS,
    ALL_DISCIPLINES,
    DISCIPLINE_LABELS,
    type Discipline,
    type DifficultyLevel,
    type AnswerRevealMode,
    type SimuladoConfig,
    type SimuladoSession,
} from '@/lib/simulado/types';
import { getSeenQuestionIds, saveSession } from '@/lib/simulado/storage';
import {
    AppleNav,
    NavBackBtn,
    NavTextBtn,
    GroupSection,
    GroupRow,
    AppleToggle,
    SegmentedControl,
    AppleBtn,
    YearChip,
} from './_ui';

const DISCIPLINE_ICONS: Record<Discipline, string> = {
    'ciencias-humanas': '🏛',
    'ciencias-natureza': '🔬',
    linguagens: '📖',
    matematica: '📐',
};

const DISCIPLINE_COLORS: Record<Discipline, string> = {
    'ciencias-humanas': '#FF6B35',
    'ciencias-natureza': '#34C759',
    linguagens: '#007AFF',
    matematica: '#AF52DE',
};

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

    async function handleStart() {
        if (!disciplines.length) {
            setError('Selecione ao menos uma área de conhecimento.');
            return;
        }
        if (!years.length) {
            setError('Selecione ao menos um ano.');
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
                    'Nenhuma questão encontrada. Tente ajustar os filtros.',
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

    const allYearsSelected = years.length === AVAILABLE_YEARS.length;

    return (
        <div className="min-h-screen" style={{ background: 'var(--sys-bg)' }}>
            <AppleNav
                title="Novo Simulado"
                left={<NavBackBtn label="Início" href="/" />}
                right={
                    <NavTextBtn
                        label="Histórico"
                        href="/simulado/historico"
                    />
                }
            />

            {/* Large title */}
            <div className="px-4 pb-2 pt-6">
                <h1
                    className="text-[34px] font-bold tracking-tight"
                    style={{ color: 'var(--label)' }}
                >
                    Novo Simulado
                </h1>
                <p
                    className="mt-1 text-[15px]"
                    style={{ color: 'var(--secondary-label)' }}
                >
                    Configure sua sessão de estudos
                </p>
            </div>

            <div className="space-y-0 px-4 pb-10">
                {/* Áreas */}
                <GroupSection header="Áreas de Conhecimento">
                    {ALL_DISCIPLINES.map((d, i) => (
                        <GroupRow
                            key={d}
                            label={
                                <span className="flex items-center gap-3">
                                    <span
                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-[15px]"
                                        style={{
                                            background: DISCIPLINE_COLORS[d],
                                        }}
                                    >
                                        {DISCIPLINE_ICONS[d]}
                                    </span>
                                    {DISCIPLINE_LABELS[d]}
                                </span>
                            }
                            right={
                                <AppleToggle
                                    checked={disciplines.includes(d)}
                                    onChange={() => toggleDiscipline(d)}
                                />
                            }
                            separator={i < ALL_DISCIPLINES.length - 1}
                        />
                    ))}
                </GroupSection>

                {/* Anos */}
                <GroupSection
                    header="Anos das Provas"
                    footer="Questões de todos os anos selecionados serão misturadas."
                >
                    <GroupRow
                        label="Todos os anos"
                        right={
                            <AppleToggle
                                checked={allYearsSelected}
                                onChange={v =>
                                    setYears(
                                        v ? [...AVAILABLE_YEARS] : [],
                                    )
                                }
                            />
                        }
                        separator
                    />
                    <GroupRow
                        label={
                            <div className="flex flex-wrap gap-2 py-1">
                                {AVAILABLE_YEARS.map(y => (
                                    <YearChip
                                        key={y}
                                        year={y}
                                        selected={years.includes(y)}
                                        onToggle={() => toggleYear(y)}
                                    />
                                ))}
                            </div>
                        }
                        separator={false}
                    />
                </GroupSection>

                {/* Questões */}
                <GroupSection header="Questões">
                    <GroupRow
                        label="Total de questões"
                        right={
                            <span
                                className="text-[17px] tabular-nums"
                                style={{ color: 'var(--blue)' }}
                            >
                                {questionCount}
                            </span>
                        }
                        separator
                    />
                    <GroupRow
                        label={
                            <input
                                type="range"
                                min={5}
                                max={90}
                                step={5}
                                value={questionCount}
                                onChange={e =>
                                    setQuestionCount(Number(e.target.value))
                                }
                                className="w-full"
                                style={{ accentColor: 'var(--blue)' }}
                            />
                        }
                        separator
                    />
                    <GroupRow
                        label="Dificuldade"
                        right={
                            <SegmentedControl
                                options={[
                                    { value: 'all' as DifficultyLevel, label: 'Todas' },
                                    { value: 'easy' as DifficultyLevel, label: 'Fácil' },
                                    { value: 'medium' as DifficultyLevel, label: 'Médio' },
                                    { value: 'hard' as DifficultyLevel, label: 'Difícil' },
                                ]}
                                value={difficulty}
                                onChange={setDifficulty}
                            />
                        }
                        separator
                    />
                    <GroupRow
                        label="Apenas questões novas"
                        sublabel="Exclui questões que já apareceram antes"
                        right={
                            <AppleToggle
                                checked={onlyNew}
                                onChange={setOnlyNew}
                            />
                        }
                        separator={false}
                    />
                </GroupSection>

                {/* Gabarito */}
                <GroupSection
                    header="Gabarito"
                    footer="No modo imediato, cada alternativa mostra certo/errado na hora. No modo ao final, o gabarito aparece somente após enviar."
                >
                    <GroupRow
                        label="Mostrar gabarito"
                        right={
                            <SegmentedControl
                                options={[
                                    {
                                        value: 'end' as AnswerRevealMode,
                                        label: 'Ao final',
                                    },
                                    {
                                        value: 'immediate' as AnswerRevealMode,
                                        label: 'Imediato',
                                    },
                                ]}
                                value={revealMode}
                                onChange={setRevealMode}
                            />
                        }
                        separator={false}
                    />
                </GroupSection>

                {/* Cronômetro */}
                <GroupSection header="Cronômetro">
                    <GroupRow
                        label="Ativar cronômetro"
                        right={
                            <AppleToggle
                                checked={timerEnabled}
                                onChange={setTimerEnabled}
                            />
                        }
                        separator={timerEnabled}
                    />
                    {timerEnabled && (
                        <>
                            <GroupRow
                                label="Duração"
                                right={
                                    <span
                                        className="text-[17px] tabular-nums"
                                        style={{ color: 'var(--blue)' }}
                                    >
                                        {timerMinutes} min
                                    </span>
                                }
                                separator
                            />
                            <GroupRow
                                label={
                                    <input
                                        type="range"
                                        min={10}
                                        max={300}
                                        step={10}
                                        value={timerMinutes}
                                        onChange={e =>
                                            setTimerMinutes(
                                                Number(e.target.value),
                                            )
                                        }
                                        className="w-full"
                                        style={{ accentColor: 'var(--blue)' }}
                                    />
                                }
                                separator={false}
                            />
                        </>
                    )}
                </GroupSection>

                {error && (
                    <div
                        className="rounded-xl px-4 py-3 text-[15px]"
                        style={{
                            background: 'rgba(255,59,48,0.1)',
                            color: 'var(--red)',
                        }}
                    >
                        {error}
                    </div>
                )}

                <div className="pt-2">
                    <AppleBtn
                        onClick={handleStart}
                        disabled={loading}
                        fullWidth
                    >
                        {loading ? 'Gerando simulado…' : 'Iniciar Simulado'}
                    </AppleBtn>
                </div>
            </div>
        </div>
    );
}
