import { useRef, useState } from 'react'
import { AVATAR_EDGE_PX, photoBytes, toStoredPhoto } from '../data/photo.ts'
import { Camera, Warning } from './icons.tsx'

/**
 * Take or choose a photo, resize it, hand back a data URL.
 *
 * `capture="environment"` makes this the rear camera on a phone and does
 * nothing at all on a desktop, where the same control opens the file picker.
 * That is the whole of the camera handling in this app: no getUserMedia, no
 * permission dance, no live preview, and nothing to degrade gracefully because
 * there is nothing to deny. The browser's own picker already handles the case
 * where a person says no.
 */
export function PhotoInput({
  value,
  onChange,
  label = 'Add a photo',
  maxEdge,
  round = false,
}: {
  value?: string
  onChange: (dataUrl: string | undefined) => void
  label?: string
  maxEdge?: number
  round?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const take = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      onChange(await toStoredPhoto(file, maxEdge))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        {value ? (
          <img
            src={value}
            alt=""
            style={{
              width: round ? 56 : 78,
              height: round ? 56 : 78,
              objectFit: 'cover',
              borderRadius: round ? 14 : 10,
              border: '1px solid var(--bark-200)',
              flex: 'none',
            }}
          />
        ) : null}
        <div>
          <button className="btn small" onClick={() => input.current?.click()} disabled={busy}>
            <Camera size={15} />
            {busy ? 'Resizing…' : value ? 'Replace' : label}
          </button>
          {value ? (
            <button className="btn ghost small" onClick={() => onChange(undefined)} style={{ marginLeft: 6 }}>
              Remove
            </button>
          ) : null}
          <div className="tiny muted" style={{ marginTop: 5 }}>
            {value
              ? `About ${Math.round(photoBytes(value) / 1024)} KB inside your file.`
              : 'Stored inside your plant file, shrunk first, never uploaded anywhere.'}
          </div>
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void take(f)
          e.target.value = ''
        }}
      />

      {error ? (
        <div className="notice warn" style={{ marginTop: 8 }} role="alert">
          <Warning size={17} />
          <div>{error}</div>
        </div>
      ) : null}
    </div>
  )
}

export const AVATAR_MAX = AVATAR_EDGE_PX
