import { describe, expect, it } from 'vitest';
import { hold, idleSession, isDue, remaining, restart, resume, retime, snooze, startDay } from './session';

const MIN = 60_000;

describe('session timer', () => {
  it('counts down from the interval and becomes due', () => {
    const s = startDay(0, 30);
    expect(remaining(s, 10 * MIN)).toBe(20 * MIN);
    expect(isDue(s, 29 * MIN)).toBe(false);
    expect(isDue(s, 30 * MIN)).toBe(true);
  });

  it('freezes the clock while paused or napping and picks up where it left off', () => {
    const paused = hold(startDay(0, 30), 10 * MIN, 'nap');
    expect(paused.status).toBe('nap');
    expect(remaining(paused, 99 * MIN)).toBe(20 * MIN);
    const back = resume(paused, 100 * MIN, 30);
    expect(remaining(back, 100 * MIN)).toBe(20 * MIN);
  });

  it('restarts the full interval after a log, keeping the paused state', () => {
    expect(remaining(restart(startDay(0, 30), 25 * MIN, 30), 25 * MIN)).toBe(30 * MIN);
    const napping = restart(hold(startDay(0, 30), 10 * MIN, 'nap'), 12 * MIN, 30);
    expect(napping.status).toBe('nap');
    expect(napping.remainingMs).toBe(30 * MIN);
    expect(restart(idleSession, 0, 30)).toBe(idleSession);
  });

  it('snoozes and retimes', () => {
    const s = startDay(0, 30);
    expect(remaining(snooze(s, 31 * MIN, 5), 31 * MIN)).toBe(5 * MIN);
    expect(remaining(retime(s, 10 * MIN, 30, 45), 10 * MIN)).toBe(35 * MIN);
    expect(remaining(retime(s, 20 * MIN, 30, 10), 20 * MIN)).toBe(0);
  });
});
