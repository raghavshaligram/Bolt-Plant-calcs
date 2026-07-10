import { useId, useState } from 'react';
import { Shovel, FlaskConical, Droplets, Ruler, Sprout, Flower2, TreeDeciduous, Thermometer } from 'lucide-react';

// Maps the string icon name coming from leadMagnetConfig (src/data/calculators.ts)
// to the actual lucide-react component. A string is what crosses the Astro
// client:load hydration boundary safely -- a component/function reference
// can't be serialized as a prop, so the lookup happens here instead.
const iconMap = {
  Shovel,
  FlaskConical,
  Droplets,
  Ruler,
  Sprout,
  Flower2,
  TreeDeciduous,
  Thermometer,
};

/**
 * Custom-styled email capture form that posts to our own /api/subscribe route,
 * which adds the contact straight to Brevo (single opt-in, no confirmation
 * email required) server-side. No Brevo embed script, iframe, or default
 * form markup is used anywhere here.
 *
 * This component owns its entire card -- border, shadow, padding, heading,
 * description, and spacing above it -- so every page that uses it (15
 * calculator pages, inline + at the bottom via CalculatorLayout) just drops
 * in <LeadMagnetForm client:load listId={...} clusterName={...}
 * description={...} /> with no wrapper markup of its own. It deliberately
 * has NO max-width of its own -- it stretches to fill whatever column its
 * parent gives it (w-full only), so it always matches the width of the
 * article/content column beside it rather than being independently capped
 * narrower than that column. Width is controlled entirely by the parent
 * container on each page, not by this component.
 *
 * Brand spec (used exactly, per design):
 *   soil brown #5C4433 · leaf green #4A7C59 · deep forest green #3D6647
 *   cream #F5F1E8 · sun gold #E8A94A
 *   Headings: Playfair Display · Body/UI: Inter
 */
export default function LeadMagnetForm({ listId, clusterName, description, icon }) {
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
    // w-full, no max-width cap: stretches to fill the full width of
    // whichever column its parent places it in, so it always matches the
    // article/content column width on the page rather than being narrower.
    // mt-8/sm:mt-10 gives consistent breathing room (32px/40px) above
    // whatever content sits before it, instead of relying on each page to
    // remember a margin.
    <div className="mt-8 w-full rounded-xl border border-[#5C4433]/15 bg-[#F5F1E8] p-6 shadow-sm sm:mt-10 sm:p-8">
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
          <div className="flex items-center gap-3">
            {icon && iconMap[icon] && (
              (() => {
                const Icon = iconMap[icon];
                return <Icon className="h-7 w-7 shrink-0 text-[#3D6647]" aria-hidden="true" />;
              })()
            )}
            <h3
              className="text-lg font-semibold text-[#3D6647]"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Get the free cheat sheet
            </h3>
          </div>
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
