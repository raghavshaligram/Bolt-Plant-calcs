import {
  DLI_TARGETS,
  LIGHT_NEED_LABELS,
  PLANT_CATEGORY_LABELS,
} from './useGrowLightCalculatorState';
import type { GrowLightCalculatorState } from './useGrowLightCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface GrowLightCalculatorCardProps {
  calc: GrowLightCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * GrowLightCalculator.tsx across all three modes (Coverage & Wattage, DLI
 * Calculator, Light Distance), now driven entirely by the shared
 * useGrowLightCalculatorState() hook instead of owning its own state. Each
 * mode's formula box is collapsed into a "Show the math"/"Show the logic"
 * <details> (same convention as the other converted calculators) since this
 * is one of the larger calculators on the site -- that's what keeps the
 * sticky panel short enough to avoid an internal scrollbar at typical
 * viewport heights. There was no separate static reference table living
 * inside the original component to extract; the "Target DLI by Plant Type"
 * table already lives in the page's own article content.
 */
export default function GrowLightCalculatorCard({ calc, sentiment, onVote }: GrowLightCalculatorCardProps) {
  const {
    mode,
    setMode,
    area,
    lightNeed,
    setLightNeed,
    hoursPerDay,
    electricityRate,
    ppfd,
    photoperiod,
    comparePlant,
    setComparePlant,
    lightType,
    setLightType,
    growthStage,
    setGrowthStage,
    isMetric,
    areaUnit,
    distanceUnit,
    handleUnitToggle,
    handleAreaChange,
    handleHoursPerDayChange,
    handleElectricityRateChange,
    handlePpfdChange,
    handlePhotoperiodChange,
    coverageResult,
    dliResult,
    distanceResult,
    exportPdf,
    reset,
  } = calc;

  const hasResult =
    (mode === 'coverage' && !!coverageResult) ||
    (mode === 'dli' && !!dliResult) ||
    mode === 'distance';

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header -- includes Reset, since the sticky panel now contains
            only the tool itself (inputs, results, reset, and the "Was this
            helpful?" prompt). The original component had no Reset button;
            this is added new per the rollout pattern. */}
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-2.5">
          <h2 className="font-display text-lg font-semibold text-white">
            Calculate Your Grow Light Needs
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

        <div className="flex flex-col gap-2 p-4">
          {/* Mode + unit toggles */}
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="label-field">Mode</span>
              <div className="mt-2 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'coverage'}
                  onClick={() => setMode('coverage')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    mode === 'coverage'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Coverage
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'dli'}
                  onClick={() => setMode('dli')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    mode === 'dli'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  DLI
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'distance'}
                  onClick={() => setMode('distance')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    mode === 'distance'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Distance
                </button>
              </div>
            </div>

            {(mode === 'coverage' || mode === 'distance') && (
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
            )}
          </div>

          {/* --- Mode 1: Coverage & Wattage --- */}
          {mode === 'coverage' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="gl-area" className="label-field">
                    Growing area <span className="text-bark-500">({areaUnit})</span>
                  </label>
                  <input
                    id="gl-area"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={area}
                    onChange={handleAreaChange}
                    className="input-field mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="gl-need" className="label-field">
                    Plant light need
                  </label>
                  <select
                    id="gl-need"
                    value={lightNeed}
                    onChange={(e) => setLightNeed(e.target.value as typeof lightNeed)}
                    className="input-field mt-1.5"
                  >
                    <option value="low">{LIGHT_NEED_LABELS.low}</option>
                    <option value="medium">{LIGHT_NEED_LABELS.medium}</option>
                    <option value="high">{LIGHT_NEED_LABELS.high}</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="gl-hours" className="label-field">
                    Hours per day <span className="text-bark-500">(optional, for cost)</span>
                  </label>
                  <input
                    id="gl-hours"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="24"
                    step="0.5"
                    value={hoursPerDay}
                    onChange={handleHoursPerDayChange}
                    className="input-field mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="gl-rate" className="label-field">
                    Electricity rate <span className="text-bark-500">($/kWh)</span>
                  </label>
                  <input
                    id="gl-rate"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={electricityRate}
                    onChange={handleElectricityRateChange}
                    className="input-field mt-1.5"
                  />
                </div>
              </div>

              {/* Formula display -- collapsed by default. It's useful
                  reference, not something most visitors need open while
                  they work, and keeping it closed is most of what lets this
                  panel stay short enough to stick without an internal
                  scrollbar. */}
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
                  Wattage = Area &times; Watts per {isMetric ? 'sq m' : 'sq ft'} (tier range)
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  Daily cost = (Watts &divide; 1000) &times; Hours &times; Rate
                </p>
              </details>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!coverageResult ? (
                  <p className="p-5 text-sm text-bark-500">
                    Enter your growing area above to see a recommended wattage range.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 divide-x divide-moss-200">
                      <div className="flex items-center gap-3 p-3.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                          <svg className="h-5 w-5 text-moss-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2a7 7 0 0 0-4 12.7V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.3A7 7 0 0 0 12 2ZM10 21h4" stroke="currentColor" strokeWidth="0.5"/>
                          </svg>
                        </span>
                        <div>
                          <p className="text-xs text-bark-500">Recommended wattage</p>
                          <p className="font-display text-2xl font-bold text-moss-700">
                            {Math.round(coverageResult.wattsLow)}&ndash;{Math.round(coverageResult.wattsHigh)} W
                          </p>
                          <p className="text-xs font-medium text-bark-600">actual input watts</p>
                        </div>
                      </div>

                      <div className="bg-moss-700 p-3.5">
                        <p className="text-xs text-moss-200">Estimated cost</p>
                        {coverageResult.dailyCost !== null ? (
                          <>
                            <p className="font-display text-xl font-bold text-white">
                              ${round(coverageResult.dailyCost, 2)}/day
                            </p>
                            <p className="mt-1 text-xs text-moss-200">
                              ~${round(coverageResult.monthlyCost!, 2)}/month
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 text-xs text-moss-200">
                            Add hours/day and a rate to estimate cost.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-moss-200 bg-white px-4 py-1.5">
                      <p className="text-xs text-bark-500">
                        Rule-of-thumb ranges, not a professional lighting design.
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
            </>
          )}

          {/* --- Mode 2: DLI Calculator --- */}
          {mode === 'dli' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="gl-ppfd" className="label-field">
                    PPFD reading <span className="text-bark-500">(µmol/m&sup2;/s)</span>
                  </label>
                  <input
                    id="gl-ppfd"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="10"
                    value={ppfd}
                    onChange={handlePpfdChange}
                    className="input-field mt-1.5"
                  />
                  <p className="mt-1.5 text-xs text-bark-500">
                    From a light meter, held at plant canopy height.
                  </p>
                </div>
                <div>
                  <label htmlFor="gl-photoperiod" className="label-field">
                    Photoperiod <span className="text-bark-500">(hours/day)</span>
                  </label>
                  <input
                    id="gl-photoperiod"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="24"
                    step="0.5"
                    value={photoperiod}
                    onChange={handlePhotoperiodChange}
                    className="input-field mt-1.5"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="gl-compare" className="label-field">
                  Compare against <span className="text-bark-500">(optional)</span>
                </label>
                <select
                  id="gl-compare"
                  value={comparePlant}
                  onChange={(e) => setComparePlant(e.target.value as typeof comparePlant)}
                  className="input-field mt-1.5"
                >
                  <option value="none">No comparison</option>
                  <option value="seedlings">{PLANT_CATEGORY_LABELS.seedlings}</option>
                  <option value="houseplants">{PLANT_CATEGORY_LABELS.houseplants}</option>
                  <option value="leafy-greens">{PLANT_CATEGORY_LABELS['leafy-greens']}</option>
                  <option value="fruiting">{PLANT_CATEGORY_LABELS.fruiting}</option>
                </select>
              </div>

              {/* Formula display -- collapsed by default, same convention as
                  the Coverage mode above. */}
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
                  DLI = (PPFD &times; 3600 &times; Photoperiod) &divide; 1,000,000
                </p>
              </details>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!dliResult ? (
                  <p className="p-5 text-sm text-bark-500">
                    Enter a PPFD reading and photoperiod above to calculate DLI.
                  </p>
                ) : (
                  <>
                    <div className="p-3.5">
                      <p className="text-xs text-bark-500">Calculated DLI</p>
                      <p className="font-display text-3xl font-bold text-moss-700">
                        {round(dliResult.dli, 1)} <span className="text-lg font-semibold">mol/m&sup2;/day</span>
                      </p>
                      {comparePlant !== 'none' && dliResult.comparison && (
                        <p className={`mt-2 text-sm font-medium ${
                          dliResult.comparison === 'within' ? 'text-moss-700' : 'text-bark-700'
                        }`}>
                          {dliResult.comparison === 'within' && `Within the typical target range for ${PLANT_CATEGORY_LABELS[comparePlant]} (${DLI_TARGETS[comparePlant][0]}–${DLI_TARGETS[comparePlant][1]} mol/m²/day).`}
                          {dliResult.comparison === 'below' && `Below the typical target range for ${PLANT_CATEGORY_LABELS[comparePlant]} (${DLI_TARGETS[comparePlant][0]}–${DLI_TARGETS[comparePlant][1]} mol/m²/day) — consider more hours or a stronger light.`}
                          {dliResult.comparison === 'above' && `Above the typical target range for ${PLANT_CATEGORY_LABELS[comparePlant]} (${DLI_TARGETS[comparePlant][0]}–${DLI_TARGETS[comparePlant][1]} mol/m²/day) — likely more light than needed.`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-moss-200 bg-white px-4 py-1.5">
                      <p className="text-xs text-bark-500">
                        Target ranges are typical guidance, not a fixed requirement.
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
            </>
          )}

          {/* --- Mode 3: Light Distance --- */}
          {mode === 'distance' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="gl-light-type" className="label-field">
                    Light type
                  </label>
                  <select
                    id="gl-light-type"
                    value={lightType}
                    onChange={(e) => setLightType(e.target.value as typeof lightType)}
                    className="input-field mt-1.5"
                  >
                    <option value="led">LED</option>
                    <option value="fluorescent">Fluorescent (T5)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="gl-stage" className="label-field">
                    Growth stage
                  </label>
                  <select
                    id="gl-stage"
                    value={growthStage}
                    onChange={(e) => setGrowthStage(e.target.value as typeof growthStage)}
                    className="input-field mt-1.5"
                  >
                    <option value="seedling">Seedling</option>
                    <option value="mature">Mature / vegetative</option>
                  </select>
                </div>
              </div>

              {/* Explanatory content -- collapsed by default, same
                  "Show the math" convention as the other two modes above. */}
              <details className="group rounded-lg bg-sand-50 px-4 py-1.5 text-sm text-bark-600 ring-1 ring-moss-100">
                <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-1.5">
                    Show the logic
                    <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-2 text-xs text-bark-600 sm:text-sm">
                  Closer light = higher intensity at the leaf, but less even coverage and more heat stress risk. Mature plants tolerate closer, more intense light better than seedlings.
                </p>
              </details>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                <div className="p-3.5">
                  <p className="text-xs text-bark-500">Recommended hanging distance</p>
                  <p className="font-display text-3xl font-bold text-moss-700">
                    {distanceResult.low}&ndash;{distanceResult.high} {distanceUnit}
                  </p>
                  <p className="mt-1 text-xs font-medium text-bark-600">
                    above the plant canopy
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-moss-200 bg-white px-4 py-1.5">
                  <p className="text-xs text-bark-500">
                    Typical manufacturer guidance &mdash; check your fixture&rsquo;s spec sheet too.
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
              </div>
            </>
          )}

          {/* Was this helpful? -- stays directly under the result, since
              it's asking about the result specifically. None of the 24
              original calculators had this; it's added new per the rollout
              pattern. */}
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
