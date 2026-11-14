import type { SheetTarget } from '../App';
import { dateLabel, timeOfDay } from '../lib/format';
import { dayKey, groupByDay, stats } from '../lib/insights';
import { EVENT_META, type AppState } from '../lib/types';
import { newId } from '../store';

export function Journey({ state, now, onOpen }: { state: AppState; now: number; onOpen: (t: SheetTarget) => void }) {
  const days = groupByDay(state.events);
  const stars = stats(state.events).successes;
  const name = state.settings.childName;

  return (
    <>
      <header className="head">
        <p className="eyebrow">{stars ? `${stars} star${stars === 1 ? '' : 's'} earned ⭐` : 'Every try counts'}</p>
        <h1>{name ? `${name}'s journey` : 'The journey'}</h1>
      </header>

      <button
        className="btn wide"
        onClick={() => onOpen({ event: { id: newId(), type: 'pee', at: Date.now() }, isNew: true })}
      >
        ＋ Add an earlier moment
      </button>

      {!days.length && (
        <div className="card empty">
          <span aria-hidden>🌱</span>
          <p>Nothing logged yet. Tap a button on the Today tab and the story starts here.</p>
        </div>
      )}

      {days.map((d) => {
        const s = stats(d.events);
        return (
          <section className="card day" key={d.key}>
            <div className="day-head">
              <div>
                <h3>Day {d.dayNumber}</h3>
                <small>{d.key === dayKey(now) ? 'Today' : dateLabel(d.date)}</small>
              </div>
              <div className="pills">
                <span className="pill good">✓ {s.successes}</span>
                <span className="pill">🪑 {s.tries}</span>
                <span className="pill soft">🌧️ {s.accidents}</span>
              </div>
            </div>
            {s.successes > 0 && (
              <div className="stickers" aria-label={`${s.successes} stars`}>
                {'⭐'.repeat(s.successes)}
              </div>
            )}
            <ul className="timeline">
              {d.events.map((e) => (
                <li key={e.id}>
                  <button className={`entry ${e.type}`} onClick={() => onOpen({ event: e, isNew: false })}>
                    <span className="entry-dot" aria-hidden>
                      {EVENT_META[e.type].emoji}
                    </span>
                    <span className="entry-main">
                      <strong>
                        {EVENT_META[e.type].label}
                        {e.self && <em> · asked to go</em>}
                      </strong>
                      {e.note && <small>{e.note}</small>}
                    </span>
                    <time>{timeOfDay(e.at)}</time>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
