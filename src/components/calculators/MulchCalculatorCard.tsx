import { PINE_STRAW_SQFT_PER_BALE_AT_2IN } from './useMulchCalculatorState';
import type { MulchCalculatorState } from './useMulchCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface MulchCalculatorCardProps {
  calc: MulchCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * MulchCalculator.tsx (minus the two static reference tables, now extracted
 * into MulchReferenceTables.tsx per CALC_ROLLOUT_PATTERN.md), now driven
 * entirely by the shared useMulchCalculatorState() hook instead of owning
 * its own state. That's what lets the left column's action row and the
 * Share/Embed/Cite modal (MulchCalculatorPanel.tsx) read and reset the same
 * inputs/result even though they render in a different part of the DOM.
 */
export default function MulchCalculatorCard({ calc, sentiment, onVote }: MulchCalculatorCardProps) {
  const {
    mode,
    setMode,
    shape,
    setShape,
    setUnitSystem,
    material,
    setMaterial,
    length,
    width,
    radius,
    area,
    depth,
    bagSize,
    setBagSize,
    isMetric,
    lengthUnit,
    depthUnit,
    areaUnit,
    parsedBagSize,
    handleLengthChange,
    handleWidthChange,
    handleRadiusChange,
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
        {/* Card header -- includes Reset, since the sticky panel now contains
            only the tool itself (inputs, results, reset, and the "Was this
            helpful?" prompt), same as the pilot's card. */}
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-white">
            Calculate Your Mulch Needs
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
          {/* Bed shape and "total area" are ONE control: circle vs rectangle
              is only meaningful when you're entering dimensions, so folding
              the shape toggle and the dimensions/area toggle into a single
              three-way pill group drops a whole row and reads more directly
              ("how is the bed shaped?" rather than two nested questions). */}
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            <div>
              <span className="label-field">How do you want to enter your area?</span>
              <div className="mt-1.5 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'dimensions' && shape === 'rectangle'}
                  onClick={() => {
                    setMode('dimensions');
                    setShape('rectangle');
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    mode === 'dimensions' && shape === 'rectangle'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Rectangle
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'dimensions' && shape === 'circle'}
                  onClick={() => {
                    setMode('dimensions');
                    setShape('circle');
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    mode === 'dimensions' && shape === 'circle'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Circle
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

          {/* Material + bag size share one row -- pine straw is sold by the
              bale, not by cubic yard, so picking it simply drops the bag-size
              control (the note under the inputs explains why) and the result
              switches to a bale count. */}
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            <div>
              <span className="label-field">Material</span>
              <div className="mt-1.5 inline-flex rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Mulch material">
                <button
                  type="button"
                  role="tab"
                  aria-selected={material === 'generic'}
                  onClick={() => setMaterial('generic')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    material === 'generic'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Bark, wood chips &amp; other mulch
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={material === 'pine-straw'}
                  onClick={() => setMaterial('pine-straw')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    material === 'pine-straw'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Pine straw
                </button>
              </div>
            </div>

            {material === 'generic' && (
              <div className="w-36">
                <label htmlFor="mulch-bag-size" className="label-field">
                  Bag size <span className="text-bark-500">(cu ft)</span>
                </label>
                <select
                  id="mulch-bag-size"
                  value={bagSize}
                  onChange={(e) => setBagSize(e.target.value)}
                  className="input-field mt-1.5"
                >
                  <option value="2">2 cu ft</option>
                  <option value="1.5">1.5 cu ft</option>
                  <option value="1">1 cu ft</option>
                  <option value="3">3 cu ft</option>
                </select>
              </div>
            )}
          </div>

          {/* Inputs -- all of them fit on ONE row at this panel width, with
              the guidance notes folded into a single caption underneath
              instead of a caption under each field. */}
          <div>
            <div className="grid gap-4 sm:grid-cols-3">
              {mode === 'dimensions' ? (
                shape === 'rectangle' ? (
                  <>
                    <div>
                      <label htmlFor="mulch-length" className="label-field">
                        Length <span className="text-bark-500">({lengthUnit})</span>
                      </label>
                      <input
                        id="mulch-length"
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
                      <label htmlFor="mulch-width" className="label-field">
                        Width <span className="text-bark-500">({lengthUnit})</span>
                      </label>
                      <input
                        id="mulch-width"
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
                    <label htmlFor="mulch-radius" className="label-field">
                      Radius <span className="text-bark-500">({lengthUnit})</span>
                    </label>
                    <input
                      id="mulch-radius"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.5"
                      value={radius}
                      onChange={handleRadiusChange}
                      className="input-field mt-1.5"
                    />
                  </div>
                )
              ) : (
                <div className="sm:col-span-2">
                  <label htmlFor="mulch-area" className="label-field">
                    Total area <span className="text-bark-500">({areaUnit})</span>
                  </label>
                  <input
                    id="mulch-area"
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
                <label htmlFor="mulch-depth" className="label-field">
                  Desired depth <span className="text-bark-500">({depthUnit})</span>
                </label>
                <input
                  id="mulch-depth"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.25"
                  value={depth}
                  onChange={handleDepthChange}
                  className="input-field mt-1.5"
                />
              </div>
            </div>

            <p className="mt-2 text-xs text-bark-500">
              {mode === 'dimensions' && shape === 'circle' && 'Radius is half the full width of the bed (diameter ÷ 2). '}
              {isMetric ? '5–8 cm is typical for garden beds.' : '2–3″ is typical for garden beds.'}{' '}
              {material === 'pine-straw'
                ? 'Pine straw is sold by the bale, so there is no bag size to pick.'
                : 'Most home-store bags are 2 cu ft.'}
            </p>
          </div>

          {/* Formula display -- collapsed by default, same convention as the
              other converted calculators, so this panel stays short enough
              to stick without an internal scrollbar. */}
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
              {mode === 'dimensions' && shape === 'circle'
                ? 'Cubic Feet = π × Radius² × (Depth ÷ 12)'
                : 'Cubic Feet = Length × Width × (Depth ÷ 12)'}
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              {material === 'pine-straw'
                ? 'Cubic Yards = Cubic Feet ÷ 27  ·  Bales = Cubic Feet ÷ 16.67'
                : 'Cubic Yards = Cubic Feet ÷ 27  ·  Bags = Cubic Feet ÷ Bag Size'}
            </p>
          </details>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter an area and depth above to see how much mulch you need.
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
                        cubic feet of mulch
                        {isMetric && (
                          <span className="ml-1 text-bark-400">
                            ({round(result.cubicMeters, 2)} m³)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: bag count (or bale count for pine straw) */}
                  <div className="bg-moss-700 p-3.5">
                    {material === 'pine-straw' ? (
                      <>
                        <p className="text-xs text-moss-200">That's about</p>
                        <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                          {result.pineStrawBales.toLocaleString()} bales
                        </p>
                        <p className="text-xs text-moss-200">
                          (~{round(PINE_STRAW_SQFT_PER_BALE_AT_2IN, 0)} sq ft per bale at 2&Prime; depth)
                        </p>
                        <p className="mt-1 text-xs text-moss-300">
                          {round(result.cubicYards, 2)} cu yd equivalent
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-moss-200">That's about</p>
                        <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                          {result.bags.toLocaleString()} bags
                        </p>
                        <p className="text-xs text-moss-200">
                          ({parsedBagSize || 2} cu ft per bag)
                        </p>
                        <p className="mt-1 text-xs text-moss-300">
                          {round(result.cubicYards, 2)} cu yd total
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2">
                  <p className="min-w-0 flex-1 text-xs text-bark-500">
                    For {round(result.sqft, 1).toLocaleString()} sq ft at {round(result.depthIn, 1)}&Prime; deep.
                    Add 10% extra for settling.
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
              asking about the result specifically. The aggregate count/icon
              row lives up in the left column's action row instead. */}
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

          {/* The "Quick unit conversions" and "Bag-size comparison" tables
              used to live here, but they were the main reason this sticky
              panel needed an internal scrollbar to fit typical viewports.
              They now render in the normal page content instead (see
              MulchReferenceTables.tsx, portaled into the article), so this
              panel stays short enough to stick without scrolling. */}
        </div>
      </div>
    </div>
  );
}
