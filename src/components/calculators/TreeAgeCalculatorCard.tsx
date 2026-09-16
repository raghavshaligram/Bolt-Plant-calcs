import { SPECIES_PRESETS } from './useTreeAgeCalculatorState';
import type { TreeAgeCalculatorState } from './useTreeAgeCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

// The inline post-result lead-magnet offer that used to render here was
// removed as part of the Calculator Page Redesign rollout: the sticky
// panel must contain only inputs, results, reset, and the Yes/No feedback
// block (see CALC_ROLLOUT_PATTERN.md / the build prompt's explicit "nothing
// else goes in the sticky panel" requirement) -- a lead-magnet signup form
// is exactly the kind of extra content that was pushing this card's
// internal height past the sticky column's viewport budget. The cluster's
// standard lead magnet (Tree Care Cheat Sheet) now renders at the bottom of
// the page instead, via CalculatorLayout's normal auto-render, same as
// every other converted calculator.

function round(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface TreeAgeCalculatorCardProps {
  calc: TreeAgeCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * TreeAgeCalculator.tsx, now driven entirely by the shared
 * useTreeAgeCalculatorState() hook instead of owning its own state. The
 * static "Growth factor reference by species" table that used to render at
 * the bottom of this card is dropped here rather than extracted into a
 * portaled ReferenceTables component: the page's article body already has
 * its own "Growth Factor Reference Table" section (a separate, hand-written
 * table covering the same data) outside this component, so keeping a
 * second copy inside the card would just duplicate content instead of
 * moving it -- see CALC_ROLLOUT_PATTERN.md's carve-out for reference tables
 * that already live in the article flow.
 */
export default function TreeAgeCalculatorCard({ calc, sentiment, onVote }: TreeAgeCalculatorCardProps) {
  const {
    setUnitSystem,
    species,
    setSpecies,
    circumference,
    isMetric,
    circUnit,
    preset,
    handleCircumferenceChange,
    result,
    hasResult,
    exportPdf,
    reset,
  } = calc;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header */}
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-white">
            Estimate Your Tree&rsquo;s Age
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
          {/* Unit system toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">Units</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
                <button
                  type="button"
                  aria-pressed={!isMetric}
                  onClick={() => setUnitSystem('imperial')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    !isMetric
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Imperial (in)
                </button>
                <button
                  type="button"
                  aria-pressed={isMetric}
                  onClick={() => setUnitSystem('metric')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isMetric
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Metric (cm)
                </button>
              </div>
            </div>
          </div>

          {/* Species selector */}
          <div>
            <label htmlFor="ta-species" className="label-field">
              Tree species <span className="text-bark-500">(growth factor: {preset.growthFactor} yr/in)</span>
            </label>
            <select
              id="ta-species"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="input-field mt-1.5"
            >
              {SPECIES_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Circumference input */}
          <div>
            <label htmlFor="ta-circumference" className="label-field">
              Trunk circumference at breast height <span className="text-bark-500">({circUnit})</span>
            </label>
            <input
              id="ta-circumference"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={circumference}
              onChange={handleCircumferenceChange}
              className="input-field mt-1.5"
            />
            <p className="mt-1.5 text-xs text-bark-500">
              Measure at ~4.5 ft (1.4 m) above ground &mdash; the standard DBH point.
            </p>
          </div>

          {/* Formula display -- collapsed by default, same convention as the
              other converted calculators. It's useful reference, not
              something most visitors need open while they work, and keeping
              it closed is part of what lets this panel stay short enough to
              stick without an internal scrollbar. */}
          <details className="group rounded-lg bg-sand-50 px-4 py-2 text-sm text-bark-600 ring-1 ring-moss-100">
            <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                Show the math
                <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">
              Diameter = Circumference &divide; &pi;
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Estimated Age &asymp; Diameter &times; Growth Factor
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Range shown = estimate &plusmn; 20% (real variance by soil, climate &amp; care)
            </p>
          </details>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your tree&rsquo;s trunk circumference above to see its estimated age.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  {/* Left: diameter (intermediate step) */}
                  <div className="flex items-center gap-3 p-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                        <path d="M16 4c-3 4-5 7-5 11a5 5 0 0 0 10 0c0-4-2-7-5-11Z" />
                        <path d="M16 26c-2-3-4-5-4-8a4 4 0 0 1 8 0c0 3-2 5-4 8Z" opacity="0.5" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">Trunk diameter (DBH)</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {isMetric ? round(result.diameterCm, 1) : round(result.diameterIn, 1)}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        {circUnit}
                        {!isMetric && (
                          <span className="ml-1 text-bark-400">
                            ({round(result.diameterCm, 1)} cm)
                          </span>
                        )}
                        {isMetric && (
                          <span className="ml-1 text-bark-400">
                            ({round(result.diameterIn, 1)} in)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: estimated age range */}
                  <div className="bg-moss-700 p-3.5">
                    <p className="text-xs text-moss-200">Estimated age</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {result.ageLow}&ndash;{result.ageHigh}
                    </p>
                    <p className="text-xs text-moss-200">years old</p>
                    <p className="mt-1 text-xs text-moss-300">
                      Midpoint: ~{Math.round(result.ageMid)} yrs
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-1.5">
                  <p className="text-xs text-bark-500">
                    An estimate, not a precise measurement &mdash; only ring counting gives an exact age.
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

          {/* The "Growth factor reference by species" table used to live
              here, but the page's article already carries its own copy in
              the "Growth Factor Reference Table" section, so it isn't
              duplicated in this card -- see the component doc comment
              above. */}
        </div>
      </div>
    </div>
  );
}
