import { ALL_ZONES, fmtDate } from '../../lib/frostZones';
import type { FrostDateCalculatorState } from './useFrostDateCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

export interface FrostDateCalculatorCardProps {
  calc: FrostDateCalculatorState;
  /**
   * The sticky right panel keeps ONLY the tool: inputs, results, reset, and
   * this "Was this helpful?" Yes/No prompt directly under the result (it's
   * asking about the result specifically, so it stays here rather than
   * moving to the left column's action row). Sentiment/onVote come from the
   * same useCalculatorFeedback() instance that backs the compact
   * thumbs-with-count icon up in the left column, so a vote from either
   * place updates both immediately.
   */
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * FrostDateCalculator.tsx, now driven entirely by the shared
 * useFrostDateCalculatorState() hook instead of owning its own state.
 * That's what lets the left column's action row and the Share/Embed/Cite
 * modal (FrostDateCalculatorPanel.tsx) read and reset the same
 * inputs/result even though they render in a different part of the DOM.
 *
 * The original component had no Reset button; one is added here in the
 * header, same as the pilot pattern.
 */
export default function FrostDateCalculatorCard({ calc, sentiment, onVote }: FrostDateCalculatorCardProps) {
  const { inputMode, setInputMode, zip, zone, setZone, handleZipChange, zipLookup, activeZone, result, exportPdf, reset } = calc;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3.5">
          <h2 className="font-display text-lg font-semibold text-white">Frost Date Calculator</h2>
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
          {/* The lookup method and the value it asks for share one row at
              560px -- the toggle group and a 10rem field sit side by side
              with room to spare -- and the helper line underneath gets the
              full width so it stays on one line. */}
          <div>
            <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
              <div>
                <span className="label-field">Find your zone by</span>
                <div className="mt-1.5 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist">
                  {([
                    { id: 'zip', label: 'ZIP Code' },
                    { id: 'zone', label: 'Hardiness Zone' },
                  ] as { id: 'zip' | 'zone'; label: string }[]).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="tab"
                      aria-selected={inputMode === m.id}
                      onClick={() => setInputMode(m.id)}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                        inputMode === m.id ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {inputMode === 'zip' ? (
                <div className="w-40">
                  <label htmlFor="fd-zip" className="label-field">US ZIP code</label>
                  <input
                    id="fd-zip"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={5}
                    value={zip}
                    onChange={handleZipChange}
                    placeholder="e.g. 60601"
                    className="input-field mt-1.5"
                  />
                </div>
              ) : (
                <div className="w-48">
                  <label htmlFor="fd-zone" className="label-field">USDA Hardiness Zone</label>
                  <select id="fd-zone" value={zone} onChange={(e) => setZone(e.target.value)} className="input-field mt-1.5">
                    {ALL_ZONES.map((z) => (
                      <option key={z} value={z}>Zone {z}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {inputMode === 'zip' ? (
              <>
                {zip.length === 5 && !zipLookup && (
                  <p className="mt-1.5 text-sm text-amber-700">
                    We couldn&rsquo;t match that ZIP to a zone. Try the Hardiness Zone tab instead, or check your zone at{' '}
                    <a href="https://planthardiness.ars.usda.gov/" rel="noopener" className="underline">planthardiness.ars.usda.gov</a>.
                  </p>
                )}
                {zipLookup && (
                  <p className="mt-1.5 text-xs text-bark-500">
                    Estimated from nearest reference point: <strong className="text-bark-700">{zipLookup.refCity}</strong> (Zone {zipLookup.zone}).
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1.5 text-xs text-bark-500">
                Don&rsquo;t know your zone? Look it up at{' '}
                <a href="https://planthardiness.ars.usda.gov/" rel="noopener" className="underline">planthardiness.ars.usda.gov</a>.
              </p>
            )}
          </div>

          <details className="group rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-800 ring-1 ring-amber-200">
            <summary className="cursor-pointer list-none font-medium marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                About these estimates
                <svg className="h-3.5 w-3.5 text-amber-600 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <p className="mt-1.5">
              These are zone-based estimates, not exact station data for your address. Actual frost timing can vary by 1&ndash;3 weeks depending on elevation, nearby water, and urban vs. open ground. Verify with your local extension office before a planting deadline that matters.
            </p>
          </details>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!result ? (
              <p className="p-5 text-sm text-bark-500">Enter a ZIP code or pick your hardiness zone to see estimated frost dates.</p>
            ) : result.data.frostFree ? (
              <div className="p-5">
                <p className="text-sm font-semibold text-moss-800">Zone {activeZone} rarely sees frost.</p>
                <p className="mt-1 text-sm text-bark-600">
                  Plant on a temperature and rainfall-based calendar rather than a frost-based one — check regional planting guides for your area&rsquo;s wet/dry or hot/cool seasons instead.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 divide-x divide-moss-200">
                  <div className="p-4">
                    <p className="text-xs text-bark-500">Last spring frost</p>
                    <p className="font-display text-lg font-bold text-moss-700 sm:text-xl">{fmtDate(result.lastStart)}&ndash;{fmtDate(result.lastEnd)}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-bark-500">First fall frost</p>
                    <p className="font-display text-lg font-bold text-moss-700 sm:text-xl">{fmtDate(result.firstStart)}&ndash;{fmtDate(result.firstEnd)}</p>
                  </div>
                  <div className="bg-moss-700 p-4">
                    <p className="text-xs text-moss-200">Growing season</p>
                    <p className="font-display text-lg font-bold text-white sm:text-xl">~{result.seasonLength} days</p>
                  </div>
                </div>
                <div className="border-t border-moss-200 bg-white px-4 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-bark-500">Planting timeline</p>
                    <button
                      type="button"
                      onClick={exportPdf}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-moss-50 px-3.5 py-2 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Export PDF
                    </button>
                  </div>
                  <ul className="mt-2 space-y-2 text-sm text-bark-700">
                    <li><strong className="text-bark-900">{fmtDate(result.timeline!.coldHardySeedsStart)}&ndash;{fmtDate(result.timeline!.coldHardySeedsEnd)}:</strong> start cold-hardy seeds indoors</li>
                    <li><strong className="text-bark-900">{fmtDate(result.timeline!.warmSeedsStart)}&ndash;{fmtDate(result.timeline!.warmSeedsEnd)}:</strong> start warm-season seeds indoors (tomatoes, peppers)</li>
                    <li><strong className="text-bark-900">{fmtDate(result.timeline!.coldHardyTransplantStart)}&ndash;{fmtDate(result.timeline!.coldHardyTransplantEnd)}:</strong> transplant cold-hardy seedlings outdoors</li>
                    <li><strong className="text-bark-900">After {fmtDate(result.timeline!.tenderSafeDate)}:</strong> safe to transplant tender crops outdoors</li>
                    <li><strong className="text-bark-900">{fmtDate(result.timeline!.fallSeedsStart)}&ndash;{fmtDate(result.timeline!.fallSeedsEnd)}:</strong> start fall crop seeds</li>
                    <li><strong className="text-bark-900">By {fmtDate(result.timeline!.lastTenderDate)}:</strong> protect or harvest tender crops</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          {(!result || result.data.frostFree) && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={exportPdf}
                disabled={!result}
                className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3.5 py-2 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Export Planting Calendar (PDF)
              </button>
            </div>
          )}

          {/* Was this helpful? -- stays directly under the result, since
              it's asking about the result specifically. The aggregate
              count/icon row lives up in the left column's action row
              instead. None of the 24 calculators had this yet; adding new,
              same as the pilot did. */}
          {result && (
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
        </div>
      </div>
    </div>
  );
}
