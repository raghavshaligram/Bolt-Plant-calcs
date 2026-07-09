import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type WaterMode = 'per-plant' | 'area';
type UnitSystem = 'imperial' | 'metric';
type FlowPreset = '0.5' | '1' | '2' | '4' | 'custom';

const STORAGE_KEY = 'drip-irrigation-calculator-state-v1';

interface SavedState {
  mode: WaterMode;
  unitSystem: UnitSystem;
  emitterCount: string;
  flowPreset: FlowPreset;
  customFlowRate: string;
  perPlantAmount: string;
  areaValue: string;
  depthValue: string;
  sessionsPerWeek: string;
}

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sanitizeNumericInput(raw: string): string {
  if (typeof raw !== 'string') return '';
  let cleaned = raw.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  cleaned = cleaned.replace(/[^\d.]/g, '');
  cleaned = cleaned.replace(/^0+(?=\d)/, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
}

function enforceNonNegative(value: string): string {
  if (value === '' || value === '.') return value;
  const num = parseFloat(value);
  if (!Number.isFinite(num) || num < 0) return '';
  return value;
}

function sanitizeIntegerInput(raw: string): string {
  if (typeof raw !== 'string') return '';
  const cleaned = raw.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
  return cleaned;
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
    // fail silently
  }
}

// Real conversion constants.
const L_PER_GAL = 3.78541;       // liters per US gallon
const SQM_PER_SQFT = 0.092903;   // sq meters per sq foot
const MM_PER_IN = 25.4;          // millimeters per inch
// Gallons needed to cover 1 sq ft with 1 inch of water depth. Cited from
// Utah State University Extension's Center for Water-Efficient Landscaping
// (precipitation-to-gallons formula: gallons = sq ft x inches x 0.623).
const GAL_PER_SQFT_INCH = 0.623;

const FLOW_PRESETS: { value: FlowPreset; gph: number; label: string }[] = [
  { value: '0.5', gph: 0.5, label: '0.5 GPH' },
  { value: '1', gph: 1, label: '1 GPH' },
  { value: '2', gph: 2, label: '2 GPH' },
  { value: '4', gph: 4, label: '4 GPH' },
  { value: 'custom', gph: 0, label: 'Custom' },
];

function formatDuration(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0 min';
  const totalMinutes = hours * 60;
  if (totalMinutes < 60) {
    return `${round(totalMinutes, totalMinutes < 10 ? 1 : 0)} min`;
  }
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) return `${wholeHours} hr`;
  return `${wholeHours} hr ${minutes} min`;
}

export default function DripIrrigationCalculator() {
  const saved = useRef<Partial<SavedState>>({});
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<WaterMode>('per-plant');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [emitterCount, setEmitterCount] = useState<string>('10');
  const [flowPreset, setFlowPreset] = useState<FlowPreset>('1');
  const [customFlowRate, setCustomFlowRate] = useState<string>('1.5');
  const [perPlantAmount, setPerPlantAmount] = useState<string>('1');
  const [areaValue, setAreaValue] = useState<string>('50');
  const [depthValue, setDepthValue] = useState<string>('1');
  const [sessionsPerWeek, setSessionsPerWeek] = useState<string>('2');

  useEffect(() => {
    const s = loadSavedState();
    saved.current = s;
    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.emitterCount !== undefined) setEmitterCount(s.emitterCount);
    if (s.flowPreset) setFlowPreset(s.flowPreset);
    if (s.customFlowRate !== undefined) setCustomFlowRate(s.customFlowRate);
    if (s.perPlantAmount !== undefined) setPerPlantAmount(s.perPlantAmount);
    if (s.areaValue !== undefined) setAreaValue(s.areaValue);
    if (s.depthValue !== undefined) setDepthValue(s.depthValue);
    if (s.sessionsPerWeek !== undefined) setSessionsPerWeek(s.sessionsPerWeek);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({
      mode, unitSystem, emitterCount, flowPreset, customFlowRate,
      perPlantAmount, areaValue, depthValue, sessionsPerWeek,
    });
  }, [mode, unitSystem, emitterCount, flowPreset, customFlowRate, perPlantAmount, areaValue, depthValue, sessionsPerWeek]);

  const isMetric = unitSystem === 'metric';
  const flowUnit = isMetric ? 'LPH' : 'GPH';
  const volumeUnit = isMetric ? 'L' : 'gal';
  const areaUnit = isMetric ? 'sq m' : 'sq ft';
  const depthUnit = isMetric ? 'mm' : 'in';

  // Convert a GPH value to the current display unit (GPH or LPH).
  const gphToDisplay = (gph: number) => (isMetric ? gph * L_PER_GAL : gph);
  const displayToGph = (val: number) => (isMetric ? val / L_PER_GAL : val);

  const handleUnitToggle = (next: UnitSystem) => {
    if (next === unitSystem) return;
    const goingMetric = next === 'metric';

    // Convert custom flow rate
    const cfr = parseFloat(customFlowRate);
    if (Number.isFinite(cfr)) {
      setCustomFlowRate(round(goingMetric ? cfr * L_PER_GAL : cfr / L_PER_GAL, 2).toString());
    }
    // Convert per-plant amount (gal <-> L)
    const ppa = parseFloat(perPlantAmount);
    if (Number.isFinite(ppa)) {
      setPerPlantAmount(round(goingMetric ? ppa * L_PER_GAL : ppa / L_PER_GAL, 2).toString());
    }
    // Convert area (sq ft <-> sq m)
    const area = parseFloat(areaValue);
    if (Number.isFinite(area)) {
      setAreaValue(round(goingMetric ? area * SQM_PER_SQFT : area / SQM_PER_SQFT, 2).toString());
    }
    // Convert depth (in <-> mm)
    const depth = parseFloat(depthValue);
    if (Number.isFinite(depth)) {
      setDepthValue(round(goingMetric ? depth * MM_PER_IN : depth / MM_PER_IN, 1).toString());
    }
    setUnitSystem(next);
  };

  const handleNumericChange =
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
    };

  const handleIntegerChange =
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(sanitizeIntegerInput(e.target.value));
    };

  const flowRateGph = useMemo(() => {
    if (flowPreset === 'custom') {
      const val = parseFloat(customFlowRate);
      if (!Number.isFinite(val) || val <= 0) return 0;
      return displayToGph(val);
    }
    const preset = FLOW_PRESETS.find((p) => p.value === flowPreset);
    return preset ? preset.gph : 0;
  }, [flowPreset, customFlowRate, isMetric]);

  const result = useMemo(() => {
    const emitters = parseInt(emitterCount, 10);
    if (!Number.isFinite(emitters) || emitters <= 0) return null;
    if (!Number.isFinite(flowRateGph) || flowRateGph <= 0) return null;

    const totalFlowGph = emitters * flowRateGph;

    let totalGalNeeded = 0;
    let perPlantGal = 0;

    if (mode === 'per-plant') {
      const raw = parseFloat(perPlantAmount);
      if (!Number.isFinite(raw) || raw <= 0) return null;
      perPlantGal = isMetric ? raw / L_PER_GAL : raw;
      // Assumes one emitter per plant, so run time is driven by a single
      // emitter's flow rate, independent of how many plants are on the line.
      totalGalNeeded = perPlantGal * emitters;
    } else {
      const rawArea = parseFloat(areaValue);
      const rawDepth = parseFloat(depthValue);
      if (!Number.isFinite(rawArea) || rawArea <= 0) return null;
      if (!Number.isFinite(rawDepth) || rawDepth <= 0) return null;
      const areaSqFt = isMetric ? rawArea / SQM_PER_SQFT : rawArea;
      const depthIn = isMetric ? rawDepth / MM_PER_IN : rawDepth;
      totalGalNeeded = areaSqFt * depthIn * GAL_PER_SQFT_INCH;
    }

    const runTimeHours =
      mode === 'per-plant' ? perPlantGal / flowRateGph : totalGalNeeded / totalFlowGph;

    const totalDeliveredGal =
      mode === 'per-plant' ? totalGalNeeded : totalFlowGph * runTimeHours;

    const weeks = parseInt(sessionsPerWeek, 10);
    const weeklyTotalGal =
      Number.isFinite(weeks) && weeks > 0 ? totalDeliveredGal * weeks : null;

    return {
      runTimeHours,
      totalFlowGph,
      totalDeliveredGal,
      weeklyTotalGal,
      emitters,
    };
  }, [mode, emitterCount, flowRateGph, perPlantAmount, areaValue, depthValue, sessionsPerWeek, isMetric]);

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Drip Irrigation Calculator Results', margin, y);
    y += 28;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    doc.text(`Generated ${dateStr} — HarvestMath.com`, margin, y);
    y += 28;

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Inputs', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const flowLabel = flowPreset === 'custom' ? `${customFlowRate} ${flowUnit} (custom)` : `${FLOW_PRESETS.find(p => p.value === flowPreset)?.label ?? ''}`;
    const lines: string[] = [
      `Number of emitters: ${emitterCount}`,
      `Emitter flow rate: ${flowLabel}`,
      `Mode: ${mode === 'per-plant' ? 'Water per plant' : 'Water depth over area'}`,
    ];
    if (mode === 'per-plant') {
      lines.push(`Target water per plant: ${perPlantAmount} ${volumeUnit}`);
    } else {
      lines.push(`Area: ${areaValue} ${areaUnit}`);
      lines.push(`Target depth: ${depthValue} ${depthUnit}`);
    }
    if (sessionsPerWeek) lines.push(`Sessions per week: ${sessionsPerWeek}`);
    lines.forEach((line) => { doc.text(line, margin, y); y += 16; });

    if (result) {
      y += 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Results', margin, y);
      y += 20;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const resultLines: string[] = [
        `Run time: ${formatDuration(result.runTimeHours)}`,
        `Total system flow: ${round(gphToDisplay(result.totalFlowGph), 2)} ${flowUnit}`,
        `Water delivered this session: ${round(gphToDisplay(result.totalDeliveredGal), 2)} ${volumeUnit}`,
      ];
      if (result.weeklyTotalGal !== null) {
        resultLines.push(`Weekly total (${sessionsPerWeek}x/week): ${round(gphToDisplay(result.weeklyTotalGal), 1)} ${volumeUnit}`);
      }
      resultLines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    }

    doc.save('drip-irrigation-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Drip Irrigation Calculator
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Mode + unit toggles */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="label-field">Water amount by</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'per-plant'}
                  onClick={() => setMode('per-plant')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'per-plant'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Per Plant
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'area'}
                  onClick={() => setMode('area')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'area'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Area Coverage
                </button>
              </div>
            </div>

            <div>
              <span className="label-field">Units</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
                <button
                  type="button"
                  aria-pressed={!isMetric}
                  onClick={() => handleUnitToggle('imperial')}
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
                  onClick={() => handleUnitToggle('metric')}
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

          {/* Emitter count + flow rate */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="dic-emitters" className="label-field">
                Number of emitters
              </label>
              <input
                id="dic-emitters"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={emitterCount}
                onChange={handleIntegerChange(setEmitterCount)}
                className="input-field mt-1.5"
              />
              <p className="mt-1.5 text-xs text-bark-500">
                Emitters running together on this line or zone.
              </p>
            </div>
            <div>
              <label htmlFor="dic-flow-preset" className="label-field">
                Emitter flow rate
              </label>
              <select
                id="dic-flow-preset"
                value={flowPreset}
                onChange={(e) => setFlowPreset(e.target.value as FlowPreset)}
                className="input-field mt-1.5"
              >
                {FLOW_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.value === 'custom' ? 'Custom' : `${isMetric ? round(p.gph * L_PER_GAL, 2) : p.gph} ${flowUnit}`}
                  </option>
                ))}
              </select>
              {flowPreset === 'custom' && (
                <input
                  id="dic-flow-custom"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={customFlowRate}
                  onChange={handleNumericChange(setCustomFlowRate)}
                  aria-label={`Custom emitter flow rate in ${flowUnit}`}
                  placeholder={flowUnit}
                  className="input-field mt-2"
                />
              )}
            </div>
          </div>

          {/* Water amount inputs */}
          {mode === 'per-plant' ? (
            <div>
              <label htmlFor="dic-per-plant" className="label-field">
                Water per plant <span className="text-bark-500">({volumeUnit})</span>
              </label>
              <input
                id="dic-per-plant"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.25"
                value={perPlantAmount}
                onChange={handleNumericChange(setPerPlantAmount)}
                className="input-field mt-1.5"
              />
              <p className="mt-1.5 text-xs text-bark-500">
                Assumes one emitter per plant, so run time is set by a single emitter&rsquo;s flow rate.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="dic-area" className="label-field">
                  Area <span className="text-bark-500">({areaUnit})</span>
                </label>
                <input
                  id="dic-area"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={areaValue}
                  onChange={handleNumericChange(setAreaValue)}
                  className="input-field mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="dic-depth" className="label-field">
                  Target water depth <span className="text-bark-500">({depthUnit})</span>
                </label>
                <input
                  id="dic-depth"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.25"
                  value={depthValue}
                  onChange={handleNumericChange(setDepthValue)}
                  className="input-field mt-1.5"
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="dic-sessions" className="label-field">
              Sessions per week <span className="text-bark-500">(optional)</span>
            </label>
            <input
              id="dic-sessions"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={sessionsPerWeek}
              onChange={handleIntegerChange(setSessionsPerWeek)}
              className="input-field mt-1.5 sm:w-40"
            />
            <p className="mt-1.5 text-xs text-bark-500">
              Leave blank to skip the weekly total.
            </p>
          </div>

          {/* Formula */}
          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            {mode === 'per-plant' ? (
              <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                Run time = Water per plant &divide; Emitter flow rate
              </p>
            ) : (
              <>
                <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                  {isMetric
                    ? 'Water needed (L) = Area (sq m) × Depth (mm)'
                    : 'Water needed (gal) = Area (sq ft) × Depth (in) × 0.623'}
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  Run time = Water needed &divide; (Emitters &times; Flow rate)
                </p>
              </>
            )}
          </div>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!result ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your emitter count, flow rate, and target water amount above to see run time.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2c3 4 6 8 6 12a6 6 0 0 1-12 0c0-4 3-8 6-12Z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">Run time</p>
                      <p className="font-display text-3xl font-bold text-moss-700">
                        {formatDuration(result.runTimeHours)}
                      </p>
                      <p className="text-xs font-medium text-bark-600">this session</p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-4 sm:p-5">
                    <p className="text-xs text-moss-200">Water delivered</p>
                    <p className="font-display text-xl font-bold text-white">
                      {round(gphToDisplay(result.totalDeliveredGal), 1)} {volumeUnit}
                    </p>
                    <p className="mt-1 text-xs text-moss-200">this session</p>
                    <p className="mt-2 text-xs text-moss-300">
                      {round(gphToDisplay(result.totalFlowGph), 2)} {flowUnit} total system flow
                    </p>
                  </div>
                </div>

                {result.weeklyTotalGal !== null && (
                  <div className="border-t border-moss-100 bg-moss-50/60 px-4 py-2 text-xs text-bark-500">
                    Weekly total at {sessionsPerWeek}x/week: ~{round(gphToDisplay(result.weeklyTotalGal), 1)} {volumeUnit}
                  </div>
                )}

                <div className="flex items-center justify-between border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    Estimate for home garden zones. Not a substitute for professional system design.
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
        </div>
      </div>
    </div>
  );
}
