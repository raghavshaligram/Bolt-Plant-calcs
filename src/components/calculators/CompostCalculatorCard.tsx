import type { CompostCalculatorState } from './useCompostCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface CompostCalculatorCardProps {
  calc: CompostCalculatorState;
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
 * CompostCalculator.tsx, now driven entirely by the shared
 * useCompostCalculatorState() hook instead of owning its own state. That's
 * what lets the left column's action row and the Share/Embed/Cite modal
 * (CompostCalculatorPanel.tsx) read and reset the same inputs/result even
 * though they render in a different part of the DOM.
 */
export default function CompostCalculatorCard({ calc, sentiment, onVote }: CompostCalculatorCardProps) {
  const {
    mode,
    setMode,
    unitSystem,
    setUnitSystem,
    length,
    width,
    area,
    depth,
    bagSize,
    setBagSize,
    isMetric,
    lengthUnit,
    depthUnit,
    areaUnit,
    handleLengthChange,
    handleWidthChange,
    handleAreaChange,
    handleDepthChange,
    result,
    hasResult,
    parsedBagSize,
    exportPdf,
    reset,
  } = calc;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header -- includes Reset/Clear, since the sticky panel now
            contains only the tool itself (inputs, results, reset, and the
            "Was this helpful?" prompt), matching the raised-bed-soil pilot. */}
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-white">Compost Calculator</h2>
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
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="label-field">Enter area as</span>
              <div className="mt-1.5 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'dimensions'}
                  onClick={() => setMode('dimensions')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'dimensions' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  L &times; W
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'area'}
                  onClick={() => setMode('area')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'area' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Area
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
                    !isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Imperial
                </button>
                <button
                  type="button"
                  aria-pressed={isMetric}
                  onClick={() => setUnitSystem('metric')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Metric
                </button>
              </div>
            </div>
          </div>

          {mode === 'dimensions' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="compost-length" className="label-field">Length ({lengthUnit})</label>
                <input id="compost-length" type="number" inputMode="decimal" min="0" step="0.1"
                  value={length} onChange={handleLengthChange} className="input-field mt-1.5" />
              </div>
              <div>
                <label htmlFor="compost-width" className="label-field">Width ({lengthUnit})</label>
                <input id="compost-width" type="number" inputMode="decimal" min="0" step="0.1"
                  value={width} onChange={handleWidthChange} className="input-field mt-1.5" />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="compost-area" className="label-field">Total area ({areaUnit})</label>
              <input id="compost-area" type="number" inputMode="decimal" min="0" step="1"
                value={area} onChange={handleAreaChange} className="input-field mt-1.5" />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="compost-depth" className="label-field">
                Depth ({depthUnit}) <span className="text-bark-500">(1-3&Prime; top-dressing, deeper for mixing in)</span>
              </label>
              <input id="compost-depth" type="number" inputMode="decimal" min="0" step="0.1"
                value={depth} onChange={handleDepthChange} className="input-field mt-1.5" />
            </div>
            <div>
              <label htmlFor="compost-bagsize" className="label-field">Bag size (cu ft)</label>
              <select id="compost-bagsize" value={bagSize} onChange={(e) => setBagSize(e.target.value as typeof bagSize)} className="input-field mt-1.5">
                <option value="1">1 cu ft</option>
                <option value="1.5">1.5 cu ft</option>
                <option value="2">2 cu ft</option>
              </select>
            </div>
          </div>

          {/* Formula display -- collapsed by default, same as the pilot, to
              help keep this panel short enough to stick without an
              internal scrollbar. */}
          <details className="group rounded-lg bg-sand-50 px-4 py-1.5 text-sm text-bark-600 ring-1 ring-moss-100">
            <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                Show the math
                <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">
              Cubic feet = Area &times; (Depth &divide; 12) <span className="text-bark-400">(depth in inches)</span>
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Weight (lb) &asymp; Cubic feet &times; 44-50
            </p>
          </details>

          <div id="compost-results" className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">Enter your area and depth to see how much compost you need.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-y divide-moss-200 sm:grid-cols-4 sm:divide-y-0">
                  <div className="p-3.5">
                    <p className="text-xs text-bark-500">Cubic feet</p>
                    <p className="font-display text-xl font-bold text-moss-700 sm:text-2xl">{round(result.cubicFeet, 1)}</p>
                  </div>
                  <div className="p-3.5">
                    <p className="text-xs text-bark-500">Cubic yards</p>
                    <p className="font-display text-xl font-bold text-moss-700 sm:text-2xl">{round(result.cubicYards, 2)}</p>
                  </div>
                  <div className="p-3.5">
                    <p className="text-xs text-bark-500">Bags ({parsedBagSize || 1.5} cu ft)</p>
                    <p className="font-display text-xl font-bold text-moss-700 sm:text-2xl">{result.bags}</p>
                  </div>
                  <div className="bg-moss-700 p-3.5">
                    <p className="text-xs text-moss-200">Est. weight</p>
                    <p className="font-display text-xl font-bold text-white sm:text-2xl">
                      {round(result.weightLbLow, 0)}&ndash;{round(result.weightLbHigh, 0)}
                    </p>
                    <p className="text-xs text-moss-200">lb ({round(result.weightLbMid * 0.453592, 0)} kg)</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-1.5">
                  <p className="text-xs text-bark-500">
                    Actual weight varies with moisture and material.
                  </p>
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
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
              asking about the result specifically. The aggregate count/icon
              row lives up in the left column's action row instead. */}
          {hasResult && (
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
