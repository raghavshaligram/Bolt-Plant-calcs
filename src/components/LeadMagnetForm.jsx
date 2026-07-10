import { useId, useState } from 'react';

/**
 * Custom-styled email capture form that posts to our own /api/subscribe route,
 * which in turn calls Brevo's double opt-in API server-side. No Brevo embed
 * script, iframe, or default form markup is used anywhere here.
 *
 * Brand spec (used exactly, per design):
 *   soil brown #5C4433 · leaf green #4A7C59 · deep forest green #3D6647
 *   cream #F5F1E8 · sun gold #E8A94A
 *   Headings: Playfair Display · Body: Inter
 */
export default function LeadMagnetForm({ listId, clusterName }) {
  const inputId = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

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
        setAlreadySubscribed(Boolean(data.alreadySubscribed));
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

  if (status === 'success') {
    return (
      <div className="w-full max-w-md rounded-2xl bg-[#F5F1E8] p-6 font-sans">
        <p
          className="text-lg font-semibold text-[#3D6647]"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          Check your inbox!
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-[#5C4433]">
          Confirm your email and we’ll send the {clusterName} Cheat Sheet.
          {alreadySubscribed && (
            <>
              {' '}Looks like you were already on the list — if you don’t see a new email, check for an earlier one from us instead.
            </>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-[#F5F1E8] p-6 font-sans">
      <p
        className="text-lg font-semibold text-[#3D6647]"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        Get the {clusterName} Cheat Sheet
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-[#5C4433]">
        One free PDF, emailed once. No spam, unsubscribe anytime.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-start">
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
            className="w-full rounded-lg border border-[#5C4433]/25 bg-white px-4 py-2.5 text-sm text-[#5C4433] placeholder:text-[#5C4433]/40 shadow-sm transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#E8A94A] disabled:opacity-60"
          />
          {status === 'error' && (
            <p className="mt-1.5 text-sm text-red-700">{errorMessage}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-[#3D6647] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#4A7C59] focus:outline-none focus:ring-2 focus:ring-[#E8A94A] focus:ring-offset-2 focus:ring-offset-[#F5F1E8] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === 'loading' ? 'Sending…' : 'Get the cheat sheet'}
        </button>
      </form>
    </div>
  );
}
