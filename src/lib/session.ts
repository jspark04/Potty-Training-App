import type { Session } from './types';

const MIN = 60_000;

export const idleSession: Session = { status: 'idle', dueAt: null, remainingMs: null };

/** Milliseconds left until the next try (negative when overdue). */
export function remaining(s: Session, now: number): number | null {
  if (s.status === 'running' && s.dueAt != null) return s.dueAt - now;
  if (s.status === 'paused' || s.status === 'nap') return s.remainingMs;
  return null;
}

export function isDue(s: Session, now: number): boolean {
  return s.status === 'running' && s.dueAt != null && now >= s.dueAt;
}

export function startDay(now: number, intervalMin: number): Session {
  return { status: 'running', dueAt: now + intervalMin * MIN, remainingMs: null };
}

export function hold(s: Session, now: number, as: 'paused' | 'nap'): Session {
  if (s.status !== 'running') return s.status === 'idle' ? s : { ...s, status: as };
  return { status: as, dueAt: null, remainingMs: Math.max(0, (s.dueAt ?? now) - now) };
}

export function resume(s: Session, now: number, intervalMin: number): Session {
  if (s.status !== 'paused' && s.status !== 'nap') return s;
  return { status: 'running', dueAt: now + (s.remainingMs ?? intervalMin * MIN), remainingMs: null };
}

/** Restart the countdown after a potty moment was logged. */
export function restart(s: Session, now: number, intervalMin: number): Session {
  const full = intervalMin * MIN;
  if (s.status === 'running') return { ...s, dueAt: now + full };
  if (s.status === 'paused' || s.status === 'nap') return { ...s, remainingMs: full };
  return s;
}

export function snooze(s: Session, now: number, minutes: number): Session {
  if (s.status !== 'running') return s;
  return { ...s, dueAt: now + minutes * MIN };
}

/** Keep the same amount of elapsed time when the interval setting changes. */
export function retime(s: Session, now: number, oldMin: number, newMin: number): Session {
  const delta = (newMin - oldMin) * MIN;
  if (s.status === 'running' && s.dueAt != null) return { ...s, dueAt: Math.max(now, s.dueAt + delta) };
  if (s.remainingMs != null) return { ...s, remainingMs: Math.max(0, s.remainingMs + delta) };
  return s;
}
