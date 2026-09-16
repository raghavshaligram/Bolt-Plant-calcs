import { ALL_ZONES, fmtDate } from '../../lib/frostZones';
import { CROPS } from './useSeedStartingCalculatorState';
import type { InputMode, SeedStartingCalculatorState } from './useSeedStartingCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

export interface SeedStartingCalculatorCardProps {
  calc: SeedStartingCalculatorState;
  /**
   * The sticky right panel keeps ONLY the tool: inputs, result, reset, and
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
 * SeedStartingCalculator.tsx, now driven entirely by the shared
 * useSeedStartingCalculatorState() hook instead of owning its own state.
 * That's what lets the left column's action row and the Share/Embed/Cite
 * modal (SeedStartingCalculatorPanel.tsx) read and reset the same
 * inputs/result even though they render in a different part of the DOM.
 *
 * The static "Seed Starting Timeline by Crop" reference table already lived
 * in the page's own article body (outside this component), not inside the
 * calculator card, so there is nothing to extract into a sibling
 * ReferenceTables component here -- see CALC_ROLLOUT_PATTERN.md.
 */
export default function SeedStartingCalculatorCard({ calc, sentiment, onVote }: SeedStartingCalculatorCardProps) {
  const {
    inputMode,
    setInputMode,
    zip,
    zone,
    setZone,
    cropId,
    setCropId,
    handleZipChange,
    zipLookup,
    activeZone,
    crop,
    result,
    zoneIsFrostFree,
    exportPdf,
    reset,
  } = calc;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header -- includes Reset, since the sticky panel now
            contains only the tool itself (inputs, result, reset, and the
            "Was this helpful?" prompt), same as the pilot pattern. The
            original component had no Reset button; this is new. */}
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-white">Seed Starting Calendar</h2>
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

        <div className="flex flex-col gap-2 p-4">
          <div>
            <span className="label-field">Find your zone by</span>
            <div className="mt-2 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist">
              {([
                { id: 'zip', label: 'ZIP Code' },
                { id: 'zone', label: 'Hardiness Zone' },
              ] as { id: InputMode; label: string }[]).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={inputMode === m.id}
                  onClick={() => setInputMode(m.id)}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    inputMode === m.id ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {inputMode === 'zip' ? (
            <div>
              <label htmlFor="ss-zip" className="label-field">US ZIP code</label>
              <input
                id="ss-zip"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                value={zip}
                onChange={handleZipChange}
                placeholder="e.g. 60601"
                className="input-field mt-1.5 max-w-[10rem]"
              />
              {zip.length === 5 && !zipLookup && (
                <p className="mt-2 text-sm text-amber-700">
                  We couldn&rsquo;t match that ZIP to a zone. Try the Hardiness Zone tab instead, or check{' '}
                  <a href="https://planthardiness.ars.usda.gov/" rel="noopener" className="underline">planthardiness.ars.usda.gov</a>.
                </p>
              )}
              {zipLookup && (
                <p className="mt-2 text-xs text-bark-500">
                  Estimated from nearest reference point: <strong className="text-bark-700">{zipLookup.refCity}</strong> (Zone {zipLookup.zone}) — same estimate method as our <a href="/calculators/frost-date-calculator/" className="underline">Frost Date Calculator</a>.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="ss-zone" className="label-field">USDA Plant Hardiness Zone</label>
              <select id="ss-zone" value={zone} onChange={(e) => setZone(e.target.value)} className="input-field mt-1.5 max-w-[10rem]">
                {ALL_ZONES.map((z) => (
                  <option key={z} value={z}>Zone {z}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-bark-500">
                Don&rsquo;t know your zone? Look it up at{' '}
                <a href="https://planthardiness.ars.usda.gov/" rel="noopener" className="underline">planthardiness.ars.usda.gov</a>.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="ss-crop" className="label-field">Crop</label>
            <select id="ss-crop" value={cropId} onChange={(e) => setCropId(e.target.value)} className="input-field mt-1.5">
              {CROPS.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <details className="group rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
            <summary className="cursor-pointer list-none font-medium marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                Estimate, not exact station data
                <svg className="h-3.5 w-3.5 text-amber-600 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <p className="mt-1.5">
              This calendar is a zone-based estimate, not exact station data — it&rsquo;s built directly on the same frost date logic as our Frost Date Calculator. Actual timing can vary by 1&ndash;3 weeks depending on your microclimate. Verify with your local extension office near a real planting deadline.
            </p>
          </details>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {zoneIsFrostFree ? (
              <div className="p-5">
                <p className="text-sm font-semibold text-moss-800">Zone {activeZone} rarely sees frost.</p>
                <p className="mt-1 text-sm text-bark-600">
                  Frost-based seed starting math doesn&rsquo;t apply here — plant on a temperature and rainfall-based calendar instead.
                </p>
              </div>
            ) : !result ? (
              <p className="p-5 text-sm text-bark-500">Enter a ZIP code or pick your hardiness zone to see your seed starting calendar.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 divide-y divide-moss-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  {result.method === 'indoor' ? (
                    <>
                      <div className="p-3.5">
                        <p className="text-xs text-bark-500">Start seeds indoors</p>
                        <p className="font-display text-xl font-bold text-moss-700 sm:text-2xl">{fmtDate(result.indoorStart!)}&ndash;{fmtDate(result.indoorEnd!)}</p>
                      </div>
                      <div className="bg-moss-700 p-3.5">
                        <p className="text-xs text-moss-200">Transplant outdoors</p>
                        <p className="font-display text-xl font-bold text-white sm:text-2xl">{fmtDate(result.transplantStart!)}&ndash;{fmtDate(result.transplantEnd!)}</p>
                      </div>
                    </>
                  ) : (
                    <div className="p-3.5 sm:col-span-2">
                      <p className="text-xs text-bark-500">Direct sow outdoors</p>
                      <p className="font-display text-xl font-bold text-moss-700 sm:text-2xl">{fmtDate(result.directSowStart!)}&ndash;{fmtDate(result.directSowEnd!)}</p>
                      <p className="mt-1 text-xs text-bark-500">{crop.name} doesn&rsquo;t transplant well — sow it directly in the ground.</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-moss-200 bg-white px-4 py-2 text-xs text-bark-600">
                  <strong className="text-bark-700">Estimated last spring frost:</strong> {fmtDate(result.lastStart)}&ndash;{fmtDate(result.lastEnd)}. {crop.note}
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={exportPdf}
              disabled={!result}
              className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export Seed Starting Calendar (PDF)
            </button>
          </div>

          {/* Was this helpful? -- stays directly under the result, since it's
              asking about the result specifically. The aggregate count/icon
              row lives up in the left column's action row instead. */}
          {result && (
            <div className="flex items-center gap-2 rounded-lg bg-sand-50 px-4 py-1.5 ring-1 ring-moss-100">
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
