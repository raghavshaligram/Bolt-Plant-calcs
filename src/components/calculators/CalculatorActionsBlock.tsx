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
 * one compact icon row (thumbs / share / embed / cite / Google "preferred
 * source" bookmark) and, below it, the helpful-count line. Nothing here
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
    <div className="not-prose inline-flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1">
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
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-bark-500 transition hover:bg-moss-50 hover:text-moss-800"
        >
          <CiteIcon className="h-5 w-5" />
        </button>

        {/* "Add as preferred on Google" -- a compact bookmark-icon button,
            right in the icon row next to Cite. This used to also have a
            separate labeled pill button below the row; that was dropped
            once the action existed here too, since showing the same link
            twice was redundant (same reasoning as the earlier duplicate
            Share row removal). */}
        {googlePreferredSourcesUrl && (
          <a
            href={googlePreferredSourcesUrl}
            target="_blank"
            rel="noopener"
            aria-label="Add as preferred on Google"
            title="Add as preferred on Google"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-transparent text-bark-500 transition hover:bg-moss-50 hover:text-moss-800"
          >
            <BookmarkIcon className="h-4 w-4" />
          </a>
        )}
      </div>

      {showCount && helpfulCount !== null && (
        <p className="flex w-full items-center gap-1.5 text-sm text-bark-600">
          <ThumbIcon className="h-4 w-4 shrink-0 text-moss-700" />
          <span>
            <span className="font-semibold text-bark-800">{helpfulCount.toLocaleString()}</span>{' '}
            {helpfulCount === 1 ? 'person finds' : 'people find'} this calculator helpful
          </span>
        </p>
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

function CiteIcon({ className }: { className?: string }) {
  // A bold "closing quotation marks" glyph, drawn as SVG rather than set as
  // a real quote character. A real serif quote character (as this used to
  // be) draws its ink near the top of its own line box -- quotation marks
  // sit up near cap-height by design, with empty space below where a
  // descender would go but isn't used -- so it visibly floats above the
  // other icons even when the button centers it with flex. An SVG's
  // viewBox *is* its bounding box, so the same items-center/justify-center
  // centering that lines up ThumbIcon/ShareIcon lines this up too.
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M9.5 7.25c-2.35 0-4.25 1.9-4.25 4.25 0 2.06 1.47 3.78 3.42 4.16L7.15 19h2.4l1.78-4.71c.4-1.06.62-2.1.62-3.04 0-2.2-.7-4-2.45-4Z" />
      <path d="M18.1 7.25c-2.35 0-4.25 1.9-4.25 4.25 0 2.06 1.47 3.78 3.42 4.16L15.75 19h2.4l1.78-4.71c.4-1.06.62-2.1.62-3.04 0-2.2-.7-4-2.45-4Z" />
    </svg>
  );
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6.75 3.75c-.83 0-1.5.67-1.5 1.5v14.5a.75.75 0 0 0 1.164.625L12 16.24l5.586 4.135a.75.75 0 0 0 1.164-.625V5.25c0-.83-.67-1.5-1.5-1.5h-10.5Z" />
    </svg>
  );
}
