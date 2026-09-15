import type { Sentiment } from './useCalculatorFeedback';

export interface CalculatorActionsBlockProps {
  sentiment: Sentiment | null;
  helpfulCount: number | null;
  showCount: boolean;
  onVote: (value: Sentiment) => void;
  onOpenModal: (tab: 'share' | 'embed' | 'cite') => void;
  /** Verified working before shipping -- omitted entirely when null. */
  googlePreferredSourcesUrl: string | null;
}

/**
 * Correction Prompt: Calculator Page Pilot -- Fix Layout Placement.
 *
 * Left column, directly under the byline: the helpful-count line, one
 * compact icon row (thumbs / share / embed / cite), and the optional
 * Google "preferred source" button. Nothing here is the calculator itself
 * -- that stays entirely in the sticky right panel (see
 * RaisedBedSoilCalculatorCard), which keeps its own plain-text "Was this
 * helpful? Yes/No" prompt right under the result. Both read/write the same
 * useCalculatorFeedback() state, so a vote from either place updates both.
 */
export default function CalculatorActionsBlock({
  sentiment,
  helpfulCount,
  showCount,
  onVote,
  onOpenModal,
  googlePreferredSourcesUrl,
}: CalculatorActionsBlockProps) {
  return (
    <div className="not-prose flex flex-col gap-3">
      {showCount && helpfulCount !== null && (
        <p className="flex items-center gap-1.5 text-sm text-bark-600">
          <ThumbIcon className="h-4 w-4 shrink-0 text-moss-700" />
          <span>
            <span className="font-semibold text-bark-800">{helpfulCount.toLocaleString()}</span>{' '}
            {helpfulCount === 1 ? 'person finds' : 'people find'} this calculator helpful
          </span>
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Thumbs up / down -- same vote as the "Was this helpful?" prompt
            under the results; whichever one the visitor uses first wins,
            and the other UI reflects it immediately (shared hook state). */}
        <div className="inline-flex overflow-hidden rounded-lg ring-1 ring-inset ring-moss-200">
          <button
            type="button"
            disabled={sentiment !== null}
            onClick={() => onVote('yes')}
            aria-pressed={sentiment === 'yes'}
            aria-label="Yes, this calculator is helpful"
            title="Helpful"
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition disabled:cursor-default ${
              sentiment === 'yes' ? 'bg-moss-700 text-white' : 'bg-white text-bark-700 hover:bg-moss-50'
            }`}
          >
            <ThumbIcon className="h-4 w-4" />
            {helpfulCount !== null && helpfulCount > 0 && <span>{helpfulCount.toLocaleString()}</span>}
          </button>
          <span className="w-px bg-moss-200" aria-hidden="true" />
          <button
            type="button"
            disabled={sentiment !== null}
            onClick={() => onVote('no')}
            aria-pressed={sentiment === 'no'}
            aria-label="No, this calculator is not helpful"
            title="Not helpful"
            className={`inline-flex items-center px-3 py-2 text-sm font-medium transition disabled:cursor-default ${
              sentiment === 'no' ? 'bg-bark-700 text-white' : 'bg-white text-bark-700 hover:bg-moss-50'
            }`}
          >
            <ThumbIcon className="h-4 w-4 rotate-180" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenModal('share')}
          aria-label="Share this calculator"
          title="Share"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-bark-700 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-50"
        >
          <ShareIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onOpenModal('embed')}
          aria-label="Embed this calculator"
          title="Embed"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-xs font-bold text-bark-700 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-50"
        >
          &lt;/&gt;
        </button>

        <button
          type="button"
          onClick={() => onOpenModal('cite')}
          aria-label="Cite this calculator"
          title="Cite"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-base font-bold leading-none text-bark-700 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-50"
        >
          &rdquo;
        </button>
      </div>

      {googlePreferredSourcesUrl && (
        <a
          href={googlePreferredSourcesUrl}
          target="_blank"
          rel="noopener"
          className="inline-flex w-fit items-center gap-2 rounded-full border border-moss-200 bg-white px-3.5 py-1.5 text-xs font-medium text-bark-700 transition hover:bg-moss-50"
        >
          <GoogleIcon className="h-3.5 w-3.5" />
          Add as preferred on Google
        </a>
      )}
    </div>
  );
}

function ThumbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M6 8.5H3.5A1.5 1.5 0 0 0 2 10v6a1.5 1.5 0 0 0 1.5 1.5H6V8.5Z" />
      <path d="M7.5 8.9 10.6 3a1 1 0 0 1 1.8.5v3.8h3.1a1.6 1.6 0 0 1 1.55 1.95l-1.2 5.5A2 2 0 0 1 14 16.5H7.5V8.9Z" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M14 6.5a2.5 2.5 0 1 0-2.4-3.2L7.3 5.7a2.5 2.5 0 1 0 0 3.6l4.3 2.4a2.5 2.5 0 1 0 .7-1.3L8 8a2.5 2.5 0 0 0 0-1L12.3 4.5c.4.5 1 .8 1.7.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
