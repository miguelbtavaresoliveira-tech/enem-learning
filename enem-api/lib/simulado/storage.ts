'use client';

import type { SimuladoSession } from './types';

const SEEN_KEY = 'simulado:seen';
const SESSION_KEY = 'simulado:session';
const RESULTS_KEY = 'simulado:results';

export function getSeenQuestionIds(): string[] {
    try {
        const raw = localStorage.getItem(SEEN_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

export function markQuestionsAsSeen(ids: string[]): void {
    try {
        const existing = getSeenQuestionIds();
        const merged = Array.from(new Set([...existing, ...ids]));
        localStorage.setItem(SEEN_KEY, JSON.stringify(merged));
    } catch {}
}

export function clearSeenQuestions(): void {
    try {
        localStorage.removeItem(SEEN_KEY);
    } catch {}
}

export function saveSession(session: SimuladoSession): void {
    try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {}
}

export function loadSession(): SimuladoSession | null {
    try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function clearSession(): void {
    try {
        sessionStorage.removeItem(SESSION_KEY);
    } catch {}
}

export function saveResult(session: SimuladoSession): void {
    try {
        const existing: SimuladoSession[] = getResults();
        existing.unshift(session);
        localStorage.setItem(RESULTS_KEY, JSON.stringify(existing.slice(0, 20)));
    } catch {}
}

export function getResults(): SimuladoSession[] {
    try {
        const raw = localStorage.getItem(RESULTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}
