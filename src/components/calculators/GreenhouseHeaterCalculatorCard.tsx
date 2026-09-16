import { GLAZING_OPTIONS, FUEL_OPTIONS, round } from './useGreenhouseHeaterCalculatorState';
import type { GreenhouseHeaterCalculatorState, GlazingKey, FuelKey, Shape } from './useGreenhouseHeaterCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

export interface GreenhouseHeaterCalculatorCardProps {
  calc: GreenhouseHeaterCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical inputs/results/PDF-export
 * markup to the original GreenhouseHeaterCalculator.tsx, now driven entirely
 * by the shared useGreenhouseHeaterCalculatorState() hook instead of owning
 * its own state, plus a header Reset button and a "Was this helpful?" prompt
 * (new, per the sticky-layout pattern -- see CALC_ROLLOUT_PATTERN.md).
 *
 * The original card also rendered a static "U-factor by glazing type"
 * reference table below the result -- that table doesn't depend on any live
 * input, so it's been extracted into GreenhouseHeaterReferenceTables.tsx and
 * portaled into the normal article flow instead, matching the pilot's
 * RaisedBedSoilReferenceTables treatment. The formula display is a
 * collapsed-by-default "Show the math" <details>.
 *
 * This was one of the worst sticky-panel scroll offenders in the whole
 * rollout, so on top of those two levers it needed several more rounds:
 *  - The header title was shortened (it was wrapping to 2 lines) and the
 *    shape-select/units row was switched from flex-wrap to a 2-col grid --
 *    at the sticky column's width, flex-wrap was dropping "Units" to its
 *    own line below "Greenhouse shape" instead of sitting beside it.
 *  - The inside/outside-temperature labels were shortened (they were each
 *    wrapping to 2 lines in that grid column).
 *  - The ASHRAE-99%-design-temperature note (previously a 3-sentence
 *    paragraph inside the narrow "outside temperature" grid column, where
 *    it wrapped to ~5 lines) is now a single short full-width pointer below
 *    the grid -- the full explanation already lives in the article's
 *    "Common Mistakes" section ("Relying on record low alone"), so this
 *    isn't losing information, just not duplicating it in the tight sticky
 *    panel (see SCROLL_FIX_PATTERN.md's dedupe carve-out).
 *  - The result's "Breakdown" (surface area / ΔT / U-factor / safety factor
 *    / efficiency -- the calculation's intermediate steps) is now its own
 *    collapsed-by-default "Show calculation breakdown" <details>, same
 *    convention as "Show the math": it's supplementary derivation detail,
 *    not the primary result (heat loss + recommended heater size stay
 *    visible in the two big result tiles above it).
 *  - Spacing is tightened throughout (gap-5/p-6 -> gap-2/p-4, header
 *    py-4 -> py-2.5, result cells p-4 sm:p-5 -> p-3, footer/helper bars ->
 *    py-1/py-1.5).
 */
export default function GreenhouseHeaterCalculatorCard({ calc, sentiment, onVote }: GreenhouseHeaterCalculatorCardProps) {
  const {
    shape,
    setShape,
    unitSystem,
    setUnitSystem,
    length,
    width,
    height,
    glazing,
    setGlazing,
    insideTemp,
    outsideTemp,
    fuel,
    setFuel,
    isMetric,
    lengthUnit,
    tempUnit,
    handleLengthChange,
    handleWidthChange,
    handleHeightChange,
    handleInsideTempChange,
    handleOutsideTempChange,
    result,
    hasResult,
    exportPdf,
    reset,
  } = calc;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-4 py-2">
          <h2 className="font-display text-lg font-semibold text-white">
            Greenhouse Heater Size
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

        <div className="flex flex-col gap-1 p-4">
          {/* Grid (not flex-wrap) -- at the sticky column's width, flex-wrap
              was dropping "Units" onto its own line below "Greenhouse
              shape" instead of sitting beside it, costing an extra row. */}
          <div className="grid grid-cols-2 items-end gap-2">
            <div>
              <label htmlFor="gh-shape" className="label-field">
                Greenhouse shape
              </label>
              <select
                id="gh-shape"
                value={shape}
                onChange={(e) => setShape(e.target.value as Shape)}
                className="input-field mt-1"
              >
                <option value="hoop">Hoop / Quonset</option>
                <option value="gable">Gable (A-frame)</option>
                <option value="lean-to">Lean-to</option>
              </select>
            </div>

            <div>
              <span className="label-field">Units</span>
              <div className="mt-1 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
                <button
                  type="button"
                  aria-pressed={!isMetric}
                  onClick={() => setUnitSystem('imperial')}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                    !isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Imperial
                </button>
                <button
                  type="button"
                  aria-pressed={isMetric}
                  onClick={() => setUnitSystem('metric')}
                  className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                    isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Metric
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="gh-length" className="label-field">
                Length <span className="text-bark-500">({lengthUnit})</span>
              </label>
              <input
                id="gh-length"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={length}
                onChange={handleLengthChange}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label htmlFor="gh-width" className="label-field">
                Width {shape === 'hoop' && <span className="text-bark-500">(diameter)</span>}{' '}
                <span className="text-bark-500">({lengthUnit})</span>
              </label>
              <input
                id="gh-width"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={width}
                onChange={handleWidthChange}
                className="input-field mt-1"
              />
            </div>

            {shape === 'hoop' ? (
              <div className="sm:col-span-2 rounded-lg bg-sand-50 px-4 py-0.5 text-xs text-bark-500 ring-1 ring-moss-100">
                A semicircular hoop house&rsquo;s peak height is automatically half the width
                {result.peakHeightFt !== null && (
                  <> &mdash; about {round(result.peakHeightFt, 1)} ft here.</>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="gh-height" className="label-field">
                  {shape === 'gable' ? 'Eave / wall height' : 'Wall height'}{' '}
                  <span className="text-bark-500">({lengthUnit})</span>
                </label>
                <input
                  id="gh-height"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={height}
                  onChange={handleHeightChange}
                  className="input-field mt-1"
                />
              </div>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="gh-glazing" className="label-field">
                Glazing type
              </label>
              <select
                id="gh-glazing"
                value={glazing}
                onChange={(e) => setGlazing(e.target.value as GlazingKey)}
                className="input-field mt-1"
              >
                {(Object.keys(GLAZING_OPTIONS) as GlazingKey[]).map((key) => (
                  <option key={key} value={key}>
                    {GLAZING_OPTIONS[key].label} (U = {GLAZING_OPTIONS[key].u})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="gh-fuel" className="label-field">
                Heater fuel type
              </label>
              <select
                id="gh-fuel"
                value={fuel}
                onChange={(e) => setFuel(e.target.value as FuelKey)}
                className="input-field mt-1"
              >
                {(Object.keys(FUEL_OPTIONS) as FuelKey[]).map((key) => (
                  <option key={key} value={key}>
                    {FUEL_OPTIONS[key].label} ({FUEL_OPTIONS[key].efficiency}% efficient)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="gh-inside-temp" className="label-field">
                Inside temp. <span className="text-bark-500">({tempUnit})</span>
              </label>
              <input
                id="gh-inside-temp"
                type="number"
                inputMode="decimal"
                step="1"
                value={insideTemp}
                onChange={handleInsideTempChange}
                className="input-field mt-1"
              />
            </div>
            <div>
              <label htmlFor="gh-outside-temp" className="label-field">
                Outside low <span className="text-bark-500">({tempUnit})</span>
              </label>
              <input
                id="gh-outside-temp"
                type="number"
                inputMode="decimal"
                step="1"
                value={outsideTemp}
                onChange={handleOutsideTempChange}
                className="input-field mt-1"
                aria-describedby="gh-outside-temp-note"
              />
            </div>
          </div>
          {/* Full ASHRAE-99%-design-temperature explanation already lives in
              the article's "Common Mistakes" section ("Relying on record low
              alone") -- kept to a short, full-width pointer here (rather
              than the narrow grid column it used to wrap 5 lines in) so it
              doesn't duplicate that paragraph in the tight sticky panel. */}
          <p id="gh-outside-temp-note" className="text-xs text-bark-500">
            See Common Mistakes below for the ASHRAE 99% alternative.
          </p>

          {/* Formula display -- collapsed by default. It's useful reference,
              not something most visitors need open while they work, and
              keeping it closed is most of what lets this input-heavy panel
              stay short enough to stick without an internal scrollbar. */}
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
              Heat Loss (Q) = U-factor × Surface Area × ΔT
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Recommended Heater Size = (Q × 1.15) ÷ (Fuel Efficiency ÷ 100)
            </p>
          </details>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your greenhouse dimensions and temperatures above to see your heat loss
                and recommended heater size.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-center gap-3 p-1.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                        <path
                          d="M16 4v6M9 8l4 4M23 8l-4 4M6 16h6M20 16h6M9 24l4-4M23 24l-4-4M16 22v6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <circle cx="16" cy="16" r="4" fill="currentColor" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">Estimated heat loss</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {round(result.heatLossBtuHr, 0).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        BTU/hr <span className="ml-1 text-bark-400">({round(result.heatLossKw, 2)} kW)</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-1.5">
                    <p className="text-xs text-moss-200">Recommended heater size</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {round(result.recommendedBtuHr, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-moss-200">
                      BTU/hr ({round(result.recommendedKw, 2)} kW)
                    </p>
                  </div>
                </div>

                {/* Calculation breakdown -- collapsed by default, same
                    convention as "Show the math": these are the calc's
                    intermediate steps, not the primary result (heat loss +
                    recommended heater size stay visible above in the two
                    result tiles), so hiding it by default is what lets this
                    input-heavy card fit the sticky panel's height budget. */}
                <details className="group border-t border-moss-200 px-4 py-0.5 text-xs text-bark-600">
                  <summary className="cursor-pointer list-none font-semibold uppercase tracking-wider text-bark-400 marker:hidden [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-1.5">
                      Show calculation breakdown
                      <svg className="h-3 w-3 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </summary>
                  <dl className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    <div className="flex justify-between gap-2 sm:block">
                      <dt className="text-bark-500">Surface area</dt>
                      <dd className="font-medium text-bark-800">{round(result.areaSqFt, 0).toLocaleString()} sq ft</dd>
                    </div>
                    <div className="flex justify-between gap-2 sm:block">
                      <dt className="text-bark-500">Temp. differential (ΔT)</dt>
                      <dd className="font-medium text-bark-800">{round(result.deltaT, 1)}°F</dd>
                    </div>
                    <div className="flex justify-between gap-2 sm:block">
                      <dt className="text-bark-500">U-factor</dt>
                      <dd className="font-medium text-bark-800">{result.uFactor}</dd>
                    </div>
                    <div className="flex justify-between gap-2 sm:block">
                      <dt className="text-bark-500">Heat loss (U × A × ΔT)</dt>
                      <dd className="font-medium text-bark-800">{round(result.heatLossBtuHr, 0).toLocaleString()} BTU/hr</dd>
                    </div>
                    <div className="flex justify-between gap-2 sm:block">
                      <dt className="text-bark-500">+ 15% safety factor</dt>
                      <dd className="font-medium text-bark-800">{round(result.afterSafety, 0).toLocaleString()} BTU/hr</dd>
                    </div>
                    <div className="flex justify-between gap-2 sm:block">
                      <dt className="text-bark-500">÷ {result.efficiency}% fuel efficiency</dt>
                      <dd className="font-medium text-bark-800">
                        {round(result.recommendedBtuHr, 0).toLocaleString()} BTU/hr
                      </dd>
                    </div>
                  </dl>
                </details>

                {/* Full "well-sealed structure" / windy-site caveat already
                    lives in the article's "Common Mistakes" section
                    ("Undersizing for a leaky structure", "Not accounting for
                    wind exposure") -- kept to a short pointer here so it
                    fits on one line next to Export PDF. */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-0.5">
                  <p className="text-xs text-bark-500">Assumes a sealed structure; add 10&ndash;15% if windy.</p>
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
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
              </>
            )}
          </div>

          {/* Was this helpful? -- stays directly under the result, since it's
              asking about the result specifically. The aggregate count/icon
              row lives up in the left column's action row instead. */}
          {hasResult && (
            <div className="flex items-center gap-2 rounded-lg bg-sand-50 px-4 py-0.5 ring-1 ring-moss-100">
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

          {/* The "U-factor by glazing type" reference table used to live
              here, but it's the main reason this sticky panel needed an
              internal scrollbar to fit typical viewports. It now renders in
              the normal page content instead (see
              GreenhouseHeaterReferenceTables.tsx, portaled into the
              article), so this panel stays short enough to stick without
              scrolling. */}
        </div>
      </div>
    </div>
  );
}
