import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type UnitSystem = 'imperial' | 'metric';
type Mode = 'single' | 'accumulation';
type PresetId = 'most' | 'cool-season' | 'turf' | 'custom';

interface Row {
  tmax: string;
  tmin: string;
}

const STORAGE_KEY = 'growing-degree-days-calculator-state-v1';

// Base temperatures below which development effectively stops for that
// organism. Fahrenheit values are the ones actually published by university
// extension sources; Celsius values are the exact conversions ((F-32) x 5/9),
// rounded to one decimal for display. Switching units switches which scale
// the whole calculation runs in -- GDD accumulated in Celsius is NOT the same
// number as GDD accumulated in Fahrenheit for the same physical day, even
// though the underlying base threshold is the same temperature, so this
// calculator computes entirely in one scale at a time rather than converting
// a running total after the fact.
const BASE_PRESETS: Record<Exclude<PresetId, 'custom'>, { f: number; c: number; sublabel: string }> = {
  most: { f: 50, c: 10, sublabel: 'Most landscape pests & warm-season plants' },
  'cool-season': { f: 43, c: 6.1, sublabel: 'Some cool-season insects' },
  turf: { f: 32, c: 0, sublabel: 'Turf models, incl. crabgrass pre-emergent' },
};

// The "86/50 cap" (a.k.a. modified/corn GDD method): before averaging, treat
// any high above 86°F as 86°F and any low below 50°F as 50°F, on the theory
// that development doesn't meaningfully speed up above ~86°F and effectively
// stops below 50°F regardless of how far below it the actual low was.
// 86°F = 30°C and 50°F = 10°C exactly, so these stay clean round numbers in
// both unit systems.
const CAP_HI_F = 86;
const CAP_LO_F = 50;
const CAP_HI_C = 30;
const CAP_LO_C = 10;

function round(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Temperature inputs, unlike most of this site's length/area inputs, need to
// allow a leading minus sign -- early-season lows below 0°F or 0°C are real.
function sanitizeTempInput(raw: string): string {
  if (typeof raw !== 'string') return '';
  let cleaned = raw.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  const negative = cleaned.trim().startsWith('-');
  cleaned = cleaned.replace(/[^\d.]/g, '');
  cleaned = cleaned.replace(/^0+(?=\d)/, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return (negative ? '-' : '') + cleaned;
}

interface SavedState {
  unitSystem: UnitSystem;
  mode: Mode;
  preset: PresetId;
  customBase: string;
  capEnabled: boolean;
  singleTmax: string;
  singleTmin: string;
  rows: Row[];
}

function loadSavedState(): Partial<SavedState> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveState(state: SavedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be unavailable (private mode, quota) — fail silently.
  }
}

interface DayResult {
  valid: boolean;
  rawHi: number;
  rawLo: number;
  hi: number;
  lo: number;
  cappedHi: boolean;
  cappedLo: boolean;
  gdd: number;
  negativeClamped: boolean;
}

function computeDay(tmaxStr: string, tminStr: string, base: number, capEnabled: boolean, capHi: number, capLo: number): DayResult {
  const rawHi = parseFloat(tmaxStr);
  const rawLo = parseFloat(tminStr);
  if (!Number.isFinite(rawHi) || !Number.isFinite(rawLo)) {
    return { valid: false, rawHi: 0, rawLo: 0, hi: 0, lo: 0, cappedHi: false, cappedLo: false, gdd: 0, negativeClamped: false };
  }
  let hi = rawHi;
  let lo = rawLo;
  let cappedHi = false;
  let cappedLo = false;
  if (capEnabled) {
    if (hi > capHi) { hi = capHi; cappedHi = true; }
    if (lo < capLo) { lo = capLo; cappedLo = true; }
  }
  const raw = (hi + lo) / 2 - base;
  const gdd = Math.max(0, raw);
  return { valid: true, rawHi, rawLo, hi, lo, cappedHi, cappedLo, gdd, negativeClamped: raw < 0 };
}

export default function GrowingDegreeDaysCalculator() {
  const hasLoaded = useRef(false);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [mode, setMode] = useState<Mode>('single');
  const [preset, setPreset] = useState<PresetId>('most');
  const [customBase, setCustomBase] = useState<string>('');
  const [capEnabled, setCapEnabled] = useState<boolean>(true);

  const [singleTmax, setSingleTmax] = useState<string>('75');
  const [singleTmin, setSingleTmin] = useState<string>('55');

  const [rows, setRows] = useState<Row[]>([
    { tmax: '58', tmin: '38' },
    { tmax: '62', tmin: '41' },
    { tmax: '71', tmin: '45' },
  ]);

  useEffect(() => {
    const s = loadSavedState();
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.mode) setMode(s.mode);
    if (s.preset) setPreset(s.preset);
    if (s.customBase !== undefined) setCustomBase(s.customBase);
    if (typeof s.capEnabled === 'boolean') setCapEnabled(s.capEnabled);
    if (s.singleTmax !== undefined) setSingleTmax(s.singleTmax);
    if (s.singleTmin !== undefined) setSingleTmin(s.singleTmin);
    if (s.rows && Array.isArray(s.rows) && s.rows.length > 0) setRows(s.rows);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ unitSystem, mode, preset, customBase, capEnabled, singleTmax, singleTmin, rows });
  }, [unitSystem, mode, preset, customBase, capEnabled, singleTmax, singleTmin, rows]);

  const isMetric = unitSystem === 'metric';
  const tempUnit = isMetric ? '°C' : '°F';

  const capHi = isMetric ? CAP_HI_C : CAP_HI_F;
  const capLo = isMetric ? CAP_LO_C : CAP_LO_F;

  const base = useMemo(() => {
    if (preset === 'custom') {
      const v = parseFloat(customBase);
      return Number.isFinite(v) ? v : 0;
    }
    return isMetric ? BASE_PRESETS[preset].c : BASE_PRESETS[preset].f;
  }, [preset, customBase, isMetric]);

  // Selecting a preset also sets a sensible default for the cap, matching
  // the fact that the 86/50 cap is specifically calibrated to a 50°F base --
  // it's still available at other bases, but it isn't turned on by default
  // for them since there's no published convention for capping at, say, a
  // 32°F turf model.
  function selectPreset(id: PresetId) {
    setPreset(id);
    if (id === 'most') setCapEnabled(true);
    else if (id !== 'custom') setCapEnabled(false);
  }

  function updateRow(index: number, field: keyof Row, value: string) {
    const cleaned = sanitizeTempInput(value);
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: cleaned } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { tmax: '', tmin: '' }]);
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  const singleResult = useMemo(
    () => computeDay(singleTmax, singleTmin, base, capEnabled, capHi, capLo),
    [singleTmax, singleTmin, base, capEnabled, capHi, capLo]
  );

  const accumulationResults = useMemo(() => {
    let running = 0;
    return rows.map((r) => {
      const day = computeDay(r.tmax, r.tmin, base, capEnabled, capHi, capLo);
      if (day.valid) running += day.gdd;
      return { ...day, cumulative: running };
    });
  }, [rows, base, capEnabled, capHi, capLo]);

  const accumulationTotal = accumulationResults.length > 0 ? accumulationResults[accumulationResults.length - 1].cumulative : 0;
  const validRowCount = accumulationResults.filter((r) => r.valid).length;

  const presetLabel = (id: Exclude<PresetId, 'custom'>) => {
    const v = isMetric ? BASE_PRESETS[id].c : BASE_PRESETS[id].f;
    return `${v}${tempUnit}`;
  };

  const formulaLine = (hi: number, lo: number, b: number, gdd: number) =>
    `((${hi} + ${lo}) ÷ 2) − ${b} = ${round(gdd, 1)} GDD`;

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Growing Degree Days Calculator Results', margin, y);
    y += 28;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated ${dateStr} — HarvestMath.com`, margin, y);
    y += 28;

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Settings', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const settingLines: string[] = [
      `Base temperature: ${base}${tempUnit}`,
      `86/50 cap: ${capEnabled ? 'On' : 'Off'}`,
      `Mode: ${mode === 'single' ? 'Single day' : 'Accumulation'}`,
    ];
    settingLines.forEach((line) => { doc.text(line, margin, y); y += 16; });

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Results', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    if (mode === 'single') {
      if (singleResult.valid) {
        const lines = [
          `High: ${singleResult.rawHi}${tempUnit}${singleResult.cappedHi ? ` (capped to ${singleResult.hi}${tempUnit})` : ''}`,
          `Low: ${singleResult.rawLo}${tempUnit}${singleResult.cappedLo ? ` (raised to ${singleResult.lo}${tempUnit})` : ''}`,
          `Growing degree days: ${round(singleResult.gdd, 1)} GDD`,
          formulaLine(singleResult.hi, singleResult.lo, base, singleResult.gdd),
        ];
        lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
      } else {
        doc.text('Enter a high and low temperature to see a result.', margin, y);
        y += 16;
      }
    } else {
      doc.text('Day    High    Low    GDD    Cumulative', margin, y);
      y += 16;
      accumulationResults.forEach((r, i) => {
        if (!r.valid) return;
        doc.text(
          `${i + 1}      ${r.rawHi}${tempUnit}    ${r.rawLo}${tempUnit}    ${round(r.gdd, 1)}    ${round(r.cumulative, 1)}`,
          margin,
          y
        );
        y += 16;
      });
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total: ${round(accumulationTotal, 1)} GDD over ${validRowCount} day${validRowCount === 1 ? '' : 's'}`, margin, y);
      y += 16;
    }

    y += 20;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('A GDD total only means something alongside its base temperature and start date — note both when comparing.', margin, y);
    y += 12;
    doc.text('GDD is a heat model; it does not account for moisture, day length, or soil fertility.', margin, y);

    doc.save('growing-degree-days-calculator-results.pdf');
  };

  const tabButtonClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition ${
      active ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
    }`;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">Growing Degree Days Calculator</h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Units + mode */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">Units</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Unit system">
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
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Calculator mode">
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
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {(Object.keys(BASE_PRESETS) as Exclude<PresetId, 'custom'>[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectPreset(id)}
                  className={`rounded-lg px-3 py-2 text-left text-sm ring-1 transition ${
                    preset === id ? 'bg-moss-700 text-white ring-moss-700' : 'bg-sand-50 text-bark-700 ring-moss-100 hover:bg-moss-50'
                  }`}
                >
                  <span className="block font-semibold">{presetLabel(id)}</span>
                  <span className={`block text-xs ${preset === id ? 'text-moss-100' : 'text-bark-500'}`}>{BASE_PRESETS[id].sublabel}</span>
                </button>
              ))}
              <div
                className={`rounded-lg px-3 py-2 ring-1 transition ${
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

          {/* 86/50 cap toggle */}
          <div className="rounded-lg bg-sand-50 p-3 ring-1 ring-moss-100">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={capEnabled}
                onChange={(e) => setCapEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-bark-300 text-moss-700 focus:ring-moss-600"
              />
              <span>
                <span className="block text-sm font-semibold text-bark-800">
                  Apply the {isMetric ? '30°C / 10°C' : '86/50'} cap
                </span>
                <span className="block text-xs text-bark-500">
                  Before averaging, cap the high at {capHi}{tempUnit} and raise the low to at least {capLo}{tempUnit}. See &ldquo;Why the {isMetric ? '30/10' : '86/50'} Cap Exists&rdquo; below.
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
            <div className="flex flex-col gap-3">
              <p className="text-xs text-bark-500">
                Add a row for each day&rsquo;s high and low. This is your growing degree day tracker — the running total updates as you add days.
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
                className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Add another day
              </button>
            </div>
          )}

          {/* Formula display */}
          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">GDD = ((Tmax + Tmin) &divide; 2) &minus; Tbase</p>
            <p className="mt-1 text-xs text-bark-500">Negative results count as zero — development doesn&rsquo;t run backward.</p>
            {mode === 'single' && singleResult.valid && (
              <p className="mt-2 font-mono text-xs text-bark-700 sm:text-sm">
                {formulaLine(singleResult.hi, singleResult.lo, base, singleResult.gdd)}
              </p>
            )}
          </div>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {mode === 'single' ? (
              !singleResult.valid ? (
                <p className="p-5 text-sm text-bark-500">Enter a high and low temperature above to see the result.</p>
              ) : (
                <>
                  <div className="p-5">
                    <p className="text-xs text-bark-500">Growing degree days for this day</p>
                    <p className="font-display text-3xl font-bold text-moss-700">{round(singleResult.gdd, 1)} <span className="text-lg font-medium text-bark-500">GDD</span></p>
                    {(singleResult.cappedHi || singleResult.cappedLo) && (
                      <p className="mt-1.5 text-xs text-bark-500">
                        {singleResult.cappedHi && <>High capped from {singleResult.rawHi}{tempUnit} to {singleResult.hi}{tempUnit}. </>}
                        {singleResult.cappedLo && <>Low raised from {singleResult.rawLo}{tempUnit} to {singleResult.lo}{tempUnit}.</>}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                    <p className="text-xs text-bark-500">Base {base}{tempUnit}{capEnabled ? ` · ${isMetric ? '30/10' : '86/50'} cap on` : ''}</p>
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
              )
            ) : validRowCount === 0 ? (
              <p className="p-5 text-sm text-bark-500">Add at least one day&rsquo;s high and low above to see a running total.</p>
            ) : (
              <>
                <div className="p-5">
                  <p className="text-xs text-bark-500">Cumulative total over {validRowCount} day{validRowCount === 1 ? '' : 's'}</p>
                  <p className="font-display text-3xl font-bold text-moss-700">{round(accumulationTotal, 1)} <span className="text-lg font-medium text-bark-500">GDD</span></p>
                  <p className="mt-1.5 text-xs text-bark-500">
                    Remember: this number only means something alongside the base temperature ({base}{tempUnit}) and the date you started counting — see &ldquo;Start Date Matters&rdquo; below.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">Base {base}{tempUnit}{capEnabled ? ` · ${isMetric ? '30/10' : '86/50'} cap on` : ''}</p>
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
        </div>
      </div>
    </div>
  );
}
