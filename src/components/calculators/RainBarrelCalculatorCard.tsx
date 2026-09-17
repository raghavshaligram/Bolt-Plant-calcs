import { round } from './useRainBarrelCalculatorState';
import type { RainBarrelCalculatorState } from './useRainBarrelCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

export interface RainBarrelCalculatorCardProps {
  calc: RainBarrelCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card, driven entirely by the shared
 * useRainBarrelCalculatorState() hook instead of owning its own state, plus
 * a header Reset button and a "Was this helpful?" prompt (per the
 * sticky-layout pattern -- see CALC_ROLLOUT_PATTERN.md).
 *
 * Structure note: this used to render as TWO stacked card shells
 * ("Rainwater Harvesting" and "Water Pressure (PSI)"), each with its own
 * moss header bar, its own padded body, its own "Show the math" disclosure
 * and its own result block. That duplicated chrome -- a second 52px header,
 * a second set of body padding, a second formula disclosure and a second
 * bordered result box -- was most of why this card needed an internal
 * scrollbar at 768px, and none of it carried information.
 *
 * It is now one card. The four inputs (roof area, rainfall, collection
 * efficiency, spigot height) share the panel's 560px width instead of
 * stacking, both formulas live in one "Show the math" disclosure, and the
 * three outputs -- gallons collected, barrel count, spigot PSI -- read as
 * one result strip with a single footer line. Each output still states its
 * own units and each tile falls back to a dash until its inputs are filled,
 * so the two independent calculations stay independently readable.
 *
 * Content that is not duplicated anywhere else stays here. The "85% is a
 * common default..." rationale and the full water-pressure-range
 * interpretation are both covered at length in the article body ("How Much
 * Rainwater Can You Collect?" and "How Much Water Pressure Will You Get?"),
 * so those stay as short pointers rather than paragraphs -- see
 * SCROLL_FIX_PATTERN.md's dedupe carve-out. There are no static
 * reference/lookup tables in this calculator to extract into a sibling
 * ReferenceTables component.
 */
export default function RainBarrelCalculatorCard({ calc, sentiment, onVote }: RainBarrelCalculatorCardProps) {
  const {
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

  const tabButtonClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition ${
      active ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
    }`;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3.5">
          <h2 className="font-display text-lg font-semibold text-white">Rain Barrel Calculator</h2>
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

        <div className="flex flex-col gap-4 p-5">
          {/* The Units toggle shares its row with the first two inputs
              rather than owning one -- at 560px there's room for the pill
              group and two number fields side by side, and each field
              already names its own unit, so the pills don't need to repeat
              them. */}
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            <div>
              <span className="label-field">Units</span>
              <div className="mt-1.5 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
                <button type="button" aria-pressed={!isMetric} onClick={() => setUnitSystem('imperial')} className={tabButtonClass(!isMetric)}>
                  Imperial
                </button>
                <button type="button" aria-pressed={isMetric} onClick={() => setUnitSystem('metric')} className={tabButtonClass(isMetric)}>
                  Metric
                </button>
              </div>
            </div>
            <div className="min-w-[8rem] flex-1">
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
                className="input-field mt-1.5"
              />
            </div>
            <div className="min-w-[8rem] flex-1">
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
                className="input-field mt-1.5"
              />
            </div>
          </div>

          {/* Efficiency and spigot height pair up on one row; the second
              drives the water-pressure tile, which used to live in a whole
              second card of its own. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rb-efficiency" className="label-field">
                Collection efficiency <span className="text-bark-500">(%)</span>
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
                className="input-field mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="rb-height" className="label-field">
                Water height above spigot <span className="text-bark-500">({heightUnit})</span>
              </label>
              <input
                id="rb-height"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={height}
                onChange={handleNumericChange(setHeight)}
                className="input-field mt-1.5"
              />
            </div>
          </div>

          <p className="text-xs text-bark-500">
            85% is a common collection-efficiency default &mdash; it covers evaporation off the roof, gutter
            overflow in heavy rain, splash-out, and any first-flush diverter.
          </p>

          {/* Both formulas in one collapsed disclosure -- it used to be one
              per section. */}
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
              Gallons = Roof area (sq ft) &times; Rainfall (in) &times; 0.623 &times; Efficiency
            </p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">PSI = 0.433 &times; height (ft)</p>
          </details>

          {/* One result strip for both calculations: collected volume,
              barrel count, and spigot pressure. Each tile is independent --
              it shows a dash until its own inputs are filled. */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasHarvestResult && !hasPressureResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your roof area and rainfall above to see how much water you can collect, and your
                barrel height to see the pressure at the spigot.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-1 divide-y divide-moss-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                  <div className="p-4">
                    <p className="text-xs text-bark-500">You can collect</p>
                    <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                      {hasHarvestResult ? round(harvest.gallons, 1).toLocaleString() : '—'}
                    </p>
                    <p className="text-xs font-medium text-bark-600">
                      gallons
                      {hasHarvestResult && (
                        <span className="ml-1 text-bark-400">({round(harvest.liters, 1).toLocaleString()} L)</span>
                      )}
                    </p>
                  </div>

                  <div className="bg-moss-700 p-4">
                    <p className="text-xs text-moss-200">That&rsquo;s about</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {hasHarvestResult ? harvest.barrels.toLocaleString() : '—'}
                    </p>
                    <p className="text-xs text-moss-200">
                      {harvest.barrels === 1 && hasHarvestResult ? 'standard 50-gal barrel' : 'standard 50-gal barrels'}
                    </p>
                  </div>

                  <div className="p-4">
                    <p className="text-xs text-bark-500">Spigot pressure</p>
                    <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                      {hasPressureResult ? round(pressure.psi, 2) : '—'}
                    </p>
                    <p className="text-xs font-medium text-bark-600">PSI</p>
                  </div>
                </div>

                <div className="border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    {hasHarvestResult && (
                      <>
                        At {efficiency || 0}% collection efficiency, from {round(harvest.sqft, 0).toLocaleString()} sq ft.
                      </>
                    )}
                    {hasHarvestResult && hasPressureResult && ' '}
                    {hasPressureResult && (
                      <>
                        {pressure.psi < 3
                          ? 'Under 3 PSI: drip irrigation only.'
                          : pressure.psi < 8
                          ? '3–8 PSI: fine for drip and soaker hoses.'
                          : 'Above 8 PSI: still below sprinkler range.'}
                      </>
                    )}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Was this helpful? -- one shared prompt for the whole calculator,
              sharing its row with Export PDF so the two footer controls cost
              one row instead of two. */}
          {(hasHarvestResult || hasPressureResult) && (
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
