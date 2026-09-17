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
 * This is the most input-heavy calculator on the site, so rather than
 * squeezing its spacing (it keeps the house standard: gap-4/p-5 body,
 * py-3.5 header, p-4 result cells, no label or input-padding overrides) it
 * earns its height budget structurally, by using the sticky column's full
 * 560px:
 *  - Length / Width / Height share ONE three-up row. For a hoop house the
 *    third cell is a read-only "Peak height" field (it's derived -- half the
 *    width) instead of the full-width note below the grid that used to cost
 *    an extra row.
 *  - The two temperature inputs are narrow, so the ASHRAE pointer sits in
 *    that row's third cell instead of a row of its own. (The full
 *    ASHRAE-99%-design-temperature explanation is in the article's "Common
 *    Mistakes" section -- "Relying on record low alone".)
 *  - Everything supplementary about the result -- the formula, the
 *    intermediate steps (surface area / ΔT / U-factor / safety factor /
 *    efficiency) and the sealed-structure caveat -- lives in ONE collapsed
 *    disclosure inside the result block. That used to be three separate
 *    rows: a "Show the math" details, a "Show calculation breakdown"
 *    details, and a caveat footer bar.
 *  - Export PDF shares the "Was this helpful?" row (the NpkCalculatorCard
 *    pattern) instead of taking a row of its own.
 *  - The glazing/fuel row is split 1.35fr/1fr: glazing's option labels are
 *    the longest text in the card and an even split clipped them.
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
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3.5">
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

        <div className="flex flex-col gap-4 p-5">
          {/* Grid (not flex-wrap) -- at the sticky column's width, flex-wrap
              was dropping "Units" onto its own line below "Greenhouse
              shape" instead of sitting beside it, costing an extra row. */}
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            <div>
              <label htmlFor="gh-shape" className="label-field">
                Greenhouse shape
              </label>
              <select
                id="gh-shape"
                value={shape}
                onChange={(e) => setShape(e.target.value as Shape)}
                className="input-field mt-1.5"
              >
                <option value="hoop">Hoop / Quonset</option>
                <option value="gable">Gable (A-frame)</option>
                <option value="lean-to">Lean-to</option>
              </select>
            </div>

            <div>
              <span className="label-field">Units</span>
              <div className="mt-1.5 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
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

          {/* Length / Width / Height share one row -- at the sticky column's
              560px width three number inputs sit comfortably side by side,
              which saves a whole row over the old 2-up grid. For a hoop
              house the third cell isn't an input at all: peak height is
              derived (half the width), so it renders as a read-only field
              in the same slot rather than as a full-width note below the
              grid, which is what used to cost the extra row. */}
          <div className="grid gap-4 sm:grid-cols-3">
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
                className="input-field mt-1.5"
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
                className="input-field mt-1.5"
              />
            </div>

            {shape === 'hoop' ? (
              <div>
                <span className="label-field">
                  Peak height <span className="text-bark-500">({lengthUnit})</span>
                </span>
                <span className="input-field mt-1.5 flex items-baseline gap-1.5 bg-sand-50">
                  <span className="font-medium text-bark-700">
                    {result.peakHeightFt !== null
                      ? round(isMetric ? result.peakHeightFt / 3.28084 : result.peakHeightFt, 1)
                      : '—'}
                  </span>
                  <span className="truncate text-xs text-bark-500">&middot; half the width</span>
                </span>
              </div>
            ) : (
              <div>
                <label htmlFor="gh-height" className="label-field">
                  {shape === 'gable' ? 'Eave height' : 'Wall height'}{' '}
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
                  className="input-field mt-1.5"
                />
              </div>
            )}
          </div>

          {/* Glazing gets the wider half: its option labels are the longest
              text in the card, and an asymmetric split is what keeps them
              from being clipped by the select. */}
          <div className="grid gap-4 sm:grid-cols-[1.35fr_1fr]">
            <div>
              <label htmlFor="gh-glazing" className="label-field">
                Glazing type
              </label>
              <select
                id="gh-glazing"
                value={glazing}
                onChange={(e) => setGlazing(e.target.value as GlazingKey)}
                className="input-field mt-1.5"
              >
                {(Object.keys(GLAZING_OPTIONS) as GlazingKey[]).map((key) => (
                  <option key={key} value={key}>
                    {GLAZING_OPTIONS[key].label} (U {GLAZING_OPTIONS[key].u})
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
                className="input-field mt-1.5"
              >
                {(Object.keys(FUEL_OPTIONS) as FuelKey[]).map((key) => (
                  <option key={key} value={key}>
                    {FUEL_OPTIONS[key].label} ({FUEL_OPTIONS[key].efficiency}% eff.)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* The two temperature inputs are narrow, so the ASHRAE pointer
              rides along in the row's third cell instead of taking a full
              row of its own below the grid. (The full
              ASHRAE-99%-design-temperature explanation already lives in the
              article's "Common Mistakes" section -- "Relying on record low
              alone" -- so this stays a pointer either way.) */}
          <div className="grid gap-4 sm:grid-cols-3">
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
                className="input-field mt-1.5"
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
                className="input-field mt-1.5"
                aria-describedby="gh-outside-temp-note"
              />
            </div>
            <p id="gh-outside-temp-note" className="self-center text-xs text-bark-500">
              See Common Mistakes below for the ASHRAE 99% design-temperature alternative to a record low.
            </p>
          </div>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your greenhouse dimensions and temperatures above to see your heat loss
                and recommended heater size.
              </p>
            ) : (
              <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-center gap-3 p-4">
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

                  <div className="bg-moss-700 p-4">
                    <p className="text-xs text-moss-200">Recommended heater size</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {round(result.recommendedBtuHr, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-moss-200">
                      BTU/hr ({round(result.recommendedKw, 2)} kW)
                    </p>
                  </div>
              </div>
            )}

            {/* One collapsed disclosure carries everything supplementary
                about the number above: the formula, the intermediate steps,
                and the sealed-structure caveat. It used to be two separate
                always-present rows ("Show the math" above the results block
                and "Show calculation breakdown" inside it) plus a footer
                bar for the caveat -- three rows for content that is all the
                same kind of thing. It renders whether or not there's a
                result yet, so the formula is always reachable. */}
            <details className="group border-t border-moss-200 bg-white px-4 py-2.5 text-xs text-bark-600">
              <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-1.5">
                  Show the math
                  <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </summary>
              <p className="mt-2 font-mono text-xs text-bark-600">
                Heat Loss (Q) = U-factor × Surface Area × ΔT
              </p>
              <p className="mt-1 font-mono text-xs text-bark-500">
                Recommended Heater Size = (Q × 1.15) ÷ (Fuel Efficiency ÷ 100)
              </p>
              {hasResult && (
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
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
              )}
              {/* Full "leaky structure" / wind-exposure discussion lives in
                  the article's "Common Mistakes" section. */}
              <p className="mt-3 text-xs text-bark-500">
                Assumes a well-sealed structure &mdash; add 10&ndash;15% for a leaky frame or an exposed, windy site.
              </p>
            </details>
          </div>

          {/* Was this helpful? -- stays directly under the result, since it's
              asking about the result specifically. The aggregate count/icon
              row lives up in the left column's action row instead. */}
          {hasResult && (
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
