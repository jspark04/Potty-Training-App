import { describe, expect, it } from 'vitest';
import { accidentsByDayPart, dryFor, groupByDay, journeyDay, stats, suggestInterval, typicalPeeGapMin } from './insights';
import type { EventType, PottyEvent } from './types';

let n = 0;
const at = (day: number, hour: number, min = 0) => new Date(2026, 10, day, hour, min).getTime();
const ev = (type: EventType, ts: number, self = false): PottyEvent => ({ id: String(n++), type, at: ts, self });

describe('insights', () => {
  const events = [
    ev('pee', at(10, 9)),
    ev('accident', at(10, 10)),
    ev('try', at(10, 11)),
    ev('poop', at(11, 9), true),
    ev('pee', at(12, 8)),
  ];

  it('summarises a set of events', () => {
    const s = stats(events);
    expect(s).toMatchObject({ pee: 2, poop: 1, tries: 1, accidents: 1, successes: 3, self: 1 });
    expect(s.rate).toBe(0.75);
    expect(stats([]).rate).toBeNull();
  });

  it('groups by day, newest first, numbered from the first day', () => {
    const g = groupByDay(events);
    expect(g.map((d) => d.dayNumber)).toEqual([3, 2, 1]);
    expect(g[2].events.map((e) => e.type)).toEqual(['try', 'accident', 'pee']);
    expect(journeyDay(events, at(14, 12))).toBe(5);
  });

  it('buckets accidents by time of day and tracks the dry stretch', () => {
    const parts = accidentsByDayPart([...events, ev('accident', at(12, 2))]);
    expect(parts.map((p) => p.count)).toEqual([1, 0, 0, 1]);
    expect(dryFor(events, at(10, 12))).toBe(2 * 3_600_000);
    expect(dryFor([], 0)).toBeNull();
  });

  it('finds the typical gap between pees', () => {
    const e = [ev('pee', at(10, 9)), ev('pee', at(10, 9, 40)), ev('accident', at(10, 10, 30)), ev('pee', at(10, 11, 30))];
    expect(typicalPeeGapMin(e)).toBe(50);
    expect(typicalPeeGapMin(events)).toBeNull();
  });

  it('suggests a longer interval when things go well and a shorter one when they do not', () => {
    const good = [9, 10, 11, 12, 13, 14].map((h) => ev('pee', at(12, h)));
    expect(suggestInterval(good, at(12, 15), 30)).toMatchObject({ to: 45, direction: 'longer' });
    const rough = [ev('pee', at(12, 9)), ...[10, 11, 12].map((h) => ev('accident', at(12, h)))];
    expect(suggestInterval(rough, at(12, 15), 30)).toMatchObject({ to: 20, direction: 'shorter' });
    expect(suggestInterval(good.slice(0, 2), at(12, 15), 30)).toBeNull();
  });
});
