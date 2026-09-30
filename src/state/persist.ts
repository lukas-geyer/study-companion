// Where the plan lives on the device: IndexedDB, else localStorage, else memory only.
import { DB_NAME, STORE_KEY } from '../config';

export type StoreKind = 'idb' | 'local' | 'memory';

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
  try {
    if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    /* not supported */
  }
}
