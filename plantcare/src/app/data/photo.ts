/*
 * Photos, shrunk before they go anywhere near the file.
 *
 * The file is the product. A buyer with thirty plants and four years of monthly
 * progress photos has a thousand images, and at three megabytes each that is a
 * three-gigabyte JSON file that no browser will parse and no text editor will
 * open — the two things the format promises. So every photo is resized and
 * re-encoded here before it is stored, and the ceiling is deliberately low.
 *
 * A journal photo is evidence, not a print. 900 px on the long edge is enough
 * to see a leaf spot spreading over six weeks, which is the actual job.
 *
 * They are stored as data URLs inside the file rather than as paths to images
 * on disk. A path breaks the moment the owner moves a folder, and it breaks
 * silently, months later, with no way to recover what the picture was. Self-
 * contained costs bytes and cannot rot.
 */

export const MAX_EDGE_PX = 900
export const AVATAR_EDGE_PX = 320
export const JPEG_QUALITY = 0.72

/** Refuse anything implausible before decoding it. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024

export class PhotoError extends Error {}

/**
 * A File from an <input type="file"> to a small JPEG data URL.
 *
 * The input carries `capture` on the plant screens, so on a phone this is the
 * camera and on a desktop it is the file picker — the same code path either
 * way, which is why there is no camera handling anywhere in this file.
 */
export async function toStoredPhoto(file: File, maxEdge = MAX_EDGE_PX): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new PhotoError(`That is a ${file.type || 'file of unknown type'}, not an image.`)
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new PhotoError(
      `That image is ${(file.size / 1024 / 1024).toFixed(0)} MB, which is larger than this will handle. ` +
        'Most phones can export a smaller copy.'
    )
  }

  const bitmap = await decode(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new PhotoError('This browser would not give the app a canvas to resize the image on.')
  ctx.drawImage(bitmap, 0, 0, w, h)
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()

  /* JPEG, not PNG: a photograph as PNG is four to eight times the size for no
     visible gain, and this goes inside a document somebody has to be able to
     open. */
  const url = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  if (!url.startsWith('data:image/jpeg')) {
    throw new PhotoError('This browser could not re-encode the image.')
  }
  return url
}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      // Honours the EXIF orientation flag, which is why a photo taken sideways
      // on a phone comes out the right way up here and not through <img>.
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* fall through to the element path */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new PhotoError('That file could not be read as an image.'))
      img.src = url
    })
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

/** Roughly how much a stored photo adds to the file, for showing to a person. */
export function photoBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',')
  if (comma === -1) return 0
  return Math.round((dataUrl.length - comma - 1) * 0.75)
}
