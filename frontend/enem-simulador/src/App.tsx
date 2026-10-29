import { useState } from 'react';
import EnemApp from './EnemApp';
import { SimuladoApp } from './simulado/SimuladoApp';

const C = {
  surface: '#faf8ff',
  surfaceLowest: '#ffffff',
  surfaceLow: '#f2f3ff',
  surfaceContainer: '#eaedff',
  surfaceHigh: '#e2e7ff',
  onSurface: '#131b2e',
  onSurfaceVariant: '#434655',
  primary: '#0037b0',
  primaryContainer: '#1d4ed8',
  primaryFixed: '#dce1ff',
  onPrimary: '#ffffff',
  onPrimaryFixed: '#001551',
  outlineVariant: '#c4c5d7',
  secondary: '#006d30',
  secondaryContainer: '#92f5a4',
};

type Mode = 'home' | 'exam' | 'simulado';

export default function App() {
  const [mode, setMode] = useState<Mode>('home');

  if (mode === 'exam') return <EnemApp onHome={() => setMode('home')} />;
  if (mode === 'simulado') return <SimuladoApp onHome={() => setMode('home')} />;

  return (
    <div style={{ minHeight: '100dvh', background: C.surface, fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: C.surfaceLowest, borderBottom: `1px solid ${C.outlineVariant}66`,
        boxShadow: '0 1px 2px rgba(15,23,42,0.04)', height: 64,
      }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '0 2rem', height: '100%', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.primaryFixed, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
            📚
          </div>
          <span style={{ fontSize: 16, fontWeight: 600, color: C.onSurface, letterSpacing: '-0.01em' }}>ENEM Estudos</span>
        </div>
      </header>

      {/* Main */}
      <main style={{ paddingTop: 64, maxWidth: 1152, margin: '0 auto', padding: '64px 2rem 2rem' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* Hero */}
          <section style={{ paddingTop: 40, paddingBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '3px 10px', borderRadius: 4,
                background: C.surfaceHigh, color: C.onSurfaceVariant,
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 0, background: C.primaryContainer }} />
                Ambiente de Preparação Acadêmica
              </span>
              <span style={{ color: C.outlineVariant, fontSize: 12 }}>•</span>
              <span style={{ fontSize: 12, color: C.onSurfaceVariant, fontWeight: 500 }}>Ciclo 2024 / 2025</span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 700, color: C.onSurface, margin: '0 0 8px', letterSpacing: '-0.025em' }}>ENEM</h1>
            <p style={{ fontSize: 15, color: C.onSurfaceVariant, maxWidth: 480, margin: 0 }}>
              Escolha o modo de estudo fundamentado para consolidar retenção e calibrar velocidade de resposta.
            </p>
          </section>

          {/* Mode cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 32 }}>
            <ModeCard
              icon="📖"
              tag="Modo Linear"
              title="Prova Completa"
              desc="Pratique questões por ano e disciplina de forma linear, mantendo o formato oficial do exame e a integridade dos cadernos de prova."
              tags={['Cadernos 2009–2023', 'Filtro por Disciplina', '1.350 Questões']}
              cta="Acessar Provas Anteriores"
              onClick={() => setMode('exam')}
            />
            <ModeCard
              icon="🎯"
              tag="Modo Adaptativo TRI"
              title="Simulado Personalizado"
              desc="Monte um simulado sob medida com controle de tempo, histórico analítico e calibragem de dificuldade por Teoria de Resposta ao Item (TRI)."
              tags={['Cronômetro oficial', 'Gabarito comentado', 'Métricas de precisão']}
              cta="Configurar Simulado"
              onClick={() => setMode('simulado')}
              primary
              badge="Recomendado"
            />
          </div>

          {/* Info strip */}
          <div style={{
            background: C.surfaceLowest, borderRadius: 12,
            border: `1px solid ${C.outlineVariant}66`,
            padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 6, background: C.surfaceContainer, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🧠</div>
              <div>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.onSurface, display: 'block', marginBottom: 2 }}>Recomendação de Foco Diário</span>
                <p style={{ fontSize: 14, color: C.onSurfaceVariant, margin: 0, maxWidth: 520 }}>
                  Sessão de <strong>45 minutos</strong> com <strong>10 minutos de intervalo</strong> preserva 88% de retenção cognitiva.
                </p>
              </div>
            </div>
          </div>

          {/* Feature badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 20 }}>
            {[
              { icon: '✅', label: 'Padrão INEP', sub: 'Matriz de Habilidades' },
              { icon: '📊', label: 'Calibragem Oficial', sub: 'Algoritmo TRI Autêntico' },
              { icon: '📚', label: 'Sem Distrações', sub: 'Zero Elementos Lúdicos' },
            ].map(f => (
              <div key={f.label} style={{ background: C.surfaceLowest, borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${C.outlineVariant}66` }}>
                <span style={{ fontSize: 20 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: C.onSurfaceVariant }}>{f.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.onSurface }}>{f.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${C.outlineVariant}66`, marginTop: 40, background: C.surfaceLowest }}>
        <div style={{ maxWidth: 1152, margin: '0 auto', padding: '20px 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', gap: 6, color: C.onSurfaceVariant, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: C.onSurface }}>ENEM Estudos</span>
            <span>•</span><span>Ambiente Acadêmico</span><span>•</span><span>© 2024</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ModeCard({ icon, tag, title, desc, tags, cta, onClick, primary, badge }: {
  icon: string; tag: string; title: string; desc: string; tags: string[]; cta: string;
  onClick: () => void; primary?: boolean; badge?: string;
}) {
  return (
    <article style={{
      position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      background: C.surfaceLowest, borderRadius: 12, padding: '20px 20px 16px',
      border: `1px solid ${C.outlineVariant}66`,
      boxShadow: '0 1px 2px rgba(15,23,42,0.05)', transition: 'box-shadow 0.15s',
    }}
      onMouseOver={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(15,23,42,0.10)')}
      onMouseOut={e => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(15,23,42,0.05)')}
    >
      {badge && (
        <div style={{ position: 'absolute', top: -10, right: 20 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 4, background: C.primaryContainer, color: C.onPrimary, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            ✓ {badge}
          </span>
        </div>
      )}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: primary ? C.primaryFixed : C.surfaceLow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
          <span style={{ fontSize: 12, fontWeight: 500, color: primary ? C.primaryContainer : C.onSurfaceVariant }}>{tag}</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: C.onSurface, margin: '0 0 8px', letterSpacing: '-0.015em' }}>{title}</h2>
        <p style={{ fontSize: 14, color: C.onSurfaceVariant, margin: '0 0 14px', lineHeight: 1.6 }}>{desc}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
          {tags.map(t => (
            <span key={t} style={{ padding: '2px 10px', borderRadius: 4, background: primary ? C.surfaceHigh : C.surfaceLow, color: primary ? C.primaryContainer : C.onSurfaceVariant, fontSize: 11, fontWeight: 500 }}>{t}</span>
          ))}
        </div>
      </div>
      <button onClick={onClick} style={{
        width: '100%', padding: '10px 0', border: 'none', borderRadius: 10,
        background: primary ? C.primaryContainer : C.surfaceLow,
        color: primary ? C.onPrimary : C.onSurface,
        fontSize: 14, fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'background 0.15s',
        boxShadow: primary ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
      }}>
        <span>{cta}</span>
        <span style={{ fontSize: 16 }}>→</span>
      </button>
    </article>
  );
}
