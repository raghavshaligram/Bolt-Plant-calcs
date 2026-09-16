import type { TreeHeightCalculatorState } from './useTreeHeightCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

function round(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface TreeHeightCalculatorCardProps {
  calc: TreeHeightCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * TreeHeightCalculator.tsx, now driven entirely by the shared
 * useTreeHeightCalculatorState() hook instead of owning its own state.
 * That's what lets the left column's action row and the Share/Embed/Cite
 * modal (TreeHeightCalculatorPanel.tsx) read and reset the same
 * inputs/result even though they render in a different part of the DOM.
 * The component had no static reference tables inside its card, so there's
 * no companion TreeHeightReferenceTables.tsx per CALC_ROLLOUT_PATTERN.md.
 */
export default function TreeHeightCalculatorCard({ calc, sentiment, onVote }: TreeHeightCalculatorCardProps) {
  const {
    setUnitSystem,
    method,
    setMethod,
    angleDistance,
    angleTop,
    eyeHeight,
    slopeMode,
    setSlopeMode,
    angleBase,
    treeShadow,
    refHeight,
    refShadow,
    stickLength,
    armDistance,
    stickDistance,
    isMetric,
    lengthUnit,
    handleAngleDistanceChange,
    handleAngleTopChange,
    handleEyeHeightChange,
    handleAngleBaseChange,
    handleTreeShadowChange,
    handleRefHeightChange,
    handleRefShadowChange,
    handleStickLengthChange,
    handleArmDistanceChange,
    handleStickDistanceChange,
    activeResult,
    formulaLine,
    methodLabel,
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
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-white">Tree Height Calculator</h2>
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

        <div className="flex flex-col gap-1.5 p-4">
          {/* Units + method */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">Units</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Unit system">
                <button type="button" role="tab" aria-selected={!isMetric} onClick={() => setUnitSystem('imperial')} className={tabButtonClass(!isMetric)}>
                  Feet
                </button>
                <button type="button" role="tab" aria-selected={isMetric} onClick={() => setUnitSystem('metric')} className={tabButtonClass(isMetric)}>
                  Meters
                </button>
              </div>
            </div>

            <div>
              <span className="label-field">Method</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Measurement method">
                <button type="button" role="tab" aria-selected={method === 'angle'} onClick={() => setMethod('angle')} className={tabButtonClass(method === 'angle')}>
                  Angle
                </button>
                <button type="button" role="tab" aria-selected={method === 'shadow'} onClick={() => setMethod('shadow')} className={tabButtonClass(method === 'shadow')}>
                  Shadow
                </button>
                <button type="button" role="tab" aria-selected={method === 'stick'} onClick={() => setMethod('stick')} className={tabButtonClass(method === 'stick')}>
                  Stick
                </button>
              </div>
            </div>
          </div>

          {/* ANGLE METHOD */}
          {method === 'angle' && (
            <div className="flex flex-col gap-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="th-distance" className="label-field">Distance to tree ({lengthUnit})</label>
                  <input
                    id="th-distance"
                    type="text"
                    inputMode="decimal"
                    value={angleDistance}
                    onChange={handleAngleDistanceChange}
                    className="input-field mt-1.5 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="th-angle-top" className="label-field">Angle to treetop (&deg;)</label>
                  <input
                    id="th-angle-top"
                    type="text"
                    inputMode="decimal"
                    value={angleTop}
                    onChange={handleAngleTopChange}
                    className="input-field mt-1.5 py-2"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-sand-50 px-3 py-1.5 ring-1 ring-moss-100">
                <p className="text-xs text-bark-500">
                  Use your phone&rsquo;s level/compass app to read the angle &mdash; no clinometer needed.
                </p>
              </div>

              <div>
                <span className="label-field">Ground between you and the tree</span>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setSlopeMode('none')}
                    className={`rounded-lg px-3 py-1.5 text-left text-sm ring-1 transition ${
                      slopeMode === 'none' ? 'bg-moss-700 text-white ring-moss-700' : 'bg-sand-50 text-bark-700 ring-moss-100 hover:bg-moss-50'
                    }`}
                  >
                    <span className="block font-semibold">Level</span>
                    <span className={`block text-xs ${slopeMode === 'none' ? 'text-moss-100' : 'text-bark-500'}`}>Simple formula</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlopeMode('below')}
                    className={`rounded-lg px-3 py-1.5 text-left text-sm ring-1 transition ${
                      slopeMode === 'below' ? 'bg-moss-700 text-white ring-moss-700' : 'bg-sand-50 text-bark-700 ring-moss-100 hover:bg-moss-50'
                    }`}
                  >
                    <span className="block font-semibold">Below you</span>
                    <span className={`block text-xs ${slopeMode === 'below' ? 'text-moss-100' : 'text-bark-500'}`}>You&rsquo;re uphill</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlopeMode('above')}
                    className={`rounded-lg px-3 py-1.5 text-left text-sm ring-1 transition ${
                      slopeMode === 'above' ? 'bg-moss-700 text-white ring-moss-700' : 'bg-sand-50 text-bark-700 ring-moss-100 hover:bg-moss-50'
                    }`}
                  >
                    <span className="block font-semibold">Above you</span>
                    <span className={`block text-xs ${slopeMode === 'above' ? 'text-moss-100' : 'text-bark-500'}`}>Tree is uphill</span>
                  </button>
                </div>
              </div>

              {slopeMode === 'none' ? (
                <div>
                  <label htmlFor="th-eye-height" className="label-field">Your eye height ({lengthUnit})</label>
                  <input
                    id="th-eye-height"
                    type="text"
                    inputMode="decimal"
                    value={eyeHeight}
                    onChange={handleEyeHeightChange}
                    className="input-field mt-1.5 py-2 max-w-xs"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="th-angle-base" className="label-field">
                    Angle {slopeMode === 'below' ? 'down' : 'up'} to the tree&rsquo;s base (°)
                  </label>
                  <input
                    id="th-angle-base"
                    type="text"
                    inputMode="decimal"
                    value={angleBase}
                    onChange={handleAngleBaseChange}
                    className="input-field mt-1.5 py-2 max-w-xs"
                  />
                  <p className="mt-1 text-xs text-bark-500">
                    Sloped ground needs this second angle to correct the simple formula. See &ldquo;Measuring on a Slope&rdquo; below.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SHADOW METHOD */}
          {method === 'shadow' && (
            <div className="flex flex-col gap-2">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="th-tree-shadow" className="label-field">Tree&rsquo;s shadow ({lengthUnit})</label>
                  <input
                    id="th-tree-shadow"
                    type="text"
                    inputMode="decimal"
                    value={treeShadow}
                    onChange={handleTreeShadowChange}
                    className="input-field mt-1.5 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="th-ref-height" className="label-field">Reference height ({lengthUnit})</label>
                  <input
                    id="th-ref-height"
                    type="text"
                    inputMode="decimal"
                    value={refHeight}
                    onChange={handleRefHeightChange}
                    className="input-field mt-1.5 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="th-ref-shadow" className="label-field">Reference&rsquo;s shadow ({lengthUnit})</label>
                  <input
                    id="th-ref-shadow"
                    type="text"
                    inputMode="decimal"
                    value={refShadow}
                    onChange={handleRefShadowChange}
                    className="input-field mt-1.5 py-2"
                  />
                </div>
              </div>
              <p className="text-xs text-bark-500">
                Measure both shadows at the same time of day &mdash; even 20-30 minutes apart can throw the ratio off. Unreliable on sloping ground.
              </p>
            </div>
          )}

          {/* STICK METHOD */}
          {method === 'stick' && (
            <div className="flex flex-col gap-2">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="th-stick-length" className="label-field">Stick above fist ({lengthUnit})</label>
                  <input
                    id="th-stick-length"
                    type="text"
                    inputMode="decimal"
                    value={stickLength}
                    onChange={handleStickLengthChange}
                    className="input-field mt-1.5 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="th-arm-distance" className="label-field">Arm, eye to stick ({lengthUnit})</label>
                  <input
                    id="th-arm-distance"
                    type="text"
                    inputMode="decimal"
                    value={armDistance}
                    onChange={handleArmDistanceChange}
                    className="input-field mt-1.5 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="th-stick-distance" className="label-field">Distance to tree ({lengthUnit})</label>
                  <input
                    id="th-stick-distance"
                    type="text"
                    inputMode="decimal"
                    value={stickDistance}
                    onChange={handleStickDistanceChange}
                    className="input-field mt-1.5 py-2"
                  />
                </div>
              </div>
              <p className="text-xs text-bark-500">
                Hold the stick perfectly vertical &mdash; tilting it is the main source of error. Stand farther back for better accuracy.
              </p>
            </div>
          )}

          {/* Formula display -- collapsed by default. It's useful reference,
              not something most visitors need open while they work, and
              keeping it closed is most of what lets this panel stay short
              enough to stick without an internal scrollbar. */}
          {formulaLine && (
            <details className="group rounded-lg bg-sand-50 px-4 py-1 text-sm text-bark-600 ring-1 ring-moss-100">
              <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
                <span className="inline-flex items-center gap-1.5">
                  Show the math
                  <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </summary>
              <p className="mt-2 font-mono text-xs text-bark-700 sm:text-sm">{formulaLine}</p>
            </details>
          )}

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!activeResult.valid ? (
              <p className="p-5 text-sm text-bark-500">Enter your measurements above to see the estimated height.</p>
            ) : (
              <>
                <div className="p-2.5">
                  <p className="text-xs text-bark-500">Estimated tree height ({methodLabel})</p>
                  <p className="font-display text-3xl font-bold text-moss-700">
                    {round(activeResult.height)} <span className="text-lg font-medium text-bark-500">{lengthUnit}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-1">
                  <p className="text-xs text-bark-500">
                    {method === 'angle' && slopeMode !== 'none' ? 'Slope-corrected' : 'Method'}: {methodLabel}
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
              asking about the result specifically. */}
          {activeResult.valid && (
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
      </div>
    </div>
  );
}
