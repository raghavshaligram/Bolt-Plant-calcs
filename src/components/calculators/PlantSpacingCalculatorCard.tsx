import { CROP_PRESETS, TREE_PRESETS, TREE_PRESET_GROUPS } from './usePlantSpacingCalculatorState';
import type { PlantSpacingCalculatorState } from './usePlantSpacingCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface PlantSpacingCalculatorCardProps {
  calc: PlantSpacingCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * PlantSpacingCalculator.tsx, now driven entirely by the shared
 * usePlantSpacingCalculatorState() hook instead of owning its own state.
 * That's what lets the left column's action row and the Share/Embed/Cite
 * modal (PlantSpacingCalculatorPanel.tsx) read and reset the same
 * inputs/result even though they render in a different part of the DOM.
 *
 * The two static "Plant Spacing Chart" and "Tree & Shrub Spacing Chart"
 * reference tables live in the page's normal article content, not in this
 * component -- the original PlantSpacingCalculator.tsx never rendered them
 * inline in the first place, so there's nothing to extract out of this card
 * (unlike e.g. MulchCalculatorCard.tsx). See PLANT-SPACING conversion notes
 * in plant-spacing-calculator.astro.
 */
export default function PlantSpacingCalculatorCard({ calc, sentiment, onVote }: PlantSpacingCalculatorCardProps) {
  const {
    mode,
    setMode,
    setUnitSystem,
    crop,
    bedLength,
    bedWidth,
    inRow,
    betweenRow,
    sqftPerPlant,
    treeType,
    treeSpacing,
    isMetric,
    lengthUnit,
    spacingUnit,
    handleCropChange,
    handleTreeTypeChange,
    handleBedLengthChange,
    handleBedWidthChange,
    handleInRowChange,
    handleBetweenRowChange,
    handleSqftPerPlantChange,
    handleTreeSpacingChange,
    result,
    selectedPreset,
    selectedTreePreset,
    exportPdf,
    reset,
  } = calc;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header -- includes Reset, since the sticky panel now contains
            only the tool itself (inputs, results, reset, and the "Was this
            helpful?" prompt), same as the pilot's card. */}
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-white">
            Plant Spacing Calculator
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

        <div className="flex flex-col gap-1.5 p-3.5">
          {/* Mode + unit toggles */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className="label-field">Garden style</span>
              <div className="mt-1.5 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'row'}
                  onClick={() => setMode('row')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'row'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Rows
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'sqft'}
                  onClick={() => setMode('sqft')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'sqft'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Sq Ft
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'trees'}
                  onClick={() => setMode('trees')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'trees'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Trees
                </button>
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
                    !isMetric
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Imperial
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
                  Metric
                </button>
              </div>
            </div>
          </div>

          {/* Crop selector */}
          {mode === 'trees' ? (
            <div>
              <label htmlFor="ps-tree-type" className="label-field">Tree or shrub</label>
              <select
                id="ps-tree-type"
                value={treeType}
                onChange={handleTreeTypeChange}
                className="input-field mt-1.5"
              >
                <option value="Custom">Custom</option>
                {TREE_PRESET_GROUPS.map((group) => (
                  <optgroup key={group} label={group}>
                    {TREE_PRESETS.filter((p) => p.group === group).map((p) => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {treeType !== 'Custom' && selectedTreePreset && (
                <p className="mt-1.5 text-xs text-bark-500">
                  Recommended mature spacing: {selectedTreePreset.spacingFt} ft
                </p>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="ps-crop" className="label-field">Crop</label>
              <select
                id="ps-crop"
                value={crop}
                onChange={handleCropChange}
                className="input-field mt-1.5"
              >
                {CROP_PRESETS.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
              {crop !== 'Custom' && selectedPreset && (
                <p className="mt-1.5 text-xs text-bark-500">
                  Recommended: {selectedPreset.inRowIn}&Prime; in-row &times; {selectedPreset.betweenRowIn}&Prime; between rows
                  {mode === 'sqft' && ` (${selectedPreset.sqftPerPlant} sq ft per plant in SFG)`}
                </p>
              )}
            </div>
          )}

          {/* Bed dimensions */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            <div>
              <label htmlFor="ps-length" className="label-field">
                Bed length <span className="text-bark-500">({lengthUnit})</span>
              </label>
              <input
                id="ps-length"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={bedLength}
                onChange={handleBedLengthChange}
                className="input-field mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="ps-width" className="label-field">
                Bed width <span className="text-bark-500">({lengthUnit})</span>
              </label>
              <input
                id="ps-width"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={bedWidth}
                onChange={handleBedWidthChange}
                className="input-field mt-1.5"
              />
            </div>
          </div>

          {/* Spacing inputs */}
          {mode === 'row' ? (
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <label htmlFor="ps-in-row" className="label-field">
                  In-row spacing <span className="text-bark-500">({spacingUnit})</span>
                </label>
                <input
                  id="ps-in-row"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={inRow}
                  onChange={handleInRowChange}
                  className="input-field mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="ps-between-row" className="label-field">
                  Between-row spacing <span className="text-bark-500">({spacingUnit})</span>
                </label>
                <input
                  id="ps-between-row"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={betweenRow}
                  onChange={handleBetweenRowChange}
                  className="input-field mt-1.5"
                />
              </div>
            </div>
          ) : mode === 'sqft' ? (
            <div>
              <label htmlFor="ps-sqft" className="label-field">
                Square feet per plant
              </label>
              <input
                id="ps-sqft"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.25"
                value={sqftPerPlant}
                onChange={handleSqftPerPlantChange}
                className="input-field mt-1.5"
              />
            </div>
          ) : (
            <div>
              <div>
                <label htmlFor="ps-tree-spacing" className="label-field">
                  Spacing between trees/shrubs <span className="text-bark-500">({lengthUnit})</span>
                </label>
                <input
                  id="ps-tree-spacing"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={treeSpacing}
                  onChange={handleTreeSpacingChange}
                  className="input-field mt-1.5"
                />
              </div>
              <details className="group mt-3 rounded-lg bg-[#E8A94A]/10 px-4 py-2 text-xs text-bark-700 ring-1 ring-[#E8A94A]/40">
                <summary className="cursor-pointer list-none font-medium text-bark-800 marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="inline-flex items-center gap-1.5">
                    Use mature spacing, not planting size
                    <svg className="h-3.5 w-3.5 text-bark-500 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-1.5 text-bark-600">
                  This is the single most common tree-spacing mistake: a 4-foot sapling that needs 20 feet of mature spacing looks absurdly over-spaced on planting day &mdash; and gets crowded in anyway. Space for the tree it will become, not the tree it is today. Spacing is a permanent decision; you can&rsquo;t re-space a mature tree.
                </p>
              </details>
            </div>
          )}

          {/* Formula -- collapsed by default, same convention as the other
              converted calculators. */}
          <details className="group rounded-lg bg-sand-50 px-4 py-1.5 text-sm text-bark-600 ring-1 ring-moss-100">
            <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                Show the math
                <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            {mode === 'row' ? (
              <>
                <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">
                  Plants per row = floor(Bed Length &divide; In-row Spacing)
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  Rows = floor(Bed Width &divide; Between-row Spacing) &nbsp;&middot;&nbsp; Total = Plants per row &times; Rows
                </p>
              </>
            ) : mode === 'sqft' ? (
              <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">
                Total plants = floor(Bed Area &divide; Sq ft per plant)
              </p>
            ) : (
              <>
                <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">
                  Trees per row = floor(Bed Length &divide; Spacing)
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  Rows = floor(Bed Width &divide; Spacing) &nbsp;&middot;&nbsp; Total = Trees per row &times; Rows
                </p>
              </>
            )}
          </details>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!result ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your bed dimensions and spacing above to see how many plants fit.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-center gap-3 p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <circle cx="5" cy="5" r="2" />
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="19" cy="5" r="2" />
                        <circle cx="5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="19" cy="12" r="2" />
                        <circle cx="5" cy="19" r="2" />
                        <circle cx="12" cy="19" r="2" />
                        <circle cx="19" cy="19" r="2" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">
                        {result.mode === 'trees' ? 'Total trees/shrubs that fit' : 'Total plants that fit'}
                      </p>
                      <p className="font-display text-3xl font-bold text-moss-700">
                        {result.totalPlants.toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        {result.mode === 'trees'
                          ? (treeType !== 'Custom' ? treeType : 'trees/shrubs')
                          : (crop !== 'Custom' ? crop : 'plants')}
                      </p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-3">
                    {result.mode === 'row' ? (
                      <>
                        <p className="text-xs text-moss-200">Layout</p>
                        <p className="font-display text-xl font-bold text-white">
                          {result.plantsPerRow} &times; {result.numRows}
                        </p>
                        <p className="mt-1 text-xs text-moss-200">
                          per row &times; rows &middot; {round(result.areaFt, 1)} sq ft bed
                        </p>
                      </>
                    ) : result.mode === 'sqft' ? (
                      <>
                        <p className="text-xs text-moss-200">Grid spacing</p>
                        <p className="font-display text-xl font-bold text-white">
                          {result.gridSpacingIn}&Prime; apart
                        </p>
                        <p className="mt-1 text-xs text-moss-200">
                          square grid &middot; {round(result.areaFt, 1)} sq ft bed
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-moss-200">Layout</p>
                        <p className="font-display text-xl font-bold text-white">
                          {result.treesPerRow} &times; {result.numRows}
                        </p>
                        <p className="mt-1 text-xs text-moss-200">
                          {round(result.spacingFtUsed, 1)} {lengthUnit} apart &middot; {round(result.areaFt, 1)} sq ft bed
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2">
                  <p className="text-xs text-bark-500">
                    Assumes a full bed, no paths.
                    {result.mode !== 'trees' && (
                      <> ~{result.perAcre.toLocaleString()}/acre, ~{result.perHectare.toLocaleString()}/hectare.</>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
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
          {result && (
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
