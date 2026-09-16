import { GRASS_RATES, TOPDRESS_OPTIONS, CONDITION_LABELS } from './useOverseedingCalculatorState';
import type { GrassKey, TopdressMaterial, OverseedingCalculatorState } from './useOverseedingCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface OverseedingCalculatorCardProps {
  calc: OverseedingCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * OverseedingCalculator.tsx (minus the static "Overseeding rates by grass
 * type" table, dropped here since the page's own article body already
 * carries an equivalent table -- see the comment above the "Was this
 * helpful?" block below), now driven entirely by the shared
 * useOverseedingCalculatorState() hook instead of owning its own state.
 * That's what lets the left column's action row and the Share/Embed/Cite
 * modal (OverseedingCalculatorPanel.tsx) read and reset the same
 * inputs/result even though they render in a different part of the DOM.
 */
export default function OverseedingCalculatorCard({ calc, sentiment, onVote }: OverseedingCalculatorCardProps) {
  const {
    area,
    grass,
    setGrass,
    condition,
    setCondition,
    unitSystem,
    setUnitSystem,
    useTopdressing,
    setUseTopdressing,
    topdressMaterial,
    setTopdressMaterial,
    depth,
    isMetric,
    areaUnit,
    depthUnit,
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
            helpful?" prompt), same as the pilot's card. The original
            component had no Reset button; this is added new per
            CALC_ROLLOUT_PATTERN.md. */}
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-white">
            Calculate Your Overseeding Needs
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">Units</span>
              <div className="mt-1.5 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="os-area" className="label-field">
                Lawn area <span className="text-bark-500">({areaUnit})</span>
              </label>
              <input
                id="os-area"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={area}
                onChange={handleAreaChange}
                className="input-field mt-1.5 py-1.5"
              />
            </div>
            <div>
              <label htmlFor="os-grass" className="label-field">
                Grass type
              </label>
              <select
                id="os-grass"
                value={grass}
                onChange={(e) => setGrass(e.target.value as GrassKey)}
                className="input-field mt-1.5 py-1.5"
              >
                {(Object.keys(GRASS_RATES) as GrassKey[]).map((key) => (
                  <option key={key} value={key}>
                    {GRASS_RATES[key].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="os-condition" className="label-field">
              Lawn condition <span className="text-bark-500">(sets the rate within the range)</span>
            </label>
            <select
              id="os-condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value as 'thin' | 'patchy' | 'very-thin')}
              className="input-field mt-1.5 py-1.5"
            >
              <option value="thin">Thin but mostly green</option>
              <option value="patchy">Patchy</option>
              <option value="very-thin">Very thin with bare spots</option>
            </select>
          </div>

          <div className="rounded-lg bg-sand-50 p-2 ring-1 ring-moss-100">
            <label className="flex items-center gap-2.5 text-sm font-medium text-bark-800">
              <input
                type="checkbox"
                checked={useTopdressing}
                onChange={(e) => setUseTopdressing(e.target.checked)}
                className="h-4 w-4 rounded border-bark-300 text-moss-700 focus:ring-2 focus:ring-moss-500"
              />
              Also calculate topdressing
            </label>

            {useTopdressing && (
              <div className="mt-1.5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="os-topdress-material" className="label-field">
                    Topdressing material
                  </label>
                  <select
                    id="os-topdress-material"
                    value={topdressMaterial}
                    onChange={(e) => setTopdressMaterial(e.target.value as TopdressMaterial)}
                    className="input-field mt-1.5 py-1.5"
                  >
                    {(Object.keys(TOPDRESS_OPTIONS) as TopdressMaterial[]).map((key) => (
                      <option key={key} value={key}>
                        {TOPDRESS_OPTIONS[key]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="os-depth" className="label-field">
                    Depth <span className="text-bark-500">({depthUnit}, &frac14;&Prime; typical)</span>
                  </label>
                  <input
                    id="os-depth"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.125"
                    value={depth}
                    onChange={handleDepthChange}
                    className="input-field mt-1.5 py-1.5"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Formula display -- collapsed by default. It's useful reference,
              not something most visitors need open while they work, and
              keeping it closed is most of what lets this panel stay short
              enough to stick without an internal scrollbar. */}
          <details className="group rounded-lg bg-sand-50 px-4 py-1 text-sm text-bark-600 ring-1 ring-moss-100">
            <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                Show the math
                <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">
              Seed (lb) = (Area &divide; 1,000) &times; rate for grass type &amp; condition
            </p>
            {useTopdressing && (
              <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                Topdressing (cu ft) = Area &times; (Depth &divide; 12) &nbsp;&middot;&nbsp; Cu yd = Cu ft &divide; 27
              </p>
            )}
          </details>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your lawn area, grass type, and condition above to see how much seed you need.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-center gap-3 p-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                        <path d="M16 4c-3 4-5 7-5 11a5 5 0 0 0 10 0c0-4-2-7-5-11Z" />
                        <path d="M16 26c-2-3-4-5-4-8a4 4 0 0 1 8 0c0 3-2 5-4 8Z" opacity="0.5" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">You need about</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {round(result.seedLbs, 1).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">lb of grass seed</p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-2">
                    <p className="text-xs text-moss-200">That&rsquo;s about</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {result.bags50lb.toLocaleString()}
                    </p>
                    <p className="text-xs text-moss-200">
                      50 lb {result.bags50lb === 1 ? 'bag' : 'bags'} &middot; {result.rate} lb/1,000 sq ft
                    </p>
                  </div>
                </div>

                {useTopdressing && (
                  <div className="flex items-center gap-3 border-t border-moss-200 px-4 py-0.5">
                    <div>
                      <p className="font-display text-2xl font-bold text-moss-700">
                        {round(result.topdressCubicFt, 1).toLocaleString()}{' '}
                        <span className="text-sm font-medium text-bark-500">cu ft topdressing</span>
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        {TOPDRESS_OPTIONS[topdressMaterial]}{' '}
                        <span className="font-normal text-bark-400">
                          (~{round(result.topdressCubicYd, 2)} cu yd{isMetric ? `, ${round(result.topdressCubicM, 2)} m³` : ''})
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-1">
                  <p className="text-xs text-bark-500">
                    For {round(result.sqft, 0).toLocaleString()} sq ft, {CONDITION_LABELS[condition].toLowerCase()}.
                  </p>
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
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
              row lives up in the left column's action row instead. None of
              the 24 calculators had this before the sticky-layout rollout;
              it's added new here per CALC_ROLLOUT_PATTERN.md. */}
          {hasResult && (
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

          {/* The "Overseeding rates by grass type" reference table used to
              live here too, but the page's own article body already carries
              an equivalent "Overseeding Rates by Grass Type" section built
              from the same figures (see overseeding-calculator.astro). Per
              CALC_ROLLOUT_PATTERN.md, a component-internal table only gets
              extracted into a sibling ReferenceTables.tsx when it isn't
              already covered by article content -- here it already is, so
              the redundant copy is simply dropped rather than duplicated,
              which also keeps this panel short enough to stick without an
              internal scrollbar. */}
        </div>
      </div>
    </div>
  );
}
