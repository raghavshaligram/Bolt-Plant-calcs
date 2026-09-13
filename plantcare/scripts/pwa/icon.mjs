/*
 * The app icons, drawn in pure JavaScript and encoded as PNG by hand.
 *
 * WHY NOT JUST SHIP TWO PNG FILES, OR RASTERISE AN SVG
 *
 * A PNG checked into the repo is a binary nobody regenerates when the brand
 * changes, and it drifts from the mark on the site within a year.
 *
 * Rasterising an SVG was the first attempt and it failed usefully: ImageMagick
 * hands SVG off to `rsvg-convert`, which was not installed, so `convert` exited
 * zero having written nothing — a build that reports success and produces no
 * icons. Fixing that by installing librsvg would have put a native dependency
 * between this project and its own build on every machine it is ever cloned to,
 * including a Windows one.
 *
 * So the icons are rendered here with arithmetic and encoded with node's own
 * zlib. No dependencies, no delegates, identical output everywhere, and the
 * shape lives in the same repository as the app that uses it.
 *
 * THE SHAPE
 *
 * A leaf is the intersection of two equal circles — a lens, pointed at both
 * ends — which is both the correct botanical silhouette and two distance
 * comparisons per pixel. The midrib and veins are line segments with a
 * point-to-segment distance test. Everything is sampled 3×3 per pixel and
 * averaged, which is what stops the edges looking like a screenshot of 1994.
 */
import { deflateSync } from 'node:zlib'

// ---- colour ------------------------------------------------------------------

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)]

export const MOSS = '#385030'
export const LEAF = '#c0e0a4'
/* Lighter than the tile, darker than the leaf: at 48 px a vein the same
   value as the background reads as a cut through the leaf rather than a vein. */
export const VEIN = '#5d7d50'

// ---- geometry ----------------------------------------------------------------

/** Inside the lens formed by two circles of equal radius, in normalised coords. */
function inLeaf(x, y, halfWidth, halfHeight) {
  const r = (halfWidth * halfWidth + halfHeight * halfHeight) / (2 * halfWidth)
  const off = r - halfWidth
  return Math.hypot(x + off, y) <= r && Math.hypot(x - off, y) <= r
}

/** Distance from a point to a line segment. */
function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

/** Inside a rounded rectangle covering [-1,1]², with corner radius in the same units. */
function inRoundedSquare(x, y, radius) {
  const ax = Math.abs(x)
  const ay = Math.abs(y)
  const inner = 1 - radius
  if (ax <= inner || ay <= inner) return ax <= 1 && ay <= 1
  return Math.hypot(ax - inner, ay - inner) <= radius
}

// ---- the drawing ------------------------------------------------------------

/**
 * One icon, as raw RGBA.
 *
 * `safeScale` is what makes the maskable variant a different drawing rather
 * than the same one shrunk. Android crops a maskable icon to whatever shape the
 * launcher uses and anything outside the middle 80% can be cut off, so the
 * maskable version draws the leaf smaller and fills the square to the edge;
 * the normal version rounds its own corners and fills more of the tile.
 */
function render(size, { maskable }) {
  const SS = 3 // samples per axis
  const bg = hex(MOSS)
  const leaf = hex(LEAF)
  const vein = hex(VEIN)
  const out = Buffer.alloc(size * size * 4)

  const leafScale = maskable ? 0.62 : 0.78
  const halfW = 0.42 * leafScale
  const halfH = 1.0 * leafScale
  const ribW = 0.035 * leafScale
  const veinW = 0.028 * leafScale
  const corner = maskable ? 0 : 0.19

  /* Veins as a fraction of the leaf: each starts on the midrib and runs out and
     UP toward the tip, which is the way a real one goes — the first version had
     them sweeping down and the icon read as a fir tree made of arrows. Written
     once and mirrored. */
  const veins = [
    [0, -0.02, 0.30, -0.36],
    [0, 0.3, 0.32, -0.02],
    [0, 0.58, 0.25, 0.3],
  ]

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          // Normalised to [-1, 1], y downward.
          const x = ((px + (sx + 0.5) / SS) / size) * 2 - 1
          const y = ((py + (sy + 0.5) / SS) / size) * 2 - 1

          const onTile = corner > 0 ? inRoundedSquare(x, y, corner) : true
          if (!onTile) continue

          let c = bg
          // Shift the leaf up slightly: the stem below it balances the mass.
          const ly = y + 0.07 * leafScale

          if (inLeaf(x, ly, halfW, halfH)) {
            c = leaf

            /* The midrib runs the full height of the leaf; the veins branch off
               it. Both are drawn darker so the shape reads at 48 px, where a
               flat silhouette turns into a green blob. */
            if (distToSegment(x, ly, 0, -halfH, 0, halfH) <= ribW) {
              c = vein
            } else {
              for (const [vx1, vy1, vx2, vy2] of veins) {
                const d1 = distToSegment(x, ly, vx1 * halfW, vy1 * halfH, vx2 * halfW, vy2 * halfH)
                const d2 = distToSegment(x, ly, -vx1 * halfW, vy1 * halfH, -vx2 * halfW, vy2 * halfH)
                if (Math.min(d1, d2) <= veinW) {
                  c = vein
                  break
                }
              }
            }
          } else if (distToSegment(x, ly, 0, halfH * 0.9, 0, halfH * 1.16) <= ribW * 1.15) {
            // The stem.
            c = leaf
          }

          r += c[0]
          g += c[1]
          b += c[2]
          a += 255
        }
      }

      const n = SS * SS
      const i = (py * size + px) * 4
      /* Premultiply against the average coverage so the anti-aliased edge of a
         rounded corner fades to transparent rather than to black. */
      const cover = a / (n * 255)
      out[i] = cover > 0 ? Math.round(r / (n * cover)) : 0
      out[i + 1] = cover > 0 ? Math.round(g / (n * cover)) : 0
      out[i + 2] = cover > 0 ? Math.round(b / (n * cover)) : 0
      out[i + 3] = Math.round(a / n)
    }
  }

  return out
}

// ---- PNG ---------------------------------------------------------------------

const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePNG(rgba, size) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  /* Filter type 0 on every scanline. The images are flat colour over most of
     their area, so deflate does the work and a smarter filter would save a few
     hundred bytes on a file that is already small. */
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** A PNG icon of the given size. `maskable` draws the Android-safe variant. */
export function iconPNG(size, { maskable = false } = {}) {
  return encodePNG(render(size, { maskable }), size)
}
