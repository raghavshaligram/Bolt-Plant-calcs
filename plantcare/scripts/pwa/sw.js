/*
 * The service worker for the installed copy.
 *
 * This app is one HTML file, which makes the usual hard part of a service
 * worker — deciding what to cache and when it goes stale — almost trivial. What
 * is left is one decision that matters and is easy to get wrong.
 *
 * NETWORK FIRST FOR THE DOCUMENT, CACHE FIRST FOR EVERYTHING ELSE.
 *
 * The tempting pattern is cache-first for everything: it is faster and it is
 * what most PWA tutorials show. It is also how a buyer ends up permanently
 * stuck on the build they installed in September, because the only copy of the
 * app the worker will ever serve is the one it already has, and the only thing
 * that can replace it is a worker update the old worker has no reason to fetch.
 * "Buy once, updates free forever" is a promise this product makes on its sales
 * page, and a cache-first document quietly breaks it.
 *
 * So: try the network for the page, fall back to the cache when there is no
 * network. Online, that costs one request against a file the CDN serves in
 * milliseconds. Offline, it is indistinguishable from cache-first. The icons
 * and the manifest are content-addressed by version below and never change
 * within a version, so they are cache-first with no downside.
 */

/* Bumped by scripts/emit-pwa.mjs on every build, from the app version. A
   changed name is what evicts the previous cache — same-named caches are the
   other classic way to ship an app nobody can update. */
const CACHE = 'plantcare-__VERSION__'

const PRECACHE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      /* One missing file must not stop the install, or a typo in the list above
         leaves the app with no worker at all and no offline support. */
      .catch(() => undefined)
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

/* The page asks for this when the person accepts an update. Without it a new
   worker waits until every tab is closed, which for an installed app can be
   weeks. */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

self.addEventListener('fetch', (event) => {
  const request = event.request

  /* Only GET, and only this origin. A POST is never idempotent enough to
     replay, and the one outbound request this app can make is the weather
     endpoint the owner configured themselves — which must reach the real
     network or fail honestly, never be answered from a cache. */
  if (request.method !== 'GET') return
  if (new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy))
          return response
        })
        .catch(() =>
          caches.match('./index.html').then((hit) => hit ?? caches.match('./')).then((hit) =>
            hit ?? new Response('Offline, and no copy of the app has been stored yet.', { status: 503 })
          )
        )
    )
    return
  }

  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
    )
  )
})
