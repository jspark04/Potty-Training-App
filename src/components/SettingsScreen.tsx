import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useRef, useState } from 'react';
import { updateSettings } from '../actions';
import { isNative, notificationsSupported, requestNotifications } from '../lib/alerts';
import { minutesLabel } from '../lib/format';
import { EVENT_META, INTERVAL_STEPS, type AppState } from '../lib/types';
import { parseState, resetState, setState } from '../store';

/** Browser: download the file. Android app: open the share sheet (Drive, email, Files…). */
async function saveFile(name: string, text: string, type: string) {
  if (isNative) {
    const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    await Share.share({ title: name, files: [uri] }).catch(() => {});
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function SettingsScreen({ state }: { state: AppState }) {
  const { settings, events } = state;
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const stamp = new Date().toISOString().slice(0, 10);

  async function toggleNotify(on: boolean) {
    if (!on) return updateSettings({ notify: false });
    const ok = await requestNotifications();
    updateSettings({ notify: ok, askedNotify: true });
    if (!ok) setMsg("Notifications are blocked for this app. Allow them in your phone's settings.");
  }

  function exportCsv() {
    const rows = [...events]
      .sort((a, b) => a.at - b.at)
      .map((e) =>
        [new Date(e.at).toLocaleString(), EVENT_META[e.type].label, e.self ? 'yes' : '', e.note ?? ''].map(csvCell).join(','),
      );
    void saveFile(`potty-log-${stamp}.csv`, ['When,Type,Asked to go,Note', ...rows].join('\n'), 'text/csv');
  }

  async function importBackup(f: File | undefined) {
    if (!f) return;
    try {
      const next = parseState(JSON.parse(await f.text()));
      if (!next) throw new Error('bad file');
      if (events.length && !confirm(`Replace the current log (${events.length} entries) with this backup?`)) return;
      setState(() => next);
      setMsg(`Restored ${next.events.length} entries.`);
    } catch {
      setMsg("That file doesn't look like a Potty Pal backup.");
    }
  }

  return (
    <>
      <header className="head">
        <p className="eyebrow">Stored only on this device</p>
        <h1>Settings</h1>
      </header>

      <section className="card form">
        <label className="field">
          Child's name
          <input
            value={settings.childName}
            onChange={(e) => updateSettings({ childName: e.target.value, onboarded: true })}
            placeholder="Name"
            maxLength={24}
          />
        </label>
        <label className="field">
          Time between tries
          <select value={settings.intervalMin} onChange={(e) => updateSettings({ intervalMin: Number(e.target.value) })}>
            {INTERVAL_STEPS.map((m) => (
              <option key={m} value={m}>
                {minutesLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="toggle">
          <span>
            Chime when it's time
            <small>Plays while the app is open</small>
          </span>
          <input type="checkbox" checked={settings.sound} onChange={(e) => updateSettings({ sound: e.target.checked })} />
        </label>
        {notificationsSupported() && (
          <label className="toggle">
            <span>
              Potty time notifications
              <small>{isNative ? 'Rings even when the app is closed' : 'Only while this page stays open — the Android app rings when closed'}</small>
            </span>
            <input type="checkbox" checked={settings.notify} onChange={(e) => void toggleNotify(e.target.checked)} />
          </label>
        )}
      </section>

      <section className="card form">
        <h3>Your data</h3>
        <button className="btn wide" onClick={exportCsv} disabled={!events.length}>
          Export log as spreadsheet (CSV)
        </button>
        <button
          className="btn wide"
          onClick={() => void saveFile(`potty-pal-backup-${stamp}.json`, JSON.stringify(state, null, 2), 'application/json')}
        >
          Save a backup
        </button>
        <button className="btn wide" onClick={() => file.current?.click()}>
          Restore from backup
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            void importBackup(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button
          className="btn wide danger"
          onClick={() => {
            if (confirm('Erase the whole log and all settings? This cannot be undone.')) resetState();
          }}
        >
          Erase everything
        </button>
        {msg && <p className="muted" role="status">{msg}</p>}
      </section>
    </>
  );
}
