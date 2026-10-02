// Where the plan lives on the device: a file in the iOS app's own storage, in the browser IndexedDB, else
// localStorage, else memory only.
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { DB_NAME, STORE_KEY } from '../config';
import { isNative } from '../native';

export type StoreKind = 'file' | 'idb' | 'local' | 'memory';

export interface Persist {
  kind: StoreKind;
  load(): Promise<unknown | null>;
  save(data: unknown): Promise<void>;
  clear(): Promise<void>;
}

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
  new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('timeout')), ms);
    p.then((v) => (clearTimeout(t), res(v)), (e) => (clearTimeout(t), rej(e)));
  });

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv');
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
    req.onblocked = () => rej(new Error('blocked'));
  });
}

function idbPersist(db: IDBDatabase): Persist {
  const run = <T,>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
    new Promise((res, rej) => {
      const tx = db.transaction('kv', mode);
      const req = fn(tx.objectStore('kv'));
      tx.oncomplete = () => res(req.result);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  return {
    kind: 'idb',
    load: () => run('readonly', (s) => s.get(STORE_KEY)).then((v) => v ?? null),
    save: (data) => run('readwrite', (s) => s.put(data, STORE_KEY)).then(() => undefined),
    clear: () => run('readwrite', (s) => s.delete(STORE_KEY)).then(() => undefined),
  };
}

const localPersist: Persist = {
  kind: 'local',
  load: async () => {
    const s = localStorage.getItem(STORE_KEY);
    return s ? JSON.parse(s) : null;
  },
  save: async (data) => localStorage.setItem(STORE_KEY, JSON.stringify(data)),
  clear: async () => localStorage.removeItem(STORE_KEY),
};

// iOS app: web storage inside the app can be cleared by the system, so the plan is a JSON file in the app's
// Library folder instead (private to the app, kept by iOS and included in iCloud backups).
const FILE = { path: `${DB_NAME}/${STORE_KEY}.json`, directory: Directory.Library };
const filePersist: Persist = {
  kind: 'file',
  load: async () => {
    try {
      const { data } = await Filesystem.readFile({ ...FILE, encoding: Encoding.UTF8 });
      return typeof data === 'string' && data ? JSON.parse(data) : null;
    } catch {
      return null; // no file yet
    }
  },
  save: async (data) => {
    await Filesystem.writeFile({ ...FILE, data: JSON.stringify(data), encoding: Encoding.UTF8, recursive: true });
  },
  clear: async () => {
    await Filesystem.deleteFile(FILE).catch(() => undefined);
  },
};

let memory: unknown = null;
const memoryPersist: Persist = {
  kind: 'memory',
  load: async () => memory,
  save: async (d) => {
    memory = d;
  },
  clear: async () => {
    memory = null;
  },
};

export async function openPersist(): Promise<Persist> {
  if (isNative) return filePersist;
  try {
    if (typeof indexedDB !== 'undefined') {
      const db = await withTimeout(idbOpen(), 2500);
      const p = idbPersist(db);
      await withTimeout(p.load(), 2500);
      return p;
    }
  } catch {
    /* fall through */
  }
  try {
    localStorage.setItem('__probe', '1');
    localStorage.removeItem('__probe');
    return localPersist;
  } catch {
    return memoryPersist;
  }
}

export async function askPersistentStorage(): Promise<void> {
  if (isNative) return; // the app's files are never cleared by the system
  try {
    if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* not supported */
  }
}
