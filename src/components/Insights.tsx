import { updateSettings } from '../actions';
import { duration, minutesLabel, weekdayShort } from '../lib/format';
import { accidentsByDayPart, dryFor, lastDays, stats, suggestInterval, typicalPeeGapMin } from '../lib/insights';
import type { AppState } from '../lib/types';

export function Insights({ state, now }: { state: AppState; now: number }) {
  const { events, settings } = state;
  const week = lastDays(events, now, 7);
  const weekEvents = events.filter((e) => e.at >= week[0].date);
  const total = stats(weekEvents);
  const parts = accidentsByDayPart(weekEvents);
  const maxPart = Math.max(1, ...parts.map((p) => p.count));
  const worst = parts.reduce((a, b) => (b.count > a.count ? b : a));
  const maxDay = Math.max(1, ...week.map((d) => d.stats.successes + d.stats.accidents));
  const gap = typicalPeeGapMin(weekEvents);
  const dry = dryFor(events, now);
  const tip = suggestInterval(events, now, settings.intervalMin);

  if (!events.length) {
    return (
      <>
        <header className="head">
          <p className="eyebrow">Last 7 days</p>
          <h1>Insights</h1>
        </header>
        <div className="card empty">
          <span aria-hidden>📈</span>
          <p>Patterns show up here after a few logged moments.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="head">
        <p className="eyebrow">Last 7 days</p>
        <h1>Insights</h1>
      </header>

      {tip && (
        <section className="card tip">
          <h3>{tip.direction === 'longer' ? '🚀 Ready to stretch?' : '🤗 Try shorter gaps'}</h3>
          <p>{tip.reason}</p>
          <button className="btn primary" onClick={() => updateSettings({ intervalMin: tip.to })}>
            Switch to every {minutesLabel(tip.to)}
          </button>
        </section>
      )}

      <div className="tiles">
        <div className="card tile">
          <strong>{total.rate == null ? '–' : `${Math.round(total.rate * 100)}%`}</strong>
          <small>made it to the potty</small>
        </div>
        <div className="card tile">
          <strong>{dry == null ? '–' : duration(dry)}</strong>
          <small>current dry streak</small>
        </div>
        <div className="card tile">
          <strong>{total.self}</strong>
          <small>times asked to go</small>
        </div>
        <div className="card tile">
          <strong>{gap == null ? '–' : `~${minutesLabel(gap)}`}</strong>
          <small>typical gap between pees</small>
        </div>
      </div>

      <section className="card">
        <h3>Day by day</h3>
        <div className="bars" role="img" aria-label="Potty successes and accidents for each of the last seven days">
          {week.map((d) => (
            <div className="bar-col" key={d.date}>
              <div className="bar-stack">
                {d.stats.accidents > 0 && (
                  <i className="bar bad" style={{ height: `${(d.stats.accidents / maxDay) * 100}%` }} />
                )}
                {d.stats.successes > 0 && (
                  <i className="bar good" style={{ height: `${(d.stats.successes / maxDay) * 100}%` }} />
                )}
              </div>
              <small>{weekdayShort(d.date)}</small>
            </div>
          ))}
        </div>
        <p className="legend">
          <i className="sw good" /> In the potty ({total.successes}) <i className="sw bad" /> Accidents ({total.accidents})
        </p>
      </section>

      <section className="card">
        <h3>When accidents happen</h3>
        {total.accidents === 0 ? (
          <p className="muted">No accidents this week 🎉</p>
        ) : (
          <>
            {parts.map((p) => (
              <div className="hbar" key={p.label}>
                <span>{p.label}</span>
                <div>
                  <i style={{ width: `${(p.count / maxPart) * 100}%` }} />
                </div>
                <b>{p.count}</b>
              </div>
            ))}
            <p className="muted">
              Most happen in the {worst.label.toLowerCase()} — try offering the potty a little more often then.
            </p>
          </>
        )}
      </section>
    </>
  );
}
