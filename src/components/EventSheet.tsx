import { useState } from 'react';
import { addEvent, deleteEvent, updateEvent } from '../actions';
import type { SheetTarget } from '../App';
import { toLocalInput } from '../lib/format';
import { EVENT_META, type EventType } from '../lib/types';

export function EventSheet({ target, onClose }: { target: NonNullable<SheetTarget>; onClose: () => void }) {
  const [draft, setDraft] = useState(target.event);
  const success = draft.type === 'pee' || draft.type === 'poop';

  function save() {
    const clean = { ...draft, note: draft.note?.trim() || undefined, self: success ? draft.self : undefined };
    if (target.isNew) addEvent(clean);
    else updateEvent(clean);
    onClose();
  }

  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal aria-label="Moment details" onClick={(e) => e.stopPropagation()}>
        <h2>{target.isNew ? 'Add a moment' : 'Edit moment'}</h2>

        <div className="type-pick">
          {(Object.keys(EVENT_META) as EventType[]).map((t) => (
            <button key={t} className={draft.type === t ? 'on' : ''} onClick={() => setDraft({ ...draft, type: t })}>
              <span aria-hidden>{EVENT_META[t].emoji}</span>
              {EVENT_META[t].label}
            </button>
          ))}
        </div>

        <label className="field">
          When
          <input
            type="datetime-local"
            value={toLocalInput(draft.at)}
            max={toLocalInput(Date.now())}
            onChange={(e) => {
              const ts = new Date(e.target.value).getTime();
              if (!Number.isNaN(ts)) setDraft({ ...draft, at: ts });
            }}
          />
        </label>

        {success && (
          <label className="toggle">
            <span>
              Asked to go on their own
              <small>A big sign of progress</small>
            </span>
            <input type="checkbox" checked={!!draft.self} onChange={(e) => setDraft({ ...draft, self: e.target.checked })} />
          </label>
        )}

        <label className="field">
          Note
          <input
            value={draft.note ?? ''}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            placeholder="After lunch, at grandma's…"
            maxLength={140}
          />
        </label>

        <div className="sheet-actions">
          {!target.isNew && (
            <button
              className="btn danger"
              onClick={() => {
                deleteEvent(draft.id);
                onClose();
              }}
            >
              Delete
            </button>
          )}
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" onClick={save}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
