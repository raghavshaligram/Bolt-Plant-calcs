import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { today as todayISO } from '../calc/dates.ts'
import { agendaFor, dueCount } from '../calc/tasks.ts'
import { buildDemo, DEMO_FILE_NAME } from '../data/demo.ts'
import { emptyStore, type Store } from '../data/schema.ts'
import {
  autosaver,
  DELIVERY,
  exportFile,
  MODE,
  openFromBlob,
  pickAndCreate,
  pickAndOpen,
  recover,
  requestPersistence,
  save,
  savesInPlace,
  setFileName,
  storageSummary,
  SUPPORTS_FS,
  type Recovery,
} from '../data/persistence.ts'
import { BUY_URL, DEMO_LOCK } from '../demo-lock.ts'
import { Book, Journal as JournalIcon, Leaf, Stethoscope, Sun, Tools, Warning } from './icons.tsx'
import { Today } from './Today.tsx'
import { Plants } from './Plants.tsx'
import { Library } from './Library.tsx'
import { Diagnose } from './Diagnose.tsx'
import { ToolsScreen } from './ToolsScreen.tsx'
import { JournalScreen } from './JournalScreen.tsx'

export const VERSION = 'Plant Care 1.0'

type Screen = 'today' | 'plants' | 'library' | 'diagnose' | 'tools' | 'journal'

const SCREENS: { id: Screen; label: string; icon: (p: { size?: number }) => React.ReactElement }[] = [
  { id: 'today', label: 'Today', icon: Sun },
  { id: 'plants', label: 'My plants', icon: Leaf },
  { id: 'library', label: 'Plants A–Z', icon: Book },
  { id: 'diagnose', label: 'Diagnose', icon: Stethoscope },
  { id: 'tools', label: 'Tools', icon: Tools },
  { id: 'journal', label: 'Journal', icon: JournalIcon },
]

export function App() {
  const [store, setStore] = useState<Store | null>(null)
  const [screen, setScreen] = useState<Screen>('today')
  const [label, setLabel] = useState(storageSummary())
  const [recovery, setRecovery] = useState<Recovery | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const today = useMemo(() => todayISO(), [])

  const saver = useRef(autosaver(VERSION, (e) => setProblem(errorText(e))))

  /* Recovery runs before anything is rendered as a plant list, because the one
     thing this app must never do is show an empty list to somebody who has data,
     and then autosave that emptiness over it. */
  useEffect(() => {
    /* The demo build has nothing to recover and must not look: recovery opens
       the browser's storage, and the demo's whole claim is that it does not
       touch it. It opens straight into the demo household instead. */
    if (DEMO_LOCK) {
      openDemo()
      return
    }

    let live = true
    recover().then((r) => {
      if (!live) return
      setRecovery(r)
      if (r.kind === 'reopened') {
        setStore(r.file.store)
        setFileName(r.file.name)
        setLabel(storageSummary())
      }
    })
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    const flush = () => saver.current.flush()
    window.addEventListener('pagehide', flush)
    return () => window.removeEventListener('pagehide', flush)
  }, [])

  /*
   * The demo does not queue a save, and that is a correctness fix rather than a
   * demo feature.
   *
   * The masthead has always said "nothing is being saved" while looking at the
   * demo household — but in hosted mode `savesInPlace()` is true, so every edit
   * was being autosaved into IndexedDB under the demo's name. The sentence was
   * true of the downloaded file and false of the installed app. Now it is true
   * of both.
   */
  const update = useCallback(
    (fn: (s: Store) => Store) => {
      setStore((prev) => {
        if (!prev) return prev
        const next = fn(prev)
        if (!isDemo) saver.current.queue(next)
        return next
      })
    },
    [isDemo]
  )

  const openDemo = () => {
    setStore(buildDemo(today, VERSION))
    setFileName(DEMO_FILE_NAME)
    setLabel('Demo — nothing is being saved')
    setIsDemo(true)
    setScreen('today')
  }

  const startFresh = async () => {
    const fresh = emptyStore(today, VERSION)

    if (MODE === 'browser') {
      /* Ask the browser to treat this as durable rather than cache. It usually
         says yes to an installed app and often no to a tab; either way the
         answer is reported on the settings screen rather than assumed. */
      void requestPersistence()
      setFileName('My plants.plants')
      setStore(fresh)
      setIsDemo(false)
      setLabel(storageSummary())
      try {
        await save(fresh, VERSION)
      } catch (e) {
        setProblem(errorText(e))
      }
      return
    }

    if (SUPPORTS_FS) {
      try {
        const f = await pickAndCreate('My plants.plants', fresh, VERSION)
        setStore(f.store)
        setFileName(f.name)
        setLabel(storageSummary())
        setIsDemo(false)
      } catch (e) {
        if (!isAbort(e)) setProblem(errorText(e))
      }
      return
    }

    setStore(fresh)
    setFileName('My plants.plants')
    setLabel(storageSummary())
    setIsDemo(false)
  }

  const openExisting = async () => {
    try {
      const f = await pickAndOpen()
      setStore(f.store)
      setFileName(f.name)
      setLabel(storageSummary())
      setIsDemo(false)
      setProblem(null)
    } catch (e) {
      if (!isAbort(e)) setProblem(errorText(e))
    }
  }

  /* Used by the non-Chromium download copy to open a file, and by the hosted
     copy to import one. In hosted mode the import is only an import once it has
     been written to storage, which is what the save here is for. */
  const openFile = async (file: File) => {
    try {
      const f = await openFromBlob(file)
      setStore(f.store)
      setFileName(f.name)
      setIsDemo(false)
      setProblem(null)
      if (MODE === 'browser') {
        void requestPersistence()
        await save(f.store, VERSION)
      }
      setLabel(storageSummary())
    } catch (e) {
      setProblem(errorText(e))
    }
  }

  /* Belt and braces: the demo build renders no button that reaches either of
     these, and if a future edit wires one up by accident they still do nothing. */
  const saveNow = async () => {
    if (!store || DEMO_LOCK) return
    try {
      if (isDemo || !savesInPlace()) await exportFile(store, VERSION)
      else await save(store, VERSION)
      setProblem(null)
    } catch (e) {
      if (!isAbort(e)) setProblem(errorText(e))
    }
  }

  const downloadCopy = async () => {
    if (!store || DEMO_LOCK) return
    try {
      await exportFile(store, VERSION)
    } catch (e) {
      setProblem(errorText(e))
    }
  }

  const agenda = useMemo(() => (store ? agendaFor(store, today) : null), [store, today])

  if (!store) {
    return (
      <Welcome
        recovery={recovery}
        onDemo={openDemo}
        onFresh={startFresh}
        onOpen={openExisting}
        onFile={openFile}
        problem={problem}
        onRecovered={(f) => {
          setStore(f.store)
          setFileName(f.name)
          setLabel(storageSummary())
        }}
      />
    )
  }

  const badge = agenda ? dueCount(agenda) : 0

  return (
    <div className="app">
      <header className="masthead">
        <div className="wordmark">
          <Leaf size={26} className="mark" />
          <h1>
            Plant Care
            <span className="filename">{isDemo ? 'Demo — nothing is being saved' : label}</span>
          </h1>
        </div>
        {DEMO_LOCK ? (
          /* The demo's only button. There is nothing to save, so the place the
             save button would be is the place the buy button goes. */
          <a className="btn small primary" href={BUY_URL}>
            Get the app
          </a>
        ) : MODE === 'browser' && !isDemo ? (
          <button className="btn small" onClick={() => void downloadCopy()}>
            Download a copy
          </button>
        ) : (
          <button className="btn small" onClick={() => void saveNow()}>
            {savesInPlace() && !isDemo ? 'Saved' : 'Save a copy'}
          </button>
        )}
      </header>

      <nav className="nav" aria-label="Sections">
        {SCREENS.map((s) => {
          const Icon = s.icon
          return (
            <button key={s.id} onClick={() => setScreen(s.id)} aria-current={screen === s.id ? 'page' : undefined}>
              <Icon size={18} />
              <span className="label">{s.label}</span>
              {s.id === 'today' && badge > 0 ? <span className="count">{badge}</span> : null}
            </button>
          )
        })}
      </nav>

      <main>
        {problem ? (
          <div className="notice warn" style={{ marginBottom: 16 }} role="alert">
            <Warning size={18} />
            <div>
              <b>That did not save.</b> {problem}
            </div>
          </div>
        ) : null}

        {isDemo ? (
          <div className="notice info" style={{ marginBottom: 16 }}>
            <Leaf size={18} />
            {DEMO_LOCK ? (
              <div>
                <b>This is the demo.</b> Ten plants, eight months of history, and everything works — every schedule is
                worked out properly, all 303 species are here, the diagnosis walkthroughs run. The one thing it cannot
                do is keep anything: nothing is saved, and closing this tab forgets it.{' '}
                <a href={BUY_URL}>The app you buy keeps your plants</a>, on your own device, with no account.
              </div>
            ) : (
              <div>
                You are looking at the demo household — ten plants, eight months of history. Change anything you like;
                nothing here is saved. When you are ready, <b>Save a copy</b> turns it into your own file, or start an
                empty one from the welcome screen.
              </div>
            )}
          </div>
        ) : null}

        {screen === 'today' && agenda ? <Today store={store} agenda={agenda} today={today} update={update} /> : null}
        {screen === 'plants' ? <Plants store={store} today={today} update={update} /> : null}
        {screen === 'library' ? <Library store={store} today={today} update={update} /> : null}
        {screen === 'diagnose' ? <Diagnose store={store} today={today} update={update} /> : null}
        {screen === 'tools' ? <ToolsScreen store={store} update={update} /> : null}
        {screen === 'journal' ? <JournalScreen store={store} today={today} update={update} /> : null}
      </main>
    </div>
  )
}

// ---- welcome -----------------------------------------------------------------

function Welcome({
  recovery,
  onDemo,
  onFresh,
  onOpen,
  onFile,
  onRecovered,
  problem,
}: {
  recovery: Recovery | null
  onDemo: () => void
  onFresh: () => void
  onOpen: () => void
  onFile: (f: File) => void
  onRecovered: (f: { store: Store; name: string }) => void
  problem: string | null
}) {
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const hosted = MODE === 'browser'

  return (
    <div className="app">
      <header className="masthead">
        <div className="wordmark">
          <Leaf size={26} className="mark" />
          <h1>Plant Care</h1>
        </div>
      </header>
      <main>
        <div style={{ maxWidth: 560, margin: '18px auto' }}>
          <div className="card">
            <div className="body">
              <h2 style={{ marginBottom: 8 }}>
                {hosted ? 'Your plants, on this device' : 'Your plants, in a file you own'}
              </h2>
              <p className="muted small">
                {hosted ? (
                  <>
                    This is the installed app. It keeps your plants in this browser, on this device, and works with no
                    internet once it has loaded. You can download the whole thing as a file whenever you want it.
                  </>
                ) : (
                  <>
                    Everything lives in one file on your computer. No account, no subscription, and it works with the
                    wifi off. Back it up by copying it; move it by moving it.
                  </>
                )}
              </p>

              {/*
                The sentence that prevents the worst support email there is.
                Somebody who has both copies will assume they are one thing,
                put a plant in the app on their phone, look for it in the file
                on their laptop, and conclude the product is broken. It is not
                broken; it was never explained. So it is explained here, before
                they have typed anything, and again on the welcome page.
              */}
              <div className="notice info" style={{ marginTop: 12 }}>
                <Warning size={18} />
                <div>
                  {hosted ? (
                    <>
                      <b>This copy and the downloaded file do not share data.</b> They cannot — one lives in this
                      browser and one is a file on a disk, and nothing joins them without a server, which this product
                      deliberately does not have. Use one as your real record. Moving between them is a download and an
                      open, and takes about ten seconds.
                    </>
                  ) : (
                    <>
                      <b>This copy and the installed app do not share data.</b> They cannot — this one is a file on your
                      disk and that one lives inside a browser, and nothing joins them without a server. Pick one as
                      your real record; moving between them is a download and an open.
                    </>
                  )}
                </div>
              </div>

              {recovery?.kind === 'storage-blocked' ? (
                <div className="notice warn" style={{ marginTop: 12 }} role="alert">
                  <Warning size={18} />
                  <div>
                    <b>This browser will not let the app store anything.</b> {recovery.message}
                    <div style={{ marginTop: 6 }}>
                      A private window does this, and so does blocking site data for this site. You can still look
                      around the demo — but do not put real plants in until this is sorted, because nothing you enter
                      will survive closing the window.
                    </div>
                  </div>
                </div>
              ) : null}

              {recovery?.kind === 'needs-permission' ? (
                <div className="notice info" style={{ marginTop: 12 }}>
                  <Warning size={18} />
                  <div>
                    <b>{recovery.name}</b> was open last time. Browsers ask again after a restart before letting a page
                    read a file.
                    <div style={{ marginTop: 9 }}>
                      <button
                        className="btn primary small"
                        disabled={busy}
                        onClick={async () => {
                          setBusy(true)
                          try {
                            onRecovered(await recovery.grant())
                          } finally {
                            setBusy(false)
                          }
                        }}
                      >
                        Reopen {recovery.name}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {recovery?.kind === 'gone' ? (
                <div className="notice warn" style={{ marginTop: 12 }}>
                  <Warning size={18} />
                  <div>
                    <b>{recovery.name}</b> was open last time and is not where it was — moved, renamed, or on a drive
                    that is not plugged in. Nothing has been changed. Open it from its new home when you find it.
                  </div>
                </div>
              ) : null}

              {problem ? (
                <div className="notice warn" style={{ marginTop: 12 }} role="alert">
                  <Warning size={18} />
                  <div>{problem}</div>
                </div>
              ) : null}

              <div className="divider" />

              <div className="stack">
                <button className="btn primary" onClick={onDemo}>
                  Look around the demo first
                </button>

                {hosted ? (
                  <>
                    <button className="btn" onClick={onFresh}>
                      Start with an empty list
                    </button>
                    <button className="btn" onClick={() => input.current?.click()}>
                      Import a .plants file
                    </button>
                  </>
                ) : SUPPORTS_FS ? (
                  <>
                    <button className="btn" onClick={onOpen}>
                      Open an existing file
                    </button>
                    <button className="btn" onClick={onFresh}>
                      Start a new file
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn" onClick={() => input.current?.click()}>
                      Open an existing file
                    </button>
                    <button className="btn" onClick={onFresh}>
                      Start a new file
                    </button>
                  </>
                )}

                <input
                  ref={input}
                  type="file"
                  accept=".plants,.json,application/json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) onFile(f)
                    e.target.value = ''
                  }}
                />
              </div>

              {MODE === 'download' ? (
                <p className="tiny muted" style={{ marginTop: 14 }}>
                  This browser cannot write back to a file directly — only Chrome, Edge and other Chromium browsers can.
                  Everything works the same here, except that saving produces a download instead of writing in place,
                  and you press Save yourself rather than it happening as you go.
                </p>
              ) : null}

              {hosted ? (
                <p className="tiny muted" style={{ marginTop: 14 }}>
                  Installed apps get their own storage, which the browser keeps until you clear it. Download a copy
                  every so often anyway — it is one button, and it is the only backup that survives a wiped phone.
                </p>
              ) : null}
            </div>
          </div>

          <p className="tiny muted" style={{ textAlign: 'center', marginTop: 10 }}>
            {DELIVERY === 'hosted' ? 'Installed app' : 'Downloaded file'} · {VERSION}
          </p>
        </div>
      </main>
    </div>
  )
}

// ---- error wording -----------------------------------------------------------

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError'
}

function errorText(e: unknown): string {
  if (e instanceof DOMException && e.name === 'NotAllowedError') {
    return 'The browser would not let the page write to that file. Try opening it again.'
  }
  if (e instanceof Error) return e.message
  return String(e)
}
