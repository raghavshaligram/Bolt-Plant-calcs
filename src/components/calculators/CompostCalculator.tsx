import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type InputMode = 'dimensions' | 'area';
type UnitSystem = 'imperial' | 'metric';

const STORAGE_KEY = 'compost-calculator-state-v1';

interface SavedState {
  mode: InputMode;
  unitSystem: UnitSystem;
  length: string;
  width: string;
  area: string;
  depth: string;
  bagSize: string;
}

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function bagCount(cubicFeet: number, bagSize = 1.5): number {
  if (cubicFeet <= 0) return 0;
  return Math.ceil(cubicFeet / bagSize);
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
  return value.replace(/-/g, '');
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

const M_TO_FT = 3.28084;
const CM_TO_IN = 0.393701;
const SQM_TO_SQFT = 10.7639;
const LB_TO_KG = 0.453592;

// Finished compost bulk density varies with moisture content and source
// material; ~44-50 lb per cubic foot is a commonly cited average range for
// screened, finished compost. We use the midpoint (47 lb/cu ft) as the
// headline estimate and show the full range alongside it — this is an
// estimate, not a lab-measured density for your specific batch.
const COMPOST_LB_PER_CUFT_LOW = 44;
const COMPOST_LB_PER_CUFT_HIGH = 50;
const COMPOST_LB_PER_CUFT_MID = 47;

export default function CompostCalculator() {
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<InputMode>('dimensions');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [length, setLength] = useState('8');
  const [width, setWidth] = useState('4');
  const [area, setArea] = useState('32');
  const [depth, setDepth] = useState('2');
  const [bagSize, setBagSize] = useState('1.5');

  useEffect(() => {
    const s = loadSavedState();
    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.area !== undefined) setArea(s.area);
    if (s.depth !== undefined) setDepth(s.depth);
    if (s.bagSize !== undefined) setBagSize(s.bagSize);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ mode, unitSystem, length, width, area, depth, bagSize });
  }, [mode, unitSystem, length, width, area, depth, bagSize]);

  const parsedBagSize = parseFloat(bagSize);
  const isMetric = unitSystem === 'metric';

  const handleNumericChange = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
    };

  const result = useMemo(() => {
    let sqft = 0;
    if (mode === 'dimensions') {
      let l = parseFloat(length);
      let w = parseFloat(width);
      if (isMetric) {
        l = Number.isFinite(l) ? l * M_TO_FT : 0;
        w = Number.isFinite(w) ? w * M_TO_FT : 0;
      }
      sqft = Number.isFinite(l) && Number.isFinite(w) ? l * w : 0;
    } else {
      let a = parseFloat(area);
      if (isMetric) {
        a = Number.isFinite(a) ? a * SQM_TO_SQFT : 0;
      }
      sqft = Number.isFinite(a) ? a : 0;
    }

    let depthIn = parseFloat(depth);
    if (isMetric) {
      depthIn = Number.isFinite(depthIn) ? depthIn * CM_TO_IN : 0;
    }
    const depthFt = Number.isFinite(depthIn) ? depthIn / 12 : 0;
    const cubicFeet = Math.max(0, sqft * depthFt);
    const cubicYards = cubicFeet / 27;
    const cubicMeters = cubicFeet * 0.0283168;
    const bags = Number.isFinite(parsedBagSize) && parsedBagSize > 0
      ? bagCount(cubicFeet, parsedBagSize)
      : 0;
    const weightLbLow = cubicFeet * COMPOST_LB_PER_CUFT_LOW;
    const weightLbHigh = cubicFeet * COMPOST_LB_PER_CUFT_HIGH;
    const weightLbMid = cubicFeet * COMPOST_LB_PER_CUFT_MID;

    return { sqft, cubicFeet, cubicYards, cubicMeters, bags, weightLbLow, weightLbHigh, weightLbMid };
  }, [mode, length, width, area, depth, isMetric, parsedBagSize]);

  const hasResult = result.cubicFeet > 0;
  const lengthUnit = isMetric ? 'm' : 'ft';
  const depthUnit = isMetric ? 'cm' : 'in';
  const areaUnit = isMetric ? 'm²' : 'sq ft';

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Compost Calculator Results', margin, y);
    y += 28;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated ${dateStr} — SoilMath.com`, margin, y);
    y += 28;

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Inputs', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const inputLines: string[] = [];
    if (mode === 'dimensions') {
      inputLines.push(`Length: ${length || 0} ${lengthUnit}`);
      inputLines.push(`Width: ${width || 0} ${lengthUnit}`);
    } else {
      inputLines.push(`Total area: ${area || 0} ${areaUnit}`);
    }
    inputLines.push(`Depth: ${depth || 0} ${depthUnit}`);
    inputLines.push(`Bag size: ${parsedBagSize || 1.5} cu ft`);
    inputLines.forEach((line) => { doc.text(line, margin, y); y += 16; });

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Results', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const resultLines = [
      `Area: ${round(result.sqft, 1).toLocaleString()} sq ft`,
      `Cubic feet: ${round(result.cubicFeet, 1).toLocaleString()} cu ft`,
      `Cubic yards: ${round(result.cubicYards, 2).toLocaleString()} cu yd`,
      `Cubic meters: ${round(result.cubicMeters, 3).toLocaleString()} m³`,
      `Bags (${parsedBagSize || 1.5} cu ft): ${result.bags.toLocaleString()}`,
      `Estimated weight: ${round(result.weightLbLow, 0).toLocaleString()}-${round(result.weightLbHigh, 0).toLocaleString()} lb (~${round(result.weightLbMid * LB_TO_KG, 0).toLocaleString()} kg)`,
    ];
    resultLines.forEach((line) => { doc.text(line, margin, y); y += 16; });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Estimates only — verify before buying materials. Weight assumes 44-50 lb per cubic', margin, y); y += 12;
    doc.text('foot of finished compost, which varies with moisture and material.', margin, y);

    doc.save('compost-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">Compost Calculator</h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">How do you want to enter your area?</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'dimensions'}
                  onClick={() => setMode('dimensions')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'dimensions' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Length &times; Width
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'area'}
                  onClick={() => setMode('area')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'area' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Total Area
                </button>
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

          {mode === 'dimensions' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="compost-length" className="label-field">Length ({lengthUnit})</label>
                <input id="compost-length" type="number" inputMode="decimal" min="0" step="0.1"
                  value={length} onChange={handleNumericChange(setLength)} className="input-field mt-1.5" />
              </div>
              <div>
                <label htmlFor="compost-width" className="label-field">Width ({lengthUnit})</label>
                <input id="compost-width" type="number" inputMode="decimal" min="0" step="0.1"
                  value={width} onChange={handleNumericChange(setWidth)} className="input-field mt-1.5" />
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="compost-area" className="label-field">Total area ({areaUnit})</label>
              <input id="compost-area" type="number" inputMode="decimal" min="0" step="1"
                value={area} onChange={handleNumericChange(setArea)} className="input-field mt-1.5" />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="compost-depth" className="label-field">
                Depth ({depthUnit}) <span className="text-bark-500">(1-3&Prime; top-dressing, deeper for mixing in)</span>
              </label>
              <input id="compost-depth" type="number" inputMode="decimal" min="0" step="0.1"
                value={depth} onChange={handleNumericChange(setDepth)} className="input-field mt-1.5" />
            </div>
            <div>
              <label htmlFor="compost-bagsize" className="label-field">Bag size (cu ft)</label>
              <select id="compost-bagsize" value={bagSize} onChange={(e) => setBagSize(e.target.value)} className="input-field mt-1.5">
                <option value="1">1 cu ft</option>
                <option value="1.5">1.5 cu ft</option>
                <option value="2">2 cu ft</option>
              </select>
            </div>
          </div>

          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
              Cubic feet = Area &times; (Depth &divide; 12) <span className="text-bark-400">(depth in inches)</span>
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Weight (lb) &asymp; Cubic feet &times; 44-50
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">Enter your area and depth to see how much compost you need.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-y divide-moss-200 sm:grid-cols-4 sm:divide-y-0">
                  <div className="p-4 sm:p-5">
                    <p className="text-xs text-bark-500">Cubic feet</p>
                    <p className="font-display text-xl font-bold text-moss-700 sm:text-2xl">{round(result.cubicFeet, 1)}</p>
                  </div>
                  <div className="p-4 sm:p-5">
                    <p className="text-xs text-bark-500">Cubic yards</p>
                    <p className="font-display text-xl font-bold text-moss-700 sm:text-2xl">{round(result.cubicYards, 2)}</p>
                  </div>
                  <div className="p-4 sm:p-5">
                    <p className="text-xs text-bark-500">Bags ({parsedBagSize || 1.5} cu ft)</p>
                    <p className="font-display text-xl font-bold text-moss-700 sm:text-2xl">{result.bags}</p>
                  </div>
                  <div className="bg-moss-700 p-4 sm:p-5">
                    <p className="text-xs text-moss-200">Est. weight</p>
                    <p className="font-display text-xl font-bold text-white sm:text-2xl">
                      {round(result.weightLbLow, 0)}&ndash;{round(result.weightLbHigh, 0)}
                    </p>
                    <p className="text-xs text-moss-200">lb ({round(result.weightLbMid * LB_TO_KG, 0)} kg)</p>
                  </div>
                </div>
                <div className="border-t border-moss-200 bg-white px-4 py-2.5 text-xs text-bark-500 sm:px-5">
                  Weight uses an average 44&ndash;50 lb per cubic foot for finished compost &mdash; actual weight varies with moisture and material.
                </div>
              </>
            )}
          </div>

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
