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
 * Renders directly under the byline row (in CalculatorLayout's hero band):
 * the helpful-count line, one compact icon row (thumbs / share / embed /
 * cite), and the optional Google "preferred source" button. Nothing here
 * is the calculator itself -- that stays entirely in the sticky right
 * panel (see RaisedBedSoilCalculatorCard), which keeps its own plain-text
 * "Was this helpful? Yes/No" prompt right under the result. Both read/
 * write the same useCalculatorFeedback() state, so a vote from either
 * place updates both.
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
    <div className="not-prose mt-3 flex flex-col gap-3">
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
            and the other UI reflects it immediately (shared hook state).
            Flat, transparent icons (no white button chip) -- same visual
            language as the site's other icon buttons (ShareButtons). */}
        <div className="inline-flex items-center overflow-hidden rounded-full">
          <button
            type="button"
            disabled={sentiment !== null}
            onClick={() => onVote('yes')}
            aria-pressed={sentiment === 'yes'}
            aria-label="Yes, this calculator is helpful"
            title="Helpful"
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm font-medium transition disabled:cursor-default ${
              sentiment === 'yes' ? 'bg-moss-700 text-white' : 'bg-transparent text-bark-500 hover:bg-moss-50 hover:text-moss-800'
            }`}
          >
            <ThumbIcon className="h-4 w-4" />
            {helpfulCount !== null && helpfulCount > 0 && <span>{helpfulCount.toLocaleString()}</span>}
          </button>
          <button
            type="button"
            disabled={sentiment !== null}
            onClick={() => onVote('no')}
            aria-pressed={sentiment === 'no'}
            aria-label="No, this calculator is not helpful"
            title="Not helpful"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition disabled:cursor-default ${
              sentiment === 'no' ? 'bg-bark-700 text-white' : 'bg-transparent text-bark-500 hover:bg-moss-50 hover:text-moss-800'
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
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-bark-500 transition hover:bg-moss-50 hover:text-moss-800"
        >
          <ShareIcon className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => onOpenModal('embed')}
          aria-label="Embed this calculator"
          title="Embed"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-xs font-bold text-bark-500 transition hover:bg-moss-50 hover:text-moss-800"
        >
          &lt;/&gt;
        </button>

        <button
          type="button"
          onClick={() => onOpenModal('cite')}
          aria-label="Cite this calculator"
          title="Cite"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-base font-bold leading-none text-bark-500 transition hover:bg-moss-50 hover:text-moss-800"
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
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75A2.25 2.25 0 0 1 16.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904" />
      <path d="M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 0 1-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 10.203 4.167 9.75 5 9.75h1.053c.472 0 .745.556.5.96a8.958 8.958 0 0 0-1.302 4.665c0 1.194.232 2.333.654 3.375Z" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
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
