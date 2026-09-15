import { useEffect, useState } from 'react';
import { trackEvent } from '../../lib/analytics';

export type Sentiment = 'yes' | 'no';

function feedbackStorageKey(slug: string): string {
  return `calculator-feedback-given-${slug}`;
}

/**
 * Correction Prompt: Calculator Page Pilot -- Fix Layout Placement.
 *
 * Extracted from the old CalculatorActionPanel.tsx so the SAME vote/count
 * state can back two separate on-screen pieces that now live in different
 * grid columns: the compact thumbs-with-count icon in the left column's
 * action row, and the plain "Was this helpful? Yes/No" prompt that stays
 * directly under the results in the sticky right panel. Both are rendered
 * by the one composed RaisedBedSoilCalculatorPanel tree, so voting from
 * either place updates both instantly and a single vote per browser is
 * still enforced -- no cross-island messaging needed.
 */
export function useCalculatorFeedback(calculatorSlug: string) {
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

  return { sentiment, helpfulCount, showCount, submitFeedback };
}
