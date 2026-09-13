/*
 * The browser's own storage, for the hosted and installed copies of this app.
 *
 * WHY THERE ARE TWO STORAGE PATHS AT ALL
 *
 * The downloaded file keeps your data in a file you chose, through the File
 * System Access API. That is the product's whole argument, and it works because
 * a page opened from your disk can be handed a handle to another file on your
 * disk and write to it forever.
 *
 * An installed PWA is a different situation. The same API exists there, but the
 * handle it gives you is scoped to an origin, persists through a browser-managed
 * permission that an installed app re-negotiates differently from a tab, and on
 * iOS it does not exist at all. Building the installed app on FSA would mean a
 * product that works on one platform and silently does not on another — and the
 * failure lands on the person's data, which is the one place it must not.
 *
 * So the rule is decided by where the app came from, which is the one thing
 * that is always knowable:
 *
 *   file://     the downloaded copy   → File System Access, your own file
 *   http(s)://  the hosted copy       → IndexedDB, this module
 *
 * THE PART THAT MATTERS TO A BUYER
 *
 * These two do not sync. They cannot: one is a file on your disk and one is a
 * database inside one browser on one device, and nothing in between them is
 * allowed to reach across without a server. That is stated on the welcome page,
 * in START-HERE, and on the app's own welcome screen, because somebody who
 * assumes otherwise loses work and it will be our fault.
 *
 * What keeps this honest rather than a lock-in is that the hosted copy can
 * still export the same .plants file at any time, and import one. The data
 * format is identical. Ownership survives the storage mechanism.
 */
import { parseStore, serialiseStore, type Store } from './schema.ts'

const DB_NAME = 'plantcare'
const DB_VERSION = 2
const HANDLES = 'handles'
const DOCS = 'docs'
const DOC_KEY = 'current'

export class StorageError extends Error {}

/*
 * One database, two stores, and an upgrade that does not destroy the first.
 *
 * Version 1 held only the file handle for the downloaded copy. Adding the
 * document store bumps to 2 and creates it alongside — anybody who used the
 * hosted copy between builds keeps what they had, which is a thing version
 * upgrades get wrong exactly once and never get forgiven for.
 */
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StorageError('This browser has no storage available to the page at all.'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(HANDLES)) db.createObjectStore(HANDLES)
      if (!db.objectStoreNames.contains(DOCS)) db.createObjectStore(DOCS)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () =>
      reject(
        new StorageError(
          'The browser would not open its storage. This usually means a private window, or site data blocked for this site.'
        )
      )
    req.onblocked = () =>
      reject(new StorageError('Another tab has this app open on an older version. Close it and reload.'))
  })
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(new StorageError('The browser refused to read or write its storage.'))
        t.onabort = () =>
          reject(
            new StorageError(
              t.error?.name === 'QuotaExceededError'
                ? 'There is no room left for this app in the browser. Removing some photos is the fastest fix — they are far larger than everything else combined.'
                : 'The browser cancelled the write.'
            )
          )
      })
  )
}

// ---- the document -----------------------------------------------------------

interface StoredDoc {
  /** The serialised store, exactly as the .plants file would contain it. */
  text: string
  /** What the owner has called this, so the masthead has something to show. */
  name: string
  savedAt: string
}

/**
 * Save the whole document.
 *
 * Whole, not a diff, and as text rather than as an object graph. Text because
 * it is then byte-identical to the file the downloaded copy writes, so export
 * is a copy rather than a re-serialisation that could differ; whole because a
 * plant file is tens of kilobytes and the complexity of partial writes buys
 * nothing at that size except a new way to corrupt somebody's data.
 */
export async function saveDoc(store: Store, version: string, name: string): Promise<void> {
  const doc: StoredDoc = { text: serialiseStore(store, version), name, savedAt: new Date().toISOString() }
  await tx(DOCS, 'readwrite', (s) => s.put(doc, DOC_KEY))
}

export async function loadDoc(): Promise<{ store: Store; name: string } | null> {
  const doc = await tx<StoredDoc | undefined>(DOCS, 'readonly', (s) => s.get(DOC_KEY))
  if (!doc?.text) return null
  return { store: parseStore(doc.text), name: doc.name || 'My plants' }
}

/** The raw text, for export, without a parse-and-reserialise round trip. */
export async function exportText(): Promise<string | null> {
  const doc = await tx<StoredDoc | undefined>(DOCS, 'readonly', (s) => s.get(DOC_KEY))
  return doc?.text ?? null
}

export async function clearDoc(): Promise<void> {
  await tx(DOCS, 'readwrite', (s) => s.delete(DOC_KEY))
}

export async function docExists(): Promise<boolean> {
  try {
    const doc = await tx<StoredDoc | undefined>(DOCS, 'readonly', (s) => s.get(DOC_KEY))
    return Boolean(doc?.text)
  } catch {
    return false
  }
}

// ---- the file handle, for the downloaded copy -------------------------------

export async function putHandle(value: unknown): Promise<void> {
  try {
    await tx(HANDLES, 'readwrite', (s) => s.put(value, DOC_KEY))
  } catch {
    /* A private window can refuse this. Losing the handle means one extra
       click next time, which is not worth failing a save over. */
  }
}

export async function getHandle<T>(): Promise<T | null> {
  try {
    return (await tx<T | undefined>(HANDLES, 'readonly', (s) => s.get(DOC_KEY))) ?? null
  } catch {
    return null
  }
}

// ---- asking the browser not to throw it away --------------------------------

/**
 * Ask for persistent storage.
 *
 * Without this, IndexedDB is "best effort": a browser under disk pressure may
 * evict it, and the person's plants are gone with no warning and nobody to
 * blame but us. With it, the data is durable until the person deletes it.
 *
 * Chromium usually grants it silently to an installed app and often refuses it
 * to a plain tab; Safari grants it after the site has been used a few times.
 * There is no way to force it, so the app asks, records the answer, and tells
 * the truth about it on the welcome screen rather than pretending.
 */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted?.()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function isPersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false
  } catch {
    return false
  }
}

/** Roughly how much room this app is using and is allowed, for the settings screen. */
export async function usage(): Promise<{ usedBytes: number; quotaBytes: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.()
    if (!e || typeof e.usage !== 'number' || typeof e.quota !== 'number') return null
    return { usedBytes: e.usage, quotaBytes: e.quota }
  } catch {
    return null
  }
}
