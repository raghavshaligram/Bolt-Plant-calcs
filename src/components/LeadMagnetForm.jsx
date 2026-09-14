import { useId, useState } from 'react';
import { Shovel, FlaskConical, Droplets, Ruler, Sprout, Flower2, TreeDeciduous, Thermometer } from 'lucide-react';
import { leadMagnetCopy } from '../data/leadMagnetCopy';
import { leadMagnetBenefit } from '../data/leadMagnetBenefit';
import { trackEvent } from '../lib/analytics';

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
 * Small flat-illustration planter graphic, matching the header logo's visual
 * language: simple layered currentColor/opacity paths, no gradients or
 * shadows. Purely decorative (aria-hidden) -- never the thing a screen
 * reader or the eye needs to land on to use the form.
 */
function PlanterIllustration({ className = '' }) {
  return (
    <svg
      viewBox="0 0 96 112"
      aria-hidden="true"
      className={className}
    >
      <path d="M28 72h40l-5 28a6 6 0 0 1-6 5H39a6 6 0 0 1-6-5l-5-28Z" fill="#C2894F" />
      <path d="M24 72h48l2-8a4 4 0 0 0-4-5H26a4 4 0 0 0-4 5l2 8Z" fill="#B0723D" />
      <ellipse cx="48" cy="67" rx="18" ry="4" fill="#3D322C" opacity="0.25" />
      <path d="M48 67c0-14-2-22-2-30" stroke="#385030" strokeWidth="3" strokeLinecap="round" />
      <path d="M46 40c-6-5-9-11-7-18 7 1 12 6 14 12 1 4 0 7-2 9-2 1-4 0-5-3Z" fill="#46643C" />
      <path d="M50 34c6-4 10-10 9-17-7 0-13 4-15 10-1 4 0 7 2 9 2 1 3 0 4-2Z" fill="#5D7D50" opacity="0.85" />
      <path d="M48 37c-1-6 0-11 3-15 4 3 6 8 5 13-1 3-3 5-5 5-2 0-3-1-3-3Z" fill="#7D9A70" opacity="0.7" />
    </svg>
  );
}

/**
 * Custom-styled email capture form that posts to our own /api/subscribe route,
 * which adds the contact straight to Brevo (single opt-in, no confirmation
 * email required) server-side. No Brevo embed script, iframe, or default
 * form markup is used anywhere here.
 *
 * This component owns its entire card -- border, shadow, padding, heading,
 * description, and spacing above it -- so every page that uses it (21
 * calculator pages, inline + at the bottom via CalculatorLayout) just drops
 * in <LeadMagnetForm client:load listId={...} tag={...} clusterName={...}
 * description={...} icon={...} /> with no wrapper markup of its own. It
 * deliberately has NO max-width of its own -- it stretches to fill whatever
 * column its parent gives it (w-full only), so it always matches the width
 * of the article/content column beside it rather than being independently
 * capped narrower than that column. Width is controlled entirely by the
 * parent container on each page, not by this component.
 *
 * Headline copy: pulled from leadMagnetCopy (keyed by `tag`, the same
 * "<name>-cluster" identifier stored on each leadMagnetConfig entry) so the
 * heading is cluster-specific instead of a generic "Get the free cheat
 * sheet" -- falls back to that generic line only if `tag` isn't recognized.
 * An explicit `headline` prop overrides the lookup entirely, for a one-off
 * offer tied to specific on-page content rather than the cluster default.
 *
 * `variant`: 'card' (default) is the full illustrated card described above.
 * 'inline' is a deliberately minimal single-row strip -- one line of copy,
 * one email field, one button, no illustration -- meant to sit directly
 * beneath a calculator's result output rather than at the bottom of the
 * page. See PotSizeCalculator.tsx / TreeAgeCalculator.tsx for the inline
 * post-result placement this was built for.
 *
 * `source`: an optional free-text tag (e.g. 'pot-size-calculator-inline')
 * folded into the lead_magnet_signup GA4 event so signups from a specific
 * placement/experiment can be measured separately from any other lead
 * magnet on the site. Omitted entirely for existing callers -- trackEvent
 * already drops undefined params, so this is a no-op unless passed.
 *
 * Brand spec (used exactly, per design):
 *   soil brown #5C4433 · leaf green #4A7C59 · deep forest green #3D6647
 *   cream #F5F1E8 · sun gold #E8A94A
 *   Headings: Playfair Display · Body/UI: Inter
 */
export default function LeadMagnetForm({
  listId,
  tag,
  clusterName,
  description,
  icon,
  variant = 'card',
  headline: headlineProp,
  source,
}) {
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
        // Fired here and nowhere else: this is the single branch where Brevo
        // has actually accepted the contact and the "Check your inbox!" state
        // renders. Not on focus, not on click, not on submit -- a failed or
        // rejected submission falls through to the error branch below and
        // sends nothing, so this counts real signups only.
        trackEvent('lead_magnet_signup', {
          list_id: listId,
          cluster_tag: tag,
          cluster_name: clusterName,
          source,
        });
        return;
      }

      setErrorMessage(data.error || 'Something went wrong. Please try again.');
      setStatus('error');
    } catch {
      setErrorMessage('Could not reach the server. Check your connection and try again.');
      setStatus('error');
    }
  }

  const headline = headlineProp || (tag && leadMagnetCopy[tag]) || 'Get the free cheat sheet';

  // Ongoing-value promise, per cluster (see leadMagnetBenefit.ts for why this
  // replaced the old generic "...emailed once" line sitewide). Falls back to
  // a plain no-spam line only for an unmapped tag (e.g. the one-off
  // companion-planting-chart list, which has no recurring content planned).
  const cheatSheetDescription =
    description ?? (tag && leadMagnetBenefit[tag]) ?? `A one-page PDF of the ${clusterName} math from this site. No spam, unsubscribe anytime.`;

  // Short, single-line-friendly version of the same promise for the compact
  // 'inline' strip below (sits directly under a calculator's result, so it
  // can't afford the full card description's length). Reuses the same
  // per-cluster leadMagnetBenefit string rather than maintaining a second
  // copy of the promise that could drift out of sync with it.
  const inlineBenefit = (tag && leadMagnetBenefit[tag])
    ? leadMagnetBenefit[tag].replace(/^The (PDF|guide) now, plus /, 'free $1, plus ')
    : 'free PDF, no spam.';

  if (variant === 'inline') {
    return (
      // Same data-lead-magnet exclusion as the card variant below -- this
      // sits inside the calculator's own result card, so without it typing
      // an email here would mis-count as "used the calculator".
      <div
        data-lead-magnet
        className="mt-3 w-full rounded-xl border border-[#5C4433]/20 bg-gradient-to-r from-[#E8A94A]/15 via-[#F5F1E8] to-[#4A7C59]/10 px-4 py-3 shadow-sm sm:px-5"
      >
        {status === 'success' ? (
          <p className="font-sans text-sm font-medium text-[#3D6647]">
            Check your inbox! Sending it to your email now — check spam/promotions if you don&rsquo;t see it in a minute.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <p className="flex-1 font-sans text-sm leading-snug text-[#5C4433]">
              <span
                className="font-semibold text-[#3D6647]"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {headline}
              </span>{' '}
              &mdash; {inlineBenefit}
            </p>
            <div className="flex shrink-0 gap-2">
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
                className="w-40 rounded-md border border-[#5C4433] bg-white px-3 py-2 font-sans text-sm text-[#5C4433] placeholder:text-[#5C4433]/50 shadow-sm transition focus:border-[#3D6647] focus:outline-none focus:ring-2 focus:ring-[#E8A94A] disabled:opacity-60 sm:w-52"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-[#3D6647] px-4 py-2 font-sans text-sm font-semibold text-[#F5F1E8] shadow-sm transition-colors duration-200 hover:bg-[#4A7C59] focus:outline-none focus:ring-2 focus:ring-[#E8A94A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-[#3D6647]/70"
              >
                {status === 'loading' ? 'Sending…' : 'Send it'}
              </button>
            </div>
            {status === 'error' && (
              <p className="basis-full font-sans text-xs text-red-600">{errorMessage}</p>
            )}
          </form>
        )}
      </div>
    );
  }

  return (
    // w-full, no max-width cap: stretches to fill the full width of
    // whichever column its parent places it in, so it always matches the
    // article/content column width on the page rather than being narrower.
    // mt-8/sm:mt-10 gives consistent breathing room (32px/40px) above
    // whatever content sits before it, instead of relying on each page to
    // remember a margin.
    // data-lead-magnet marks this subtree as NOT part of the calculator, so the
    // calculator-usage listener in CalculatorLayout ignores typing in the email
    // field. Without it, entering an email would count as "used the calculator".
    <div
      data-lead-magnet
      className="mt-6 w-full rounded-2xl bg-gradient-to-br from-[#E8A94A]/20 via-[#F5F1E8] to-[#4A7C59]/10 p-4 shadow-card ring-1 ring-[#5C4433]/15 sm:mt-10 sm:p-8"
    >
      {status === 'success' ? (
        <div className="rounded-xl bg-[#3D6647] p-6">
          <p
            className="text-lg font-semibold text-[#F5F1E8]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Check your inbox!
          </p>
          <p className="mt-1.5 font-sans text-sm leading-relaxed text-[#F5F1E8]">
            We're sending the {clusterName} Cheat Sheet to your email now. If you don't see it in a
            minute or two, check your spam or promotions folder — and marking it "not spam" helps
            make sure future free guides land straight in your inbox.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-5">
          <PlanterIllustration className="h-12 w-12 shrink-0 sm:h-24 sm:w-24" />

          <div className="w-full flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-3 sm:justify-start">
              {icon && iconMap[icon] && (
                (() => {
                  const Icon = iconMap[icon];
                  return (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8A94A]/25 text-[#3D6647] sm:h-11 sm:w-11">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                    </span>
                  );
                })()
              )}
              <h3
                className="text-lg font-semibold text-[#3D6647] sm:text-xl"
                style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
              >
                {headline}
              </h3>
            </div>
            <p className="mt-1.5 mb-4 font-sans text-sm leading-relaxed text-[#5C4433] sm:mt-2 sm:mb-5">
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
          </div>
        </div>
      )}
    </div>
  );
}
