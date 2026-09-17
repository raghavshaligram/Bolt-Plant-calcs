import { CROPS } from './useVegetableYieldCalculatorState';
import type { VegetableYieldCalculatorState } from './useVegetableYieldCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface VegetableYieldCalculatorCardProps {
  calc: VegetableYieldCalculatorState;
  /**
   * The sticky right panel keeps ONLY the tool: inputs, results, reset, and
   * this "Was this helpful?" Yes/No prompt directly under the result.
   * Sentiment/onVote come from the same useCalculatorFeedback() instance
   * that backs the compact thumbs-with-count icon up in the left column, so
   * a vote from either place updates both immediately.
   */
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * VegetableYieldCalculator.tsx, now driven entirely by the shared
 * useVegetableYieldCalculatorState() hook instead of owning its own state.
 * That's what lets the left column's action row and the Share/Embed/Cite
 * modal (VegetableYieldCalculatorPanel.tsx) read and reset the same
 * inputs/result even though they render in a different part of the DOM.
 */
export default function VegetableYieldCalculatorCard({ calc, sentiment, onVote }: VegetableYieldCalculatorCardProps) {
  const {
    mode,
    setMode,
    cropId,
    setCropId,
    plants,
    area,
    isMetric,
    areaUnit,
    weightUnit,
    handleUnitToggle,
    handlePlantsChange,
    handleAreaChange,
    crop,
    result,
    hasResult,
    exportPdf,
    reset,
  } = calc;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header -- includes Reset/Clear, since the sticky panel now
            contains only the tool itself (inputs, results, reset, and the
            "Was this helpful?" prompt), matching the raised-bed-soil pilot. */}
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3.5">
          <h2 className="font-display text-lg font-semibold text-white">
            Vegetable Yield Calculator
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

        <div className="flex flex-col gap-4 p-5">
          {/* Mode + unit toggles -- two sibling toggle groups share one row
              rather than a 50/50 grid, so the short Units group only takes
              the width it needs (see CALC_SPACING_PATTERN.md). */}
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            <div>
              <span className="label-field">Estimate by</span>
              <div className="mt-1.5 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'plants'}
                  onClick={() => setMode('plants')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    mode === 'plants'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Number of Plants
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'area'}
                  onClick={() => setMode('area')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    mode === 'area'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Growing Area
                </button>
              </div>
            </div>

            {mode === 'area' && (
              <div>
                <span className="label-field">Units</span>
                <div className="mt-1.5 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
                  <button
                    type="button"
                    aria-pressed={!isMetric}
                    onClick={() => handleUnitToggle('imperial')}
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
                    onClick={() => handleUnitToggle('metric')}
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
            )}
          </div>

          {/* Crop selector + the plants/area input share one row -- at 560px
              a select and a number input sit comfortably side by side, and
              each one's helper line fills the space under its own control. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="vyc-crop" className="label-field">Crop</label>
              <select
                id="vyc-crop"
                value={cropId}
                onChange={(e) => setCropId(e.target.value)}
                className="input-field mt-1.5"
              >
                {CROPS.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <p className="mt-1.5 text-xs text-bark-500">
                {crop.note}
              </p>
            </div>

            {mode === 'plants' ? (
              <div>
                <label htmlFor="vyc-plants" className="label-field">Number of plants</label>
                <input
                  id="vyc-plants"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  value={plants}
                  onChange={handlePlantsChange}
                  className="input-field mt-1.5"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="vyc-area" className="label-field">
                  Growing area <span className="text-bark-500">({areaUnit})</span>
                </label>
                <input
                  id="vyc-area"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={area}
                  onChange={handleAreaChange}
                  className="input-field mt-1.5"
                />
                <p className="mt-1.5 text-xs text-bark-500">
                  Plant count is estimated at {crop.sqftPerPlant} sq ft per {crop.name.toLowerCase()} plant.
                </p>
              </div>
            )}
          </div>

          {/* Formula display -- collapsed by default, same as the pilot, to
              help keep this panel short enough to stick without an
              internal scrollbar. */}
          <details className="group rounded-lg bg-sand-50 px-4 py-2.5 text-sm text-bark-600 ring-1 ring-moss-100">
            <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                Show the math
                <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            {mode === 'plants' ? (
              <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">
                Total yield = Number of plants &times; Yield per plant
              </p>
            ) : (
              <>
                <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">
                  Plants = Area &divide; Sq ft per plant
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  Total yield = Plants &times; Yield per plant
                </p>
              </>
            )}
          </details>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult || !result ? (
              <p className="p-5 text-sm text-bark-500">
                Enter {mode === 'plants' ? 'a number of plants' : 'a growing area'} above to estimate your yield.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-center gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2c3 4 6 8 6 12a6 6 0 0 1-12 0c0-4 3-8 6-12Z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">Estimated total yield</p>
                      <p className="font-display text-3xl font-bold text-moss-700">
                        {round(isMetric ? result.totalKg : result.totalLbs, 1).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">{weightUnit}</p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-4">
                    <p className="text-xs text-moss-200">Plants</p>
                    <p className="font-display text-xl font-bold text-white">
                      {result.plantCount.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-moss-200">{crop.name}</p>
                    <p className="mt-2 text-xs text-moss-300">
                      ~{crop.yieldPerPlantLbs} lbs per plant
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    Estimate only — real yield varies with variety, climate, soil, and care.
                  </p>
                  <div className="flex justify-end">
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
                </div>
              </>
            )}
          </div>

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
        </div>
      </div>
    </div>
  );
}
