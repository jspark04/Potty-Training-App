import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';

/** True inside the Android app; false in a browser. */
export const isNative = Capacitor.isNativePlatform();

let ctx: AudioContext | null = null;

/** Browsers only allow audio after a tap, so call this from a user gesture. */
export function unlockAudio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* audio unavailable */
  }
}

export function chime() {
  if (!ctx || ctx.state !== 'running') return;
  const t0 = ctx.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    const t = t0 + i * 0.18;
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(t);
    osc.stop(t + 0.65);
  });
}

export function tap() {
  if (isNative) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
  else navigator.vibrate?.(10);
}

export function buzz() {
  if (isNative) void Haptics.vibrate({ duration: 400 }).catch(() => {});
  else navigator.vibrate?.([200, 100, 200]);
}

export const notificationsSupported = () => isNative || typeof Notification !== 'undefined';

export async function requestNotifications(): Promise<boolean> {
  try {
    if (isNative) return (await LocalNotifications.requestPermissions()).display === 'granted';
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission === 'granted') return true;
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

const ALARM_ID = 1;

/**
 * Android app only: hand the next "potty time" to the system so it fires even when the app is
 * closed or the phone is locked. Pass null to clear it.
 */
export async function syncAlarm(dueAt: number | null, childName: string) {
  if (!isNative) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: ALARM_ID }] });
    if (dueAt == null || dueAt <= Date.now()) return;
    await LocalNotifications.schedule({
      notifications: [
        {
          id: ALARM_ID,
          title: 'Potty time! 🚽',
          body: `Time for ${childName || 'your little one'} to try.`,
          schedule: { at: new Date(dueAt), allowWhileIdle: true },
        },
      ],
    });
  } catch {
    /* notifications unavailable */
  }
}

/** Browser only: show a notification right now (the tab must still be alive). */
export async function notifyNow(childName: string) {
  if (isNative || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const title = 'Potty time! 🚽';
  const opts: NotificationOptions = {
    body: `Time for ${childName || 'your little one'} to try.`,
    tag: 'potty-due',
    icon: './icon-192.png',
  };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, opts);
    else new Notification(title, opts);
  } catch {
    /* notification unavailable */
  }
}
