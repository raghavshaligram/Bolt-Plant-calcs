import { useRef, useState } from 'react'
import {
  categoryForLux,
  categoryForRelative,
  LIGHT_LABEL,
  LIGHT_ORDER,
  luxFromExposure,
  meanLuminance,
  verdictFor,
  type LightReading,
} from '../calc/light.ts'
import { SPECIES, speciesById, type LightNeed } from '../data/ported/species.ts'
import { updatePlant } from '../data/actions.ts'
import type { Store } from '../data/schema.ts'
import { CameraPane, grabFrame, useCamera } from './Camera.tsx'
import { Check, GroupGlyph, Sun, Warning } from './icons.tsx'

/**
 * "Will this plant do well in this spot?"
 *
 * The measurement is in calc/light.ts and the honesty about it is in the header
 * of that file. What this screen adds is the part that makes the number useful:
 * every reading is immediately turned into an answer about a specific plant,
 * because "1,400 lux" means nothing to anybody and "a little darker than a
 * calathea would like, so water it less" means something.
 *
 * It works with no camera at all. The four categories are buttons, and picking
 * one gives exactly the same answers — the camera saves you a judgement call,
 * it is not the feature.
 */
export function LightMeter({ store, update }: { store: Store; update: (fn: (s: Store) => Store) => void }) {
  const { state, start, stop } = useCamera()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [reading, setReading] = useState<LightReading | null>(null)
  const [busy, setBusy] = useState(false)
  const [subject, setSubject] = useState<string>(store.plants.find((p) => !p.archived)?.id ?? '')
  const [browse, setBrowse] = useState('')
  const [saved, setSaved] = useState(false)

  const take = async () => {
    const video = videoRef.current
    if (!video) return
    setBusy(true)
    setSaved(false)
    try {
      setReading(await measure(video, state.status === 'live' ? state.stream : null))
    } finally {
      setBusy(false)
    }
  }

  const manual = (category: LightNeed) => {
    setSaved(false)
    setReading({
      method: 'manual',
      category,
      borderline: false,
      detail: 'Your own judgement of the spot — nothing was measured.',
    })
  }

  const plant = subject ? store.plants.find((p) => p.id === subject) : undefined
  const chosen = plant ? speciesById(plant.speciesId) : browse ? speciesById(browse) : undefined
  const verdict = reading && chosen ? verdictFor(chosen, reading.category) : null

  return (
    <>
      <div className="card">
        <div className="body">
          <h2 style={{ marginBottom: 6 }}>How much light is this spot getting?</h2>
          <p className="small muted">
            Hold the phone where the plant would sit, facing the way the plant would face, and take a reading.
          </p>

          <div style={{ marginTop: 12 }}>
            <CameraPane
              state={state}
              videoRef={videoRef}
              onStart={start}
              startLabel="Use the camera"
              fallback={<ManualPicker onPick={manual} />}
            />
          </div>

          {state.status === 'live' ? (
            <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
              <button className="btn primary" onClick={() => void take()} disabled={busy}>
                <Sun size={16} /> {busy ? 'Reading…' : 'Take a reading'}
              </button>
              <button className="btn ghost small" onClick={stop}>
                Turn the camera off
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {reading ? (
        <>
          <div className="card">
            <div className="body">
              <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                <div className="avatar" style={{ width: 44, height: 44, flex: 'none' }}>
                  <Sun size={22} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3>
                    {LIGHT_LABEL[reading.category]}
                    {reading.borderline ? <span className="muted"> — borderline</span> : null}
                  </h3>
                  <div className="small muted" style={{ marginTop: 3 }}>
                    {reading.detail}
                  </div>
                </div>
              </div>

              {/*
                The caveat is on the same card as the number, not in a footnote.
                A phone camera is not a lux meter, the brief says to say so, and
                saying so once beside the reading is worth more than saying it
                three times somewhere else.
              */}
              <div className={`notice ${reading.method === 'manual' ? 'info' : 'warn'}`} style={{ marginTop: 12 }}>
                {reading.method === 'manual' ? <Sun size={18} /> : <Warning size={18} />}
                <div>
                  {reading.method === 'manual' ? (
                    <>
                      <b>You picked this one.</b> That is a perfectly good way to do it — the four categories are what
                      the advice is written against anyway, and a person standing in the room usually knows. The camera
                      is here for when you genuinely cannot tell a dim corner from a medium one.
                    </>
                  ) : reading.method === 'exposure' ? (
                    <>
                      <b>Treat this as a rough figure, not a measurement.</b> It is worked out from the exposure your
                      camera chose, which is how a light meter does it — but a phone lens, a dirty window and the angle
                      you are holding it at all move the answer. It is good enough to tell a dim corner from a bright
                      one, which is the question. It is not good enough to argue over 200 lux.
                    </>
                  ) : (
                    <>
                      <b>This browser will not tell the app what the camera's exposure was</b>, so this is a relative
                      brightness rather than a real light level. Compare two spots by taking a reading in each, one after
                      the other, without closing the camera — those two numbers mean something next to each other. The
                      category is a best guess.
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="section-title">
            <h3>What would be happy here?</h3>
          </div>

          <div className="card">
            <div className="body">
              <div className="grid2">
                <div>
                  <label className="field" htmlFor="lm-plant">
                    One of your plants
                  </label>
                  <select
                    id="lm-plant"
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value)
                      setBrowse('')
                      setSaved(false)
                    }}
                  >
                    <option value="">—</option>
                    {store.plants
                      .filter((p) => !p.archived)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="field" htmlFor="lm-species">
                    Or anything from the book
                  </label>
                  <select
                    id="lm-species"
                    value={browse}
                    onChange={(e) => {
                      setBrowse(e.target.value)
                      setSubject('')
                      setSaved(false)
                    }}
                  >
                    <option value="">—</option>
                    {SPECIES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.common}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {verdict && chosen ? (
                <div className={`notice ${verdict.fit === 'good' ? 'info' : 'warn'}`} style={{ marginTop: 12 }}>
                  <GroupGlyph group={chosen.group} size={18} />
                  <div>
                    <b>{verdict.headline}</b>
                    <div style={{ marginTop: 4 }}>{verdict.detail}</div>
                    <div className="tiny muted" style={{ marginTop: 5 }}>
                      {chosen.common} wants {LIGHT_LABEL[chosen.light].toLowerCase()}; this spot reads as{' '}
                      {LIGHT_LABEL[reading.category].toLowerCase()}.
                    </div>
                  </div>
                </div>
              ) : null}

              {/*
                Recording the reading against the plant is the point at which
                this stops being a gadget: the watering schedule already takes
                the spot's light into account, and until now the only way to set
                it was a dropdown of adjectives.
              */}
              {plant && reading ? (
                <div className="row" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                  <button
                    className="btn"
                    disabled={saved || plant.placement.light === reading.category}
                    onClick={() => {
                      update((s) =>
                        updatePlant(s, plant.id, (p) => ({
                          ...p,
                          placement: { ...p.placement, light: reading.category },
                        }))
                      )
                      setSaved(true)
                    }}
                  >
                    {saved ? (
                      <>
                        <Check size={15} /> Saved to {plant.name}
                      </>
                    ) : plant.placement.light === reading.category ? (
                      `${plant.name} is already recorded as this`
                    ) : (
                      `Record this as ${plant.name}'s light`
                    )}
                  </button>
                  <span className="tiny muted">Its watering interval will change to match.</span>
                </div>
              ) : null}
            </div>
          </div>

          {chosen ? null : (
            <div className="card">
              <div className="body">
                <h3 style={{ marginBottom: 8 }}>Plants that suit {LIGHT_LABEL[reading.category].toLowerCase()}</h3>
                <div className="small muted" style={{ marginBottom: 8 }}>
                  From the 303 in the book.
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {SPECIES.filter((s) => s.light === reading.category)
                    .slice(0, 14)
                    .map((s) => (
                      <span className="pill" key={s.id}>
                        <GroupGlyph group={s.group} size={13} />
                        {s.common}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}
    </>
  )
}

function ManualPicker({ onPick }: { onPick: (c: LightNeed) => void }) {
  return (
    <div>
      <div className="small muted" style={{ marginBottom: 7 }}>
        Or just say which of these the spot looks like — the answers below are identical either way.
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {LIGHT_ORDER.map((c) => (
          <button key={c} className="btn small" onClick={() => onPick(c)}>
            {LIGHT_LABEL[c]}
          </button>
        ))}
      </div>
    </div>
  )
}

// ---- the measurement itself --------------------------------------------------

interface PhotoSettingsish {
  exposureTime?: number
  iso?: number
  fNumber?: number
}

/**
 * Ask the camera what exposure it chose; fall back to counting pixels.
 *
 * `ImageCapture.getPhotoSettings()` is Chromium-only and reports exposureTime in
 * 100-microsecond units, which is the kind of detail that produces a reading
 * four orders of magnitude wrong if you assume milliseconds. Everything is
 * sanity-checked against a plausible range before it is believed — a phone that
 * reports a 40-second shutter in daylight is reporting something else.
 */
async function measure(video: HTMLVideoElement, stream: MediaStream | null): Promise<LightReading> {
  const track = stream?.getVideoTracks()[0]

  if (track && 'ImageCapture' in window) {
    try {
      const Capture = (window as unknown as { ImageCapture: new (t: MediaStreamTrack) => { getPhotoSettings: () => Promise<PhotoSettingsish> } }).ImageCapture
      const settings = await new Capture(track).getPhotoSettings()
      const shutterSeconds = settings.exposureTime ? settings.exposureTime / 10000 : NaN
      const iso = settings.iso ?? NaN
      if (shutterSeconds > 0 && shutterSeconds < 4 && iso >= 20 && iso <= 25600) {
        const lux = luxFromExposure({ shutterSeconds, iso, aperture: settings.fNumber })
        if (Number.isFinite(lux) && lux > 0 && lux < 200000) {
          const { category, borderline } = categoryForLux(lux)
          return {
            method: 'exposure',
            lux,
            category,
            borderline,
            detail:
              `About ${formatLux(lux)} — from a ${formatShutter(shutterSeconds)} exposure at ISO ${Math.round(iso)}` +
              (settings.fNumber ? ` and f/${settings.fNumber}` : ', assuming a typical phone lens'),
          }
        }
      }
    } catch {
      /* Not supported, or the device refused. The fallback is the point. */
    }
  }

  const frame = grabFrame(video)
  const value = frame ? meanLuminance(frame.data.data) : 0
  const { category, borderline } = categoryForRelative(value)
  return {
    method: 'relative',
    relative: value,
    category,
    borderline,
    detail: `Relative brightness ${value.toFixed(0)} out of 100, measured from the picture itself.`,
  }
}

function formatLux(lux: number): string {
  if (lux >= 10000) return `${Math.round(lux / 1000)},000 lux`
  if (lux >= 1000) return `${(lux / 1000).toFixed(1)}k lux`
  return `${Math.round(lux / 10) * 10} lux`
}

function formatShutter(seconds: number): string {
  if (seconds >= 1) return `${seconds.toFixed(1)}s`
  return `1/${Math.round(1 / seconds)}s`
}
