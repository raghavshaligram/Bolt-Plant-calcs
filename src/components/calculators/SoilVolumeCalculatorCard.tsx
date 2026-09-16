import { BAG_SIZES_QT } from './useSoilVolumeCalculatorState';
import type { SoilVolumeCalculatorState } from './useSoilVolumeCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface SoilVolumeCalculatorCardProps {
  calc: SoilVolumeCalculatorState;
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
 * SoilVolumeCalculator.tsx (minus the static reference tables, now in
 * SoilVolumeReferenceTables.tsx), driven entirely by the shared
 * useSoilVolumeCalculatorState() hook instead of owning its own state.
 */
export default function SoilVolumeCalculatorCard({ calc, sentiment, onVote }: SoilVolumeCalculatorCardProps) {
  const {
    shape,
    setShape,
    setUnitSystem,
    length,
    width,
    diameter,
    depth,
    isMetric,
    lengthUnit,
    depthUnit,
    handleLengthChange,
    handleWidthChange,
    handleDiameterChange,
    handleDepthChange,
    result,
    hasResult,
    exportPdf,
    reset,
  } = calc;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header */}
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-1.5">
          <h2 className="font-display text-lg font-semibold text-white">
            Calculate Your Soil Volume
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

        <div className="flex flex-col gap-1 p-2.5">
          {/* Shape + Units toggles */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="label-field leading-none">Shape</span>
              <div className="mt-1 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={shape === 'rectangle'}
                  onClick={() => setShape('rectangle')}
                  className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${
                    shape === 'rectangle'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Rectangle
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={shape === 'cylinder'}
                  onClick={() => setShape('cylinder')}
                  className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${
                    shape === 'cylinder'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Cylinder / Pot
                </button>
              </div>
            </div>

            <div>
              <span className="label-field leading-none">Units</span>
              <div className="mt-1 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
                <button
                  type="button"
                  aria-pressed={!isMetric}
                  onClick={() => setUnitSystem('imperial')}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition ${
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
                  className={`rounded-md px-3 py-1 text-sm font-medium transition ${
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

          {/* Inputs */}
          <div className="grid gap-2 sm:grid-cols-2">
            {shape === 'rectangle' ? (
              <>
                <div>
                  <label htmlFor="sv-length" className="label-field leading-none">
                    Length <span className="text-bark-500">({lengthUnit})</span>
                  </label>
                  <input
                    id="sv-length"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={length}
                    onChange={handleLengthChange}
                    className="input-field mt-1 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="sv-width" className="label-field leading-none">
                    Width <span className="text-bark-500">({lengthUnit})</span>
                  </label>
                  <input
                    id="sv-width"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={width}
                    onChange={handleWidthChange}
                    className="input-field mt-1 py-2"
                  />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label htmlFor="sv-diameter" className="label-field leading-none">
                  Diameter <span className="text-bark-500">({lengthUnit})</span>
                </label>
                <input
                  id="sv-diameter"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.25"
                  value={diameter}
                  onChange={handleDiameterChange}
                  className="input-field mt-1 py-2"
                />
                {!isMetric && (
                  <p className="mt-1 text-xs text-bark-500">
                    In feet: 6&Prime; pot&nbsp;= 0.5&nbsp;ft, 12&Prime;&nbsp;= 1&nbsp;ft, 16&Prime;&nbsp;= 1.33&nbsp;ft, 24&Prime;&nbsp;= 2&nbsp;ft.
                  </p>
                )}
              </div>
            )}

            <div className="sm:col-span-2">
              <label htmlFor="sv-depth" className="label-field leading-none">
                Fill depth <span className="text-bark-500">({depthUnit})</span>
              </label>
              <input
                id="sv-depth"
                type="number"
                inputMode="decimal"
                min="0"
                step={shape === 'cylinder' ? '0.5' : '1'}
                value={depth}
                onChange={handleDepthChange}
                className="input-field mt-1 py-2"
              />
              <p className="mt-1 text-xs text-bark-500">
                {shape === 'cylinder'
                  ? (isMetric ? 'Leave 3–5 cm from the rim for watering headspace.' : 'Leave 1–2″ from the rim for watering headspace.')
                  : (isMetric ? 'Typical raised bed: 20–30 cm. New lawn: 10–15 cm.' : 'Typical raised bed: 6–12″. New lawn: 4–6″.')}
              </p>
            </div>
          </div>

          {/* Formula display -- collapsed by default, same as the pilot, to
              keep this panel short enough to stick without an internal
              scrollbar. */}
          <details className="group rounded-lg bg-sand-50 px-4 py-1 text-sm text-bark-600 ring-1 ring-moss-100">
            <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                Show the math
                <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            {shape === 'rectangle' ? (
              <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">
                Cubic Feet = Length × Width × (Depth ÷ 12)
              </p>
            ) : (
              <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">
                Cubic Feet = π × (Diameter ÷ 2)² × (Depth ÷ 12)
              </p>
            )}
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Liters = Cubic Feet × 28.32 &nbsp;·&nbsp; Cu Yd = Cubic Feet ÷ 27
            </p>
          </details>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter dimensions and fill depth above to see your soil volume.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  {/* Left: cubic feet */}
                  <div className="flex items-center gap-3 p-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                        <path d="M16 4c-3 4-5 7-5 11a5 5 0 0 0 10 0c0-4-2-7-5-11Z" />
                        <path d="M16 26c-2-3-4-5-4-8a4 4 0 0 1 8 0c0 3-2 5-4 8Z" opacity="0.5" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">You need approximately</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {round(result.cubicFeet, 2).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        cubic feet of soil
                        {isMetric && (
                          <span className="ml-1 text-bark-400">
                            ({round(result.cubicMeters, 3)} m³)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: liters + cubic yards */}
                  <div className="bg-moss-700 p-2.5">
                    <p className="text-xs text-moss-200">That's about</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {round(result.liters, 1).toLocaleString()} L
                    </p>
                    <p className="text-xs text-moss-200">
                      ({round(result.cubicYards, 2)} cu yd)
                    </p>
                    <p className="mt-1 text-xs text-moss-300">
                      Liters useful for bag shopping
                    </p>
                  </div>
                </div>

                <div className="border-t border-moss-100 bg-moss-50/60 px-4 py-1.5">
                  <p className="text-xs font-medium uppercase tracking-wider text-bark-400">
                    Or buy in bags (standard retail potting mix sizes)
                  </p>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {BAG_SIZES_QT.map((qt) => (
                      <div key={qt} className="rounded-lg bg-white px-3 py-1 text-center ring-1 ring-moss-100">
                        <p className="font-display text-lg font-bold text-moss-700">
                          {result.bagCounts[qt].toLocaleString()}
                        </p>
                        <p className="text-xs text-bark-500">&times; {qt} qt bags</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-1">
                  <p className="text-xs text-bark-500">
                    ~{round(result.weightLbs, 0).toLocaleString()} lbs&nbsp;/&nbsp;~{round(result.weightKg, 0).toLocaleString()} kg &mdash; est. weight at 40 lbs/cu ft.
                    Add 10–15% for settling.
                  </p>
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
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
            <div className="flex items-center gap-2 rounded-lg bg-sand-50 px-4 py-1 ring-1 ring-moss-100">
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

          {/* The common pot-size and raised-bed-size reference tables used to
              live here, but they were the main reason this sticky panel
              needed an internal scrollbar to fit typical viewports. They now
              render in the normal page content instead (see
              SoilVolumeReferenceTables.tsx, portaled into the article), so
              this panel stays short enough to stick without scrolling. */}
        </div>
      </div>
    </div>
  );
}
