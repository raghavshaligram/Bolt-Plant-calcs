import { GROWTH_STAGES, UNIT_LABELS, round } from './useHydroponicNutrientCalculatorState';
import type { GrowthStage, HydroponicNutrientCalculatorState, ReservoirUnit, VolumeUnit } from './useHydroponicNutrientCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

export interface HydroponicNutrientCalculatorCardProps {
  calc: HydroponicNutrientCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card, driven entirely by the shared
 * useHydroponicNutrientCalculatorState() hook instead of owning its own
 * state, plus a header Reset button and a single "Was this helpful?" prompt
 * (per the sticky-layout pattern -- see CALC_ROLLOUT_PATTERN.md).
 *
 * Structure note: this used to render as TWO stacked card shells ("Nutrient
 * Dosing" and "EC <-> PPM Converter"), each with its own moss header bar,
 * its own padded body, its own "Show the math" disclosure and its own
 * bordered result block. That duplicated chrome carried no information and
 * was most of why the panel needed an internal scrollbar at 768px, so it is
 * now one card: the five inputs sit two or three to a row at the panel's
 * 560px width, one disclosure holds both formulas, and the dosing figure
 * and the three PPM scales share a single result block with one footer line.
 *
 * Content deliberately NOT duplicated here, because the page already
 * carries it in full (see SCROLL_FIX_PATTERN.md's dedupe carve-out):
 *  - The static "Which PPM scale does my meter use?" lookup table lives in
 *    HydroponicNutrientReferenceTables.tsx, portaled into the article right
 *    above this card's section. The per-tile brand captions ("Hanna,
 *    Milwaukee, ...") were that same table's data repeated per result, so
 *    only the scale number itself is shown here.
 *  - The full EC-vs-PPM argument is the article's "EC vs. PPM: Which Should
 *    You Trust?" section; the result footer keeps a one-line pointer.
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
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3.5">
          <h2 className="font-display text-lg font-semibold text-white">Hydroponic Nutrients</h2>
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

        <div className="flex flex-col gap-4 p-5">
          {/* Reservoir, stage and the EC reading share one row. The EC input
              used to sit in a second card of its own; at 560px it fits here
              beside the two dosing inputs. */}
          <div className="grid gap-4 sm:grid-cols-[1fr_1.3fr_0.85fr]">
            <div>
              <label htmlFor="hn-reservoir-volume" className="label-field">
                Reservoir volume
              </label>
              <div className="mt-1.5 flex gap-1.5">
                <input
                  id="hn-reservoir-volume"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={reservoirVolume}
                  onChange={handleNumericChange(setReservoirVolume)}
                  className="input-field w-full min-w-0"
                />
                <select
                  aria-label="Reservoir volume unit"
                  value={reservoirUnit}
                  onChange={(e) => setReservoirUnit(e.target.value as ReservoirUnit)}
                  className="input-field w-[4.5rem] shrink-0 px-2"
                >
                  <option value="gal">gal</option>
                  <option value="l">L</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="hn-growth-stage" className="label-field">
                Growth stage <span className="text-bark-500">({GROWTH_STAGES[growthStage].percent}%)</span>
              </label>
              <select
                id="hn-growth-stage"
                value={growthStage}
                onChange={(e) => setGrowthStage(e.target.value as GrowthStage)}
                className="input-field mt-1.5"
              >
                {(Object.keys(GROWTH_STAGES) as GrowthStage[]).map((key) => (
                  <option key={key} value={key}>
                    {GROWTH_STAGES[key].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
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
                className="input-field mt-1.5"
              />
            </div>
          </div>

          <div className="rounded-lg bg-sand-50 p-3 ring-1 ring-moss-100">
            <p className="text-sm font-medium text-bark-700">Your product&rsquo;s label dose</p>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="hn-dose-amount" className="label-field">
                  Dose amount
                </label>
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    id="hn-dose-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={doseAmount}
                    onChange={handleNumericChange(setDoseAmount)}
                    className="input-field w-full min-w-0"
                  />
                  <select
                    aria-label="Dose amount unit"
                    value={doseUnit}
                    onChange={(e) => setDoseUnit(e.target.value as VolumeUnit)}
                    className="input-field w-[5rem] shrink-0 px-2"
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
                <div className="mt-1.5 flex gap-1.5">
                  <input
                    id="hn-per-unit-volume"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={perUnitVolume}
                    onChange={handleNumericChange(setPerUnitVolume)}
                    className="input-field w-full min-w-0"
                  />
                  <span className="input-field flex w-[5rem] shrink-0 items-center justify-center px-2 text-bark-500">
                    {reservoirUnit === 'gal' ? 'gal' : 'L'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Both formulas and the label-reading hint in one collapsed
              disclosure -- it used to be one disclosure per section plus an
              always-visible hint line. */}
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
              Nutrient amount = (Reservoir volume &divide; label&rsquo;s per-unit volume) &times; label&rsquo;s dose &times; growth-stage %
            </p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
              PPM = EC &times; scale factor (500, 640, or 700)
            </p>
            <p className="mt-2 text-xs text-bark-500">
              Reading the label: &ldquo;per gal/L&rdquo; means the per-unit volume is 1; &ldquo;every 2 gal&rdquo; means it is 2.
            </p>
            <p className="mt-1.5 text-xs text-bark-500">
              Because the scale factor is a convention, not a measurement, <strong className="text-bark-700">EC is the
              more reliable number</strong> &mdash; see &ldquo;EC vs. PPM&rdquo; below.
            </p>
          </details>

          {/* One result block for both calculations: the concentrate dose,
              then the EC reading converted to all three PPM scales. */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasDosingResult ? (
              <p className="p-4 text-sm text-bark-500">
                Enter your reservoir volume and your product&rsquo;s label dose above to see how much concentrate to add.
              </p>
            ) : (
              <div className="p-4">
                <p className="text-xs text-bark-500">Add this much concentrate</p>
                <p className="font-display text-3xl font-bold text-moss-700">
                  {round(dosing.scaledAmountDisplay, 2).toLocaleString()} {UNIT_LABELS[doseUnit]}
                </p>
                <p className="mt-1 text-xs text-bark-600">
                  Scaled to {GROWTH_STAGES[growthStage].percent}% for {GROWTH_STAGES[growthStage].label.toLowerCase()}{' '}
                  &mdash; {GROWTH_STAGES[growthStage].range}.
                </p>
              </div>
            )}

            {!hasEcResult ? (
              <p className="border-t border-moss-200 p-4 text-sm text-bark-500">
                Enter your EC reading above to convert it to all three PPM scales.
              </p>
            ) : (
              <div className="grid grid-cols-3 divide-x divide-moss-200 border-t border-moss-200">
                <div className="p-4">
                  <p className="text-xs text-bark-500">PPM, 500 scale</p>
                  <p className="font-display text-2xl font-bold text-moss-700">{round(ecConversion.ppm500, 0).toLocaleString()}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-bark-500">PPM, 640 scale</p>
                  <p className="font-display text-2xl font-bold text-moss-700">{round(ecConversion.ppm640, 0).toLocaleString()}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-bark-500">PPM, 700 scale</p>
                  <p className="font-display text-2xl font-bold text-moss-700">{round(ecConversion.ppm700, 0).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>

          {/* Was this helpful? -- one shared prompt covering both
              calculations, sharing its row with Export PDF so the two footer
              controls cost one row instead of two. */}
          {hasAnyResult && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sand-50 px-4 py-2.5 ring-1 ring-moss-100">
              <button
                type="button"
                onClick={exportPdf}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-50"
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
              <div className="ml-auto flex items-center gap-2">
                <p className="text-sm font-medium text-bark-700">Was this helpful?</p>
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
