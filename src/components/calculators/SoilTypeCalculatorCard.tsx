import { TEXTURE_INFO } from './useSoilTypeCalculatorState';
import type { SoilTypeCalculatorState } from './useSoilTypeCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

function round(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export interface SoilTypeCalculatorCardProps {
  calc: SoilTypeCalculatorState;
  /**
   * The sticky right panel keeps ONLY the tool: inputs, result, reset, and
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
 * SoilTypeCalculator.tsx, now driven entirely by the shared
 * useSoilTypeCalculatorState() hook instead of owning its own state. That's
 * what lets the left column's action row and the Share/Embed/Cite modal
 * (SoilTypeCalculatorPanel.tsx) read and reset the same inputs/result even
 * though they render in a different part of the DOM.
 *
 * This is a diagnostic classification tool, not a volume/quantity
 * calculator -- its result is a USDA texture class, not a bag count or
 * weight -- so unlike the soil-and-amendments siblings there's no
 * bag/weight result row here, and no static reference table was extracted
 * (see useSoilTypeCalculatorState.ts's TEXTURE_INFO comment for why).
 */
export default function SoilTypeCalculatorCard({ calc, sentiment, onVote }: SoilTypeCalculatorCardProps) {
  const {
    mode,
    setMode,
    sand,
    silt,
    clay,
    jarSand,
    jarSilt,
    jarClay,
    handleSandChange,
    handleSiltChange,
    handleClayChange,
    handleJarSandChange,
    handleJarSiltChange,
    handleJarClayChange,
    result,
    exportPdf,
    reset,
  } = calc;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header -- includes Reset, since the sticky panel now
            contains only the tool itself (inputs, result, reset, and the
            "Was this helpful?" prompt), same as the pilot pattern. The
            original component had no Reset button; this is new. */}
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-white">Classify Your Soil Texture</h2>
          <button
            type="button"
            onClick={reset}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-moss-800/60 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-moss-800"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M4 4v4h4M16 16v-4h-4M4.5 8A6 6 0 0 1 16 6.5M15.5 12A6 6 0 0 1 4 13.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Reset
          </button>
        </div>

        <div className="flex flex-col gap-2 p-4">
          <div>
            <span className="label-field">Input method</span>
            <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'percent'}
                onClick={() => setMode('percent')}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                  mode === 'percent' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                Enter percentages
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'jar-test'}
                onClick={() => setMode('jar-test')}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                  mode === 'jar-test' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                Jar test measurements
              </button>
            </div>
          </div>

          {mode === 'percent' ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="st-sand" className="label-field">
                  Sand <span className="text-bark-500">(%)</span>
                </label>
                <input
                  id="st-sand"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={sand}
                  onChange={handleSandChange}
                  className="input-field mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="st-silt" className="label-field">
                  Silt <span className="text-bark-500">(%)</span>
                </label>
                <input
                  id="st-silt"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={silt}
                  onChange={handleSiltChange}
                  className="input-field mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="st-clay" className="label-field">
                  Clay <span className="text-bark-500">(%)</span>
                </label>
                <input
                  id="st-clay"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={clay}
                  onChange={handleClayChange}
                  className="input-field mt-1.5"
                />
              </div>
              {result.normalized && (
                <p className="sm:col-span-3 text-xs text-sand-700">
                  Your percentages summed to {round(parseFloat(sand) + parseFloat(silt) + parseFloat(clay))}%, not
                  100% — normalized proportionally before classifying.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="st-jar-sand" className="label-field">
                  Sand layer height
                </label>
                <input
                  id="st-jar-sand"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={jarSand}
                  onChange={handleJarSandChange}
                  className="input-field mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="st-jar-silt" className="label-field">
                  Silt layer height
                </label>
                <input
                  id="st-jar-silt"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={jarSilt}
                  onChange={handleJarSiltChange}
                  className="input-field mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="st-jar-clay" className="label-field">
                  Clay layer height
                </label>
                <input
                  id="st-jar-clay"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={jarClay}
                  onChange={handleJarClayChange}
                  className="input-field mt-1.5"
                />
              </div>
              <p className="sm:col-span-3 text-xs text-bark-500">
                Use any consistent unit (inches, cm, mm) — only the ratio between layers matters.
              </p>
            </div>
          )}

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
              % of each = layer (or amount) &divide; total &times; 100, then classified against the USDA soil
              texture triangle boundaries
            </p>
          </details>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!result.hasInput ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your sand, silt, and clay values above to classify your soil texture.
              </p>
            ) : (
              <>
                <div className="p-3.5">
                  <p className="text-xs text-bark-500">Your soil texture class is</p>
                  <p className="font-display text-3xl font-bold capitalize text-moss-700">{result.textureClass}</p>
                  <p className="mt-1 text-xs text-bark-500">
                    Sand {round(result.sandPct)}% &middot; Silt {round(result.siltPct)}% &middot; Clay{' '}
                    {round(result.clayPct)}%
                  </p>
                </div>
                <div className="border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-sm leading-relaxed text-bark-600">{TEXTURE_INFO[result.textureClass]}</p>
                </div>
                <div className="flex justify-end border-t border-moss-200 bg-white px-4 py-1.5">
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

          {/* Was this helpful? -- stays directly under the result, since
              it's asking about the result specifically. The aggregate
              count/icon row lives up in the left column's action row
              instead. None of the 24 calculators had this yet; adding new,
              same as the pilot did. */}
          {result.hasInput && (
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
        </div>
      </div>
    </div>
  );
}
