import { STANDARD_SIZES, PLANT_GUIDE, GAL_TO_L, GAL_TO_QT, IN_TO_CM, round } from './usePotSizeCalculatorState';
import type { PotSizeCalculatorState } from './usePotSizeCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

// The inline post-result lead-magnet offer that used to render here was
// removed as part of the Calculator Page Redesign rollout: the sticky
// panel must contain only inputs, results, reset, and the Yes/No feedback
// block (see CALC_ROLLOUT_PATTERN.md / the build prompt's explicit "nothing
// else goes in the sticky panel" requirement) -- a lead-magnet signup form
// is exactly the kind of extra content that was pushing this card's
// internal height past the sticky column's viewport budget. The cluster's
// standard lead magnet (Indoor Plants Cheat Sheet) now renders at the
// bottom of the page instead, via CalculatorLayout's normal auto-render,
// same as every other converted calculator.

export interface PotSizeCalculatorCardProps {
  calc: PotSizeCalculatorState;
  /**
   * The sticky right panel keeps ONLY the tool: inputs, results, reset, and
   * this "Was this helpful?" Yes/No prompt directly under the result (it's
   * asking about the result specifically, so it stays here rather than
   * moving to the left column's action row). Sentiment/onVote come from the
   * same useCalculatorFeedback() instance that backs the compact
   * thumbs-with-count icon up in the left column, so a vote from either
   * place updates both immediately.
   */
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * PotSizeCalculator.tsx, now driven entirely by the shared
 * usePotSizeCalculatorState() hook instead of owning its own state. That's
 * what lets the left column's action row and the Share/Embed/Cite modal
 * (PotSizeCalculatorPanel.tsx) read and reset the same inputs/results even
 * though they render in a different part of the DOM.
 *
 * PotSizeCalculator.tsx itself is left untouched (still used standalone,
 * with its own local state, by src/pages/embed/pot-size-calculator.astro).
 *
 * This calculator has three independent modes (Unit Converter, Repotting
 * Size-Up, Plant Guide) rather than one formula -- the reference tables
 * (Pot Size Conversion Chart, Container Size Guide by Plant) already lived
 * in the page's own article body, not inside this component, so there was
 * nothing to extract into a separate ReferenceTables component here.
 */
export default function PotSizeCalculatorCard({ calc, sentiment, onVote }: PotSizeCalculatorCardProps) {
  const {
    mode,
    setMode,
    setUnitSystem,
    isMetric,
    convertType,
    setConvertType,
    standardSizeId,
    setStandardSizeId,
    customType,
    setCustomType,
    customDiameter,
    handleCustomDiameterChange,
    customHeight,
    handleCustomHeightChange,
    customVolume,
    handleCustomVolumeChange,
    customVolUnit,
    setCustomVolUnit,
    sizeupCurrentId,
    setSizeupCurrentId,
    guidePlantId,
    setGuidePlantId,
    convertResult,
    sizeupResult,
    guideResult,
    exportPdf,
    reset,
  } = calc;

  const hasCurrentResult =
    mode === 'convert' ? !!convertResult : mode === 'sizeup' ? !!sizeupResult : !!guideResult;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header -- includes Reset, since the sticky panel now
            contains only the tool itself (inputs, results, reset, and the
            "Was this helpful?" prompt). The original component had no
            Reset button; this is new, same as every other converted
            calculator. */}
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-white">Pot Size Calculator</h2>
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

        <div className="flex flex-col gap-3 p-4">
          {/* Mode + unit toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">Calculation type</span>
              <div className="mt-2 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist">
                {([
                  { id: 'convert', label: 'Unit Converter' },
                  { id: 'sizeup', label: 'Repotting Size-Up' },
                  { id: 'guide', label: 'Plant Guide' },
                ] as { id: typeof mode; label: string }[]).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={mode === m.id}
                    onClick={() => setMode(m.id)}
                    className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                      mode === m.id ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label-field">Units</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
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

          {/* ---------------- CONVERT ---------------- */}
          {mode === 'convert' && (
            <>
              <div className="inline-flex rounded-lg bg-sand-100 p-1 self-start" role="group" aria-label="Converter input type">
                <button type="button" aria-pressed={convertType === 'standard'} onClick={() => setConvertType('standard')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${convertType === 'standard' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                  Standard nursery size
                </button>
                <button type="button" aria-pressed={convertType === 'custom'} onClick={() => setConvertType('custom')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${convertType === 'custom' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                  Custom pot
                </button>
              </div>

              {convertType === 'standard' && (
                <div>
                  <label htmlFor="pot-standard-size" className="label-field">Pot size</label>
                  <select id="pot-standard-size" value={standardSizeId} onChange={(e) => setStandardSizeId(e.target.value)}
                    className="input-field mt-1.5">
                    {STANDARD_SIZES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {convertType === 'custom' && (
                <>
                  <div className="inline-flex rounded-lg bg-sand-100 p-1 self-start" role="group" aria-label="Custom input type">
                    <button type="button" aria-pressed={customType === 'dims'} onClick={() => setCustomType('dims')}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${customType === 'dims' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                      I know diameter &amp; height
                    </button>
                    <button type="button" aria-pressed={customType === 'volume'} onClick={() => setCustomType('volume')}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${customType === 'volume' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                      I know target volume
                    </button>
                  </div>

                  {customType === 'dims' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="pot-custom-diameter" className="label-field">
                          Diameter <span className="text-bark-500">({isMetric ? 'cm' : 'in'})</span>
                        </label>
                        <input id="pot-custom-diameter" type="number" inputMode="decimal" min="0" step="0.1"
                          value={customDiameter} onChange={handleCustomDiameterChange} className="input-field mt-1.5" />
                      </div>
                      <div>
                        <label htmlFor="pot-custom-height" className="label-field">
                          Height <span className="text-bark-500">({isMetric ? 'cm' : 'in'})</span>
                        </label>
                        <input id="pot-custom-height" type="number" inputMode="decimal" min="0" step="0.1"
                          value={customHeight} onChange={handleCustomHeightChange} className="input-field mt-1.5" />
                      </div>
                    </div>
                  )}

                  {customType === 'volume' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="pot-custom-volume" className="label-field">Target volume</label>
                        <input id="pot-custom-volume" type="number" inputMode="decimal" min="0" step="0.1"
                          value={customVolume} onChange={handleCustomVolumeChange} className="input-field mt-1.5" />
                      </div>
                      <div>
                        <label htmlFor="pot-custom-volunit" className="label-field">Unit</label>
                        <select id="pot-custom-volunit" value={customVolUnit} onChange={(e) => setCustomVolUnit(e.target.value as 'gal' | 'qt' | 'L')}
                          className="input-field mt-1.5">
                          <option value="gal">Gallons</option>
                          <option value="qt">Quarts</option>
                          <option value="L">Liters</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
                    <p className="font-medium text-bark-700">The math:</p>
                    {customType === 'dims' ? (
                      <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                        Volume = &pi; &times; (diameter &divide; 2)&sup2; &times; height <span className="text-bark-400">(assumes a straight-sided cylinder)</span>
                      </p>
                    ) : (
                      <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                        Diameter &asymp; cube root of (4 &times; volume &divide; &pi;) <span className="text-bark-400">(assumes height &asymp; diameter)</span>
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!convertResult ? (
                  <p className="p-5 text-sm text-bark-500">Choose a standard size, or enter custom dimensions, to see the converted values.</p>
                ) : (
                  <div className="grid grid-cols-2 divide-x divide-moss-200">
                    <div className="p-4 sm:p-5">
                      <p className="text-xs text-bark-500">Diameter</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {isMetric ? round(convertResult.diameterIn * IN_TO_CM, 1) : round(convertResult.diameterIn, 2)}
                      </p>
                      <p className="text-xs font-medium text-bark-600">{isMetric ? 'cm' : 'in'}</p>
                    </div>
                    <div className="bg-moss-700 p-4 sm:p-5">
                      <p className="text-xs text-moss-200">Volume</p>
                      <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                        {isMetric ? round(convertResult.volGal * GAL_TO_L, 2) : round(convertResult.volGal, 2)}
                      </p>
                      <p className="text-xs text-moss-200">
                        {isMetric ? 'L' : 'gal'} &middot; {round(convertResult.volGal * GAL_TO_QT, 2)} qt &middot; {round(convertResult.volGal * GAL_TO_L, 2)} L
                      </p>
                    </div>
                  </div>
                )}
                {convertResult?.estimated && (
                  <div className="border-t border-moss-200 bg-white px-4 py-2.5 text-xs text-bark-500 sm:px-5">
                    Estimated figure — small pots and custom dimensions aren&rsquo;t part of any fixed manufacturer standard.
                  </div>
                )}
              </div>
            </>
          )}

          {/* ---------------- SIZE-UP ---------------- */}
          {mode === 'sizeup' && (
            <>
              <div>
                <label htmlFor="pot-sizeup-current" className="label-field">Current pot size</label>
                <select id="pot-sizeup-current" value={sizeupCurrentId} onChange={(e) => setSizeupCurrentId(e.target.value)}
                  className="input-field mt-1.5">
                  {STANDARD_SIZES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
                <p className="font-medium text-bark-700">The guideline:</p>
                <p className="mt-1">
                  Size up by roughly 2 in of diameter at a time (more for containers already 10 in+). Bigger jumps surround the roots with more soil than they can use, which is a common cause of root rot.
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!sizeupResult ? (
                  <p className="p-5 text-sm text-bark-500">Pick your current pot size to see the recommended next size up.</p>
                ) : sizeupResult.isLast ? (
                  <p className="p-5 text-sm text-bark-600">
                    {sizeupResult.current.label} is the largest size in this ladder. For anything larger, keep moving up one nursery size (or ~2-4 in of diameter) at a time.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 divide-x divide-moss-200">
                    <div className="p-4 sm:p-5">
                      <p className="text-xs text-bark-500">Current size</p>
                      <p className="font-display text-xl font-bold text-moss-700 sm:text-2xl">{sizeupResult.current.label}</p>
                      <p className="text-xs font-medium text-bark-600">
                        {isMetric ? round(sizeupResult.current.diameterIn * IN_TO_CM, 1) + ' cm' : sizeupResult.current.diameterIn + ' in'} diameter
                      </p>
                    </div>
                    <div className="bg-moss-700 p-4 sm:p-5">
                      <p className="text-xs text-moss-200">Recommended next size</p>
                      <p className="font-display text-xl font-bold text-white sm:text-2xl">{sizeupResult.next!.label}</p>
                      <p className="text-xs text-moss-200">
                        +{isMetric ? round((sizeupResult.diameterIncreaseIn ?? 0) * IN_TO_CM, 1) + ' cm' : sizeupResult.diameterIncreaseIn + ' in'} diameter
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ---------------- GUIDE ---------------- */}
          {mode === 'guide' && (
            <>
              <div>
                <label htmlFor="pot-guide-plant" className="label-field">Plant / vegetable</label>
                <select id="pot-guide-plant" value={guidePlantId} onChange={(e) => setGuidePlantId(e.target.value)}
                  className="input-field mt-1.5">
                  {PLANT_GUIDE.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!guideResult ? (
                  <p className="p-5 text-sm text-bark-500">Pick a plant to see its minimum recommended container size.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 divide-x divide-moss-200">
                      <div className="p-4 sm:p-5">
                        <p className="text-xs text-bark-500">Minimum container size</p>
                        <p className="font-display text-xl font-bold text-moss-700 sm:text-2xl">
                          {guideResult.info.minGal ?? guideResult.info.diamIn}
                        </p>
                        <p className="text-xs font-medium text-bark-600">
                          {guideResult.info.minGal ? 'gallons' : 'inches diameter'}
                        </p>
                      </div>
                      <div className="bg-moss-700 p-4 sm:p-5">
                        <p className="text-xs text-moss-200">Minimum soil depth</p>
                        <p className="font-display text-xl font-bold text-white sm:text-2xl">
                          {guideResult.info.depthIn ?? '—'}
                        </p>
                        <p className="text-xs text-moss-200">{guideResult.info.depthIn ? 'inches' : 'not depth-limited'}</p>
                      </div>
                    </div>
                    {guideResult.info.note && (
                      <div className="border-t border-moss-200 bg-white px-4 py-2.5 text-xs text-bark-600 sm:px-5">
                        {guideResult.info.note}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Was this helpful? -- stays directly under the result, since
              it's asking about the result specifically. The aggregate
              count/icon row lives up in the left column's action row
              instead. None of the 24 calculators had this yet; adding new,
              same as the pilot did. */}
          {hasCurrentResult && (
            <div className="flex items-center gap-2 rounded-lg bg-sand-50 px-4 py-2.5 ring-1 ring-moss-100">
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

          <div className="flex justify-end">
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
      </div>
    </div>
  );
}
