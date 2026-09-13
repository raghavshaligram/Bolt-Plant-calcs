import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera as CameraIcon, Warning } from './icons.tsx'

/*
 * One camera, two tools, and one place that handles being told no.
 *
 * Verification item 8 is "camera features degrade gracefully when permission is
 * denied", and the way to make that true everywhere is to have exactly one
 * piece of code that asks. Both the light meter and the pot measurer use this
 * hook; neither of them contains the word getUserMedia.
 *
 * "Gracefully" here means four specific things, because a refused camera has
 * four different causes and only one of them is worth a retry button:
 *
 *   denied       the person said no, or said no once before and the browser
 *                remembers. Retrying does nothing until they change it in the
 *                address bar, so the app says where that setting lives.
 *   none         the device has no camera. There is nothing to grant.
 *   insecure     the page is on http:// or a file:// that the browser does not
 *                treat as secure. This is the one that would otherwise look
 *                like a broken app, and it has a real fix worth naming.
 *   busy/other   another app holds the camera, or something else went wrong.
 *
 * In every case the rest of the app keeps working and the tool offers the
 * manual path instead — which for both of these tools is the path that existed
 * first anyway. The camera is an accelerator, never a gate.
 */

export type CameraState =
  | { status: 'idle' }
  | { status: 'starting' }
  | { status: 'live'; stream: MediaStream }
  | { status: 'failed'; reason: CameraFailure; message: string }

export type CameraFailure = 'denied' | 'none' | 'insecure' | 'busy' | 'unsupported' | 'other'

const MESSAGES: Record<CameraFailure, string> = {
  denied:
    'The browser is not letting this page use the camera. If you meant to allow it, click the camera or padlock icon in the address bar and set the camera to Allow, then try again. Everything else in the app works without it.',
  none: 'No camera was found on this device.',
  insecure:
    'Browsers only give the camera to pages served over https, or opened from localhost. Opening this file directly from disk is not enough for the camera — the rest of the app is fine that way, just not this part.',
  busy: 'Something else on this device is using the camera. Close it and try again.',
  unsupported: 'This browser does not offer the camera to a page at all.',
  other: 'The camera could not be started.',
}

function classify(err: unknown): CameraFailure {
  if (typeof DOMException !== 'undefined' && err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'SecurityError') return 'denied'
    if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') return 'none'
    if (err.name === 'NotReadableError' || err.name === 'AbortError') return 'busy'
  }
  return 'other'
}

export function useCamera() {
  const [state, setState] = useState<CameraState>({ status: 'idle' })
  const streamRef = useRef<MediaStream | null>(null)

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setState({ status: 'idle' })
  }, [])

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      /* A page on file:// or plain http gets no mediaDevices at all in Chromium,
         which is indistinguishable from an old browser unless we check. */
      const reason: CameraFailure = window.isSecureContext === false ? 'insecure' : 'unsupported'
      setState({ status: 'failed', reason, message: MESSAGES[reason] })
      return
    }
    setState({ status: 'starting' })
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      setState({ status: 'live', stream })
    } catch (err) {
      const reason = classify(err)
      setState({ status: 'failed', reason, message: MESSAGES[reason] })
    }
  }, [])

  /* A camera left running is a light on the front of somebody's phone. */
  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), [])

  return { state, start, stop }
}

/** The live preview, or the reason there isn't one. */
export function CameraPane({
  state,
  videoRef,
  onStart,
  startLabel = 'Turn the camera on',
  fallback,
}: {
  state: CameraState
  videoRef: React.RefObject<HTMLVideoElement | null>
  onStart: () => void
  startLabel?: string
  /** What to offer instead. Always shown on failure, never hidden behind a retry. */
  fallback?: React.ReactNode
}) {
  useEffect(() => {
    if (state.status === 'live' && videoRef.current) {
      videoRef.current.srcObject = state.stream
      void videoRef.current.play().catch(() => {
        /* Autoplay refusal is not worth an error; the poster frame is enough. */
      })
    }
  }, [state, videoRef])

  if (state.status === 'failed') {
    return (
      <>
        <div className="notice warn" role="alert">
          <Warning size={18} />
          <div>
            <b>The camera is not available.</b> {state.message}
          </div>
        </div>
        {state.reason === 'denied' || state.reason === 'busy' ? (
          <button className="btn small" style={{ marginTop: 9 }} onClick={onStart}>
            <CameraIcon size={15} /> Try again
          </button>
        ) : null}
        {fallback ? <div style={{ marginTop: 12 }}>{fallback}</div> : null}
      </>
    )
  }

  if (state.status !== 'live') {
    return (
      <>
        <button className="btn primary" onClick={onStart} disabled={state.status === 'starting'}>
          <CameraIcon size={16} />
          {state.status === 'starting' ? 'Asking for the camera…' : startLabel}
        </button>
        {fallback ? <div style={{ marginTop: 12 }}>{fallback}</div> : null}
      </>
    )
  }

  return (
    <div className="camera">
      <video ref={videoRef} playsInline muted />
    </div>
  )
}

/** Grab the current frame as pixels, at a size that is cheap to work with. */
export function grabFrame(video: HTMLVideoElement, maxEdge = 480): { data: ImageData; canvas: HTMLCanvasElement } | null {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return null
  const scale = Math.min(1, maxEdge / Math.max(vw, vh))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(vw * scale))
  canvas.height = Math.max(1, Math.round(vh * scale))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
  return { data: ctx.getImageData(0, 0, canvas.width, canvas.height), canvas }
}
