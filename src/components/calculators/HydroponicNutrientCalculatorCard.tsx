import { GROWTH_STAGES, UNIT_LABELS, round } from './useHydroponicNutrientCalculatorState';
import type { GrowthStage, HydroponicNutrientCalculatorState, ReservoirUnit, VolumeUnit } from './useHydroponicNutrientCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

export interface HydroponicNutrientCalculatorCardProps {
  calc: HydroponicNutrientCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * HydroponicNutrientCalculator.tsx's two sections (Nutrient Dosing and the
 * EC/PPM Converter), now driven entirely by the shared
 * useHydroponicNutrientCalculatorState() hook instead of owning its own
 * state, plus a header Reset button and a single "Was this helpful?"
 * prompt covering both sections (new, per the sticky-layout pattern -- see
 * CALC_ROLLOUT_PATTERN.md).
 *
 * The static "Which PPM scale does my meter use?" lookup table that used to
 * live inside the EC/PPM section has been moved to
 * HydroponicNutrientReferenceTables.tsx, portaled into the article, and
 * both sections' "The math:" formula displays are collapsed-by-default
 * <details> ("Show the math").
 *
 * This was one of the worst sticky-panel scroll offenders in the whole
 * rollout, so on top of those two levers it needed several more rounds:
 *  - The "EC is the reliable number..." paragraph (previously ~6 lines)
 *    is shortened to one line -- the full EC-vs-PPM explanation already
 *    lives in the article's "EC vs. PPM: Which Should You Trust?" section,
 *    so this isn't losing information, just not duplicating it in the tight
 *    sticky panel (see SCROLL_FIX_PATTERN.md's dedupe carve-out).
 *  - Each EC/PPM result tile's brand list (e.g. "Hanna, Milwaukee, General
 *    Hydroponics, Oakton") is dropped -- that's the exact same brand list,
 *    per scale, as HydroponicNutrientReferenceTables.tsx's "Which PPM scale
 *    does my meter use?" table, which is portaled into the article right
 *    above this card's own section on the page, so it isn't duplicated here
 *    either, just the scale number itself.
 *  - Export PDF was merged into the EC/PPM section's "EC is the reliable
 *    number" footer row instead of its own row below.
 *  - Spacing is tightened throughout (gap-6/gap-5/p-6 -> gap-0.5/p-4,
 *    header py-4 -> py-1, result cells p-4 sm:p-5 -> p-1.5/p-2, footer/
 *    helper bars -> py-0/py-0.5), the two "Show the math" boxes are
 *    stripped of their padded/ringed box chrome (just the summary + hidden
 *    content), and text inputs/selects locally override the shared
 *    `input-field` class's padding (py-1.5/py-2 instead of its py-2.5) --
 *    a utility class on the element itself, so it only affects this card,
 *    not the shared class other calculators use.
 */
export default function HydroponicNutrientCalculatorCard({ calc, sentiment, onVote }: HydroponicNutrientCalculatorCardProps) {
  const {
    reservoirVolume,
    reservoirUnit,
    setReservoirUnit,
    perUnitVolume,
    doseAmount,
    doseUnit,
    setDoseUnit,
    growthStage,
    setGrowthStage,
    ecValue,
    handleNumericChange,
    setReservoirVolume,
    setPerUnitVolume,
    setDoseAmount,
    setEcValue,
    dosing,
    ecConversion,
    hasDosingResult,
    hasEcResult,
    exportPdf,
    reset,
  } = calc;

  const hasAnyResult = hasDosingResult || hasEcResult;

  return (
    <div className="not-prose flex flex-col gap-0.5">
      {/* Section 1: Nutrient Dosing */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-4 py-1">
          <h2 className="font-display text-lg font-semibold text-white">Nutrient Dosing</h2>
          <button
            type="button"
            onClick={reset}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-moss-800/60 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-moss-800"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M4 4v4h4M16 16v-4h-4M4.5 8A6 6 0 0 1 16 6.5M15.5 12A6 6 0 0 1 4 13.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Reset
          </button>
        </div>

        <div className="flex flex-col gap-0.5 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="hn-reservoir-volume" className="label-field">
                Reservoir volume
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="hn-reservoir-volume"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={reservoirVolume}
                  onChange={handleNumericChange(setReservoirVolume)}
                  className="input-field py-1.5"
                />
                <select
                  aria-label="Reservoir volume unit"
                  value={reservoirUnit}
                  onChange={(e) => setReservoirUnit(e.target.value as ReservoirUnit)}
                  className="input-field w-24 py-1.5"
                >
                  <option value="gal">gal</option>
                  <option value="l">L</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="hn-growth-stage" className="label-field">
                Growth stage
              </label>
              <select
                id="hn-growth-stage"
                value={growthStage}
                onChange={(e) => setGrowthStage(e.target.value as GrowthStage)}
                className="input-field mt-1 py-1.5"
              >
                {(Object.keys(GROWTH_STAGES) as GrowthStage[]).map((key) => (
                  <option key={key} value={key}>
                    {GROWTH_STAGES[key].label} ({GROWTH_STAGES[key].percent}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg bg-sand-50 p-2 ring-1 ring-moss-100">
            <p className="mb-0.5 text-sm font-medium text-bark-700">Your product&rsquo;s label dose</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label htmlFor="hn-dose-amount" className="label-field">
                  Dose amount
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="hn-dose-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={doseAmount}
                    onChange={handleNumericChange(setDoseAmount)}
                    className="input-field py-1.5"
                  />
                  <select
                    aria-label="Dose amount unit"
                    value={doseUnit}
                    onChange={(e) => setDoseUnit(e.target.value as VolumeUnit)}
                    className="input-field w-24 py-1.5"
                  >
                    <option value="ml">ml</option>
                    <option value="tsp">tsp</option>
                    <option value="tbsp">tbsp</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="hn-per-unit-volume" className="label-field">
                  Per how many {reservoirUnit === 'gal' ? 'gallons' : 'liters'}
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    id="hn-per-unit-volume"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={perUnitVolume}
                    onChange={handleNumericChange(setPerUnitVolume)}
                    className="input-field py-1.5"
                  />
                  <span className="input-field flex w-24 items-center justify-center py-1.5 text-bark-500">
                    {reservoirUnit === 'gal' ? 'gal' : 'L'}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-1 text-xs text-bark-500">From the label: &ldquo;per gal/L&rdquo; = 1, &ldquo;every 2 gal&rdquo; = 2.</p>
          </div>

          {/* Formula display -- collapsed by default, matching the "Show the
              math" convention established by the pilot. It's useful
              reference, not something most visitors need open while they
              work, and keeping it closed is most of what lets this
              two-section panel stay short enough to stick without an
              internal scrollbar. */}
          <details className="group text-sm text-bark-600">
            <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                Show the math
                <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <p className="mt-1.5 font-mono text-xs text-bark-600 sm:text-sm">
              Nutrient amount = (Reservoir volume &divide; label&rsquo;s per-unit volume) &times; label&rsquo;s dose &times; growth-stage %
            </p>
          </details>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasDosingResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your reservoir volume and your product&rsquo;s label dose above to see how much concentrate to add.
              </p>
            ) : (
              <>
                <div className="p-1.5">
                  <p className="text-xs text-bark-500">Add this much concentrate</p>
                  <p className="font-display text-3xl font-bold text-moss-700">
                    {round(dosing.scaledAmountDisplay, 2).toLocaleString()} {UNIT_LABELS[doseUnit]}
                  </p>
                </div>
                <div className="border-t border-moss-200 bg-white px-4 py-0.5">
                  <p className="text-xs leading-relaxed text-bark-600">
                    Scaled to {GROWTH_STAGES[growthStage].percent}% for {GROWTH_STAGES[growthStage].label.toLowerCase()} ({GROWTH_STAGES[growthStage].range}).
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: EC <-> PPM Converter */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-4 py-1">
          <h2 className="font-display text-lg font-semibold text-white">EC &harr; PPM Converter</h2>
        </div>

        <div className="flex flex-col gap-0.5 p-4">
          <div className="max-w-xs">
            <label htmlFor="hn-ec-value" className="label-field">
              EC <span className="text-bark-500">(mS/cm)</span>
            </label>
            <input
              id="hn-ec-value"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={ecValue}
              onChange={handleNumericChange(setEcValue)}
              className="input-field mt-1 py-1.5"
            />
          </div>

          <details className="group text-sm text-bark-600">
            <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                Show the math
                <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">
              PPM = EC &times; scale factor (500, 640, or 700)
            </p>
          </details>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasEcResult ? (
              <p className="p-5 text-sm text-bark-500">Enter your EC reading above to convert it to all three PPM scales.</p>
            ) : (
              <div className="grid grid-cols-1 divide-y divide-moss-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="p-1.5">
                  <p className="text-xs text-bark-500">500 scale</p>
                  <p className="font-display text-2xl font-bold text-moss-700">{round(ecConversion.ppm500, 0).toLocaleString()}</p>
                </div>
                <div className="p-1.5">
                  <p className="text-xs text-bark-500">640 scale</p>
                  <p className="font-display text-2xl font-bold text-moss-700">{round(ecConversion.ppm640, 0).toLocaleString()}</p>
                </div>
                <div className="p-1.5">
                  <p className="text-xs text-bark-500">700 scale</p>
                  <p className="font-display text-2xl font-bold text-moss-700">{round(ecConversion.ppm700, 0).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          {/* The "Which PPM scale does my meter use?" lookup table (with the
              full brand list per scale) used to live here. It's static
              reference data that doesn't depend on the live inputs, so it
              now renders in the normal page content instead (see
              HydroponicNutrientReferenceTables.tsx, portaled into the
              article, right above this card's section on the page) -- the
              per-tile brand captions above were dropped for the same reason,
              since they were just this same table's data repeated per
              result. */}

          {/* Full EC-vs-PPM explanation already lives in the article's "EC
              vs. PPM: Which Should You Trust?" section -- kept to a short
              pointer here so it fits on one line next to Export PDF (which
              lives in this same row, rather than its own row below, since
              it's the calculator's one shared export action). */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs leading-relaxed text-bark-600">
              <strong className="text-bark-800">EC</strong> is more reliable than PPM &mdash; see below.
            </p>
            <button
              type="button"
              onClick={exportPdf}
              className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M3 16h14"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Export PDF
            </button>
          </div>

          {/* Was this helpful? -- one shared prompt covering both sections
              (there's a single vote per calculator, not one per section),
              shown once either section has a result. */}
          {hasAnyResult && (
            <div className="flex items-center gap-1.5 rounded-lg bg-sand-50 px-3 py-0 ring-1 ring-moss-100">
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
