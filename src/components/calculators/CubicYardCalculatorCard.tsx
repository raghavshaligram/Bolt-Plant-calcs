import { MATERIALS } from './useCubicYardCalculatorState';
import type { Material, CubicYardCalculatorState } from './useCubicYardCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface CubicYardCalculatorCardProps {
  calc: CubicYardCalculatorState;
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
 * CubicYardCalculator.tsx, now driven entirely by the shared
 * useCubicYardCalculatorState() hook instead of owning its own state.
 * That's what lets the left column's action row and the Share/Embed/Cite
 * modal (CubicYardCalculatorPanel.tsx) read and reset the same
 * inputs/result even though they render in a different part of the DOM.
 *
 * No static reference/weight-per-material table is extracted out of this
 * card: the original component only ever rendered a one-line weight-range
 * caption plus a one-line formula footer for whichever mode is active, not
 * an actual lookup table -- the real "Weight per Cubic Yard by Material"
 * table already lives in the page's article content, outside this
 * component, untouched.
 */
export default function CubicYardCalculatorCard({ calc, sentiment, onVote }: CubicYardCalculatorCardProps) {
  const {
    material,
    setMaterial,
    mode,
    setMode,
    setUnitSystem,
    dimLength,
    dimWidth,
    dimDepth,
    weightDirection,
    setWeightDirection,
    weightValue,
    volumeValue,
    areaValue,
    areaDepth,
    isMetric,
    lengthUnit,
    depthUnit,
    areaUnit,
    weightUnit,
    volumeUnit,
    lbsPerCuYd,
    handleDimLengthChange,
    handleDimWidthChange,
    handleDimDepthChange,
    handleWeightValueChange,
    handleVolumeValueChange,
    handleAreaValueChange,
    handleAreaDepthChange,
    dimensionsResult,
    weightResult,
    areaResult,
    exportPdf,
    reset,
  } = calc;

  const tabButtonClass = (active: boolean) =>
    `rounded-md px-2.5 py-1 text-sm font-medium transition ${
      active ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
    }`;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-1.5">
          <h2 className="font-display text-lg font-semibold text-white">Cubic Yard Calculator</h2>
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

        <div className="flex flex-col gap-1 p-3">
          {/* Material + Units */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="label-field leading-none">Material</span>
              <div className="mt-1 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Material">
                {(Object.keys(MATERIALS) as Material[]).map((m) => (
                  <button key={m} type="button" role="tab" aria-selected={material === m} onClick={() => setMaterial(m)} className={tabButtonClass(material === m)}>
                    {MATERIALS[m].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="label-field leading-none">Units</span>
              <div className="mt-1 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
                <button type="button" aria-pressed={!isMetric} onClick={() => setUnitSystem('imperial')} className={tabButtonClass(!isMetric)}>
                  Imperial
                </button>
                <button type="button" aria-pressed={isMetric} onClick={() => setUnitSystem('metric')} className={tabButtonClass(isMetric)}>
                  Metric
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-bark-500">
            {MATERIALS[material].label} used at ~{lbsPerCuYd.toLocaleString()} lbs/cu yd (typical range {MATERIALS[material].rangeLbs[0].toLocaleString()}&ndash;{MATERIALS[material].rangeLbs[1].toLocaleString()} lbs/cu yd depending on moisture).
          </p>

          {/* Mode tabs */}
          <div>
            <span className="label-field leading-none">Conversion</span>
            <div className="mt-1 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Conversion mode">
              <button type="button" role="tab" aria-selected={mode === 'dimensions'} onClick={() => setMode('dimensions')} className={tabButtonClass(mode === 'dimensions')}>
                Dimensions
              </button>
              <button type="button" role="tab" aria-selected={mode === 'weight'} onClick={() => setMode('weight')} className={tabButtonClass(mode === 'weight')}>
                Weight &harr; Volume
              </button>
              <button type="button" role="tab" aria-selected={mode === 'area'} onClick={() => setMode('area')} className={tabButtonClass(mode === 'area')}>
                Area to Volume
              </button>
            </div>
          </div>

          {/* Mode 1: Dimensions */}
          {mode === 'dimensions' && (
            <div className="grid gap-2 sm:grid-cols-3">
              <div>
                <label htmlFor="cy-length" className="label-field leading-none">Length ({lengthUnit})</label>
                <input id="cy-length" type="number" inputMode="decimal" min="0" step="0.5" value={dimLength} onChange={handleDimLengthChange} className="input-field mt-1 py-2" />
              </div>
              <div>
                <label htmlFor="cy-width" className="label-field leading-none">Width ({lengthUnit})</label>
                <input id="cy-width" type="number" inputMode="decimal" min="0" step="0.5" value={dimWidth} onChange={handleDimWidthChange} className="input-field mt-1 py-2" />
              </div>
              <div>
                <label htmlFor="cy-depth" className="label-field leading-none">Depth ({depthUnit})</label>
                <input id="cy-depth" type="number" inputMode="decimal" min="0" step="0.5" value={dimDepth} onChange={handleDimDepthChange} className="input-field mt-1 py-2" />
              </div>
            </div>
          )}

          {/* Mode 2: Weight <-> Volume */}
          {mode === 'weight' && (
            <div className="flex flex-col gap-2">
              <div className="inline-flex w-fit rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Weight conversion direction">
                <button type="button" role="tab" aria-selected={weightDirection === 'toVolume'} onClick={() => setWeightDirection('toVolume')} className={tabButtonClass(weightDirection === 'toVolume')}>
                  {weightUnit} &rarr; {volumeUnit}
                </button>
                <button type="button" role="tab" aria-selected={weightDirection === 'toWeight'} onClick={() => setWeightDirection('toWeight')} className={tabButtonClass(weightDirection === 'toWeight')}>
                  {volumeUnit} &rarr; {weightUnit}
                </button>
              </div>
              {weightDirection === 'toVolume' ? (
                <div className="max-w-[10rem]">
                  <label htmlFor="cy-weight" className="label-field leading-none">Weight ({weightUnit})</label>
                  <input id="cy-weight" type="number" inputMode="decimal" min="0" step="0.1" value={weightValue} onChange={handleWeightValueChange} className="input-field mt-1 py-2" />
                </div>
              ) : (
                <div className="max-w-[10rem]">
                  <label htmlFor="cy-volume" className="label-field leading-none">Volume ({volumeUnit})</label>
                  <input id="cy-volume" type="number" inputMode="decimal" min="0" step="0.1" value={volumeValue} onChange={handleVolumeValueChange} className="input-field mt-1 py-2" />
                </div>
              )}
            </div>
          )}

          {/* Mode 3: Area to Volume */}
          {mode === 'area' && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label htmlFor="cy-area" className="label-field leading-none">Area ({areaUnit})</label>
                <input id="cy-area" type="number" inputMode="decimal" min="0" step="1" value={areaValue} onChange={handleAreaValueChange} className="input-field mt-1 py-2" />
              </div>
              <div>
                <label htmlFor="cy-area-depth" className="label-field leading-none">Depth ({depthUnit})</label>
                <input id="cy-area-depth" type="number" inputMode="decimal" min="0" step="0.5" value={areaDepth} onChange={handleAreaDepthChange} className="input-field mt-1 py-2" />
              </div>
            </div>
          )}

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {mode === 'dimensions' && (
              !dimensionsResult ? (
                <p className="p-5 text-sm text-bark-500">Enter length, width, and depth to see cubic yards.</p>
              ) : (
                <div className="grid grid-cols-2 divide-x divide-moss-200 sm:grid-cols-4">
                  <div className="p-2.5">
                    <p className="text-xs text-bark-500">Cubic feet</p>
                    <p className="font-display text-lg font-bold text-moss-700">{round(dimensionsResult.cubicFeet, 2).toLocaleString()}</p>
                  </div>
                  <div className="bg-moss-700 p-2.5">
                    <p className="text-xs text-moss-200">Cubic yards</p>
                    <p className="font-display text-lg font-bold text-white">{round(dimensionsResult.cubicYards, 2).toLocaleString()}</p>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs text-bark-500">Cubic meters</p>
                    <p className="font-display text-lg font-bold text-moss-700">{round(dimensionsResult.cubicMeters, 3).toLocaleString()}</p>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs text-bark-500">Est. weight</p>
                    <p className="font-display text-lg font-bold text-moss-700">~{round(dimensionsResult.weightTons, 2).toLocaleString()} tons</p>
                  </div>
                </div>
              )
            )}

            {mode === 'weight' && (
              !weightResult ? (
                <p className="p-5 text-sm text-bark-500">Enter a {weightDirection === 'toVolume' ? 'weight' : 'volume'} to convert.</p>
              ) : weightResult.kind === 'volume' ? (
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="bg-moss-700 p-2.5 text-center">
                    <p className="text-xs text-moss-200">Cubic yards</p>
                    <p className="font-display text-2xl font-bold text-white">{round(weightResult.cubicYards, 2).toLocaleString()}</p>
                  </div>
                  <div className="p-2.5 text-center">
                    <p className="text-xs text-bark-500">Cubic meters</p>
                    <p className="font-display text-2xl font-bold text-moss-700">{round(weightResult.cubicMeters, 3).toLocaleString()}</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="bg-moss-700 p-2.5 text-center">
                    <p className="text-xs text-moss-200">Est. tons</p>
                    <p className="font-display text-2xl font-bold text-white">~{round(weightResult.tons, 2).toLocaleString()}</p>
                  </div>
                  <div className="p-2.5 text-center">
                    <p className="text-xs text-bark-500">Est. tonnes</p>
                    <p className="font-display text-2xl font-bold text-moss-700">~{round(weightResult.tonnes, 2).toLocaleString()}</p>
                  </div>
                </div>
              )
            )}

            {mode === 'area' && (
              !areaResult ? (
                <p className="p-5 text-sm text-bark-500">Enter an area and depth to see cubic yards.</p>
              ) : (
                <div className="grid grid-cols-2 divide-x divide-moss-200 sm:grid-cols-4">
                  <div className="p-2.5">
                    <p className="text-xs text-bark-500">Cubic feet</p>
                    <p className="font-display text-lg font-bold text-moss-700">{round(areaResult.cubicFeet, 2).toLocaleString()}</p>
                  </div>
                  <div className="bg-moss-700 p-2.5">
                    <p className="text-xs text-moss-200">Cubic yards</p>
                    <p className="font-display text-lg font-bold text-white">{round(areaResult.cubicYards, 2).toLocaleString()}</p>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs text-bark-500">Cubic meters</p>
                    <p className="font-display text-lg font-bold text-moss-700">{round(areaResult.cubicMeters, 3).toLocaleString()}</p>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs text-bark-500">Est. weight</p>
                    <p className="font-display text-lg font-bold text-moss-700">~{round(areaResult.weightTons, 2).toLocaleString()} tons</p>
                  </div>
                </div>
              )
            )}

            <div className="border-t border-moss-200 bg-white px-4 py-1">
              <p className="font-mono text-xs text-bark-500">
                {mode === 'dimensions' && 'Cubic Yards = (Length × Width × Depth ÷ 12) ÷ 27'}
                {mode === 'weight' && weightDirection === 'toVolume' && `Cubic Yards = (${weightUnit} × ${isMetric ? '1,000 kg' : '2,000 lbs'}) ÷ ${lbsPerCuYd.toLocaleString()} lbs/cu yd`}
                {mode === 'weight' && weightDirection === 'toWeight' && `Weight = Cubic Yards × ${lbsPerCuYd.toLocaleString()} lbs/cu yd`}
                {mode === 'area' && 'Cubic Yards = (Area × Depth ÷ 12) ÷ 27'}
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={exportPdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export Results (PDF)
            </button>
          </div>

          {/* Was this helpful? -- stays directly under the result, since it's
              asking about the result specifically. The aggregate count/icon
              row lives up in the left column's action row instead. */}
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
        </div>
      </div>
    </div>
  );
}
