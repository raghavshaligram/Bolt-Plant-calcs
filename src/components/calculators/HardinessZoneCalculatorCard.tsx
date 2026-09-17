import type { HardinessZoneCalculatorState } from './useHardinessZoneCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';
import { formatTempRangeF, formatTempRangeC } from '../../lib/hardinessZoneTemps';

export interface HardinessZoneCalculatorCardProps {
  calc: HardinessZoneCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * HardinessZoneFinder.tsx, now driven entirely by the shared
 * useHardinessZoneCalculatorState() hook instead of owning its own state.
 * That's what lets the left column's action row and the Share/Embed/Cite
 * modal (HardinessZoneCalculatorPanel.tsx) read and reset the same input/
 * result even though they render in a different part of the DOM.
 */
export default function HardinessZoneCalculatorCard({ calc, sentiment, onVote }: HardinessZoneCalculatorCardProps) {
  const { zip, handleZipChange, lookup, band, hasResult, exportPdf, reset } = calc;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3.5">
          <h2 className="font-display text-lg font-semibold text-white">Hardiness Zone Finder</h2>
          <button
            type="button"
            onClick={reset}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-moss-800/60 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-moss-800"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M4 4v4h4M16 16v-4h-4M4.5 8A6 6 0 0 1 16 6.5M15.5 12A6 6 0 0 1 4 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Reset
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          <div>
            <label htmlFor="hz-zip" className="label-field">US ZIP code</label>
            <input
              id="hz-zip"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              value={zip}
              onChange={handleZipChange}
              placeholder="e.g. 60601"
              className="input-field mt-1.5 max-w-[10rem]"
            />
            {zip.length === 5 && !lookup && (
              <p className="mt-2 text-sm text-amber-700">
                We couldn&rsquo;t match that ZIP to a zone &mdash; double-check the digits, or see Sources below for the official map.
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!lookup || !band ? (
              <p className="p-5 text-sm text-bark-500">Enter a 5-digit ZIP code to find your USDA hardiness zone.</p>
            ) : (
              <>
                <div className="bg-moss-700 p-4 text-center">
                  <p className="text-xs uppercase tracking-wider text-moss-200">Your USDA hardiness zone</p>
                  <p className="mt-1 font-display text-4xl font-bold text-white sm:text-5xl">Zone {lookup.zone}</p>
                </div>
                <div className="grid grid-cols-1 divide-y divide-moss-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  <div className="p-4">
                    <p className="text-xs text-bark-500">Avg. annual minimum (&deg;F)</p>
                    <p className="font-display text-lg font-bold text-moss-700 sm:text-xl">{formatTempRangeF(band)}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-bark-500">Avg. annual minimum (&deg;C)</p>
                    <p className="font-display text-lg font-bold text-moss-700 sm:text-xl">{formatTempRangeC(band)}</p>
                  </div>
                </div>
                <div className="border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    Nearest reference point: <strong className="text-bark-700">{lookup.refCity}</strong>
                  </p>
                </div>
              </>
            )}
          </div>

          <details className="group rounded-lg bg-sand-50 px-4 py-2.5 text-sm text-bark-600 ring-1 ring-moss-100">
            <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                How accurate is this?
                <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <p className="mt-2 text-xs text-bark-500">
              This is a regional estimate based on the nearest of 826 reference points, each matched to the official 2023 USDA zone map. It&rsquo;s accurate to within about a half-zone across most of the country, but elevation shifts zones over short distances &mdash; if you&rsquo;re in mountainous terrain, check the official USDA map for your exact address (see Sources below).
            </p>
          </details>

          {/* Was this helpful? -- stays directly under the result, since it's
              asking about the result specifically. The aggregate count/icon
              row lives up in the left column's action row instead. */}
          {hasResult && (
            <div className="flex items-center gap-2 rounded-lg bg-sand-50 px-4 py-2.5 ring-1 ring-moss-100">
              <p className="text-sm font-medium text-bark-700">Was this helpful?</p>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  disabled={sentiment !== null}
                  onClick={() => onVote('yes')}
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
                  onClick={() => onVote('no')}
                  aria-pressed={sentiment === 'no'}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition disabled:cursor-default ${
                    sentiment === 'no'
                      ? 'bg-bark-700 text-white ring-bark-700'
                      : 'bg-white text-bark-700 ring-moss-200 hover:bg-moss-50 disabled:hover:bg-white'
                  }`}
                >
                  No
                </button>
                {sentiment && <span className="text-xs text-bark-500">Thanks!</span>}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={exportPdf}
              disabled={!hasResult}
              className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3.5 py-2 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export Zone Result (PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
