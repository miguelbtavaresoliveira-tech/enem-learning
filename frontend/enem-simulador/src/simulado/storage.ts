import type { SimuladoSession, SimuladoResult } from './types';

const SEEN_KEY = 'simulado:seen';
const SESSION_KEY = 'simulado:session';
const RESULTS_KEY = 'simulado:results';

function tryParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    const arr = tryParse<string[]>(raw);
    return new Set(arr ?? []);
  } catch { return new Set(); }
}

export function markSeen(ids: string[]): void {
  try {
    const existing = getSeenIds();
    ids.forEach(id => existing.add(id));
    localStorage.setItem(SEEN_KEY, JSON.stringify([...existing]));
  } catch { /* ignore */ }
}

export function clearSeen(): void {
  try { localStorage.removeItem(SEEN_KEY); } catch { /* ignore */ }
}

export function saveSession(session: SimuladoSession): void {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* ignore */ }
}

export function loadSession(): SimuladoSession | null {
  try { return tryParse<SimuladoSession>(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

export function clearSession(): void {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

export function saveResult(result: SimuladoResult): void {
  try {
    const results = getResults();
    results.unshift(result);
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results.slice(0, 50)));
  } catch { /* ignore */ }
}

export function getResults(): SimuladoResult[] {
  try { return tryParse<SimuladoResult[]>(localStorage.getItem(RESULTS_KEY)) ?? []; } catch { return []; }
}

export function deleteResult(id: string): void {
  try {
    const filtered = getResults().filter(r => r.id !== id);
    localStorage.setItem(RESULTS_KEY, JSON.stringify(filtered));
  } catch { /* ignore */ }
}

export function clearResults(): void {
  try { localStorage.removeItem(RESULTS_KEY); } catch { /* ignore */ }
}
