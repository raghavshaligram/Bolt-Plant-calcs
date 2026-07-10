import { useEffect, useRef, useState } from 'react';

/**
 * Site-wide "you're confirmed" modal, mounted once in Layout.astro so it
 * works no matter which page someone signs up from (any of the 15 calculator
 * pages or 7 cluster pages).
 *
 * Fires two ways:
 *  1. A 'leadmagnet:subscribed' window event, dispatched by LeadMagnetForm
 *     the moment /api/subscribe returns success -- this is the live path now
 *     that Brevo signup is single opt-in (contact is added to the list
 *     immediately, no confirmation email to click).
 *  2. A ?subscribed=true URL param, kept as a fallback in case a future flow
 *     redirects back here (e.g. if double opt-in is ever reintroduced) --
 *     currently unused in practice since nothing sets this param anymore.
 */
export default function SubscribeConfirmedModal() {
  const [open, setOpen] = useState(false);
  const [clusterName, setClusterName] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    function handleSubscribed(event) {
      setClusterName(event.detail?.clusterName ?? null);
      setOpen(true);
    }
    window.addEventListener('leadmagnet:subscribed', handleSubscribed);

    const params = new URLSearchParams(window.location.search);
    if (params.get('subscribed') === 'true') {
      setOpen(true);

      // Strip the query param so refreshing, bookmarking, or sharing the URL
      // doesn't re-trigger the modal.
      params.delete('subscribed');
      const query = params.toString();
      const cleanUrl = window.location.pathname + (query ? `?${query}` : '') + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }

    return () => window.removeEventListener('leadmagnet:subscribed', handleSubscribed);
  }, []);

  function close() {
    setOpen(false);
  }

  function handleBackdropClick(event) {
    if (cardRef.current && !cardRef.current.contains(event.target)) {
      close();
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscribe-confirmed-heading"
        className="relative w-full max-w-sm rounded-lg border border-[#E8A94A] bg-[#F5F1E8] p-6 shadow-xl"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5C4433] transition hover:bg-[#5C4433]/10 focus:outline-none focus:ring-2 focus:ring-[#E8A94A]"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <h2
          id="subscribe-confirmed-heading"
          className="pr-6 text-xl font-semibold text-[#3D6647]"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Check your inbox!
        </h2>
        <p className="mt-2 font-sans text-sm leading-relaxed text-[#5C4433]">
          {clusterName ? `We’ll send the ${clusterName} Cheat Sheet to your email shortly.` : 'We’ll send your cheat sheet to your email shortly.'}
        </p>

        <button
          type="button"
          onClick={close}
          className="mt-5 inline-flex items-center justify-center rounded-md bg-[#3D6647] px-5 py-2.5 font-sans text-sm font-semibold text-[#F5F1E8] shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#E8A94A] focus:ring-offset-2"
        >
          Continue Browsing
        </button>
      </div>
    </div>
  );
}
