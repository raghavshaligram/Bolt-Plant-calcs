import { FLOW_PRESETS, formatDuration, round } from './useDripIrrigationCalculatorState';
import type { DripIrrigationCalculatorState } from './useDripIrrigationCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

export interface DripIrrigationCalculatorCardProps {
  calc: DripIrrigationCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical inputs/results/PDF-export
 * markup to the original DripIrrigationCalculator.tsx, now driven entirely
 * by the shared useDripIrrigationCalculatorState() hook instead of owning
 * its own state, plus a header Reset button and a "Was this helpful?"
 * prompt (new, per the sticky-layout pattern -- see CALC_ROLLOUT_PATTERN.md).
 *
 * Flagged (alongside NPK) as one of the two calculators most likely to need
 * internal-scroll mitigation in the sticky panel. The original card had no
 * static reference/lookup table to extract into a sibling ReferenceTables
 * component -- its "Flow Rates Reference" table already lives directly in
 * the page's article flow, not inside this card -- so, matching NPK's own
 * treatment, the one thing extracted here is the "The math:" formula box,
 * now a collapsed-by-default <details> ("Show the math") instead of an
 * always-visible block. That, plus the original's already-conditional
 * per-plant/area inputs (only one branch renders at a time), is what keeps
 * this card short enough to avoid an internal scrollbar in the sticky panel.
 */
export default function DripIrrigationCalculatorCard({ calc, sentiment, onVote }: DripIrrigationCalculatorCardProps) {
  const {
    mode, setMode,
    isMetric,
    emitterCount,
    flowPreset, setFlowPreset,
    customFlowRate,
    perPlantAmount,
    areaValue,
    depthValue,
    sessionsPerWeek,
    flowUnit, volumeUnit, areaUnit, depthUnit,
    gphToDisplay,
    handleUnitToggle,
    handleNumericChange,
    handleIntegerChange,
    setEmitterCount,
    setPerPlantAmount,
    setAreaValue,
    setDepthValue,
    setSessionsPerWeek,
    result,
    exportPdf,
    reset,
  } = calc;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-2">
          <h2 className="font-display text-lg font-semibold text-white">
            Drip Irrigation Calculator
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

        <div className="flex flex-col gap-1 p-3">
          {/* Mode + unit toggles */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="label-field">Water amount by</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'per-plant'}
                  onClick={() => setMode('per-plant')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'per-plant'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Per Plant
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'area'}
                  onClick={() => setMode('area')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'area'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Area Coverage
                </button>
              </div>
            </div>

            <div>
              <span className="label-field">Units</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
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
          </div>

          {/* Emitter count, flow rate + sessions -- combined into one row
              (instead of two separate rows) since these three short fields
              fit comfortably side by side, which is what keeps this card
              short enough to avoid an internal scrollbar in the sticky
              panel. */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="di-emitters" className="label-field">
                Emitters
              </label>
              <input
                id="di-emitters"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={emitterCount}
                onChange={handleIntegerChange(setEmitterCount)}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label htmlFor="di-flow-preset" className="label-field">
                Flow rate
              </label>
              <select
                id="di-flow-preset"
                value={flowPreset}
                onChange={(e) => setFlowPreset(e.target.value as typeof flowPreset)}
                className="input-field mt-1"
              >
                {FLOW_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.value === 'custom' ? 'Custom' : `${isMetric ? round(p.gph * 3.78541, 2) : p.gph} ${flowUnit}`}
                  </option>
                ))}
              </select>
              {flowPreset === 'custom' && (
                <input
                  id="di-flow-custom"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={customFlowRate}
                  onChange={handleNumericChange(calc.setCustomFlowRate)}
                  aria-label={`Custom emitter flow rate in ${flowUnit}`}
                  placeholder={flowUnit}
                  className="input-field mt-2"
                />
              )}
            </div>
            <div>
              <label htmlFor="di-sessions" className="label-field">
                Sessions/wk
              </label>
              <input
                id="di-sessions"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={sessionsPerWeek}
                onChange={handleIntegerChange(setSessionsPerWeek)}
                className="input-field mt-1"
              />
            </div>
          </div>
          <p className="text-xs text-bark-500">
            Emitters running together on this line or zone. Leave sessions/wk blank to skip the weekly total.
          </p>

          {/* Water amount inputs */}
          {mode === 'per-plant' ? (
            <div>
              <label htmlFor="di-per-plant" className="label-field">
                Water per plant <span className="text-bark-500">({volumeUnit})</span>
              </label>
              <input
                id="di-per-plant"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.25"
                value={perPlantAmount}
                onChange={handleNumericChange(setPerPlantAmount)}
                className="input-field mt-1"
              />
              <p className="mt-1 text-xs text-bark-500">
                Assumes one emitter per plant, so run time is set by a single emitter&rsquo;s flow rate.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="di-area" className="label-field">
                  Area <span className="text-bark-500">({areaUnit})</span>
                </label>
                <input
                  id="di-area"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={areaValue}
                  onChange={handleNumericChange(setAreaValue)}
                  className="input-field mt-1"
                />
              </div>
              <div>
                <label htmlFor="di-depth" className="label-field">
                  Target water depth <span className="text-bark-500">({depthUnit})</span>
                </label>
                <input
                  id="di-depth"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.25"
                  value={depthValue}
                  onChange={handleNumericChange(setDepthValue)}
                  className="input-field mt-1"
                />
              </div>
            </div>
          )}

          {/* Formula -- collapsed by default. It's useful reference, not
              something most visitors need open while they work, and keeping
              it closed is most of what lets this panel stay short enough to
              stick without an internal scrollbar (same treatment as the
              pilot and NPK calculators). */}
          <details className="group rounded-lg bg-sand-50 px-4 py-1.5 text-sm text-bark-600 ring-1 ring-moss-100">
            <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                Show the math
                <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            {mode === 'per-plant' ? (
              <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">
                Run time = Water per plant &divide; Emitter flow rate
              </p>
            ) : (
              <>
                <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">
                  {isMetric
                    ? 'Water needed (L) = Area (sq m) × Depth (mm)'
                    : 'Water needed (gal) = Area (sq ft) × Depth (in) × 0.623'}
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  Run time = Water needed &divide; (Emitters &times; Flow rate)
                </p>
              </>
            )}
          </details>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!result ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your emitter count, flow rate, and target water amount above to see run time.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-center gap-3 p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2c3 4 6 8 6 12a6 6 0 0 1-12 0c0-4 3-8 6-12Z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">Run time</p>
                      <p className="font-display text-3xl font-bold text-moss-700">
                        {formatDuration(result.runTimeHours)}
                      </p>
                      <p className="text-xs font-medium text-bark-600">this session</p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-3">
                    <p className="text-xs text-moss-200">Water delivered</p>
                    <p className="font-display text-xl font-bold text-white">
                      {round(gphToDisplay(result.totalDeliveredGal), 1)} {volumeUnit}
                    </p>
                    <p className="mt-1 text-xs text-moss-200">this session</p>
                    <p className="mt-1 text-xs text-moss-300">
                      {round(gphToDisplay(result.totalFlowGph), 2)} {flowUnit} total system flow
                    </p>
                  </div>
                </div>

                {result.weeklyTotalGal !== null && (
                  <div className="border-t border-moss-100 bg-moss-50/60 px-4 py-1.5 text-xs text-bark-500">
                    Weekly total at {sessionsPerWeek}x/week: ~{round(gphToDisplay(result.weeklyTotalGal), 1)} {volumeUnit}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-moss-200 bg-white px-4 py-1.5">
                  <p className="text-xs text-bark-500">
                    Estimate for home garden zones. Not a substitute for professional system design.
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

          {/* Was this helpful? -- stays directly under the result, since
              it's asking about the result specifically. */}
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
