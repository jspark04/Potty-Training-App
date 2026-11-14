import { useEffect, useRef, useState } from 'react';
import { deleteEvent, logEvent } from './actions';
import { Celebration } from './components/Celebration';
import { EventSheet } from './components/EventSheet';
import { Home } from './components/Home';
import { Icon, type IconName } from './components/Icon';
import { Insights } from './components/Insights';
import { Journey } from './components/Journey';
import { SettingsScreen } from './components/SettingsScreen';
import { App as NativeApp } from '@capacitor/app';
import { buzz, chime, isNative, notifyNow, syncAlarm, tap, unlockAudio } from './lib/alerts';
import { isDue } from './lib/session';
import { EVENT_META, type EventType, type PottyEvent } from './lib/types';
import { useAppState } from './store';

type Tab = 'today' | 'journey' | 'insights' | 'settings';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'timer' },
  { id: 'journey', label: 'Journey', icon: 'book' },
  { id: 'insights', label: 'Insights', icon: 'chart' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
];

export function useNow(ms = 500) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

export type SheetTarget = { event: PottyEvent; isNew: boolean } | null;

export default function App() {
  const state = useAppState();
  const now = useNow();
  const [tab, setTab] = useState<Tab>('today');
  const [sheet, setSheet] = useState<SheetTarget>(null);
  const [toast, setToast] = useState<PottyEvent | null>(null);
  const [party, setParty] = useState(0);
  const alerted = useRef<number | null>(null);
  const { session, settings } = state;

  // Ring the bell once each time the countdown reaches zero.
  const due = isDue(session, now);
  useEffect(() => {
    if (!due || alerted.current === session.dueAt) return;
    alerted.current = session.dueAt;
    if (settings.sound) chime();
    buzz();
    if (settings.notify) void notifyNow(settings.childName);
  }, [due, session.dueAt, settings.sound, settings.notify, settings.childName]);

  // Android app: keep the system alarm in step with the countdown so it rings with the app closed.
  const alarmAt = session.status === 'running' && settings.notify ? session.dueAt : null;
  useEffect(() => {
    void syncAlarm(alarmAt, settings.childName, settings.repeat);
  }, [alarmAt, settings.childName, settings.repeat]);

  // While the app is open and a try is overdue, keep chiming until it is logged or snoozed.
  useEffect(() => {
    if (!due || !settings.repeat) return;
    const id = setInterval(() => {
      if (settings.sound) chime();
      buzz();
    }, 30_000);
    return () => clearInterval(id);
  }, [due, settings.repeat, settings.sound]);

  // Android back button: close the sheet, then return to Today, then leave the app.
  const back = useRef(() => {});
  back.current = () => {
    if (sheet) setSheet(null);
    else if (tab !== 'today') setTab('today');
    else void NativeApp.minimizeApp();
  };
  useEffect(() => {
    if (!isNative) return;
    const sub = NativeApp.addListener('backButton', () => back.current());
    return () => void sub.then((h) => h.remove());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);

  function log(type: EventType) {
    unlockAudio();
    tap();
    const event = logEvent(type);
    setToast(event);
    if (type === 'pee' || type === 'poop') setParty((n) => n + 1);
  }

  return (
    <div className="app" onPointerDown={unlockAudio}>
      <main className="screen">
        {tab === 'today' && <Home state={state} now={now} onLog={log} />}
        {tab === 'journey' && <Journey state={state} now={now} onOpen={setSheet} />}
        {tab === 'insights' && <Insights state={state} now={now} />}
        {tab === 'settings' && <SettingsScreen state={state} />}
      </main>

      {toast && (
        <div className="toast" role="status">
          <span>
            {EVENT_META[toast.type].emoji} {EVENT_META[toast.type].label} logged
          </span>
          <button
            onClick={() => {
              setSheet({ event: toast, isNew: false });
              setToast(null);
            }}
          >
            Add details
          </button>
          <button
            onClick={() => {
              deleteEvent(toast.id);
              setToast(null);
            }}
          >
            Undo
          </button>
        </div>
      )}

      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? 'on' : ''} aria-current={tab === t.id} onClick={() => setTab(t.id)}>
            <Icon name={t.icon} />
            {t.label}
          </button>
        ))}
      </nav>

      {sheet && <EventSheet target={sheet} onClose={() => setSheet(null)} />}
      {party > 0 && <Celebration key={party} name={settings.childName} />}
    </div>
  );
}
