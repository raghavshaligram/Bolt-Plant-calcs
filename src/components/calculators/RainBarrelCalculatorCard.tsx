import { round } from './useRainBarrelCalculatorState';
import type { RainBarrelCalculatorState } from './useRainBarrelCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

export interface RainBarrelCalculatorCardProps {
  calc: RainBarrelCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * RainBarrelCalculator.tsx (two independent sections: rainwater harvesting,
 * then spigot water pressure), now driven entirely by the shared
 * useRainBarrelCalculatorState() hook instead of owning its own state, plus
 * a header Reset button and a "Was this helpful?" prompt (new, per the
 * sticky-layout pattern -- see CALC_ROLLOUT_PATTERN.md).
 *
 * Unlike most other calculators in this rollout, this one has two
 * independent results rendered at once rather than one primary result, so
 * the Reset button (which resets both sections' state together) lives on
 * the first section's header, and the single "Was this helpful?" prompt
 * -- backed by one shared feedback vote for the whole calculator -- sits
 * below both result blocks rather than duplicated under each one. There
 * were no static reference/lookup tables inside the original card to
 * extract into a sibling ReferenceTables component.
 *
 * This was one of the worst sticky-panel scroll offenders in the rollout
 * (two full sections stacked in one card), so on top of the usual levers it
 * needed several rounds of tightening to fit the sticky panel's height
 * budget without an internal scrollbar:
 *  - Both sections' "The math:" boxes are collapsed-by-default <details>
 *    ("Show the math"), stripped of their padded/ringed box chrome (just
 *    the summary + hidden content, no surrounding card) since even that
 *    box's padding mattered at this scale.
 *  - Spacing is tightened throughout: gap-6/gap-5/p-6 -> gap-1/p-4, header
 *    py-4 -> py-2, result cells p-4 sm:p-5 -> p-2/p-2.5, footer/helper bars
 *    -> py-0.5/py-1.
 *  - Export PDF was merged into the water-pressure result's footer row
 *    (next to the range interpretation) instead of its own row below.
 *  - The "Collection efficiency" label was shortened to "Efficiency" (it
 *    was wrapping to two lines in the narrow sticky column, which alone
 *    was costing ~40px), and its "85% is a common default..." helper line
 *    was dropped entirely -- that rationale is fully covered in the "How
 *    Much Rainwater Can You Collect?" article section, and the field's own
 *    pre-filled 85 already signals the default.
 *  - The water-pressure interpretation text (which PSI range means what)
 *    was shortened to a short pointer per branch, since its full version
 *    is fully covered in the "How Much Water Pressure Will You Get?"
 *    article section -- see SCROLL_FIX_PATTERN.md's dedupe carve-out.
 */
export default function RainBarrelCalculatorCard({ calc, sentiment, onVote }: RainBarrelCalculatorCardProps) {
  const {
    unitSystem,
    setUnitSystem,
    roofArea,
    rainfall,
    efficiency,
    height,
    isMetric,
    areaUnit,
    rainUnit,
    heightUnit,
    handleNumericChange,
    setRoofArea,
    setRainfall,
    setEfficiency,
    setHeight,
    harvest,
    pressure,
    hasHarvestResult,
    hasPressureResult,
    exportPdf,
    reset,
  } = calc;

  return (
    <div className="not-prose flex flex-col gap-1">
      {/* Section 1: Rainwater Harvesting */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-4 py-2">
          <h2 className="font-display text-lg font-semibold text-white">Rainwater Harvesting</h2>
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

        <div className="flex flex-col gap-1 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="label-field mb-0">Units</span>
            <div className="inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
              <button
                type="button"
                aria-pressed={!isMetric}
                onClick={() => setUnitSystem('imperial')}
                className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                  !isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                Imperial (ft, in)
              </button>
              <button
                type="button"
                aria-pressed={isMetric}
                onClick={() => setUnitSystem('metric')}
                className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                  isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                Metric (m, mm)
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="rb-roof-area" className="label-field">
                Roof area <span className="text-bark-500">({areaUnit})</span>
              </label>
              <input
                id="rb-roof-area"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={roofArea}
                onChange={handleNumericChange(setRoofArea)}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label htmlFor="rb-rainfall" className="label-field">
                Rainfall <span className="text-bark-500">({rainUnit})</span>
              </label>
              <input
                id="rb-rainfall"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={rainfall}
                onChange={handleNumericChange(setRainfall)}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label htmlFor="rb-efficiency" className="label-field">
                Efficiency <span className="text-bark-500">(%)</span>
              </label>
              <input
                id="rb-efficiency"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="1"
                value={efficiency}
                onChange={handleNumericChange(setEfficiency)}
                className="input-field mt-1"
              />
              {/* The rationale for the 85% default (evaporation, gutter
                  overflow, first-flush loss) already lives in the "How Much
                  Rainwater Can You Collect?" article section below, and the
                  pre-filled 85 in the field itself already signals the
                  default -- dropped the duplicate helper line here to help
                  this card fit the sticky panel's height budget. */}
            </div>
          </div>

          {/* Formula display -- collapsed by default, same convention as the
              other converted calculators. */}
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
              Gallons = Roof area (sq ft) &times; Rainfall (in) &times; 0.623 &times; Efficiency
            </p>
          </details>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasHarvestResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your roof area and rainfall amount above to see how much water you can collect.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-center gap-3 p-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                        <path d="M16 3c3 6 8 13 8 18a8 8 0 1 1-16 0c0-5 5-12 8-18Z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">You can collect</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {round(harvest.gallons, 1).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        gallons <span className="ml-1 text-bark-400">({round(harvest.liters, 1).toLocaleString()} L)</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-2">
                    <p className="text-xs text-moss-200">That&rsquo;s about</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">{harvest.barrels.toLocaleString()}</p>
                    <p className="text-xs text-moss-200">{harvest.barrels === 1 ? 'standard 50-gal barrel' : 'standard 50-gal barrels'}</p>
                  </div>
                </div>
                <div className="border-t border-moss-200 bg-white px-4 py-0.5">
                  <p className="text-xs text-bark-500">
                    At {efficiency || 0}% collection efficiency, from {round(harvest.sqft, 0).toLocaleString()} sq ft.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Water Pressure (PSI) */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-4 py-2">
          <h2 className="font-display text-lg font-semibold text-white">Water Pressure (PSI)</h2>
        </div>

        <div className="flex flex-col gap-1 p-4">
          <div className="max-w-xs">
            <label htmlFor="rb-height" className="label-field">
              Height of water surface above spigot <span className="text-bark-500">({heightUnit})</span>
            </label>
            <input
              id="rb-height"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={height}
              onChange={handleNumericChange(setHeight)}
              className="input-field mt-1"
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
            <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">PSI = 0.433 &times; height (ft)</p>
          </details>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasPressureResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter the height of the water surface above your spigot to see the water pressure.
              </p>
            ) : (
              <div className="p-2">
                <p className="text-xs text-bark-500">Water pressure</p>
                <p className="font-display text-3xl font-bold text-moss-700">{round(pressure.psi, 2)} PSI</p>
              </div>
            )}
          </div>

          {/* Full explanation of what each pressure range means (and when a
              booster pump is needed) already lives in the "How Much Water
              Pressure Will You Get?" article section below -- kept to a
              short pointer here so it fits on one line next to Export PDF
              (which lives in this same row, rather than its own row below,
              since it's the calculator's one shared export action and this
              is the last footer row in the card). */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {hasPressureResult ? (
              <p className="text-xs leading-relaxed text-bark-600">
                {pressure.psi < 3
                  ? 'Under 3 PSI: drip irrigation only.'
                  : pressure.psi < 8
                  ? '3–8 PSI: OK for drip/soaker hoses.'
                  : 'Above 8 PSI: still below sprinkler range.'}
              </p>
            ) : (
              <span />
            )}
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
        </div>
      </div>

      {/* Was this helpful? -- one shared prompt for the whole calculator
          (both sections share a single feedback vote), shown once either
          result is available. */}
      {(hasHarvestResult || hasPressureResult) && (
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
    </div>
  );
}
