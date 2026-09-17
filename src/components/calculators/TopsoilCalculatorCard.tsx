import type { TopsoilCalculatorState } from './useTopsoilCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface TopsoilCalculatorCardProps {
  calc: TopsoilCalculatorState;
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
 * TopsoilCalculator.tsx (minus the two static reference tables, which now
 * live in TopsoilReferenceTables.tsx so this sticky panel stays short),
 * driven entirely by the shared useTopsoilCalculatorState() hook instead of
 * owning its own state.
 */
export default function TopsoilCalculatorCard({ calc, sentiment, onVote }: TopsoilCalculatorCardProps) {
  const {
    mode,
    setMode,
    unitSystem,
    setUnitSystem,
    useCase,
    setUseCase,
    length,
    width,
    area,
    depth,
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
    exportPdf,
    reset,
  } = calc;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header -- includes Reset, since the sticky panel now
            contains only the tool itself (inputs, results, reset, and the
            "Was this helpful?" prompt). */}
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-white">
            Calculate Your Topsoil Needs
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

        <div className="flex flex-col gap-3 p-4">
          {/* Use case toggle + unit system toggle */}
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            <div>
              <span className="label-field">What are you doing?</span>
              <div className="mt-1.5 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={useCase === 'fill-bed'}
                  onClick={() => setUseCase('fill-bed')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    useCase === 'fill-bed'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Fill a bed
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={useCase === 'topdress-lawn'}
                  onClick={() => setUseCase('topdress-lawn')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    useCase === 'topdress-lawn'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Topdress a lawn
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
                  Imperial (ft, in)
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
                  Metric (m, cm)
                </button>
              </div>
            </div>
          </div>

          {/* Area input mode toggle */}
          <div>
            <span className="label-field">How do you want to enter your area?</span>
            <div className="mt-1.5 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
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
                aria-selected={mode === 'area'}
                onClick={() => setMode('area')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  mode === 'area'
                    ? 'bg-white text-moss-800 shadow-sm'
                    : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                Total area
              </button>
            </div>
          </div>

          {/* Inputs -- every dimension fits on ONE row at this panel width,
              with the depth guidance folded into a single full-width caption
              underneath instead of a caption inside the depth cell. */}
          <div>
            <div className="grid gap-4 sm:grid-cols-3">
              {mode === 'dimensions' ? (
                <>
                  <div>
                    <label htmlFor="topsoil-length" className="label-field">
                      Length <span className="text-bark-500">({lengthUnit})</span>
                    </label>
                    <input
                      id="topsoil-length"
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
                    <label htmlFor="topsoil-width" className="label-field">
                      Width <span className="text-bark-500">({lengthUnit})</span>
                    </label>
                    <input
                      id="topsoil-width"
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
              ) : (
                <div className="sm:col-span-2">
                  <label htmlFor="topsoil-area" className="label-field">
                    Total area <span className="text-bark-500">({areaUnit})</span>
                  </label>
                  <input
                    id="topsoil-area"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={area}
                    onChange={handleAreaChange}
                    className="input-field mt-1.5"
                  />
                </div>
              )}

              <div>
                <label htmlFor="topsoil-depth" className="label-field">
                  Desired depth <span className="text-bark-500">({depthUnit})</span>
                </label>
                <input
                  id="topsoil-depth"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step={useCase === 'fill-bed' ? '1' : '0.125'}
                  value={depth}
                  onChange={handleDepthChange}
                  className="input-field mt-1.5"
                />
              </div>
            </div>

            <p className="mt-2 text-xs text-bark-500">
              {useCase === 'fill-bed'
                ? (isMetric ? '20–30 cm is typical for raised beds.' : '8–12″ is typical for raised beds.')
                : (isMetric ? '0.5–1 cm is typical for topdressing a lawn.' : '0.25–0.5″ is typical for topdressing a lawn.')}
            </p>
          </div>

          {/* Formula display -- collapsed by default, same as the pilot, so
              this panel stays short enough to stick without an internal
              scrollbar. */}
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
              Cubic Feet = Length × Width × (Depth ÷ 12)
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Cubic Yards = Cubic Feet ÷ 27 &nbsp;·&nbsp; Tons ≈ Cubic Yards × 1.2
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Bags (40 lb) ≈ Cubic Feet ÷ 0.75
            </p>
          </details>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter an area and depth above to see how much topsoil you need.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  {/* Left: cubic feet */}
                  <div className="flex items-center gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                        <path d="M16 4c-3 4-5 7-5 11a5 5 0 0 0 10 0c0-4-2-7-5-11Z" />
                        <path d="M16 26c-2-3-4-5-4-8a4 4 0 0 1 8 0c0 3-2 5-4 8Z" opacity="0.5" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">You need approximately</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {round(result.cubicFeet, 1).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        cubic feet of topsoil
                        {isMetric && (
                          <span className="ml-1 text-bark-400">
                            ({round(result.cubicMeters, 2)} m³)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: tons + cubic yards */}
                  <div className="bg-moss-700 p-3.5">
                    <p className="text-xs text-moss-200">That's about</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      ~{round(result.tons, 2).toLocaleString()} tons
                    </p>
                    <p className="text-xs text-moss-200">
                      ({round(result.cubicYards, 2)} cu yd)
                    </p>
                    <p className="mt-1 text-xs text-moss-300">
                      Weight is approximate
                    </p>
                  </div>
                </div>

                {/* Bag count + caption + Export share ONE footer row: the bag
                    figure reads as a single line rather than a three-line
                    stat stack, and the Export button sits beside it instead
                    of claiming a row of its own. */}
                <div className="border-t border-moss-200 bg-white px-4 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-display text-2xl font-bold text-moss-700">
                      ~{result.bags40lb.toLocaleString()}{' '}
                      <span className="text-sm font-medium text-bark-600">
                        bags of topsoil (40 lb)
                      </span>
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
                  <p className="mt-0.5 text-xs text-bark-500">
                    For {round(result.sqft, 1).toLocaleString()} sq ft at {round(result.depthIn, 2)}&Prime; deep,
                    0.75 cu ft/bag. Add 10% for settling.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Was this helpful? -- stays directly under the result, since
              it's asking about the result specifically. The aggregate
              count/icon row lives up in the left column's action row
              instead. */}
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

          {/* The unit-conversion and depth-guideline reference tables used
              to live here, but they were the main reason this sticky panel
              needed an internal scrollbar to fit typical viewports. They
              now render in the normal page content instead (see
              TopsoilReferenceTables.tsx, portaled into the article), so
              this panel stays short enough to stick without scrolling. */}
        </div>
      </div>
    </div>
  );
}
