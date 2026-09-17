import { GRASS_PRESETS } from './useGrassSeedCalculatorState';
import type { GrassSeedCalculatorState } from './useGrassSeedCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface GrassSeedCalculatorCardProps {
  calc: GrassSeedCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * GrassSeedCalculator.tsx (minus the static "Grass seed rate reference by
 * type" table, now extracted into GrassSeedReferenceTables.tsx per
 * CALC_ROLLOUT_PATTERN.md), now driven entirely by the shared
 * useGrassSeedCalculatorState() hook instead of owning its own state.
 * That's what lets the left column's action row and the Share/Embed/Cite
 * modal (GrassSeedCalculatorPanel.tsx) read and reset the same
 * inputs/result even though they render in a different part of the DOM.
 */
export default function GrassSeedCalculatorCard({ calc, sentiment, onVote }: GrassSeedCalculatorCardProps) {
  const {
    mode,
    setMode,
    setUnitSystem,
    seedingMode,
    setSeedingMode,
    grass,
    setGrass,
    length,
    width,
    sqft,
    acres,
    ratePer1000,
    isMetric,
    lengthUnit,
    areaUnit,
    bigAreaLabel,
    bigAreaUnit,
    handleLengthChange,
    handleWidthChange,
    handleSqftChange,
    handleAcresChange,
    result,
    hasResult,
    exportPdf,
    reset,
  } = calc;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header -- includes Reset, since the sticky panel now contains
            only the tool itself (inputs, results, reset, and the "Was this
            helpful?" prompt), same as the pilot's card. The original
            component had no Reset button; this is added new per the
            rollout pattern. */}
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-white">
            Calculate Your Grass Seed Needs
          </h2>
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

        <div className="flex flex-col gap-3 p-5">
          {/* Seeding mode toggle + unit system toggle */}
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            <div>
              <span className="label-field">What are you doing?</span>
              <div className="mt-1.5 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={seedingMode === 'new-lawn'}
                  onClick={() => setSeedingMode('new-lawn')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    seedingMode === 'new-lawn'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  New lawn
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={seedingMode === 'overseeding'}
                  onClick={() => setSeedingMode('overseeding')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    seedingMode === 'overseeding'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Overseeding
                </button>
              </div>
            </div>

            <div>
              <span className="label-field">Units</span>
              <div className="mt-1.5 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
                <button
                  type="button"
                  aria-pressed={!isMetric}
                  onClick={() => setUnitSystem('imperial')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    !isMetric
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Imperial
                </button>
                <button
                  type="button"
                  aria-pressed={isMetric}
                  onClick={() => setUnitSystem('metric')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isMetric
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Metric
                </button>
              </div>
            </div>
          </div>

          {/* Area input mode toggle */}
          <div>
            <span className="label-field">How do you want to enter your area?</span>
            <div className="mt-1.5 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'dimensions'}
                onClick={() => setMode('dimensions')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  mode === 'dimensions'
                    ? 'bg-white text-moss-800 shadow-sm'
                    : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                Length &times; width
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'sqft'}
                onClick={() => setMode('sqft')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  mode === 'sqft'
                    ? 'bg-white text-moss-800 shadow-sm'
                    : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                Total {areaUnit}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'acres'}
                onClick={() => setMode('acres')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  mode === 'acres'
                    ? 'bg-white text-moss-800 shadow-sm'
                    : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                {bigAreaLabel}
              </button>
            </div>
          </div>

          {/* Grass type + the area itself share one row: at 560px the seed-type
              select and both dimensions sit side by side comfortably, and
              that recovered row is what keeps this card inside the sticky
              column's height budget without tightening any spacing. The
              recommended-rate line sits under the whole row so it keeps the
              full width and stays on one line. */}
          <div>
            <div className={`grid gap-4 ${mode === 'dimensions' ? 'sm:grid-cols-[1.4fr_1fr_1fr]' : 'sm:grid-cols-2'}`}>
              <div>
                <label htmlFor="gs-grass" className="label-field">Grass type</label>
                <select
                  id="gs-grass"
                  value={grass}
                  onChange={(e) => setGrass(e.target.value)}
                  className="input-field mt-1.5"
                >
                  {GRASS_PRESETS.map((p) => (
                    <option key={p.name} value={p.name}>{p.name}</option>
                  ))}
                </select>
              </div>

              {mode === 'dimensions' && (
                <>
                  <div>
                    <label htmlFor="gs-length" className="label-field">
                      Length <span className="text-bark-500">({lengthUnit})</span>
                    </label>
                    <input
                      id="gs-length"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={length}
                      onChange={handleLengthChange}
                      className="input-field mt-1.5"
                    />
                  </div>
                  <div>
                    <label htmlFor="gs-width" className="label-field">
                      Width <span className="text-bark-500">({lengthUnit})</span>
                    </label>
                    <input
                      id="gs-width"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={width}
                      onChange={handleWidthChange}
                      className="input-field mt-1.5"
                    />
                  </div>
                </>
              )}

              {mode === 'sqft' && (
                <div>
                  <label htmlFor="gs-sqft" className="label-field">
                    Total area <span className="text-bark-500">({areaUnit})</span>
                  </label>
                  <input
                    id="gs-sqft"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={sqft}
                    onChange={handleSqftChange}
                    className="input-field mt-1.5"
                  />
                </div>
              )}

              {mode === 'acres' && (
                <div>
                  <label htmlFor="gs-acres" className="label-field">
                    Total area <span className="text-bark-500">({bigAreaUnit})</span>
                  </label>
                  <input
                    id="gs-acres"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={acres}
                    onChange={handleAcresChange}
                    className="input-field mt-1.5"
                  />
                </div>
              )}
            </div>

            <p className="mt-1.5 text-xs text-bark-500">
              Recommended rate: {ratePer1000} lb per 1,000 sq ft for {seedingMode === 'new-lawn' ? 'a new lawn' : 'overseeding'}.
            </p>
          </div>

          {/* Formula display -- collapsed by default. It's useful reference,
              not something most visitors need open while they work, and
              keeping it closed is most of what lets this panel stay short
              enough to stick without an internal scrollbar. */}
          <details className="group rounded-lg bg-sand-50 px-4 py-2 text-sm text-bark-600 ring-1 ring-moss-100">
            <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                Show the math
                <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">
              Seed (lb) = (Area &divide; 1,000) &times; Rate per 1,000 sq ft
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              50 lb Bags = Seed (lb) &divide; 50, rounded up
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Rate per Acre = Rate per 1,000 sq ft &times; 43.56
            </p>
          </details>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your lawn area above to see how much grass seed you need.
              </p>
            ) : (
              <>
                {/* Slightly wider left cell: it carries the icon plus the
                    grass-name line, which wraps on the longer presets at an
                    even 50/50 split. */}
                <div className="grid grid-cols-[1.2fr_1fr] divide-x divide-moss-200">
                  {/* Left: total pounds */}
                  <div className="flex items-center gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                        <path d="M16 4c-3 4-5 7-5 11a5 5 0 0 0 10 0c0-4-2-7-5-11Z" />
                        <path d="M16 26c-2-3-4-5-4-8a4 4 0 0 1 8 0c0 3-2 5-4 8Z" opacity="0.5" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">You need about</p>
                      {/* The metric equivalent rides alongside the headline
                          number rather than on the unit line below it: with a
                          long grass name ("kentucky bluegrass") that line
                          wrapped to two lines and cost the card a row. */}
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {round(result.totalLb, 1).toLocaleString()}
                        {isMetric && (
                          <span className="ml-1.5 text-sm font-medium text-bark-400">
                            ({round(result.totalKg, 1)} kg)
                          </span>
                        )}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        lb of {grass.toLowerCase()} seed
                      </p>
                    </div>
                  </div>

                  {/* Right: bags */}
                  <div className="bg-moss-700 p-3.5">
                    <p className="text-xs text-moss-200">That&rsquo;s about</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {result.bags.toLocaleString()} {result.bags === 1 ? 'bag' : 'bags'}
                    </p>
                    <p className="text-xs text-moss-200">
                      (50 lb bags) &middot; {round(result.totalSqft, 0).toLocaleString()} sq ft
                    </p>
                  </div>
                </div>

                {/* The rate-per-1,000-sq-ft figure is already stated in the
                    grass type helper text above, so only the derived
                    per-acre stat (not shown anywhere else) is kept here --
                    trims the duplication without dropping information. */}
                <div className="border-t border-moss-200 px-4 py-1.5">
                  <p className="text-xs font-medium text-bark-600">
                    &asymp; {round(result.ratePerAcre, 1).toLocaleString()} lb/acre{' '}
                    <span className="font-normal text-bark-400">
                      (~{round(result.bagsPerAcre, 1)} bags of 50 lb per acre)
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2">
                  <p className="text-xs text-bark-500">
                    Buy extra for edges and touch-ups.
                  </p>
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3.5 py-2 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Export PDF
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Was this helpful? -- stays directly under the result, since it's
              asking about the result specifically. None of the 24 original
              calculators had this; it's added new per the rollout pattern. */}
          {hasResult && (
            <div className="flex items-center gap-2 rounded-lg bg-sand-50 px-4 py-2 ring-1 ring-moss-100">
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

          {/* The "Grass seed rate reference by type" table used to live here,
              but it was the main reason this sticky panel needed an internal
              scrollbar to fit typical viewports. It now renders in the
              normal page content instead (see GrassSeedReferenceTables.tsx,
              portaled into the article), so this panel stays short enough
              to stick without scrolling. */}
        </div>
      </div>
    </div>
  );
}
