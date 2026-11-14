import { useSyncExternalStore } from 'react';
import { idleSession } from './lib/session';
import type { AppState, PottyEvent } from './lib/types';

const KEY = 'potty-pal:v1';

const initial: AppState = {
  v: 1,
  events: [],
  session: idleSession,
  settings: { childName: '', intervalMin: 30, sound: true, notify: false, askedNotify: false, repeat: true, onboarded: false },
};

/** Accepts anything (stored data, an imported file) and returns a valid state or null. */
export function parseState(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<AppState>;
  if (!Array.isArray(r.events)) return null;
  const events = r.events.filter(
    (e): e is PottyEvent =>
      !!e && typeof e.id === 'string' && typeof e.at === 'number' && ['pee', 'poop', 'try', 'accident'].includes(e.type),
  );
  return {
    v: 1,
    events,
    session: { ...idleSession, ...(r.session ?? {}) },
    settings: { ...initial.settings, ...(r.settings ?? {}) },
  };
}

function load(): AppState {
  try {
    return parseState(JSON.parse(localStorage.getItem(KEY) ?? 'null')) ?? initial;
  } catch {
    return initial;
  }
}

let state = load();
const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(update: (s: AppState) => AppState) {
  state = update(state);
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or unavailable; keep going in memory */
  }
  listeners.forEach((l) => l());
}

export function resetState() {
  setState(() => initial);
}

export function useAppState(): AppState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
