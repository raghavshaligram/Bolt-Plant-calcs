import { GRASS_COVERAGE, GRASS_LABEL, SQFT_PER_PIECE } from './useSodCalculatorState';
import type { GrassType, ShapeMode, SodCalculatorState, WasteFactor } from './useSodCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

function round(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface SodCalculatorCardProps {
  calc: SodCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

const shapeTabs: { id: ShapeMode; label: string }[] = [
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'circle', label: 'Circle' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'multi', label: 'Multi-section' },
];

/**
 * Pure presentational calculator card -- identical markup to the original
 * SodCalculator.tsx, now driven entirely by the shared useSodCalculatorState()
 * hook instead of owning its own state. That's what lets the left column's
 * action row and the Share/Embed/Cite modal (SodCalculatorPanel.tsx) read
 * and reset the same inputs/result even though they render in a different
 * part of the DOM.
 */
export default function SodCalculatorCard({ calc, sentiment, onVote }: SodCalculatorCardProps) {
  const {
    shape,
    setShape,
    unitSystem,
    setUnitSystem,
    grassType,
    setGrassType,
    customCoverage,
    wasteFactor,
    setWasteFactor,
    length,
    width,
    radius,
    triBase,
    triHeight,
    sections,
    isMetric,
    lengthUnit,
    soldAs,
    handleLengthChange,
    handleWidthChange,
    handleRadiusChange,
    handleTriBaseChange,
    handleTriHeightChange,
    handleCustomCoverageChange,
    updateSection,
    addSection,
    removeSection,
    result,
    hasResult,
    sqmWithWaste,
    exportPdf,
    reset,
  } = calc;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3.5">
          <h2 className="font-display text-lg font-semibold text-white">Calculate How Much Sod You Need</h2>
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
          {/* Lawn shape + Units -- two sibling toggle groups share one row */}
          <div className="flex flex-wrap items-start gap-x-4 gap-y-4">
            <div>
              <span className="label-field">Lawn shape</span>
              <div className="mt-1.5 inline-flex flex-wrap rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Lawn shape">
                {shapeTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={shape === tab.id}
                    onClick={() => setShape(tab.id)}
                    className={`rounded-md px-2.5 py-1.5 text-sm font-medium transition ${
                      shape === tab.id ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
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

          {/* Shape inputs */}
          {shape === 'rectangle' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sod-length" className="label-field">Length <span className="text-bark-500">({lengthUnit})</span></label>
                <input id="sod-length" type="number" inputMode="decimal" min="0" step="0.1" value={length} onChange={handleLengthChange} className="input-field mt-1.5" />
              </div>
              <div>
                <label htmlFor="sod-width" className="label-field">Width <span className="text-bark-500">({lengthUnit})</span></label>
                <input id="sod-width" type="number" inputMode="decimal" min="0" step="0.1" value={width} onChange={handleWidthChange} className="input-field mt-1.5" />
              </div>
            </div>
          )}

          {shape === 'circle' && (
            <div>
              <label htmlFor="sod-radius" className="label-field">Radius <span className="text-bark-500">({lengthUnit})</span></label>
              <input id="sod-radius" type="number" inputMode="decimal" min="0" step="0.5" value={radius} onChange={handleRadiusChange} className="input-field mt-1.5" />
              <p className="mt-1.5 text-xs text-bark-500">Half the full width of the circle (diameter &divide; 2).</p>
            </div>
          )}

          {shape === 'triangle' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sod-tri-base" className="label-field">Base <span className="text-bark-500">({lengthUnit})</span></label>
                <input id="sod-tri-base" type="number" inputMode="decimal" min="0" step="0.1" value={triBase} onChange={handleTriBaseChange} className="input-field mt-1.5" />
              </div>
              <div>
                <label htmlFor="sod-tri-height" className="label-field">Height <span className="text-bark-500">({lengthUnit})</span></label>
                <input id="sod-tri-height" type="number" inputMode="decimal" min="0" step="0.1" value={triHeight} onChange={handleTriHeightChange} className="input-field mt-1.5" />
                <p className="mt-1.5 text-xs text-bark-500">Perpendicular height, not the slanted side.</p>
              </div>
            </div>
          )}

          {shape === 'multi' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-bark-500">
                Break an L-shaped or irregular lawn into simple rectangles and add each one below &mdash; the calculator sums them.
              </p>
              {sections.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 rounded-lg bg-sand-50 p-3 ring-1 ring-moss-100">
                  <div>
                    <label htmlFor={`sod-section-length-${i}`} className="label-field">Section {i + 1} length <span className="text-bark-500">({lengthUnit})</span></label>
                    <input
                      id={`sod-section-length-${i}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={s.length}
                      onChange={(e) => updateSection(i, 'length', e.target.value)}
                      className="input-field mt-1.5"
                    />
                  </div>
                  <div>
                    <label htmlFor={`sod-section-width-${i}`} className="label-field">Width <span className="text-bark-500">({lengthUnit})</span></label>
                    <input
                      id={`sod-section-width-${i}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={s.width}
                      onChange={(e) => updateSection(i, 'width', e.target.value)}
                      className="input-field mt-1.5"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSection(i)}
                    disabled={sections.length <= 1}
                    aria-label={`Remove section ${i + 1}`}
                    className="mb-0.5 inline-flex h-10 w-10 items-center justify-center rounded-lg text-bark-400 transition hover:bg-white hover:text-bark-700 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSection}
                className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Add another section
              </button>
            </div>
          )}

          {/* Grass type + waste factor */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sod-grass-type" className="label-field">Grass type</label>
              <select
                id="sod-grass-type"
                value={grassType}
                onChange={(e) => setGrassType(e.target.value as GrassType)}
                className="input-field mt-1.5"
              >
                <option value="unsure">Not sure &mdash; use industry standard (450 sq ft)</option>
                <optgroup label="Warm-season (sold as slabs)">
                  <option value="bermuda">Bermuda</option>
                  <option value="zoysia">Zoysia</option>
                  <option value="st-augustine">St. Augustine</option>
                  <option value="centipede">Centipede</option>
                </optgroup>
                <optgroup label="Cool-season (sold as rolls)">
                  <option value="tall-fescue">Tall Fescue</option>
                  <option value="kentucky-bluegrass">Kentucky Bluegrass</option>
                  <option value="ryegrass">Ryegrass</option>
                </optgroup>
                <option value="custom">Custom &mdash; enter my supplier's coverage</option>
              </select>
              {grassType === 'custom' ? (
                <div className="mt-3">
                  <label htmlFor="sod-custom-coverage" className="label-field">Supplier's pallet coverage <span className="text-bark-500">(sq ft)</span></label>
                  <input
                    id="sod-custom-coverage"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={customCoverage}
                    onChange={handleCustomCoverageChange}
                    className="input-field mt-1.5"
                  />
                </div>
              ) : grassType === 'unsure' ? (
                <p className="mt-1.5 text-xs text-bark-500">
                  ~{GRASS_COVERAGE[grassType]} sq ft/pallet &mdash; industry standard. Confirm with supplier.
                </p>
              ) : (
                <p className="mt-1.5 text-xs text-bark-500">
                  ~{GRASS_COVERAGE[grassType]} sq ft/pallet, sold as {soldAs}. Confirm with supplier.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="sod-waste-factor" className="label-field">Waste factor</label>
              <select
                id="sod-waste-factor"
                value={wasteFactor}
                onChange={(e) => setWasteFactor(e.target.value as WasteFactor)}
                className="input-field mt-1.5"
              >
                <option value="5">5% &mdash; straight edges</option>
                <option value="10">10% &mdash; curved edges</option>
                <option value="15">15% &mdash; complex / multiple obstacles</option>
              </select>
              <p className="mt-1.5 text-xs text-bark-500">Accounts for offcuts from fitting rectangular pieces to your lawn&rsquo;s edges.</p>
            </div>
          </div>

          {/* Formula display -- collapsed by default. It's useful reference,
              not something most visitors need open while they work, and
              keeping it closed is most of what lets this panel stay short
              enough to stick without an internal scrollbar. */}
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
              {shape === 'circle'
                ? 'Area = π × Radius²'
                : shape === 'triangle'
                ? 'Area = (Base × Height) ÷ 2'
                : shape === 'multi'
                ? 'Area = Σ (Length × Width) of each section'
                : 'Area = Length × Width'}
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Pallets = ROUNDUP( Area &times; (1 + Waste %) &divide; Pallet Coverage )
            </p>
          </details>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">Enter your lawn&rsquo;s dimensions above to see how much sod you need.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-center gap-3 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                        <path d="M4 24h24v4H4zM6 22V10l7-4 7 4v12M6 22h14M9 22v-6h4v6" opacity="0.85" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">You need about</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {result.pallets.toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        pallet{result.pallets === 1 ? '' : 's'} of sod
                      </p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-4">
                    <p className="text-xs text-moss-200">Or in pieces</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {result.pieces.toLocaleString()}
                    </p>
                    <p className="text-xs text-moss-200">
                      ~{SQFT_PER_PIECE} sq ft each &middot; {round(result.sqftWithWaste, 1).toLocaleString()} sq ft w/ waste
                      {isMetric && <span> ({round(sqmWithWaste, 1)} m&sup2;)</span>}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    Lawn area: {round(result.sqft, 1).toLocaleString()} sq ft, before the {wasteFactor}% waste factor.
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

          {/* Was this helpful? -- stays directly under the result, since
              it's asking about the result specifically. The aggregate
              count/icon row lives up in the left column's action row
              instead. */}
          {hasResult && (
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
        </div>
      </div>
    </div>
  );
}
