import { BASE_PRESETS, formulaLine, round, sanitizeTempInput } from './useGrowingDegreeDaysCalculatorState';
import type { GrowingDegreeDaysCalculatorState, PresetId } from './useGrowingDegreeDaysCalculatorState';
import type { Sentiment } from './useCalculatorFeedback';

export interface GrowingDegreeDaysCalculatorCardProps {
  calc: GrowingDegreeDaysCalculatorState;
  sentiment: Sentiment | null;
  onVote: (value: Sentiment) => void;
}

/**
 * Pure presentational calculator card -- identical markup to the original
 * GrowingDegreeDaysCalculator.tsx, now driven entirely by the shared
 * useGrowingDegreeDaysCalculatorState() hook instead of owning its own
 * state, plus a header Reset button and a "Was this helpful?" prompt (new,
 * per the sticky-layout pattern -- see CALC_ROLLOUT_PATTERN.md).
 */
export default function GrowingDegreeDaysCalculatorCard({ calc, sentiment, onVote }: GrowingDegreeDaysCalculatorCardProps) {
  const {
    setUnitSystem,
    mode,
    setMode,
    preset,
    setPreset,
    customBase,
    setCustomBase,
    capEnabled,
    setCapEnabled,
    singleTmax,
    setSingleTmax,
    singleTmin,
    setSingleTmin,
    rows,
    isMetric,
    tempUnit,
    capHi,
    capLo,
    base,
    selectPreset,
    updateRow,
    addRow,
    removeRow,
    singleResult,
    accumulationResults,
    accumulationTotal,
    validRowCount,
    presetLabel,
    exportPdf,
    reset,
  } = calc;

  const hasAnyResult = mode === 'single' ? singleResult.valid : validRowCount > 0;

  const tabButtonClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition ${
      active ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
    }`;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="flex items-center justify-between gap-3 bg-moss-700 px-5 py-3">
          <h2 className="font-display text-lg font-semibold text-white">Growing Degree Days Calculator</h2>
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
          {/* Units + mode */}
          <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
            <div>
              <span className="label-field">Units</span>
              <div className="mt-1.5 inline-flex rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Unit system">
                <button type="button" role="tab" aria-selected={!isMetric} onClick={() => setUnitSystem('imperial')} className={tabButtonClass(!isMetric)}>
                  °F
                </button>
                <button type="button" role="tab" aria-selected={isMetric} onClick={() => setUnitSystem('metric')} className={tabButtonClass(isMetric)}>
                  °C
                </button>
              </div>
            </div>

            <div>
              <span className="label-field">Mode</span>
              <div className="mt-1.5 inline-flex rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Calculator mode">
                <button type="button" role="tab" aria-selected={mode === 'single'} onClick={() => setMode('single')} className={tabButtonClass(mode === 'single')}>
                  Single Day
                </button>
                <button type="button" role="tab" aria-selected={mode === 'accumulation'} onClick={() => setMode('accumulation')} className={tabButtonClass(mode === 'accumulation')}>
                  Accumulation
                </button>
              </div>
            </div>
          </div>

          {/* Base temperature */}
          <div>
            <span className="label-field">Base temperature</span>
            <div className="mt-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(Object.keys(BASE_PRESETS) as Exclude<PresetId, 'custom'>[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectPreset(id)}
                  className={`rounded-lg px-2.5 py-1.5 text-left text-sm ring-1 transition ${
                    preset === id ? 'bg-moss-700 text-white ring-moss-700' : 'bg-sand-50 text-bark-700 ring-moss-100 hover:bg-moss-50'
                  }`}
                >
                  <span className="block font-semibold">{presetLabel(id)}</span>
                  <span className={`block text-xs ${preset === id ? 'text-moss-100' : 'text-bark-500'}`}>{BASE_PRESETS[id].sublabel}</span>
                </button>
              ))}
              <div
                className={`rounded-lg px-2.5 py-1.5 ring-1 transition ${
                  preset === 'custom' ? 'bg-moss-700 ring-moss-700' : 'bg-sand-50 ring-moss-100'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setPreset('custom')}
                  className={`block text-left text-sm font-semibold ${preset === 'custom' ? 'text-white' : 'text-bark-700'}`}
                >
                  Custom
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={customBase}
                  onFocus={() => setPreset('custom')}
                  onChange={(e) => { setPreset('custom'); setCustomBase(sanitizeTempInput(e.target.value)); }}
                  placeholder={`e.g. 45${tempUnit}`}
                  className={`mt-1 w-full rounded-md border-0 bg-white/90 px-2 py-1 text-sm ${preset === 'custom' ? '' : 'opacity-80'}`}
                />
              </div>
            </div>
          </div>

          {/* 86/50 cap toggle -- description trimmed to one line; the full
              rationale already lives in the article's "Why the 86/50 Cap
              Exists" section, so it isn't duplicated here in full. */}
          <div className="rounded-lg bg-sand-50 px-3 py-2 ring-1 ring-moss-100">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={capEnabled}
                onChange={(e) => setCapEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-bark-300 text-moss-700 focus:ring-moss-600"
              />
              <span className="text-sm font-semibold text-bark-800">
                Apply the {isMetric ? '30°C / 10°C' : '86/50'} cap
                <span className="ml-1.5 font-normal text-xs text-bark-500">
                  (caps {capHi}{tempUnit} / floors {capLo}{tempUnit})
                </span>
              </span>
            </label>
          </div>

          {/* Single day mode */}
          {mode === 'single' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="gdd-tmax" className="label-field">High temperature ({tempUnit})</label>
                <input
                  id="gdd-tmax"
                  type="text"
                  inputMode="decimal"
                  value={singleTmax}
                  onChange={(e) => setSingleTmax(sanitizeTempInput(e.target.value))}
                  className="input-field mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="gdd-tmin" className="label-field">Low temperature ({tempUnit})</label>
                <input
                  id="gdd-tmin"
                  type="text"
                  inputMode="decimal"
                  value={singleTmin}
                  onChange={(e) => setSingleTmin(sanitizeTempInput(e.target.value))}
                  className="input-field mt-1.5"
                />
              </div>
            </div>
          )}

          {/* Accumulation mode */}
          {mode === 'accumulation' && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-bark-500">
                Add a row for each day&rsquo;s high and low &mdash; the running total updates as you add days.
              </p>
              <div className="overflow-x-auto rounded-lg ring-1 ring-moss-100">
                <table className="w-full min-w-[420px] text-sm">
                  <thead className="bg-sand-50 text-xs font-semibold uppercase tracking-wide text-bark-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Day</th>
                      <th className="px-3 py-2 text-left">High ({tempUnit})</th>
                      <th className="px-3 py-2 text-left">Low ({tempUnit})</th>
                      <th className="px-3 py-2 text-right">GDD</th>
                      <th className="px-3 py-2 text-right">Cumulative</th>
                      <th className="px-2 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-moss-100">
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 text-bark-500">{i + 1}</td>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Day ${i + 1} high`}
                            value={r.tmax}
                            onChange={(e) => updateRow(i, 'tmax', e.target.value)}
                            className="w-20 rounded-md border border-moss-200 px-2 py-1 text-sm focus:border-moss-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label={`Day ${i + 1} low`}
                            value={r.tmin}
                            onChange={(e) => updateRow(i, 'tmin', e.target.value)}
                            className="w-20 rounded-md border border-moss-200 px-2 py-1 text-sm focus:border-moss-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium text-bark-700">
                          {accumulationResults[i]?.valid ? round(accumulationResults[i].gdd, 1) : '—'}
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-moss-700">
                          {accumulationResults[i]?.valid ? round(accumulationResults[i].cumulative, 1) : '—'}
                        </td>
                        <td className="px-1 py-1.5">
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            disabled={rows.length <= 1}
                            aria-label={`Remove day ${i + 1}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-bark-400 transition hover:bg-sand-100 hover:text-bark-700 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-moss-50 px-3.5 py-2 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Add another day
              </button>
            </div>
          )}

          {/* Formula display -- collapsed by default, same convention as the
              other converted calculators, to help keep this two-mode panel
              short enough to stick without an internal scrollbar. */}
          <details className="group rounded-lg bg-sand-50 px-4 py-2 text-sm text-bark-600 ring-1 ring-moss-100">
            <summary className="cursor-pointer list-none font-medium text-bark-700 marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1.5">
                Show the math
                <svg className="h-3.5 w-3.5 text-bark-400 transition group-open:rotate-180" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M5 7.5 10 12.5 15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <p className="mt-2 font-mono text-xs text-bark-600 sm:text-sm">GDD = ((Tmax + Tmin) &divide; 2) &minus; Tbase</p>
            <p className="mt-1 text-xs text-bark-500">Negative results count as zero — development doesn&rsquo;t run backward.</p>
            {mode === 'single' && singleResult.valid && (
              <p className="mt-2 font-mono text-xs text-bark-700 sm:text-sm">
                {formulaLine(singleResult.hi, singleResult.lo, base, singleResult.gdd)}
              </p>
            )}
          </details>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {mode === 'single' ? (
              !singleResult.valid ? (
                <p className="p-3.5 text-sm text-bark-500">Enter a high and low temperature above to see the result.</p>
              ) : (
                <>
                  <div className="p-3.5">
                    <p className="text-xs text-bark-500">Growing degree days for this day</p>
                    <p className="font-display text-3xl font-bold text-moss-700">{round(singleResult.gdd, 1)} <span className="text-lg font-medium text-bark-500">GDD</span></p>
                    {(singleResult.cappedHi || singleResult.cappedLo) && (
                      <p className="mt-1.5 text-xs text-bark-500">
                        {singleResult.cappedHi && <>High capped from {singleResult.rawHi}{tempUnit} to {singleResult.hi}{tempUnit}. </>}
                        {singleResult.cappedLo && <>Low raised from {singleResult.rawLo}{tempUnit} to {singleResult.lo}{tempUnit}.</>}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2">
                    <p className="text-xs text-bark-500">Base {base}{tempUnit}{capEnabled ? ` · ${isMetric ? '30/10' : '86/50'} cap on` : ''}</p>
                    <button
                      type="button"
                      onClick={exportPdf}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3.5 py-2 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Export PDF
                    </button>
                  </div>
                </>
              )
            ) : validRowCount === 0 ? (
              <p className="p-3.5 text-sm text-bark-500">Add at least one day&rsquo;s high and low above to see a running total.</p>
            ) : (
              <>
                <div className="p-3.5">
                  <p className="text-xs text-bark-500">Cumulative total over {validRowCount} day{validRowCount === 1 ? '' : 's'}</p>
                  <p className="font-display text-3xl font-bold text-moss-700">{round(accumulationTotal, 1)} <span className="text-lg font-medium text-bark-500">GDD</span></p>
                  <p className="mt-1.5 text-xs text-bark-500">
                    Remember: this number only means something alongside the base temperature ({base}{tempUnit}) and the date you started counting — see &ldquo;Start Date Matters&rdquo; below.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2">
                  <p className="text-xs text-bark-500">Base {base}{tempUnit}{capEnabled ? ` · ${isMetric ? '30/10' : '86/50'} cap on` : ''}</p>
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3.5 py-2 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
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
              asking about the result specifically (same placement as the
              pilot calculator). */}
          {hasAnyResult && (
            <div className="flex items-center gap-2 rounded-lg bg-sand-50 px-4 py-2 ring-1 ring-moss-100">
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
