import { PRESETS } from './useRaisedBedSoilCalculatorState';
import type { RaisedBedSoilCalculatorState } from './useRaisedBedSoilCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface RaisedBedSoilCalculatorCardProps {
  calc: RaisedBedSoilCalculatorState;
  /**
   * Correction Prompt: Calculator Page Pilot -- Fix Layout Placement.
   * The sticky right panel keeps ONLY the tool: inputs, results, reset,
   * and this "Was this helpful?" Yes/No prompt directly under the result
   * (it's asking about the result specifically, so it stays here rather
   * than moving to the left column's action row). Sentiment/onVote come
   * from the same useCalculatorFeedback() instance that backs the compact
   * thumbs-with-count icon up in the left column, so a vote from either
   * place updates both immediately.
   */
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * RaisedBedSoilCalculator.tsx, now driven entirely by the shared
 * useRaisedBedSoilCalculatorState() hook instead of owning its own state.
 * That's what lets the left column's action row and the Share/Embed/Cite
 * modal (RaisedBedSoilCalculatorPanel.tsx) read and reset the same
 * inputs/result even though they render in a different part of the DOM.
 */
export default function RaisedBedSoilCalculatorCard({ calc, sentiment, onVote }: RaisedBedSoilCalculatorCardProps) {
  const {
    unitSystem,
    setUnitSystem,
    presetIndex,
    length,
    width,
    depth,
    bagSize,
    setBagSize,
    isMetric,
    lengthUnit,
    depthUnit,
    handlePreset,
    handleLengthChange,
    handleWidthChange,
    handleDepthChange,
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
            "Was this helpful?" prompt) per the Correction Prompt. */}
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-white">
            Calculate Your Raised Bed Soil
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
          {/* Preset buttons + unit toggle row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="label-field">Common bed sizes</span>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Bed size presets">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={presetIndex === idx}
                    onClick={() => handlePreset(idx)}
                    className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
                      presetIndex === idx
                        ? 'bg-moss-700 text-white ring-moss-700'
                        : 'bg-white text-bark-700 ring-moss-200 hover:bg-moss-50 hover:text-moss-800'
                    }`}
                  >
                    {preset.label === 'Custom' ? 'Custom' : (
                      <>
                        {preset.label}
                        {' '}
                        <span className="text-xs opacity-70">ft</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="label-field">Units</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
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

          {/* Dimension inputs */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="rb-length" className="label-field">
                Length <span className="text-bark-500">({lengthUnit})</span>
              </label>
              <input
                id="rb-length"
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
              <label htmlFor="rb-width" className="label-field">
                Width <span className="text-bark-500">({lengthUnit})</span>
              </label>
              <input
                id="rb-width"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={width}
                onChange={handleWidthChange}
                className="input-field mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="rb-depth" className="label-field">
                Fill depth <span className="text-bark-500">({depthUnit})</span>
              </label>
              <input
                id="rb-depth"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={depth}
                onChange={handleDepthChange}
                className="input-field mt-1.5"
              />
              <p className="mt-1.5 text-xs text-bark-500">
                {isMetric ? '20–30 cm is typical.' : '8–12″ is typical.'}
              </p>
            </div>
          </div>

          {/* Bag size selector */}
          <div>
            <span className="label-field">Bag size</span>
            <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Bag size">
              <button
                type="button"
                aria-pressed={bagSize === '1.5'}
                onClick={() => setBagSize('1.5')}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                  bagSize === '1.5' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                1.5 cu ft
              </button>
              <button
                type="button"
                aria-pressed={bagSize === '2'}
                onClick={() => setBagSize('2')}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                  bagSize === '2' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                2 cu ft
              </button>
            </div>
          </div>

          {/* Formula display -- collapsed by default. It's useful reference,
              not something most visitors need open while they work, and
              keeping it closed is most of what lets this panel stay short
              enough to stick without an internal scrollbar. */}
          <details className="group rounded-lg bg-sand-50 px-4 py-2.5 text-sm text-bark-600 ring-1 ring-moss-100">
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
              Cubic Yards = Cubic Feet ÷ 27
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Bags = ⌈ Cubic Feet ÷ Bag Size ⌉ &nbsp;·&nbsp; Weight ≈ Cubic Feet × 53.3 lbs
            </p>
          </details>

          {/* Results */}
          <div id="rb-results" className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your bed dimensions and depth above to see how much soil you need.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-start gap-3 p-4">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
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
                      <p className="text-xs font-medium text-bark-600">cubic feet of soil</p>
                      <p className="mt-0.5 text-xs text-bark-400">
                        ({round(result.cubicYards, 2)} cu yd)
                      </p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-4">
                    <p className="text-xs text-moss-200">That&apos;s about</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      ~{result.bags.toLocaleString()}
                    </p>
                    <p className="text-xs text-moss-200">
                      {bagSize} cu ft bags
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5 sm:px-5">
                  <p className="text-xs text-bark-500">
                    <span className="font-semibold text-bark-700">
                      ~{Math.round(result.weightLbs).toLocaleString()} lbs
                    </span>{' '}
                    &middot; For {round(result.sqft, 1)} sq ft at {round(result.depthIn, 1)}&Prime; deep.
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

          {/* The bag-count comparison and unit-conversion reference tables
              used to live here, but they were the main reason this sticky
              panel needed an internal scrollbar to fit typical viewports.
              They now render in the normal page content instead (see
              RaisedBedSoilReferenceTables.tsx, portaled into the article),
              so this panel stays short enough to stick without scrolling. */}
        </div>
      </div>
    </div>
  );
}
