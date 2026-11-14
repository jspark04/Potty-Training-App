import { hold, idleSession, restart, resume, retime, snooze, startDay } from './lib/session';
import type { EventType, PottyEvent, Settings } from './lib/types';
import { newId, setState } from './store';

export function logEvent(type: EventType, at = Date.now()): PottyEvent {
  const event: PottyEvent = { id: newId(), type, at };
  setState((s) => ({
    ...s,
    events: [...s.events, event],
    session: restart(s.session, Date.now(), s.settings.intervalMin),
  }));
  return event;
}

export function addEvent(event: PottyEvent) {
  setState((s) => ({ ...s, events: [...s.events, event] }));
}

export function updateEvent(event: PottyEvent) {
  setState((s) => ({ ...s, events: s.events.map((e) => (e.id === event.id ? event : e)) }));
}

export function deleteEvent(id: string) {
  setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
}

export const startTheDay = () =>
  setState((s) => ({ ...s, session: startDay(Date.now(), s.settings.intervalMin) }));
export const pauseTimer = (as: 'paused' | 'nap') =>
  setState((s) => ({ ...s, session: hold(s.session, Date.now(), as) }));
export const resumeTimer = () =>
  setState((s) => ({ ...s, session: resume(s.session, Date.now(), s.settings.intervalMin) }));
export const endTheDay = () => setState((s) => ({ ...s, session: idleSession }));
export const snoozeTimer = (minutes: number) =>
  setState((s) => ({ ...s, session: snooze(s.session, Date.now(), minutes) }));

export function updateSettings(patch: Partial<Settings>) {
  setState((s) => ({
    ...s,
    settings: { ...s.settings, ...patch },
    session:
      patch.intervalMin != null && patch.intervalMin !== s.settings.intervalMin
        ? retime(s.session, Date.now(), s.settings.intervalMin, patch.intervalMin)
        : s.session,
  }));
}
