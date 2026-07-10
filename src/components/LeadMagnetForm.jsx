import { useId, useState } from 'react';

/**
 * Custom-styled email capture form that posts to our own /api/subscribe route,
 * which adds the contact straight to Brevo (single opt-in, no confirmation
 * email required) server-side. No Brevo embed script, iframe, or default
 * form markup is used anywhere here.
 *
 * This component owns its entire card -- width cap, border, shadow, padding,
 * heading, description, and spacing above it -- so every page that uses it
 * (7 cluster pages, 15 calculator pages) just drops in
 * <LeadMagnetForm client:load listId={...} clusterName={...} description={...} />
 * with no wrapper markup of its own. That's deliberate: a page previously
 * wrapped this in its own ad hoc card/section markup, which is how one
 * wrapper (the cluster-page bottom section) ended up full-width with no
 * border or max-width, visually breaking out of the content column next to
 * it. Centralizing the card here means that class of bug can't recur on a
 * per-page basis.
 *
 * Brand spec (used exactly, per design):
 *   soil brown #5C4433 · leaf green #4A7C59 · deep forest green #3D6647
 *   cream #F5F1E8 · sun gold #E8A94A
 *   Headings: Playfair Display · Body/UI: Inter
 */
export default function LeadMagnetForm({ listId, clusterName, description }) {
  const inputId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, listId }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setStatus('success');
        return;
      }

      setErrorMessage(data.error || 'Something went wrong. Please try again.');
      setStatus('error');
    } catch {
      setErrorMessage('Could not reach the server. Check your connection and try again.');
      setStatus('error');
    }
  }

  const cheatSheetDescription =
    description ?? `A one-page PDF of the ${clusterName} math from this site, emailed once.`;

  return (
    // w-full + max-w-2xl: never wider than the surrounding article/prose
    // column (which caps at the same max-w-2xl elsewhere on these pages),
    // regardless of which page or cluster renders it. mt-8/sm:mt-10 gives
    // consistent breathing room (32px/40px) above whatever content sits
    // before it, instead of relying on each page to remember a margin.
    <div className="mt-8 w-full max-w-2xl rounded-xl border border-[#5C4433]/15 bg-[#F5F1E8] p-6 shadow-sm sm:mt-10 sm:p-8">
      {status === 'success' ? (
        <div className="rounded-md bg-[#3D6647] p-6">
          <p
            className="text-lg font-semibold text-[#F5F1E8]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Check your inbox!
          </p>
          <p className="mt-1.5 font-sans text-sm leading-relaxed text-[#F5F1E8]">
            We’ll send the {clusterName} Cheat Sheet to your email shortly.
          </p>
        </div>
      ) : (
        <>
          <h3
            className="text-lg font-semibold text-[#3D6647]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Get the free cheat sheet
          </h3>
          <p className="mt-2 mb-5 font-sans text-sm leading-relaxed text-[#5C4433]">
            {cheatSheetDescription}
          </p>

          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1">
                <label htmlFor={inputId} className="sr-only">
                  Email address
                </label>
                <input
                  id={inputId}
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={status === 'loading'}
                  className="w-full rounded-md border border-[#5C4433] bg-[#F5F1E8] px-4 py-2.5 font-sans text-sm text-[#5C4433] placeholder:text-[#5C4433]/50 shadow-sm transition focus:border-[#3D6647] focus:outline-none focus:ring-2 focus:ring-[#E8A94A] focus:shadow-inner disabled:opacity-60"
                />
                {status === 'error' && (
                  <p className="mt-1.5 font-sans text-sm text-red-600">{errorMessage}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-[#3D6647] px-5 py-2.5 font-sans text-sm font-semibold text-[#F5F1E8] shadow-sm transition-colors duration-200 hover:bg-[#4A7C59] focus:outline-none focus:ring-2 focus:ring-[#E8A94A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#3D6647]/70"
              >
                {status === 'loading' ? 'Sending…' : 'Get the Cheat Sheet'}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}
