import { round } from './useNpkCalculatorState';
import type { NpkCalculatorState, Mode } from './useNpkCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

export interface NpkCalculatorCardProps {
  calc: NpkCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical inputs/results/PDF-export
 * markup to the original NpkCalculator.tsx, now driven entirely by the
 * shared useNpkCalculatorState() hook instead of owning its own state, plus
 * a header Reset button and a "Was this helpful?" prompt (new, per the
 * sticky-layout pattern -- see CALC_ROLLOUT_PATTERN.md).
 *
 * This is the largest and highest scroll-risk calculator in the rollout
 * (three full modes). There were no static reference/lookup tables inside
 * the original card to extract into a sibling ReferenceTables component --
 * unlike the raised-bed/mulch calculators, nothing here is a plain <table>
 * of fixed data. The one thing that WAS always-visible inline content in
 * every mode is the "The math:" formula box, so -- matching the pilot's own
 * treatment of its formula display -- each mode's math box is now a
 * collapsed-by-default <details> ("Show the math"), which is the main lever
 * keeping this card short enough to avoid an internal scrollbar in the
 * sticky panel.
 */
export default function NpkCalculatorCard({ calc, sentiment, onVote }: NpkCalculatorCardProps) {
  const {
    mode, setMode,
    unitSystem, setUnitSystem, isMetric,
    granN, granP, granK, granRate, granArea,
    liqN, liqP, liqK, liqInputMode, setLiqInputMode, liqTargetPpm, liqRatioAmt, liqRatioVol, liqContainer,
    blendCount, blendProducts, blendTargetN, blendTargetP, blendTargetK, blendRate, blendArea,
    setGranN, setGranP, setGranK, setGranRate, setGranArea,
    setLiqN, setLiqP, setLiqK,
    handleNumericChange,
    handleBlendProductChange,
    setBlendSize,
    granResult, liqResult, blendResult,
    exportPdf,
    reset,
  } = calc;

  const hasResult = mode === 'granular' ? !!granResult : mode === 'liquid' ? !!liqResult : !!blendResult;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-4 py-1">
          <h2 className="font-display text-lg font-semibold text-white">NPK Calculator</h2>
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

        <div className="flex flex-col gap-0.5 p-1.5">
          {/* Mode + unit toggles */}
          <div className="grid grid-cols-2 items-start gap-2 leading-none">
            <div>
              <span className="label-field leading-tight">Calculation type</span>
              <div className="mt-0.5 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist">
                {(['granular', 'liquid', 'blend'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => setMode(m)}
                    className={`rounded-md px-2.5 py-1 text-sm font-medium capitalize transition ${
                      mode === m ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="label-field leading-tight">Units</span>
              <div className="mt-0.5 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
                <button
                  type="button"
                  aria-pressed={!isMetric}
                  onClick={() => setUnitSystem('imperial')}
                  className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${
                    !isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Imperial
                </button>
                <button
                  type="button"
                  aria-pressed={isMetric}
                  onClick={() => setUnitSystem('metric')}
                  className={`rounded-md px-2.5 py-1 text-sm font-medium transition ${
                    isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Metric
                </button>
              </div>
            </div>
          </div>

          {/* ---------------- GRANULAR ---------------- */}
          {mode === 'granular' && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="npk-gran-n" className="label-field">N %</label>
                  <input id="npk-gran-n" type="number" inputMode="decimal" min="0" max="100" step="1"
                    value={granN} onChange={handleNumericChange(setGranN)} className="input-field mt-1.5" />
                </div>
                <div>
                  <label htmlFor="npk-gran-p" className="label-field">P %</label>
                  <input id="npk-gran-p" type="number" inputMode="decimal" min="0" max="100" step="1"
                    value={granP} onChange={handleNumericChange(setGranP)} className="input-field mt-1.5" />
                </div>
                <div>
                  <label htmlFor="npk-gran-k" className="label-field">K %</label>
                  <input id="npk-gran-k" type="number" inputMode="decimal" min="0" max="100" step="1"
                    value={granK} onChange={handleNumericChange(setGranK)} className="input-field mt-1.5" />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="npk-gran-rate" className="label-field">
                    Target rate <span className="text-bark-500">({isMetric ? 'g N/m²' : 'lb/1000ft²'})</span>
                  </label>
                  <input id="npk-gran-rate" type="number" inputMode="decimal" min="0" step="0.1"
                    value={granRate} onChange={handleNumericChange(setGranRate)} className="input-field mt-1.5" />
                </div>
                <div>
                  <label htmlFor="npk-gran-area" className="label-field">
                    Area <span className="text-bark-500">({isMetric ? 'm²' : 'sq ft'})</span>
                  </label>
                  <input id="npk-gran-area" type="number" inputMode="decimal" min="0" step="1"
                    value={granArea} onChange={handleNumericChange(setGranArea)} className="input-field mt-1.5" />
                </div>
              </div>

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
                  Total N = Rate &times; (Area &divide; {isMetric ? '1' : '1,000'})
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  Fertilizer Needed = Total N &divide; (N% &divide; 100)
                </p>
              </details>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!granResult ? (
                  <p className="p-5 text-sm text-bark-500">Enter your fertilizer&rsquo;s N%, target rate, and area to see how much product you need.</p>
                ) : (
                  <div className="grid grid-cols-2 divide-x divide-moss-200">
                    <div className="p-3.5">
                      <p className="text-xs text-bark-500">Total actual N needed</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">{round(granResult.totalN, 2)}</p>
                      <p className="text-xs font-medium text-bark-600">{granResult.unit}</p>
                    </div>
                    <div className="bg-moss-700 p-3.5">
                      <p className="text-xs text-moss-200">Fertilizer product needed</p>
                      <p className="font-display text-2xl font-bold text-white sm:text-3xl">{round(granResult.product, 2)}</p>
                      <p className="text-xs text-moss-200">{granResult.unit} of {granN}-{granP}-{granK}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ---------------- LIQUID ---------------- */}
          {mode === 'liquid' && (
            <>
              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <label htmlFor="npk-liq-n" className="label-field">N %</label>
                  <input id="npk-liq-n" type="number" inputMode="decimal" min="0" max="100" step="1"
                    value={liqN} onChange={handleNumericChange(setLiqN)} className="input-field mt-1" />
                </div>
                <div>
                  <label htmlFor="npk-liq-p" className="label-field">P %</label>
                  <input id="npk-liq-p" type="number" inputMode="decimal" min="0" max="100" step="1"
                    value={liqP} onChange={handleNumericChange(setLiqP)} className="input-field mt-1" />
                </div>
                <div>
                  <label htmlFor="npk-liq-k" className="label-field">K %</label>
                  <input id="npk-liq-k" type="number" inputMode="decimal" min="0" max="100" step="1"
                    value={liqK} onChange={handleNumericChange(setLiqK)} className="input-field mt-1" />
                </div>
              </div>

              <div>
                <span className="label-field">Set strength by</span>
                <div className="mt-1.5 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                  <button type="button" role="tab" aria-selected={liqInputMode === 'ppm'}
                    onClick={() => setLiqInputMode('ppm')}
                    className={`rounded-md px-3 py-1 text-sm font-medium transition ${liqInputMode === 'ppm' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                    Target PPM
                  </button>
                  <button type="button" role="tab" aria-selected={liqInputMode === 'ratio'}
                    onClick={() => setLiqInputMode('ratio')}
                    className={`rounded-md px-3 py-1 text-sm font-medium transition ${liqInputMode === 'ratio' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                    Dilution Ratio
                  </button>
                </div>
              </div>

              {liqInputMode === 'ppm' ? (
                <div>
                  <label htmlFor="npk-liq-ppm" className="label-field">Target PPM (N)</label>
                  <input id="npk-liq-ppm" type="number" inputMode="decimal" min="0" step="1"
                    value={liqTargetPpm} onChange={handleNumericChange(calc.setLiqTargetPpm)} className="input-field mt-1" />
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <label htmlFor="npk-liq-ratio-amt" className="label-field">
                      Fertilizer amount <span className="text-bark-500">({isMetric ? 'g' : 'oz'})</span>
                    </label>
                    <input id="npk-liq-ratio-amt" type="number" inputMode="decimal" min="0" step="0.1"
                      value={liqRatioAmt} onChange={handleNumericChange(calc.setLiqRatioAmt)} className="input-field mt-1" />
                  </div>
                  <div>
                    <label htmlFor="npk-liq-ratio-vol" className="label-field">
                      Per water volume <span className="text-bark-500">({isMetric ? 'L' : 'gal'})</span>
                    </label>
                    <input id="npk-liq-ratio-vol" type="number" inputMode="decimal" min="0" step="0.1"
                      value={liqRatioVol} onChange={handleNumericChange(calc.setLiqRatioVol)} className="input-field mt-1" />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="npk-liq-container" className="label-field">
                  Container size <span className="text-bark-500">({isMetric ? 'L' : 'gal'})</span>
                </label>
                <input id="npk-liq-container" type="number" inputMode="decimal" min="0" step="1"
                  value={liqContainer} onChange={handleNumericChange(calc.setLiqContainer)} className="input-field mt-1" />
              </div>

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
                  {isMetric ? 'PPM = (g fertilizer ÷ L water) × N% × 10' : 'PPM = (oz fertilizer ÷ gal water) × N% × 74.9'}
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  Concentrate for container = Rate per {isMetric ? 'liter' : 'gallon'} &times; Container size
                </p>
              </details>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!liqResult ? (
                  <p className="p-5 text-sm text-bark-500">Enter your fertilizer&rsquo;s N%, desired strength, and container size to see how much concentrate to add.</p>
                ) : (
                  <div className="grid grid-cols-2 divide-x divide-moss-200">
                    <div className="p-3.5">
                      <p className="text-xs text-bark-500">Concentrate for container</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">{round(liqResult.totalConcentrate, 2)}</p>
                      <p className="text-xs font-medium text-bark-600">{liqResult.unit} ({round(liqResult.ratePerVol, 3)} {liqResult.unit}/{liqResult.volUnit})</p>
                    </div>
                    <div className="bg-moss-700 p-3.5">
                      <p className="text-xs text-moss-200">Resulting strength</p>
                      <p className="font-display text-2xl font-bold text-white sm:text-3xl">{round(liqResult.resultingPpm, 1)}</p>
                      <p className="text-xs text-moss-200">PPM (N)</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ---------------- BLEND ---------------- */}
          {mode === 'blend' && (
            <>
              <div>
                <span className="label-field leading-tight">Fertilizers to blend</span>
                <div className="mt-0.5 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                  <button type="button" role="tab" aria-selected={blendCount === 2}
                    onClick={() => setBlendSize(2)}
                    className={`rounded-md px-4 py-1 text-sm font-medium transition ${blendCount === 2 ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                    2
                  </button>
                  <button type="button" role="tab" aria-selected={blendCount === 3}
                    onClick={() => setBlendSize(3)}
                    className={`rounded-md px-4 py-1 text-sm font-medium transition ${blendCount === 3 ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                    3
                  </button>
                </div>
              </div>

              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {blendProducts.slice(0, blendCount).map((p, i) => (
                  <div key={i} className="rounded-lg border border-moss-100 p-1 leading-none">
                    <label htmlFor={`npk-blend-name-${i}`} className="label-field leading-tight">Fertilizer {i + 1}</label>
                    <input id={`npk-blend-name-${i}`} type="text" value={p.name}
                      onChange={handleBlendProductChange(i, 'name')} className="input-field mt-0.5 py-1" />
                    <div className="mt-1 grid grid-cols-3 gap-1">
                      <div>
                        <label htmlFor={`npk-blend-n-${i}`} className="label-field leading-tight">N%</label>
                        <input id={`npk-blend-n-${i}`} type="number" inputMode="decimal" min="0" max="100" step="1"
                          value={p.n} onChange={handleBlendProductChange(i, 'n')} className="input-field mt-0.5 py-1" />
                      </div>
                      <div>
                        <label htmlFor={`npk-blend-p-${i}`} className="label-field leading-tight">P%</label>
                        <input id={`npk-blend-p-${i}`} type="number" inputMode="decimal" min="0" max="100" step="1"
                          value={p.p} onChange={handleBlendProductChange(i, 'p')} className="input-field mt-0.5 py-1" />
                      </div>
                      <div>
                        <label htmlFor={`npk-blend-k-${i}`} className="label-field leading-tight">K%</label>
                        <input id={`npk-blend-k-${i}`} type="number" inputMode="decimal" min="0" max="100" step="1"
                          value={p.k} onChange={handleBlendProductChange(i, 'k')} className="input-field mt-0.5 py-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <label htmlFor="npk-blend-tn" className="label-field leading-tight">Target N</label>
                  <input id="npk-blend-tn" type="number" inputMode="decimal" min="0" step="1"
                    value={blendTargetN} onChange={handleNumericChange(calc.setBlendTargetN)} className="input-field mt-0.5 py-1" />
                </div>
                <div>
                  <label htmlFor="npk-blend-tp" className="label-field leading-tight">Target P</label>
                  <input id="npk-blend-tp" type="number" inputMode="decimal" min="0" step="1"
                    value={blendTargetP} onChange={handleNumericChange(calc.setBlendTargetP)} className="input-field mt-0.5 py-1" />
                </div>
                <div>
                  <label htmlFor="npk-blend-tk" className="label-field leading-tight">Target K</label>
                  <input id="npk-blend-tk" type="number" inputMode="decimal" min="0" step="1"
                    value={blendTargetK} onChange={handleNumericChange(calc.setBlendTargetK)} className="input-field mt-0.5 py-1" />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label htmlFor="npk-blend-rate" className="label-field leading-tight">
                    Target N rate <span className="text-bark-500">({isMetric ? 'g N/m²' : 'lb/1000ft²'})</span>
                  </label>
                  <input id="npk-blend-rate" type="number" inputMode="decimal" min="0" step="0.1"
                    value={blendRate} onChange={handleNumericChange(calc.setBlendRate)} className="input-field mt-0.5 py-1" />
                </div>
                <div>
                  <label htmlFor="npk-blend-area" className="label-field leading-tight">
                    Area <span className="text-bark-500">({isMetric ? 'm²' : 'sq ft'})</span>
                  </label>
                  <input id="npk-blend-area" type="number" inputMode="decimal" min="0" step="1"
                    value={blendArea} onChange={handleNumericChange(calc.setBlendArea)} className="input-field mt-0.5 py-1" />
                </div>
              </div>

              <details className="group rounded-lg bg-sand-50 px-4 py-1 text-sm text-bark-600 ring-1 ring-moss-100">
                <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-1.5">
                    Show the math
                    <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-2 text-xs text-bark-600 sm:text-sm">
                  Target ratio is proportional (e.g. 3-1-2 or 10-10-10) &mdash; only the ratio between these three numbers matters, not their absolute size.
                </p>
                <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                  Solve w&#8321;&hellip;w&#8345; so that &Sigma;(w&#8305; &times; N%&#8305;) = Target N, and so on for P and K
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  2 products &rarr; solved exactly for N &amp; P; K checked against target
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  3 products &rarr; solved exactly for N, P &amp; K simultaneously
                </p>
              </details>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!blendResult ? (
                  <p className="p-5 text-sm text-bark-500">Fill in each fertilizer&rsquo;s N-P-K, your target ratio, rate, and area to see the blend.</p>
                ) : !blendResult.weights ? (
                  <div className="p-5">
                    <p className="text-sm font-semibold text-sand-700">Can&rsquo;t solve this blend</p>
                    <p className="mt-1 text-sm text-bark-600">{blendResult.reason}</p>
                  </div>
                ) : (
                  <>
                    <div className={`px-4 py-0.5 ${blendResult.exact ? 'bg-moss-700' : 'bg-sand-600'}`}>
                      <p className="text-sm font-semibold text-white">
                        {blendResult.exact
                          ? 'Exact target ratio achievable ✓'
                          : 'Exact target ratio NOT achievable with these products'}
                      </p>
                      {!blendResult.exact && (
                        <p className="mt-0.5 text-xs text-white/90">{blendResult.reason ?? 'Showing the closest match: N and P hit exactly, K falls short of or exceeds target (see below).'}</p>
                      )}
                    </div>
                    <div className="divide-y divide-moss-200">
                      {blendResult.products.map((p, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-0.5">
                          <span className="text-sm text-bark-700">{p.name}</span>
                          <span className="font-display text-base font-bold text-moss-700">
                            {round(blendResult.weights![i], 2)} {blendResult.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                    {!blendResult.exact && blendResult.resultingK !== null && (
                      <div className="border-t border-moss-200 bg-white px-4 py-0.5 text-xs text-bark-600">
                        Resulting K: {round(blendResult.resultingK, 2)} {blendResult.unit} vs. target {round(blendResult.targetKAmt, 2)} {blendResult.unit}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Export PDF + "Was this helpful?" share one row -- merging them
              (instead of two stacked rows) is one of the space-savers that
              keeps this, the largest calculator in the rollout, under the
              sticky panel's viewport budget at 768px. Was-this-helpful stays
              tied to the tool's result (same convention as the pilot/GDD),
              just laid out beside Export PDF instead of below it. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export PDF
            </button>
            {hasResult && (
              <div className="flex items-center gap-2 rounded-lg bg-sand-50 px-3 py-1 ring-1 ring-moss-100">
                <p className="text-sm font-medium text-bark-700">Helpful?</p>
                <button
                  type="button"
                  disabled={sentiment !== null}
                  onClick={() => onVote('yes')}
                  aria-pressed={sentiment === 'yes'}
                  className={`rounded-lg px-3 py-1 text-sm font-medium ring-1 ring-inset transition disabled:cursor-default ${
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
                  className={`rounded-lg px-3 py-1 text-sm font-medium ring-1 ring-inset transition disabled:cursor-default ${
                    sentiment === 'no'
                      ? 'bg-bark-700 text-white ring-bark-700'
                      : 'bg-white text-bark-700 ring-moss-200 hover:bg-moss-50 disabled:hover:bg-white'
                  }`}
                >
                  No
                </button>
                {sentiment && <span className="text-xs text-bark-500">Thanks!</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
