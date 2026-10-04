// The iOS app (Capacitor) runs this same web app. Everything that has to behave differently there goes through here.
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Share } from '@capacitor/share';

export const isNative: boolean = Capacitor.isNativePlatform();

/** Writes a generated file (backup, calendar export) to the app's cache and opens the iOS share sheet for it. */
export async function shareFile(filename: string, text: string): Promise<'saved' | 'declined'> {
  const { uri } = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
  try {
    await Share.share({ files: [uri] });
    return 'saved';
  } catch (e) {
    // Closing the share sheet without choosing anything rejects with "Share canceled".
    if (/cancel/i.test(String((e as { message?: string })?.message ?? e))) return 'declined';
    throw e;
  }
}

/** Tells the app's native frame the theme (SemestraViewController in ios/App/App/SceneDelegate.swift), so the area the
 *  iOS bounce reveals and the status bar match the page. No-op on the web. */
export function setNativeTheme(theme: 'auto' | 'light' | 'dark'): void {
  const w = window as { webkit?: { messageHandlers?: { theme?: { postMessage(v: string): void } } } };
  if (isNative) w.webkit?.messageHandlers?.theme?.postMessage(theme);
}

// ---------------------------------------------------------------- reminders (local notifications)
export interface Note { at: Date; title: string; body: string }
export type NotifState = 'granted' | 'denied' | 'prompt';

export async function notificationsState(): Promise<NotifState> {
  const { display } = await LocalNotifications.checkPermissions();
  return display === 'granted' ? 'granted' : display === 'denied' ? 'denied' : 'prompt';
}

/** Asks iOS for permission (only shows the system question the first time). */
export async function askNotifications(): Promise<boolean> {
  if ((await notificationsState()) === 'prompt') await LocalNotifications.requestPermissions();
  return (await notificationsState()) === 'granted';
}

let queue: Promise<void> = Promise.resolve();
/** Replaces all pending reminders with these. Runs one at a time; never asks for permission by itself. */
export function syncReminders(notes: Note[]): Promise<void> {
  queue = queue
    .then(async () => {
      const { notifications } = await LocalNotifications.getPending();
      if (notifications.length) await LocalNotifications.cancel({ notifications: notifications.map((n) => ({ id: n.id })) });
      if (!notes.length || (await notificationsState()) !== 'granted') return;
      await LocalNotifications.schedule({
        notifications: notes.map((x, i) => ({ id: i + 1, title: x.title, body: x.body, schedule: { at: x.at, allowWhileIdle: true } })),
      });
    })
    .catch(() => undefined);
  return queue;
}
