/*
 * Drawn, not downloaded.
 *
 * Every icon in this app is a handful of SVG paths in this file. No icon font,
 * no sprite sheet, no CDN — the product is one HTML file that works with the
 * wifi off, and an icon set that arrives over the network is the fastest way to
 * break that promise without noticing, because a missing icon looks like
 * nothing rather than like an error.
 *
 * The group glyphs are the other half of the theme. A list of three hundred
 * plants reading as three hundred identical rows of text is the difference
 * between a reference book and a spreadsheet, and a fern silhouette beside a
 * fern is worth more than the twelve lines it costs.
 */
import type { CareType } from '../calc/schedule.ts'
import type { SpeciesGroup } from '../data/ported/species.ts'

interface IconProps {
  size?: number
  className?: string
}

const svg = (size: number, className: string | undefined, children: React.ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
)

export function Droplet({ size = 20, className }: IconProps) {
  return svg(size, className, <path d="M12 3.2c3.4 4 5.4 6.7 5.4 9.3a5.4 5.4 0 1 1-10.8 0c0-2.6 2-5.3 5.4-9.3Z" />)
}

export function Feed({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M12 21V9" />
      <path d="M12 13c0-3 2-5.5 5.5-6.2C17.5 10.4 15.5 13 12 13Z" />
      <path d="M12 17c0-2.4-1.6-4.4-4.4-5 0 2.8 1.6 5 4.4 5Z" />
    </>
  )
}

export function Mist({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M5 9.5h9a3.5 3.5 0 1 0-3.4-4.3" />
      <path d="M4 13.5h12" />
      <path d="M7 17.5h9" />
    </>
  )
}

export function Pot({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M4.5 10h15l-1.6 9.2a1.6 1.6 0 0 1-1.6 1.3H7.7a1.6 1.6 0 0 1-1.6-1.3Z" />
      <path d="M3.5 7h17v3h-17z" />
      <path d="M12 7c0-2.6 1.5-4.2 4.3-4.6C16.3 5 14.8 6.6 12 7Z" />
    </>
  )
}

export function Rotate({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20.2 4v4.2H16" />
    </>
  )
}

export function Prune({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M7.6 16.3 16 4M16.4 16.3 8 4" />
    </>
  )
}

export function Clean({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M4.5 15.5c4-5 8-7.5 15-8.5-1 7-3.5 11-8.5 15" />
      <path d="M4.5 15.5c2.6-.4 4.3.4 5 2.2" />
      <path d="M15 3.5l1 1.6M19.4 5.6l1.6-.8M20.5 10l1.8.3" />
    </>
  )
}

export const CARE_ICON: Record<CareType, (p: IconProps) => React.ReactElement> = {
  water: Droplet,
  feed: Feed,
  mist: Mist,
  prune: Prune,
  clean: Clean,
  repot: Pot,
  rotate: Rotate,
}

export function Sun({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </>
  )
}

export function Paw({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <ellipse cx="7" cy="9.5" rx="1.9" ry="2.4" />
      <ellipse cx="12" cy="7.5" rx="1.9" ry="2.6" />
      <ellipse cx="17" cy="9.5" rx="1.9" ry="2.4" />
      <path d="M12 12.2c3 0 5 2 5 4.3S15 20.5 12 20.5s-5-1.7-5-4c0-2.3 2-4.3 5-4.3Z" />
    </>
  )
}

export function Warning({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M12 4.2 21 19.5H3Z" />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.7" r=".6" fill="currentColor" />
    </>
  )
}

export function Search({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M15.8 15.8 20.5 20.5" />
    </>
  )
}

export function Plus({ size = 20, className }: IconProps) {
  return svg(size, className, <path d="M12 5v14M5 12h14" />)
}

export function Check({ size = 20, className }: IconProps) {
  return svg(size, className, <path d="m5 12.5 4.5 4.5L19 7" />)
}

export function Back({ size = 20, className }: IconProps) {
  return svg(size, className, <path d="M15 5l-7 7 7 7" />)
}

export function Question({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.2 2.4c-.5.2-.8.7-.8 1.2v.6" />
      <circle cx="12" cy="16.4" r=".7" fill="currentColor" stroke="none" />
    </>
  )
}

export function Camera({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M4 7.5h3l1.4-2.2h7.2L17 7.5h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  )
}

export function Cloud({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M7.5 18.5a4 4 0 0 1-.4-8 5.5 5.5 0 0 1 10.6 1.2 3.4 3.4 0 0 1-.7 6.8Z" />
    </>
  )
}

export function Book({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M4 4.5h6.5A2.5 2.5 0 0 1 13 7v13a2 2 0 0 0-2-2H4Z" />
      <path d="M20 4.5h-6.5A2.5 2.5 0 0 0 11 7v13a2 2 0 0 1 2-2h7Z" />
    </>
  )
}

export function Stethoscope({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M6 3v5a4 4 0 0 0 8 0V3" />
      <path d="M6 3H4.5M14 3h1.5" />
      <path d="M10 12v2.5a4.5 4.5 0 0 0 9 0V13" />
      <circle cx="19" cy="11" r="2" />
    </>
  )
}

export function Journal({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M6 3.5h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1.5 1.5 0 0 1-1.5-1.5v-14A1.5 1.5 0 0 1 6 3.5Z" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </>
  )
}

export function Tools({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M14.5 6.5a3.5 3.5 0 0 0 4.6 4.6l-8 8a2.2 2.2 0 0 1-3.1-3.1Z" />
      <path d="M6.5 4.2 9 6.7l-2 2-2.5-2.5a1 1 0 0 1 0-1.4l.6-.6a1 1 0 0 1 1.4 0Z" />
    </>
  )
}

export function Leaf({ size = 20, className }: IconProps) {
  return svg(
    size,
    className,
    <>
      <path d="M5 19c0-7.5 4.5-13 14-13.5C18.5 15 13 19.5 5 19Z" />
      <path d="M5 19c3.5-4.5 6.5-7.5 11-10" />
    </>
  )
}

// ---- group glyphs ------------------------------------------------------------
//
// One silhouette per group in the species table. Filled rather than stroked, so
// they read as plant shapes at 20 px rather than as diagrams.

const glyph = (size: number, className: string | undefined, children: React.ReactNode) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
    {children}
  </svg>
)

const GLYPHS: Record<SpeciesGroup, (s: number, c?: string) => React.ReactElement> = {
  vine: (s, c) =>
    glyph(
      s,
      c,
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M12 2c0 6-6 7-6 12 0 4 3 6 6 6" />
        <path d="M12 6c2.6 0 4-1.3 4-3.4-2.6 0-4 1.3-4 3.4Z" fill="currentColor" stroke="none" />
        <path d="M8.4 11c-2.4-.6-4 .2-4.4 2.2 2.4.6 4-.2 4.4-2.2Z" fill="currentColor" stroke="none" />
        <path d="M7 17.5c2.4-.9 3.5-2.4 3-4.5-2.4.9-3.5 2.4-3 4.5Z" fill="currentColor" stroke="none" />
      </g>
    ),
  foliage: (s, c) =>
    glyph(
      s,
      c,
      <g fill="currentColor">
        <path d="M11.3 21h1.4v-8h-1.4z" />
        <path d="M12 12.5C12 7.5 15 4 20 3.2c.3 5.3-2.7 8.8-8 9.3Z" />
        <path d="M12 15.5C12 11.6 9.5 8.9 5.4 8.3 5.1 12.4 7.7 15.1 12 15.5Z" />
      </g>
    ),
  succulent: (s, c) =>
    glyph(
      s,
      c,
      <g fill="currentColor">
        <path d="M12 4c1.5 2.5 1.5 5 0 7.5-1.5-2.5-1.5-5 0-7.5Z" />
        <path d="M6.5 7.5c2.6.7 4.2 2.4 4.8 5.2-2.7-.5-4.3-2.2-4.8-5.2Z" />
        <path d="M17.5 7.5c-2.6.7-4.2 2.4-4.8 5.2 2.7-.5 4.3-2.2 4.8-5.2Z" />
        <path d="M7 14h10l-1 6.2a1 1 0 0 1-1 .8H9a1 1 0 0 1-1-.8Z" />
      </g>
    ),
  tree: (s, c) =>
    glyph(
      s,
      c,
      <g fill="currentColor">
        <path d="M11.2 21h1.6v-7h-1.6z" />
        <circle cx="12" cy="8.5" r="5.2" />
        <circle cx="7.8" cy="11.5" r="3.2" />
        <circle cx="16.2" cy="11.5" r="3.2" />
      </g>
    ),
  palm: (s, c) =>
    glyph(
      s,
      c,
      <g fill="currentColor">
        <path d="M11.3 21h1.7l-.6-13h-1z" />
        <path d="M12 7.4C9.6 4.6 6.9 4 4 5.8c2.6 2.7 5.3 3.2 8 1.6Z" />
        <path d="M12 7.4c2.4-2.8 5.1-3.4 8-1.6-2.6 2.7-5.3 3.2-8 1.6Z" />
        <path d="M12 7.4C11 4 9 2.2 6 2c.8 3.5 2.8 5.3 6 5.4Z" />
        <path d="M12 7.4C13 4 15 2.2 18 2c-.8 3.5-2.8 5.3-6 5.4Z" />
      </g>
    ),
  fern: (s, c) =>
    glyph(
      s,
      c,
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M12 21V5" />
        <path d="M12 7 8.5 4.6M12 7l3.5-2.4M12 10.5 7.5 8M12 10.5l4.5-2.5M12 14 6.8 11.8M12 14l5.2-2.2M12 17.5 6.5 15.4M12 17.5l5.5-2.1" />
      </g>
    ),
  prayer: (s, c) =>
    glyph(
      s,
      c,
      <g fill="currentColor">
        <path d="M12 21c-4-2-6-5-6-9 0-3.4 2-6.4 6-9 4 2.6 6 5.6 6 9 0 4-2 7-6 9Z" opacity=".35" />
        <path d="M12 3c4 2.6 6 5.6 6 9 0 4-2 7-6 9Z" />
      </g>
    ),
  flowering: (s, c) =>
    glyph(
      s,
      c,
      <g fill="currentColor">
        <path d="M11.3 21h1.4v-8h-1.4z" />
        <path d="M7 15.5c1.8.6 3.2.2 4.3-1.2-1.8-.6-3.2-.2-4.3 1.2Z" />
        <circle cx="12" cy="7.5" r="2.4" />
        <path d="M12 2.4c1.9 0 3 1 3 2.6s-1.1 2.5-3 2.5c-1.9 0-3-1-3-2.5s1.1-2.6 3-2.6Z" />
        <path d="M6.9 6.1c1.1-1.5 2.5-1.9 4.2-1.1.5 1.8 0 3.1-1.7 3.9-1.7.8-3-.1-3.4-1.4a1.9 1.9 0 0 1 .9-1.4Z" />
        <path d="M17.1 6.1c-1.1-1.5-2.5-1.9-4.2-1.1-.5 1.8 0 3.1 1.7 3.9 1.7.8 3-.1 3.4-1.4a1.9 1.9 0 0 0-.9-1.4Z" />
        <path d="M9.2 12.2c-.6-1.8-.1-3.1 1.6-3.8 1.2 1.4 1.3 2.8.1 4.1-.9.9-2 .8-2.6-.1Z" />
        <path d="M14.8 12.2c.6-1.8.1-3.1-1.6-3.8-1.2 1.4-1.3 2.8-.1 4.1.9.9 2 .8 2.6-.1Z" />
      </g>
    ),
  herb: (s, c) =>
    glyph(
      s,
      c,
      <g fill="currentColor">
        <path d="M11.3 21h1.4v-9h-1.4z" />
        <path d="M12 12c-.2-2.6-1.8-4.2-4.7-4.7C7.5 10 9.1 11.6 12 12Z" />
        <path d="M12 12c.2-2.6 1.8-4.2 4.7-4.7C16.5 10 14.9 11.6 12 12Z" />
        <path d="M12 8.2c-.2-2.3-1.5-3.7-4-4.1.2 2.3 1.5 3.7 4 4.1Z" />
        <path d="M12 8.2c.2-2.3 1.5-3.7 4-4.1-.2 2.3-1.5 3.7-4 4.1Z" />
      </g>
    ),
  vegetable: (s, c) =>
    glyph(
      s,
      c,
      <g fill="currentColor">
        <path d="M12 21c-3.9 0-6.5-3-6.5-7S8.1 7.5 12 7.5 18.5 10 18.5 14s-2.6 7-6.5 7Z" />
        <path d="M11.2 7.6V5.2c0-1.4.9-2.3 2.6-2.7.2 1.7-.5 2.8-2 3.3v1.8Z" />
      </g>
    ),
  carnivore: (s, c) =>
    glyph(
      s,
      c,
      <g fill="currentColor">
        <path d="M11.4 21h1.3v-7h-1.3z" />
        <path d="M12 14c-3.2 0-5-1.8-5.4-5.4 1.4.8 2.3 1.7 2.7 2.6.2-1.4.9-2.6 2.7-3.6 1.8 1 2.5 2.2 2.7 3.6.4-.9 1.3-1.8 2.7-2.6C17 12.2 15.2 14 12 14Z" />
      </g>
    ),
  other: (s, c) =>
    glyph(
      s,
      c,
      <g fill="currentColor">
        <path d="M12 3c2.2 3.6 3.3 6.6 3.3 9 0 3.6-1.5 5.6-3.3 9-1.8-3.4-3.3-5.4-3.3-9 0-2.4 1.1-5.4 3.3-9Z" />
        <path d="M6 8c2.2 1.3 3.4 3 3.6 5.2C7.3 12.8 6.1 11.1 6 8Z" />
        <path d="M18 8c-2.2 1.3-3.4 3-3.6 5.2 2.3-.4 3.5-2.1 3.6-5.2Z" />
      </g>
    ),
}

export function GroupGlyph({ group, size = 20, className }: { group: SpeciesGroup } & IconProps) {
  return (GLYPHS[group] ?? GLYPHS.other)(size, className)
}
