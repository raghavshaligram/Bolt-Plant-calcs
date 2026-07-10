import { useId, useState } from 'react';

/**
 * Custom-styled email capture form that posts to our own /api/subscribe route,
 * which calls Brevo's double opt-in API server-side. No Brevo embed script,
 * iframe, or default form markup is used anywhere here.
 *
 * Brand spec (used exactly, per design):
 *   soil brown #5C4433 · leaf green #4A7C59 · deep forest green #3D6647
 *   cream #F5F1E8 · sun gold #E8A94A
 *   Headings: Playfair Display · Body/UI: Inter
 */
export default function LeadMagnetForm({ listId, clusterName }) {
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

  if (status === 'success') {
    return (
      <div className="w-full max-w-md rounded-md bg-[#3D6647] p-6">
        <p
          className="text-lg font-semibold text-[#F5F1E8]"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          You’re subscribed!
        </p>
        <p className="mt-1.5 font-sans text-sm leading-relaxed text-[#F5F1E8]">
          The {clusterName} Cheat Sheet is on its way to your inbox.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
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
            className="w-full rounded-md border border-[#5C4433] bg-[#F5F1E8] px-4 py-2.5 font-sans text-sm text-[#5C4433] placeholder:text-[#5C4433]/50 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#E8A94A] disabled:opacity-60"
          />
          {status === 'error' && (
            <p className="mt-1.5 font-sans text-sm text-red-600">{errorMessage}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-[#3D6647] px-5 py-2.5 font-sans text-sm font-semibold text-[#F5F1E8] shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[#E8A94A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {status === 'loading' ? 'Sending…' : 'Get the Cheat Sheet'}
        </button>
      </div>
    </form>
  );
}
