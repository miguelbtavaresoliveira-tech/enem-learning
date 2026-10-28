import { useState } from 'react';
import EnemApp from './EnemApp';
import { SimuladoApp } from './simulado/SimuladoApp';

type Mode = 'home' | 'exam' | 'simulado';

export default function App() {
  const [mode, setMode] = useState<Mode>('home');

  if (mode === 'exam') return <EnemApp onHome={() => setMode('home')} />;
  if (mode === 'simulado') return <SimuladoApp onHome={() => setMode('home')} />;

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--sys-bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, gap: 16,
    }}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📚</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--label)', margin: 0 }}>ENEM</h1>
        <p style={{ fontSize: 15, color: 'var(--secondary-label)', marginTop: 6 }}>Escolha o modo de estudo</p>
      </div>

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ModeCard
          icon="📖"
          title="Prova Completa"
          description="Pratique questões por ano e disciplina"
          onClick={() => setMode('exam')}
        />
        <ModeCard
          icon="🎯"
          title="Simulado"
          description="Monte um simulado personalizado com histórico"
          onClick={() => setMode('simulado')}
          accent
        />
      </div>
    </div>
  );
}

function ModeCard({ icon, title, description, onClick, accent }: { icon: string; title: string; description: string; onClick: () => void; accent?: boolean }) {
  return (
    <button onClick={onClick} style={{
      background: accent ? 'var(--blue)' : 'var(--card-bg)',
      border: accent ? 'none' : '0.5px solid var(--separator)',
      borderRadius: 16, padding: '20px 20px', cursor: 'pointer',
      display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
      transition: 'opacity 0.15s',
    }}>
      <span style={{ fontSize: 32 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 17, fontWeight: 600, color: accent ? '#fff' : 'var(--label)' }}>{title}</div>
        <div style={{ fontSize: 14, color: accent ? 'rgba(255,255,255,0.8)' : 'var(--secondary-label)', marginTop: 2 }}>{description}</div>
      </div>
    </button>
  );
}
