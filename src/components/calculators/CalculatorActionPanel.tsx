import { useEffect, useState } from 'react';
import { trackEvent } from '../../lib/analytics';

export interface RelatedLink {
  name: string;
  url: string;
}

export interface CalculatorActionPanelProps {
  calculatorSlug: string;
  hasResult: boolean;
  onReset: () => void;
  onOpenShare: () => void;
  relatedLinks: RelatedLink[];
  /** Verified working before shipping (Part 5) -- omitted entirely when null. */
  googlePreferredSourcesUrl: string | null;
}

type Sentiment = 'yes' | 'no';

function feedbackStorageKey(slug: string): string {
  return `calculator-feedback-given-${slug}`;
}

/**
 * Part 2 (action panel) + Part 4 (related calculators) + Part 5 (Google
 * Preferred Sources link) of the sticky-calculator pilot. Sits directly
 * below RaisedBedSoilCalculatorCard inside the same sticky container, so on
 * desktop it travels with the calculator, and on mobile it's simply the next
 * thing in the normal content flow.
 */
export default function CalculatorActionPanel({
  calculatorSlug,
  hasResult,
  onReset,
  onOpenShare,
  relatedLinks,
  googlePreferredSourcesUrl,
}: CalculatorActionPanelProps) {
  const [sentiment, setSentiment] = useState<Sentiment | null>(null);
  const [helpfulCount, setHelpfulCount] = useState<number | null>(null);
  const [showCount, setShowCount] = useState(false);

  // Load this browser's prior vote (if any) and the current real count on
  // mount. The count is fetched regardless of whether this visitor has voted
  // -- it's aggregate social proof, not a reflection of "your" vote.
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(feedbackStorageKey(calculatorSlug));
      if (stored === 'yes' || stored === 'no') setSentiment(stored);
    } catch {
      /* localStorage unavailable -- feedback still works, just not remembered across visits */
    }

    fetch(`/api/calculator-feedback?calculator=${encodeURIComponent(calculatorSlug)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setHelpfulCount(typeof data.yes === 'number' ? data.yes : null);
        setShowCount(Boolean(data.showCount));
      })
      .catch(() => {
        /* Never let this block the page -- no count is shown until it loads. */
      });
  }, [calculatorSlug]);

  const submitFeedback = async (value: Sentiment) => {
    if (sentiment) return; // one vote per browser, per calculator
    setSentiment(value);
    try {
      window.localStorage.setItem(feedbackStorageKey(calculatorSlug), value);
    } catch {
      /* ignore */
    }
    trackEvent('calculator_feedback', { calculator_name: calculatorSlug, sentiment: value });

    try {
      const res = await fetch('/api/calculator-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calculator: calculatorSlug, sentiment: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setHelpfulCount(typeof data.yes === 'number' ? data.yes : null);
        setShowCount(Boolean(data.showCount));
      }
    } catch {
      /* The vote still registers visually for this visitor even if the write failed. */
    }
  };

  return (
    <div className="not-prose mt-4 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-card ring-1 ring-moss-100/60">
      {/* Share + Reset */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onOpenShare}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-moss-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-moss-800"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M14 6.5a2.5 2.5 0 1 0-2.4-3.2L7.3 5.7a2.5 2.5 0 1 0 0 3.6l4.3 2.4a2.5 2.5 0 1 0 .7-1.3L8 8a2.5 2.5 0 0 0 0-1L12.3 4.5c.4.5 1 .8 1.7.8Z" fill="currentColor" />
          </svg>
          Share
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sand-100 px-3 py-2 text-sm font-semibold text-bark-700 transition hover:bg-sand-200"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M4 4v4h4M16 16v-4h-4M4.5 8A6 6 0 0 1 16 6.5M15.5 12A6 6 0 0 1 4 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Reset
        </button>
      </div>

      {/* Was this helpful? -- only once there's a real result to react to */}
      {hasResult && (
        <div className="border-t border-moss-100 pt-4">
          <p className="text-sm font-medium text-bark-700">Was this helpful?</p>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={sentiment !== null}
              onClick={() => submitFeedback('yes')}
              aria-pressed={sentiment === 'yes'}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition disabled:cursor-default ${
                sentiment === 'yes'
                  ? 'bg-moss-700 text-white ring-moss-700'
                  : 'bg-white text-bark-700 ring-moss-200 hover:bg-moss-50 disabled:hover:bg-white'
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              disabled={sentiment !== null}
              onClick={() => submitFeedback('no')}
              aria-pressed={sentiment === 'no'}
              className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition disabled:cursor-default ${
                sentiment === 'no'
                  ? 'bg-bark-700 text-white ring-bark-700'
                  : 'bg-white text-bark-700 ring-moss-200 hover:bg-moss-50 disabled:hover:bg-white'
              }`}
            >
              No
            </button>
            {sentiment && <span className="text-xs text-bark-500">Thanks for the feedback!</span>}
          </div>
          {/* Hard rule: never show a seeded/fabricated count. Only renders once
              the server confirms a real count at or above the threshold. */}
          {showCount && helpfulCount !== null && (
            <p className="mt-2 text-xs text-bark-500">
              {helpfulCount.toLocaleString()} {helpfulCount === 1 ? 'person' : 'people'} found this helpful
            </p>
          )}
        </div>
      )}

      {/* Related calculators -- compact, not a grid */}
      <div className="border-t border-moss-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-bark-400">Related</p>
        <ul className="mt-2 space-y-1.5">
          {relatedLinks.map((link) => (
            <li key={link.url}>
              <a href={link.url} className="text-sm font-medium text-moss-700 hover:text-moss-900 hover:underline">
                {link.name} →
              </a>
            </li>
          ))}
        </ul>
      </div>

      {googlePreferredSourcesUrl && (
        <a
          href={googlePreferredSourcesUrl}
          target="_blank"
          rel="noopener"
          className="text-xs text-bark-400 hover:text-moss-700 hover:underline"
        >
          Add HarvestMath as a preferred source on Google
        </a>
      )}
    </div>
  );
}
