export type EventType = 'pee' | 'poop' | 'try' | 'accident';

export interface PottyEvent {
  id: string;
  type: EventType;
  at: number; // epoch ms
  note?: string;
  /** Child asked to go on their own (only meaningful for pee/poop). */
  self?: boolean;
}

export type SessionStatus = 'idle' | 'running' | 'paused' | 'nap';

export interface Session {
  status: SessionStatus;
  /** When the next try is due (only while running). */
  dueAt: number | null;
  /** Time left on the clock (only while paused / napping). */
  remainingMs: number | null;
}

export interface Settings {
  childName: string;
  intervalMin: number;
  sound: boolean;
  notify: boolean;
  /** Whether we have already asked for notification permission once. */
  askedNotify: boolean;
  /** Keep reminding every couple of minutes until the try is logged or snoozed. */
  repeat: boolean;
  onboarded: boolean;
}

export interface AppState {
  v: 1;
  events: PottyEvent[];
  session: Session;
  settings: Settings;
}

export const INTERVAL_STEPS = [10, 15, 20, 30, 45, 60, 90, 120];

export const EVENT_META: Record<EventType, { label: string; emoji: string; hint: string }> = {
  pee: { label: 'Pee', emoji: '💧', hint: 'In the potty' },
  poop: { label: 'Poop', emoji: '💩', hint: 'In the potty' },
  try: { label: 'Sat & tried', emoji: '🪑', hint: 'Not this time' },
  accident: { label: 'Accident', emoji: '🌧️', hint: 'It happens' },
};
