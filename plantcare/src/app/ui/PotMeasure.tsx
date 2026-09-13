import { useRef, useState } from 'react'
import {
  formatInches,
  MeasureError,
  nearestStandard,
  potInches,
  REFERENCES,
  toleranceInches,
  type Segment,
} from '../calc/potmeasure.ts'
import { STANDARD_SIZES } from '../data/ported/potsize.ts'
import { updatePlant } from '../data/actions.ts'
import type { Store } from '../data/schema.ts'
import { CameraPane, useCamera } from './Camera.tsx'
import { Camera, Check, Pot, Warning } from './icons.tsx'

/**
 * Measure a pot by marking two spans on a photo of it.
 *
 * The arithmetic and its limits are in calc/potmeasure.ts. What this screen is
 * responsible for is making the marking easy enough that somebody does it: the
 * two lines start in sensible places, both ends of each are draggable with a
 * finger, and the answer updates as they move rather than behind a button.
 *
 * Nothing here is automatic. No edge detection, no "we found your pot" — a
 * detector that is right most of the time produces a number that is wrong some
 * of the time with no way to tell which, and the person's own two fingers are
 * both more accurate and more trustworthy than that.
 */
export function PotMeasure({ store, update }: { store: Store; update: (fn: (s: Store) => Store) => void }) {
  const { state, start, stop } = useCamera()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [shot, setShot] = useState<string | null>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  const [refId, setRefId] = useState(REFERENCES[0].id)
  const [ref, setRef] = useState<Segment | null>(null)
  const [pot, setPot] = useState<Segment | null>(null)
  const [assign, setAssign] = useState<string>('')
  const [saved, setSaved] = useState(false)

  const reference = REFERENCES.find((r) => r.id === refId) ?? REFERENCES[0]

  const capture = () => {
    const video = videoRef.current
    if (!video?.videoWidth) return
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 900 / Math.max(video.videoWidth, video.videoHeight))
    canvas.width = Math.round(video.videoWidth * scale)
    canvas.height = Math.round(video.videoHeight * scale)
    canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height)
    setShot(canvas.toDataURL('image/jpeg', 0.8))
    setSize({ w: canvas.width, h: canvas.height })
    /* Start the two marks apart and obviously draggable, rather than at zero
       length in a corner where nobody finds them. */
    setRef({ x1: canvas.width * 0.2, y1: canvas.height * 0.78, x2: canvas.width * 0.45, y2: canvas.height * 0.78 })
    setPot({ x1: canvas.width * 0.22, y1: canvas.height * 0.42, x2: canvas.width * 0.78, y2: canvas.height * 0.42 })
    setSaved(false)
    stop()
  }

  const useFile = (file: File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 900 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      setShot(canvas.toDataURL('image/jpeg', 0.8))
      setSize({ w: canvas.width, h: canvas.height })
      setRef({ x1: canvas.width * 0.2, y1: canvas.height * 0.78, x2: canvas.width * 0.45, y2: canvas.height * 0.78 })
      setPot({ x1: canvas.width * 0.22, y1: canvas.height * 0.42, x2: canvas.width * 0.78, y2: canvas.height * 0.42 })
      setSaved(false)
      URL.revokeObjectURL(url)
    }
    img.src = url
  }

  let inches: number | null = null
  let problem: string | null = null
  if (ref && pot) {
    try {
      inches = potInches(ref, pot, reference.mm)
    } catch (e) {
      problem = e instanceof MeasureError ? e.message : String(e)
    }
  }
  const tolerance = ref && pot ? toleranceInches(ref, pot, reference.mm) : NaN
  const match = inches !== null ? nearestStandard(inches, STANDARD_SIZES) : null
  const plant = assign ? store.plants.find((p) => p.id === assign) : undefined

  return (
    <>
      <div className="card">
        <div className="body">
          <h2 style={{ marginBottom: 6 }}>How big is this pot?</h2>
          <p className="small muted">
            Put something of known size against the pot — a bank card works, and is the same size everywhere in the
            world — then photograph the two together and mark them.
          </p>

          {!shot ? (
            <>
              <div style={{ marginTop: 12 }}>
                <CameraPane
                  state={state}
                  videoRef={videoRef}
                  onStart={start}
                  startLabel="Use the camera"
                  fallback={<FilePick onFile={useFile} />}
                />
              </div>
              {state.status === 'live' ? (
                <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                  <button className="btn primary" onClick={capture}>
                    <Camera size={16} /> Take the photo
                  </button>
                  <button className="btn ghost small" onClick={stop}>
                    Turn the camera off
                  </button>
                </div>
              ) : null}
              <div className="notice info" style={{ marginTop: 12 }}>
                <Pot size={18} />
                <div>
                  Two things decide whether this works. The card has to be <b>the same distance from the lens as the
                  pot rim</b> — leaning against the pot, not flat on the table in front of it. And keep both roughly in
                  the middle of the frame: phone lenses stretch whatever is near the edges.
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginTop: 10 }}>
                <label className="field" htmlFor="pm-ref">
                  What did you put in the picture?
                </label>
                <select id="pm-ref" value={refId} onChange={(e) => setRefId(e.target.value)}>
                  {REFERENCES.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label} — {r.mm} mm
                    </option>
                  ))}
                </select>
                <div className="tiny muted" style={{ marginTop: 4 }}>
                  {reference.source}
                </div>
              </div>

              {size && ref && pot ? (
                <Marker
                  shot={shot}
                  size={size}
                  ref1={ref}
                  pot={pot}
                  onRef={(s) => {
                    setRef(s)
                    setSaved(false)
                  }}
                  onPot={(s) => {
                    setPot(s)
                    setSaved(false)
                  }}
                />
              ) : null}

              <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
                <button
                  className="btn ghost small"
                  onClick={() => {
                    setShot(null)
                    setRef(null)
                    setPot(null)
                    setSaved(false)
                  }}
                >
                  Take a different photo
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {shot ? (
        <div className="card">
          <div className="body">
            {problem ? (
              <div className="notice warn" role="alert">
                <Warning size={18} />
                <div>{problem}</div>
              </div>
            ) : inches !== null ? (
              <>
                <div className="row" style={{ alignItems: 'flex-start', gap: 12 }}>
                  <div className="avatar" style={{ width: 44, height: 44, flex: 'none' }}>
                    <Pot size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3>{formatInches(inches)}</h3>
                    <div className="small muted" style={{ marginTop: 3 }}>
                      {Number.isFinite(tolerance) ? (
                        <>
                          Give or take about {tolerance.toFixed(1)} in from how precisely the two marks are placed.
                          {tolerance > inches * 0.06 ? ' Drag the reference mark longer, or take the photo closer, to tighten that.' : ''}
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                {match ? (
                  <div className="notice info" style={{ marginTop: 12 }}>
                    <Pot size={18} />
                    <div>
                      Closest standard size: <b>{match.label}</b> — {match.diameterIn} in across, holds about{' '}
                      {match.volGal} gallons.
                      {Math.abs(match.off) > 1 ? (
                        <div style={{ marginTop: 4 }}>
                          That is {Math.abs(match.off).toFixed(1)} in {match.off > 0 ? 'smaller' : 'larger'} than what
                          you measured, so it may well be a size that is not in the nursery table.
                        </div>
                      ) : null}
                      <div className="tiny muted" style={{ marginTop: 5 }}>
                        From the same gallon-to-inches table as the Pot sizes tab and the calculator on the site.
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="divider" />

                <div className="grid2">
                  <div>
                    <label className="field" htmlFor="pm-assign">
                      Record this against a plant
                    </label>
                    <select
                      id="pm-assign"
                      value={assign}
                      onChange={(e) => {
                        setAssign(e.target.value)
                        setSaved(false)
                      }}
                    >
                      <option value="">—</option>
                      {store.plants
                        .filter((p) => !p.archived)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — currently {p.placement.potDiameterIn} in
                          </option>
                        ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    {plant ? (
                      <button
                        className="btn"
                        disabled={saved}
                        onClick={() => {
                          const use = match ? match.diameterIn : Number(inches!.toFixed(1))
                          update((s) =>
                            updatePlant(s, plant.id, (p) => ({
                              ...p,
                              placement: { ...p.placement, potDiameterIn: use },
                            }))
                          )
                          setSaved(true)
                        }}
                      >
                        {saved ? (
                          <>
                            <Check size={15} /> Saved to {plant.name}
                          </>
                        ) : (
                          `Set ${plant.name} to ${match ? match.diameterIn : inches.toFixed(1)} in`
                        )}
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="tiny muted" style={{ marginTop: 8 }}>
                  Pot size is worth about a factor of two in the watering schedule, which is why it is worth measuring
                  rather than guessing. Changing it here changes every interval for that plant.
                </p>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}

function FilePick({ onFile }: { onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div>
      <button className="btn" onClick={() => input.current?.click()}>
        <Camera size={15} /> Use a photo instead
      </button>
      <div className="tiny muted" style={{ marginTop: 5 }}>
        Any photo with the pot and something of known size in it works just as well as the live camera.
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

/**
 * The two draggable spans.
 *
 * Pointer events rather than mouse or touch, so a finger, a stylus and a mouse
 * all take the same path. The handles are 11px in image space but carry a much
 * larger transparent hit area, because the drawn size of a handle and the size
 * of the thing you can grab are different problems and a fingertip is 9 mm.
 */
function Marker({
  shot,
  size,
  ref1,
  pot,
  onRef,
  onPot,
}: {
  shot: string
  size: { w: number; h: number }
  ref1: Segment
  pot: Segment
  onRef: (s: Segment) => void
  onPot: (s: Segment) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [drag, setDrag] = useState<{ which: 'ref' | 'pot'; end: 1 | 2 } | null>(null)

  const at = (e: React.PointerEvent) => {
    const svg = svgRef.current
    if (!svg) return null
    const r = svg.getBoundingClientRect()
    return {
      x: ((e.clientX - r.left) / r.width) * size.w,
      y: ((e.clientY - r.top) / r.height) * size.h,
    }
  }

  const move = (e: React.PointerEvent) => {
    if (!drag) return
    const p = at(e)
    if (!p) return
    const seg = drag.which === 'ref' ? ref1 : pot
    const next: Segment = drag.end === 1 ? { ...seg, x1: p.x, y1: p.y } : { ...seg, x2: p.x, y2: p.y }
    ;(drag.which === 'ref' ? onRef : onPot)(next)
  }

  const handle = (which: 'ref' | 'pot', end: 1 | 2, x: number, y: number, colour: string) => (
    <g
      onPointerDown={(e) => {
        ;(e.target as Element).setPointerCapture?.(e.pointerId)
        setDrag({ which, end })
      }}
      style={{ cursor: 'grab' }}
    >
      <circle cx={x} cy={y} r={26} fill="transparent" />
      <circle cx={x} cy={y} r={11} fill={colour} stroke="#fff" strokeWidth={3} />
    </g>
  )

  const line = (s: Segment, colour: string) => (
    <>
      <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke="#fff" strokeWidth={7} strokeLinecap="round" opacity={0.65} />
      <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={colour} strokeWidth={3.5} strokeLinecap="round" />
    </>
  )

  return (
    <div style={{ marginTop: 12 }}>
      <div className="measure-legend">
        <span>
          <i style={{ background: 'var(--clay-400)' }} /> across the reference object
        </span>
        <span>
          <i style={{ background: 'var(--moss-500)' }} /> across the widest part of the pot
        </span>
      </div>
      <div className="measure-frame">
        <img src={shot} alt="" />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${size.w} ${size.h}`}
          onPointerMove={move}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        >
          {line(ref1, 'var(--clay-400)')}
          {line(pot, 'var(--moss-500)')}
          {handle('ref', 1, ref1.x1, ref1.y1, 'var(--clay-400)')}
          {handle('ref', 2, ref1.x2, ref1.y2, 'var(--clay-400)')}
          {handle('pot', 1, pot.x1, pot.y1, 'var(--moss-500)')}
          {handle('pot', 2, pot.x2, pot.y2, 'var(--moss-500)')}
        </svg>
      </div>
      <div className="tiny muted" style={{ marginTop: 6 }}>
        Drag the four dots. Measure the pot across its widest part — from above, a round rim is an ellipse and its long
        axis is the true diameter.
      </div>
    </div>
  )
}
