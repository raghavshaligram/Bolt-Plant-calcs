/*
 * Where the data lives, and how the app works out which of the two answers
 * applies to the copy it is currently running as.
 *
 * THIS APP IS SOLD TWICE FROM ONE BUILD
 *
 * The same HTML is the file you download and the app you install. That is a
 * deliberate constraint from the brief — no second codebase, no feature
 * differences — and it means this file cannot be decided at build time. It has
 * to look around at runtime and pick.
 *
 * The signal is the protocol, because it is the only one that is always
 * knowable and never lies:
 *
 *   file://      the downloaded copy    → File System Access, your own file
 *   http(s)://   the hosted / installed → IndexedDB, see data/idb.ts
 *
 * Not `display-mode: standalone`, which is false the first time somebody opens
 * the hosted app in a tab and true after they install it — the same person, the
 * same data, and a storage mode that moved underneath them. Not a build flag,
 * because there is one build. The protocol never changes for a given copy.
 *
 * WHY FILE SYSTEM ACCESS IS THE RIGHT ANSWER FOR THE DOWNLOAD AND THE WRONG ONE
 * FOR THE INSTALL
 *
 * For the downloaded file it is the product's entire argument: pick a file once,
 * and every save after that writes straight back to it, in a folder you chose,
 * readable in a text editor, backed up by copying it. For the installed app it
 * is a trap — the API is absent on iOS entirely, and where it exists the handle
 * belongs to an origin and re-negotiates its permission differently in a
 * standalone window than in a tab. A product that silently fails to save on one
 * platform is worse than one that never offered to.
 *
 * So the hosted copy keeps its document in IndexedDB and can export the exact
 * same .plants file whenever asked. Ownership survives; the mechanism changes.
 *
 * TWO THINGS THIS FILE REFUSES TO DO
 *
 * It never writes before it has read. An empty plant list saved over somebody's
 * real file is the one failure this product cannot recover from, so an
 * unreadable handle produces a prompt and a missing file produces a warning
 * naming it — never a blank start.
 *
 * And it never pretends the two copies are the same store. They do not sync and
 * cannot without a server, which is the thing this product is the absence of.
 */
import { parseStore, serialiseStore, type Store } from './schema.ts'
import {
  clearDoc,
  docExists,
  exportText,
  getHandle,
  isPersisted,
  loadDoc,
  putHandle,
  requestPersistence,
  saveDoc,
  StorageError,
} from './idb.ts'

/** Which copy of the product this is. Decided once, at load. */
export type Delivery = 'downloaded-file' | 'hosted'

/** Where this copy keeps the document. */
export type Mode = 'file-system' | 'download' | 'browser'

const isFileProtocol = typeof location !== 'undefined' && location.protocol === 'file:'

export const DELIVERY: Delivery = isFileProtocol ? 'downloaded-file' : 'hosted'

export const SUPPORTS_FS =
  typeof window !== 'undefined' && 'showSaveFilePicker' in window && 'showOpenFilePicker' in window

/**
 * The hosted copy uses the browser's storage even where FSA exists.
 *
 * Chromium on a desktop would happily give the installed app a file handle, and
 * using it there would mean the app behaved one way on Chrome and another on
 * every iPhone — with the difference showing up as somebody's data not being
 * where they left it. One answer per delivery is worth more than the best
 * available answer per browser.
 */
export const MODE: Mode = DELIVERY === 'hosted' ? 'browser' : SUPPORTS_FS ? 'file-system' : 'download'

const PICKER_TYPES = [
  { description: 'Plant file', accept: { 'application/json': ['.plants', '.json'] as string[] } },
]

// ---- the open document -------------------------------------------------------

export interface OpenFile {
  name: string
  store: Store
  /** Null in download mode, in hosted mode, or when the handle could not be kept. */
  handle: FileSystemFileHandle | null
}

let handle: FileSystemFileHandle | null = null
let fileName = 'My plants.plants'

export function currentFileName(): string {
  return fileName
}

export function setFileName(name: string): void {
  fileName = name
}

/** True when saving happens by itself, rather than producing a download. */
export function savesInPlace(): boolean {
  return MODE === 'browser' || handle !== null
}

/** One sentence for the masthead, so a person always knows where their data is. */
export function storageSummary(): string {
  if (MODE === 'browser') return 'Saved in this browser'
  if (handle) return fileName
  return `${fileName} — press Save`
}

// ---- opening -----------------------------------------------------------------

export async function pickAndOpen(): Promise<OpenFile> {
  if (!SUPPORTS_FS) throw new Error('This browser cannot open files in place.')
  const [h] = await (window as never as { showOpenFilePicker: (o: unknown) => Promise<FileSystemFileHandle[]> })
    .showOpenFilePicker({ types: PICKER_TYPES, multiple: false })
  const file = await h.getFile()
  const store = parseStore(await file.text())
  handle = h
  fileName = h.name
  await putHandle(h)
  return { name: h.name, store, handle: h }
}

/**
 * A file the person chose from an `<input type="file">`.
 *
 * This is the non-Chromium path for the downloaded copy AND the import path for
 * the hosted copy — the same function, because in both cases the job is "read
 * these bytes as a plant file". In hosted mode the caller then saves it, which
 * is what makes an import an import rather than a one-session view.
 */
export async function openFromBlob(file: File): Promise<OpenFile> {
  const store = parseStore(await file.text())
  handle = null
  fileName = file.name
  return { name: file.name, store, handle: null }
}

export async function pickAndCreate(suggested: string, store: Store, version: string): Promise<OpenFile> {
  if (!SUPPORTS_FS) throw new Error('This browser cannot create files in place.')
  const h = await (window as never as { showSaveFilePicker: (o: unknown) => Promise<FileSystemFileHandle> })
    .showSaveFilePicker({ suggestedName: suggested, types: PICKER_TYPES })
  handle = h
  fileName = h.name
  await putHandle(h)
  await save(store, version)
  return { name: h.name, store, handle: h }
}

// ---- saving ------------------------------------------------------------------

export async function save(store: Store, version: string): Promise<void> {
  if (MODE === 'browser') {
    await saveDoc(store, version, fileName)
    return
  }
  const text = serialiseStore(store, version)
  if (handle) {
    const w = await handle.createWritable()
    await w.write(text)
    await w.close()
    return
  }
  downloadFile(fileName, text)
}

/**
 * Hand the person the .plants file, from whichever copy they are running.
 *
 * In hosted mode this reads the stored text rather than re-serialising the live
 * store, so the exported file is byte-for-byte what was saved — an export that
 * can differ from what is on disk is an export nobody can reason about.
 */
export async function exportFile(store: Store, version: string): Promise<void> {
  if (MODE === 'browser') {
    const text = (await exportText()) ?? serialiseStore(store, version)
    downloadFile(fileName, text)
    return
  }
  downloadFile(fileName, serialiseStore(store, version))
}

export function downloadFile(name: string, text: string): void {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  // Revoke on the next turn of the event loop; revoking synchronously races the
  // click in Safari and produces a zero-byte download with no error anywhere.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

// ---- coming back -------------------------------------------------------------

export type Recovery =
  | { kind: 'none' }
  | { kind: 'reopened'; file: OpenFile }
  | { kind: 'needs-permission'; name: string; grant: () => Promise<OpenFile> }
  | { kind: 'gone'; name: string }
  /** Hosted mode: the browser's storage would not open at all. */
  | { kind: 'storage-blocked'; message: string }

interface PermissionCapable {
  queryPermission?: (d: { mode: string }) => Promise<PermissionState>
  requestPermission?: (d: { mode: string }) => Promise<PermissionState>
  name: string
  getFile: () => Promise<File>
}

/**
 * What happened to the document we had open last time.
 *
 * Hosted mode has one extra outcome the file mode does not: the browser can
 * refuse storage entirely — a private window, or site data blocked. That is
 * reported as itself rather than as "no data", because the two need opposite
 * responses. "No data" means start; "blocked" means do not start, because
 * anything you do will be lost when the window closes.
 */
export async function recover(): Promise<Recovery> {
  if (MODE === 'browser') {
    try {
      const doc = await loadDoc()
      if (!doc) return { kind: 'none' }
      fileName = doc.name
      return { kind: 'reopened', file: { name: doc.name, store: doc.store, handle: null } }
    } catch (e) {
      if (e instanceof StorageError) return { kind: 'storage-blocked', message: e.message }
      /* The document is there and unreadable — a truncated write, or a file
         from a build that no longer exists. Saying so beats starting empty. */
      return {
        kind: 'storage-blocked',
        message:
          e instanceof Error
            ? `${e.message} Nothing has been changed — your data is still in the browser's storage.`
            : 'The saved data could not be read. Nothing has been changed.',
      }
    }
  }

  if (!SUPPORTS_FS) return { kind: 'none' }
  const h = await getHandle<FileSystemFileHandle & PermissionCapable>()
  if (!h) return { kind: 'none' }

  const state = (await h.queryPermission?.({ mode: 'readwrite' })) ?? 'granted'

  const load = async (): Promise<OpenFile> => {
    const file = await h.getFile()
    const store = parseStore(await file.text())
    handle = h
    fileName = h.name
    return { name: h.name, store, handle: h }
  }

  if (state === 'granted') {
    try {
      return { kind: 'reopened', file: await load() }
    } catch {
      return { kind: 'gone', name: h.name }
    }
  }
  if (state === 'denied') return { kind: 'none' }

  return {
    kind: 'needs-permission',
    name: h.name,
    grant: async () => {
      // Must be called from a click. Chromium rejects it otherwise, by design.
      const granted = await h.requestPermission?.({ mode: 'readwrite' })
      if (granted !== 'granted') throw new Error('Permission to reopen that file was not given.')
      return load()
    },
  }
}

export async function forget(): Promise<void> {
  handle = null
  if (MODE === 'browser') await clearDoc()
  else await putHandle(null)
}

export { docExists, isPersisted, requestPersistence }

// ---- autosave ----------------------------------------------------------------

/**
 * Debounced autosave.
 *
 * Every edit is a write, and a person typing a note produces one edit per
 * keystroke. 900 ms after the last change batches a sentence and still survives
 * the tab being closed straight after, which `flush()` on pagehide covers.
 *
 * In download mode this deliberately does nothing: an autosave there would mean
 * a download per keystroke, so that one path has a Save button and says so.
 */
export function autosaver(version: string, onError: (e: unknown) => void) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending: Store | null = null
  let inFlight = false

  const write = async () => {
    if (inFlight || !pending) return
    const store = pending
    pending = null
    inFlight = true
    try {
      await save(store, version)
    } catch (e) {
      onError(e)
    } finally {
      inFlight = false
      if (pending) void write()
    }
  }

  return {
    queue(store: Store) {
      if (!savesInPlace()) return
      pending = store
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => void write(), 900)
    },
    flush() {
      if (timer) clearTimeout(timer)
      if (pending) void write()
    },
  }
}
