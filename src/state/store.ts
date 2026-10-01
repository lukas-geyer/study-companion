// App state: the plan data (persisted) plus UI state (not persisted). One immutable snapshot.
import { useSyncExternalStore } from 'react';
import { APP_ID } from '../config';
import { normalize } from '../core/backup';
import { monOf, todayDn } from '../core/dates';
import { newAppData } from '../core/defaults';
import { regionFromLocale } from '../core/holidays';
import type { DisplayClass } from '../core/timetable';
import type { AppData } from '../core/types';
import type { Key } from '../i18n';
import { askPersistentStorage, openPersist, type Persist, type StoreKind } from './persist';

export type View = 'today' | 'week' | 'year' | 'setup';
export type LegalDoc = 'imprint' | 'privacy';
export type Pane =
  | { k: 'mod'; id: string; n: number }
  | { k: 'cls'; cls: DisplayClass; n: number }
  | { k: 'log' }
  | { k: 'appt' }
  | { k: 'legal'; doc: LegalDoc }
  | null;

export interface Toast { id: number; key?: Key; msg?: string }
export interface UIState {
  view: View;
  dayN: number;
  weekMon: number;
  pane: Pane;
  toast: Toast | null;
  storage: 'loading' | StoreKind;
  wizard: boolean;
  anchor: string;
}
export interface AppState { data: AppData; ui: UIState; ready: boolean }

const guessRegion = () => {
  try {
    return regionFromLocale(navigator.languages?.[0] || navigator.language || '');
  } catch {
    return 'none' as const;
  }
};
const initialView = (): View => {
  try {
    const h = location.hash.slice(1);
    if (h === 'today' || h === 'week' || h === 'year' || h === 'setup') return h;
  } catch {
    /* no location */
  }
  return 'today';
};
// #imprint and #privacy open the legal notice directly (e.g. a link from an app store listing).
const initialPane = (): Pane => {
  try {
    const h = location.hash.slice(1);
    if (h === 'imprint' || h === 'privacy') return { k: 'legal', doc: h };
  } catch {
    /* no location */
  }
  return null;
};

const T0 = todayDn();
let state: AppState = {
  data: newAppData(guessRegion()),
  ui: { view: initialView(), dayN: T0, weekMon: monOf(T0), pane: initialPane(), toast: null, storage: 'loading', wizard: false, anchor: '' },
  ready: false,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const getState = (): AppState => state;
export function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function setUI(patch: Partial<UIState>): void {
  state = { ...state, ui: { ...state.ui, ...patch } };
  emit();
}

let toastN = 0;
export function toast(k: Key | { msg: string }): void {
  setUI({ toast: typeof k === 'string' ? { id: ++toastN, key: k } : { id: ++toastN, msg: k.msg } });
}

// ---------------------------------------------------------------- persistence
let persist: Persist | null = null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pending = false;
let channel: BroadcastChannel | null = null;
const TAB = Math.random().toString(36).slice(2);
let askedPersist = false;

async function flush(): Promise<void> {
  if (!persist || !pending) return;
  pending = false;
  try {
    await persist.save(state.data);
    channel?.postMessage({ type: 'saved', from: TAB });
    if (!askedPersist) {
      askedPersist = true;
      void askPersistentStorage();
    }
  } catch {
    toast('toast.saveFailed');
  }
}

/** Replace or mutate the data (on a copy), then save shortly after. */
export function updateData(fn: (d: AppData) => AppData | void): void {
  const draft = structuredClone(state.data);
  const res = fn(draft);
  state = { ...state, data: res || draft };
  emit();
  pending = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void flush(), 250);
}

export async function init(): Promise<void> {
  persist = await openPersist();
  let raw: unknown = null;
  try {
    raw = await persist.load();
  } catch {
    raw = null;
  }
  state = {
    ...state,
    data: raw ? normalize(raw) : state.data,
    ready: true,
    ui: { ...state.ui, storage: persist.kind },
  };
  emit();
  try {
    channel = new BroadcastChannel(APP_ID);
    channel.onmessage = async (ev) => {
      if (!ev.data || ev.data.type !== 'saved' || ev.data.from === TAB || pending || !persist) return;
      const fresh = await persist.load();
      if (fresh) {
        state = { ...state, data: normalize(fresh) };
        emit();
      }
    };
  } catch {
    channel = null;
  }
  const flushNow = () => {
    clearTimeout(saveTimer);
    void flush();
  };
  addEventListener('pagehide', flushNow);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushNow();
  });
}

export async function wipeStorage(): Promise<void> {
  clearTimeout(saveTimer);
  pending = false;
  try {
    await persist?.clear();
  } catch {
    /* ignore */
  }
}
