import { useState } from 'react';
import { endTheDay, pauseTimer, resumeTimer, snoozeTimer, startTheDay, updateSettings } from '../actions';
import { requestNotifications, unlockAudio } from '../lib/alerts';
import { clock, duration, minutesLabel } from '../lib/format';
import { dayKey, dryFor, journeyDay, stats } from '../lib/insights';
import { isDue, remaining } from '../lib/session';
import { EVENT_META, INTERVAL_STEPS, type AppState, type EventType } from '../lib/types';
import { Gauge } from './Gauge';

const LOG_ORDER: EventType[] = ['pee', 'poop', 'try', 'accident'];

function greeting(now: number) {
  const h = new Date(now).getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

export function Home({ state, now, onLog }: { state: AppState; now: number; onLog: (t: EventType) => void }) {
  const { session, settings, events } = state;
  const [picking, setPicking] = useState(false);
  const [name, setName] = useState('');

  const left = remaining(session, now);
  const due = isDue(session, now);
  const total = settings.intervalMin * 60_000;
  const today = stats(events.filter((e) => dayKey(e.at) === dayKey(now)));
  const dry = dryFor(events, now);
  const who = settings.childName || 'your little one';

  const tone = due ? 'due' : session.status;

  return (
    <>
      <header className="head">
        <p className="eyebrow">
          {greeting(now)} · Day {journeyDay(events, now)}
        </p>
        <h1>{settings.childName ? `${settings.childName}'s potty day` : 'Potty day'}</h1>
      </header>

      {!settings.onboarded && (
        <form
          className="card welcome"
          onSubmit={(e) => {
            e.preventDefault();
            updateSettings({ childName: name.trim(), onboarded: true });
          }}
        >
          <label htmlFor="kid-name">Who's learning? 🌱</label>
          <div className="row">
            <input
              id="kid-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Child's name"
              autoComplete="off"
              maxLength={24}
            />
            <button className="btn primary">Save</button>
          </div>
        </form>
      )}

      <Gauge fraction={left == null ? 1 : left / total} tone={tone}>
        {session.status === 'idle' && (
          <>
            <span className="gauge-label">Ready when you are</span>
            <button
              className="btn primary big"
              onClick={() => {
                unlockAudio();
                startTheDay();
                if (!settings.askedNotify) {
                  void requestNotifications().then((ok) => updateSettings({ notify: ok, askedNotify: true }));
                }
              }}
            >
              Start the day
            </button>
          </>
        )}
        {session.status !== 'idle' && !due && (
          <>
            <span className="gauge-label">
              {session.status === 'nap' ? 'Napping 😴' : session.status === 'paused' ? 'Paused' : 'Next try in'}
            </span>
            <span className="gauge-time">{clock(left ?? 0)}</span>
          </>
        )}
        {due && (
          <>
            <span className="gauge-label">Potty time!</span>
            <span className="gauge-time small">Let's try 🚽</span>
            <span className="gauge-sub">{duration(-(left ?? 0)) === 'just now' ? 'right now' : `${duration(-(left ?? 0))} ago`}</span>
          </>
        )}
        <button className="chip interval" onClick={() => setPicking((p) => !p)} aria-expanded={picking}>
          every {minutesLabel(settings.intervalMin)} ▾
        </button>
      </Gauge>

      {picking && (
        <div className="steps" role="group" aria-label="Time between tries">
          {INTERVAL_STEPS.map((m) => (
            <button
              key={m}
              className={m === settings.intervalMin ? 'on' : ''}
              onClick={() => {
                updateSettings({ intervalMin: m });
                setPicking(false);
              }}
            >
              {minutesLabel(m)}
            </button>
          ))}
        </div>
      )}

      {session.status !== 'idle' && (
        <div className="controls">
          {due ? (
            <button className="btn" onClick={() => snoozeTimer(5)}>
              ⏰ Snooze 5 min
            </button>
          ) : session.status === 'running' ? (
            <>
              <button className="btn" onClick={() => pauseTimer('paused')}>
                ⏸ Pause
              </button>
              <button className="btn" onClick={() => pauseTimer('nap')}>
                🌙 Nap
              </button>
            </>
          ) : (
            <button className="btn primary" onClick={resumeTimer}>
              ▶ {session.status === 'nap' ? 'Awake' : 'Resume'}
            </button>
          )}
          <button className="btn" onClick={endTheDay}>
            ⏹ End day
          </button>
        </div>
      )}

      <section>
        <h2>{due ? `How did ${who} do?` : 'Log a moment'}</h2>
        <div className="log-grid">
          {LOG_ORDER.map((t) => (
            <button key={t} className={`log ${t}`} onClick={() => onLog(t)}>
              <span className="log-emoji" aria-hidden>
                {EVENT_META[t].emoji}
              </span>
              <span>
                <strong>{EVENT_META[t].label}</strong>
                <small>{EVENT_META[t].hint}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="strip" aria-label="Today so far">
        <div>
          <strong>{today.successes}</strong>
          <small>in the potty</small>
        </div>
        <div>
          <strong>{today.accidents}</strong>
          <small>accidents</small>
        </div>
        <div>
          <strong>{dry == null ? '–' : duration(dry)}</strong>
          <small>dry streak</small>
        </div>
      </section>
    </>
  );
}
