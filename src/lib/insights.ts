import { INTERVAL_STEPS, type PottyEvent } from './types';

const DAY = 86_400_000;

export function dayKey(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface DayStats {
  pee: number;
  poop: number;
  tries: number;
  accidents: number;
  successes: number;
  self: number;
  /** successes / (successes + accidents), or null when there is nothing to rate. */
  rate: number | null;
}

export function stats(events: PottyEvent[]): DayStats {
  const s = { pee: 0, poop: 0, tries: 0, accidents: 0, successes: 0, self: 0 };
  for (const e of events) {
    if (e.type === 'pee') s.pee++;
    else if (e.type === 'poop') s.poop++;
    else if (e.type === 'try') s.tries++;
    else s.accidents++;
    if ((e.type === 'pee' || e.type === 'poop') && e.self) s.self++;
  }
  s.successes = s.pee + s.poop;
  const rated = s.successes + s.accidents;
  return { ...s, rate: rated ? s.successes / rated : null };
}

export interface DayGroup {
  key: string;
  date: number; // start of day
  dayNumber: number; // 1-based day of the journey
  events: PottyEvent[]; // newest first
}

/** Days that have entries, newest first, numbered from the first logged day. */
export function groupByDay(events: PottyEvent[]): DayGroup[] {
  if (!events.length) return [];
  const first = startOfDay(Math.min(...events.map((e) => e.at)));
  const map = new Map<string, DayGroup>();
  for (const e of [...events].sort((a, b) => b.at - a.at)) {
    const key = dayKey(e.at);
    let g = map.get(key);
    if (!g) {
      const date = startOfDay(e.at);
      g = { key, date, dayNumber: Math.round((date - first) / DAY) + 1, events: [] };
      map.set(key, g);
    }
    g.events.push(e);
  }
  return [...map.values()];
}

export function journeyDay(events: PottyEvent[], now: number): number {
  if (!events.length) return 1;
  const first = startOfDay(Math.min(...events.map((e) => e.at)));
  return Math.round((startOfDay(now) - first) / DAY) + 1;
}

/** Stats for each of the last `n` calendar days, oldest first (empty days included). */
export function lastDays(events: PottyEvent[], now: number, n: number) {
  const out: { date: number; stats: DayStats }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(startOfDay(now));
    d.setDate(d.getDate() - i);
    const key = dayKey(d.getTime());
    out.push({ date: d.getTime(), stats: stats(events.filter((e) => dayKey(e.at) === key)) });
  }
  return out;
}

export const DAY_PARTS = [
  { label: 'Morning', from: 5, to: 12 },
  { label: 'Afternoon', from: 12, to: 17 },
  { label: 'Evening', from: 17, to: 21 },
  { label: 'Night', from: 21, to: 29 },
] as const;

export function accidentsByDayPart(events: PottyEvent[]): { label: string; count: number }[] {
  return DAY_PARTS.map((p) => ({
    label: p.label,
    count: events.filter((e) => {
      if (e.type !== 'accident') return false;
      const h = new Date(e.at).getHours();
      const hh = h < 5 ? h + 24 : h;
      return hh >= p.from && hh < p.to;
    }).length,
  }));
}

/** Time since the last accident, or since the first entry if there has never been one. */
export function dryFor(events: PottyEvent[], now: number): number | null {
  if (!events.length) return null;
  const accidents = events.filter((e) => e.type === 'accident').map((e) => e.at);
  const since = accidents.length ? Math.max(...accidents) : Math.min(...events.map((e) => e.at));
  return Math.max(0, now - since);
}

/** Median minutes between pees (potty or accident) within the same day. */
export function typicalPeeGapMin(events: PottyEvent[]): number | null {
  const pees = events.filter((e) => e.type === 'pee' || e.type === 'accident').sort((a, b) => a.at - b.at);
  const gaps: number[] = [];
  for (let i = 1; i < pees.length; i++) {
    if (dayKey(pees[i].at) !== dayKey(pees[i - 1].at)) continue;
    const g = (pees[i].at - pees[i - 1].at) / 60_000;
    if (g >= 5 && g <= 300) gaps.push(g);
  }
  if (gaps.length < 3) return null;
  gaps.sort((a, b) => a - b);
  const mid = gaps.length >> 1;
  return Math.round(gaps.length % 2 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2);
}

export interface Suggestion {
  to: number;
  direction: 'longer' | 'shorter';
  reason: string;
}

/** Suggest stretching (or shortening) the interval based on the last three days. */
export function suggestInterval(events: PottyEvent[], now: number, intervalMin: number): Suggestion | null {
  const recent = events.filter((e) => e.at > startOfDay(now) - 2 * DAY);
  const s = stats(recent);
  const rated = s.successes + s.accidents;
  if (s.rate == null) return null;
  const idx = INTERVAL_STEPS.findIndex((m) => m >= intervalMin);
  const i = idx === -1 ? INTERVAL_STEPS.length - 1 : idx;
  if (rated >= 6 && s.rate >= 0.8 && i < INTERVAL_STEPS.length - 1) {
    return {
      to: INTERVAL_STEPS[i + 1],
      direction: 'longer',
      reason: `${Math.round(s.rate * 100)}% in the potty over the last few days — ready for a longer stretch.`,
    };
  }
  if (rated >= 4 && s.rate < 0.5 && i > 0) {
    return {
      to: INTERVAL_STEPS[i - 1],
      direction: 'shorter',
      reason: 'More accidents than catches lately — shorter gaps can help rebuild momentum.',
    };
  }
  return null;
}
