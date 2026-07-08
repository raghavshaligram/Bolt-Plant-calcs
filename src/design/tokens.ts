/**
 * Design system tokens — locked palette and typography for Plant Calculators.
 *
 * All hex values pulled directly from tailwind.config.js. Import these when
 * you need values in TypeScript/TSX; in Astro/HTML use the Tailwind class names
 * (e.g. `bg-moss-700`, `text-bark-900`).
 */

// ---------------------------------------------------------------------------
// COLOR TOKENS
// ---------------------------------------------------------------------------

/** Primary brand color — earthy green. Use for primary actions, links, accents. */
export const moss = {
  50:  '#f3f6f1',
  100: '#e3ebe0',
  200: '#c7d6c1',
  300: '#a3ba9a',
  400: '#7d9a70',
  500: '#5d7d50',
  600: '#46643c',
  700: '#385030', // Primary CTA, card headers, active states
  800: '#2e4029', // Hover state for moss-700
  900: '#263623',
  950: '#131e11',
} as const;

/** Warm tertiary — terracotta/clay tones. Use for warnings and earthy accents. */
export const clay = {
  50:  '#faf6f0',
  100: '#f2e8d8',
  200: '#e4cda9',
  300: '#d3ab78',
  400: '#c2894f',
  500: '#b0723d',
  600: '#965a31',
  700: '#7a4529',
  800: '#633a28',
  900: '#533225',
  950: '#2d1813',
} as const;

/** Page backgrounds and subtle fills — warm cream. */
export const sand = {
  50:  '#faf8f3', // Body background
  100: '#f3eee0', // Subtle section fills, toggle backgrounds
  200: '#e6dabd',
  300: '#d4bf95',
  400: '#c2a36e',
  500: '#b48d54',
  600: '#a07849',
  700: '#825f3d',
  800: '#6c4f36',
  900: '#5a4230',
  950: '#332419',
} as const;

/** Body text, borders, muted labels — neutral warm brown. */
export const bark = {
  50:  '#f6f4f1',
  100: '#e7e1d9',
  200: '#cfc4b6',
  300: '#b0a08c',
  400: '#94816a', // Muted / placeholder text
  500: '#7d6a55', // Secondary body text
  600: '#655545', // Body text (lighter contexts)
  700: '#53453a', // Body text (standard)
  800: '#463a32', // Strong body / label text
  900: '#3d322c', // Primary body text, headings
  950: '#221a16',
} as const;

/** Bright green — success states, "live" badges, leaf icons. */
export const leaf = {
  50:  '#f1f8ec',
  100: '#dff0d0',
  200: '#c0e0a4',
  300: '#97ca6f',
  400: '#72ad46',
  500: '#56902d',
  600: '#3f7221',
  700: '#325a1e',
  800: '#2a481d',
  900: '#243d1c',
  950: '#11210a',
} as const;

// ---------------------------------------------------------------------------
// TYPOGRAPHY TOKENS
// ---------------------------------------------------------------------------

export const fonts = {
  /** Body and UI text — Inter (system fallback: system-ui, sans-serif) */
  sans: 'Inter, system-ui, sans-serif',
  /** Display / headings — Fraunces optical serif (system fallback: Georgia, serif) */
  display: 'Fraunces, Georgia, serif',
} as const;

/**
 * Heading scale (Tailwind class references).
 * H1: text-3xl sm:text-4xl  — font-display, font-semibold, tracking-tight, text-bark-900
 * H2: text-2xl              — font-display, font-semibold, text-bark-900
 * H3: text-lg               — font-display, font-semibold, text-bark-900
 * Body: text-base sm:text-lg — font-sans, leading-relaxed, text-bark-600
 * Small/label: text-sm      — font-sans, text-bark-500
 * Caption: text-xs          — font-sans, text-bark-400
 */
export const typeScale = {
  h1: 'font-display text-3xl font-semibold tracking-tight text-bark-900 sm:text-4xl',
  h2: 'font-display text-2xl font-semibold text-bark-900',
  h3: 'font-display text-lg font-semibold text-bark-900',
  body: 'font-sans text-base leading-relaxed text-bark-600 sm:text-lg',
  label: 'font-sans text-sm font-medium text-bark-800',
  small: 'font-sans text-sm text-bark-500',
  caption: 'font-sans text-xs text-bark-400',
} as const;

// ---------------------------------------------------------------------------
// SPACING — 8 px base unit
// ---------------------------------------------------------------------------
// Use Tailwind's spacing scale: 1 unit = 4px, so 2 = 8px, 4 = 16px, 6 = 24px …
// Gutters: gap-4 (16px) · gap-6 (24px) · gap-8 (32px) · gap-12 (48px)
// Section padding: py-6 sm:py-8 (page columns) · py-14 (footer)

// ---------------------------------------------------------------------------
// SHADOW TOKENS
// ---------------------------------------------------------------------------
export const shadows = {
  card: '0 1px 2px rgba(38,54,35,0.04), 0 4px 16px rgba(38,54,35,0.06)',
  cardHover: '0 2px 4px rgba(38,54,35,0.06), 0 12px 32px rgba(38,54,35,0.10)',
} as const;

// ---------------------------------------------------------------------------
// COMPONENT CLASS RECIPES (Tailwind strings — copy-paste into className)
// ---------------------------------------------------------------------------
export const recipes = {
  /** White card with subtle moss ring and shadow */
  card: 'rounded-2xl bg-white p-6 shadow-card ring-1 ring-moss-100/60',
  /** Primary CTA button — moss green */
  btnPrimary: 'inline-flex items-center justify-center rounded-lg bg-moss-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-moss-800 focus:outline-none focus:ring-2 focus:ring-moss-500 focus:ring-offset-2',
  /** Secondary outlined button */
  btnSecondary: 'inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-50',
  /** Text input / number input */
  inputField: 'block w-full rounded-lg border-0 bg-sand-50 px-3.5 py-2.5 text-bark-900 shadow-sm ring-1 ring-inset ring-bark-200 placeholder:text-bark-400 focus:bg-white focus:ring-2 focus:ring-inset focus:ring-moss-500 sm:text-sm sm:leading-6',
  /** Field label */
  labelField: 'block text-sm font-medium leading-6 text-bark-800',
  /** Formula / code display box */
  formulaBox: 'rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100',
  /** Results panel — light moss background */
  resultsPanel: 'overflow-hidden rounded-xl border border-moss-200 bg-moss-50',
} as const;
