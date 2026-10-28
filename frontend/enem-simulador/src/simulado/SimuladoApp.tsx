import { useState } from 'react';
import type { SimuladoConfig, SimuladoSession } from './types';
import { SetupScreen } from './SetupScreen';
import { ExamScreen } from './ExamScreen';
import { SummaryScreen } from './SummaryScreen';
import { HistoryScreen } from './HistoryScreen';
import { clearSession } from './storage';

type View = 'setup' | 'exam' | 'summary' | 'history';

export function SimuladoApp({ onHome }: { onHome?: () => void } = {}) {
  const [view, setView] = useState<View>('setup');
  const [config, setConfig] = useState<SimuladoConfig | null>(null);
  const [session, setSession] = useState<SimuladoSession | null>(null);

  const handleStart = (cfg: SimuladoConfig) => {
    setConfig(cfg);
    setSession(null);
    setView('exam');
  };

  const handleFinish = (sess: SimuladoSession) => {
    setSession(sess);
    clearSession();
    setView('summary');
  };

  const handleNewSimulado = () => {
    setConfig(null);
    setSession(null);
    setView('setup');
  };

  return (
    <>
      {view === 'setup' && (
        <SetupScreen onStart={handleStart} onHistory={() => setView('history')} onHome={onHome} />
      )}
      {view === 'exam' && config && (
        <ExamScreen config={config} onFinish={handleFinish} onBack={() => setView('setup')} />
      )}
      {view === 'summary' && session && (
        <SummaryScreen session={session} onNewSimulado={handleNewSimulado} onHistory={() => setView('history')} />
      )}
      {view === 'history' && (
        <HistoryScreen onBack={() => setView('setup')} />
      )}
    </>
  );
}
