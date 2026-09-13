/*
 * The installable half of the product, wired up at runtime.
 *
 * One build ships twice: as a file somebody downloads and as an app somebody
 * installs. Everything a PWA needs — a manifest link, a service worker, a theme
 * colour — is meaningless or actively wrong in the downloaded copy:
 *
 *   - A static <link rel="manifest"> in the HTML would resolve to
 *     file:///.../manifest.webmanifest and 404 on every open. Harmless, but it
 *     is a fetch, and this product's build guard exists precisely to stop the
 *     HTML from referring to anything it does not contain.
 *   - navigator.serviceWorker does not exist on file://, so registering one
 *     would throw on the copy most buyers open first.
 *
 * So none of it is in the markup. The hosted copy adds what it needs when it
 * loads, and the downloaded copy does nothing at all and never knows this file
 * had anything to say.
 */
import { DELIVERY } from './data/persistence.ts'

/** Matches the moss-700 in the site's design tokens. */
export const THEME_COLOUR = '#385030'
export const BACKGROUND_COLOUR = '#faf8f3'

export type UpdateState = 'idle' | 'available'

/**
 * Set up the installed-app pieces. Safe to call anywhere; does nothing off https.
 *
 * `onUpdate` fires when a newer build has been fetched and is waiting. It is a
 * callback rather than an automatic reload because this app can be mid-sentence
 * in a journal entry, and a service worker that refreshes the page underneath
 * somebody typing has destroyed their work to deliver a bug fix.
 */
export function setupPWA(onUpdate?: (apply: () => void) => void): void {
  if (DELIVERY !== 'hosted') return

  addManifestLink()
  addThemeColour()
  registerWorker(onUpdate)
}

function addManifestLink(): void {
  if (document.querySelector('link[rel="manifest"]')) return
  const link = document.createElement('link')
  link.rel = 'manifest'
  // Relative, so the same file works at /app/ today and at the root of a
  // subdomain later without a rebuild.
  link.href = 'manifest.webmanifest'
  document.head.appendChild(link)
}

function addThemeColour(): void {
  if (document.querySelector('meta[name="theme-color"]')) return
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = THEME_COLOUR
  document.head.appendChild(meta)

  /* iOS ignores the manifest's display mode unless these are present, and
     without them "Add to Home Screen" produces a Safari shortcut rather than a
     standalone app — which looks to the buyer like the install did not work. */
  const capable = document.createElement('meta')
  capable.name = 'apple-mobile-web-app-capable'
  capable.content = 'yes'
  document.head.appendChild(capable)

  const status = document.createElement('meta')
  status.name = 'apple-mobile-web-app-status-bar-style'
  status.content = 'default'
  document.head.appendChild(status)

  const title = document.createElement('meta')
  title.name = 'apple-mobile-web-app-title'
  title.content = 'Plant Care'
  document.head.appendChild(title)

  const touch = document.createElement('link')
  touch.rel = 'apple-touch-icon'
  touch.href = 'icon-192.png'
  document.head.appendChild(touch)
}

function registerWorker(onUpdate?: (apply: () => void) => void): void {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .then((reg) => {
        reg.addEventListener('updatefound', () => {
          const next = reg.installing
          if (!next) return
          next.addEventListener('statechange', () => {
            /* `controller` is null on the very first install — that is a fresh
               install finishing, not an update, and telling somebody their
               brand new app has an update available is nonsense. */
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              onUpdate?.(() => {
                next.postMessage({ type: 'SKIP_WAITING' })
              })
            }
          })
        })
      })
      .catch(() => {
        /* An install that fails leaves a working online app. There is nothing
           for the person to do about it, so there is nothing to tell them. */
      })

    /* ── why this is not simply "reload when the controller changes" ────────
     *
     * The worker calls `clients.claim()` when it activates, so that the very
     * first visit is controlled — and therefore works offline — without the
     * person having to open the app twice. The cost of claiming is that
     * `controllerchange` also fires on that first activation, which has nothing
     * to do with an update.
     *
     * Reloading there refreshes the page underneath somebody who has just
     * arrived, at whatever moment activation happens to finish — which is the
     * exact behaviour the comment at the top of this file says this design
     * avoids. It reached a passing verification run twice before showing up,
     * because whether it lands before or after any given interaction is a race.
     *
     * So: remember whether this page was already under a worker's control when
     * it started. If it was not, the first controllerchange is the install
     * finishing and is ignored. Only a page that was already controlled can be
     * seeing a genuine replacement, and that only ever follows SKIP_WAITING —
     * which is only ever sent by the person pressing the update button.
     */
    const wasControlled = Boolean(navigator.serviceWorker.controller)
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!wasControlled || reloading) return
      reloading = true
      location.reload()
    })
  })
}

/** True when the app is running as an installed app rather than in a tab. */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches
  const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true
  return Boolean(standalone || iosStandalone)
}
