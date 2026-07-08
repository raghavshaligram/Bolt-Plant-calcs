import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type InputMode = 'dimensions' | 'area';
type BedShape = 'rectangle' | 'circle';
type UnitSystem = 'imperial' | 'metric';

const STORAGE_KEY = 'mulch-calculator-state-v1';

interface SavedState {
  mode: InputMode;
  shape: BedShape;
  unitSystem: UnitSystem;
  length: string;
  width: string;
  radius: string;
  area: string;
  depth: string;
  bagSize: string;
}

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function bagCount(cubicFeet: number, bagSize = 2): number {
  if (cubicFeet <= 0) return 0;
  return Math.ceil(cubicFeet / bagSize);
}

function sanitizeNumericInput(raw: string): string {
  if (typeof raw !== 'string') return '';
  // Strip any HTML/script tags and angle brackets outright.
  let cleaned = raw.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  // Allow only digits, one decimal point, and a leading minus sign (which we then strip).
  cleaned = cleaned.replace(/[^\d.]/g, '');
  // Remove leading zeros but keep "0." valid
  cleaned = cleaned.replace(/^0+(?=\d)/, '');
  // Allow only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
}

function enforceNonNegative(value: string): string {
  // Strip any minus signs — negative dimensions/depth are nonsensical here.
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

// Conversion helpers: metric inputs → internal imperial (feet/inches) for the math.
const M_TO_FT = 3.28084;
const CM_TO_IN = 0.393701;
const SQM_TO_SQFT = 10.7639;

export default function MulchCalculator() {
  const saved = useRef<Partial<SavedState>>({});
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<InputMode>('dimensions');
  const [shape, setShape] = useState<BedShape>('rectangle');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [length, setLength] = useState<string>('8');
  const [width, setWidth] = useState<string>('4');
  const [radius, setRadius] = useState<string>('5');
  const [area, setArea] = useState<string>('32');
  const [depth, setDepth] = useState<string>('3');
  const [bagSize, setBagSize] = useState<string>('2');

  // Load cached state once on mount (client-only).
  useEffect(() => {
    const s = loadSavedState();
    saved.current = s;
    if (s.mode) setMode(s.mode);
    if (s.shape) setShape(s.shape);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.radius !== undefined) setRadius(s.radius);
    if (s.area !== undefined) setArea(s.area);
    if (s.depth !== undefined) setDepth(s.depth);
    if (s.bagSize !== undefined) setBagSize(s.bagSize);
    hasLoaded.current = true;
  }, []);

  // Persist to localStorage whenever inputs change (after initial load).
  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ mode, shape, unitSystem, length, width, radius, area, depth, bagSize });
  }, [mode, shape, unitSystem, length, width, radius, area, depth, bagSize]);

  const parsedBagSize = parseFloat(bagSize);

  const result = useMemo(() => {
    let sqft = 0;
    if (mode === 'dimensions') {
      if (shape === 'rectangle') {
        let l = parseFloat(length);
        let w = parseFloat(width);
        if (unitSystem === 'metric') {
          l = Number.isFinite(l) ? l * M_TO_FT : 0;
          w = Number.isFinite(w) ? w * M_TO_FT : 0;
        }
        sqft = Number.isFinite(l) && Number.isFinite(w) ? l * w : 0;
      } else {
        let r = parseFloat(radius);
        if (unitSystem === 'metric') {
          r = Number.isFinite(r) ? r * M_TO_FT : 0;
        }
        sqft = Number.isFinite(r) ? Math.PI * r * r : 0;
      }
    } else {
      let a = parseFloat(area);
      if (unitSystem === 'metric') {
        a = Number.isFinite(a) ? a * SQM_TO_SQFT : 0;
      }
      sqft = Number.isFinite(a) ? a : 0;
    }

    let depthIn = parseFloat(depth);
    if (unitSystem === 'metric') {
      // depth is in cm in metric mode
      depthIn = Number.isFinite(depthIn) ? depthIn * CM_TO_IN : 0;
    }
    const depthFt = Number.isFinite(depthIn) ? depthIn / 12 : 0;
    const cubicFeet = Math.max(0, sqft * depthFt);
    const cubicYards = cubicFeet / 27;
    const cubicMeters = cubicFeet * 0.0283168;
    const bags = Number.isFinite(parsedBagSize) && parsedBagSize > 0
      ? bagCount(cubicFeet, parsedBagSize)
      : 0;

    return { sqft, cubicFeet, cubicYards, cubicMeters, bags, depthIn };
  }, [mode, shape, unitSystem, length, width, radius, area, depth, parsedBagSize]);

  const hasResult = result.cubicFeet > 0;

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';
  const depthUnit = isMetric ? 'cm' : 'in';
  const areaUnit = isMetric ? 'm²' : 'sq ft';

  const handleNumericChange = (
    setter: (v: string) => void,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = enforceNonNegative(sanitizeNumericInput(e.target.value));
    setter(cleaned);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Mulch Calculator Results', margin, y);
    y += 28;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
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
      if (shape === 'rectangle') {
        inputLines.push(`Length: ${length || 0} ${lengthUnit}`);
        inputLines.push(`Width: ${width || 0} ${lengthUnit}`);
      } else {
        inputLines.push(`Shape: Circle`);
        inputLines.push(`Radius: ${radius || 0} ${lengthUnit}`);
      }
    } else {
      inputLines.push(`Total area: ${area || 0} ${areaUnit}`);
    }
    inputLines.push(`Depth: ${depth || 0} ${depthUnit}`);
    inputLines.push(`Bag size: ${parsedBagSize || 2} cu ft`);
    inputLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Results', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const resultLines: string[] = [
      `Area: ${round(result.sqft, 1).toLocaleString()} sq ft`,
      `Cubic feet: ${round(result.cubicFeet, 1).toLocaleString()} cu ft`,
      `Cubic yards: ${round(result.cubicYards, 2).toLocaleString()} cu yd`,
      `Cubic meters: ${round(result.cubicMeters, 3).toLocaleString()} m³`,
      `Bags (${parsedBagSize || 2} cu ft): ${result.bags.toLocaleString()}`,
    ];
    resultLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Estimates only — verify before buying materials. Bag counts assume',
      margin, y,
    );
    y += 12;
    doc.text(
      `standard ${parsedBagSize || 2} cu ft bags and round up to the next whole bag.`,
      margin, y,
    );

    doc.save('mulch-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header */}
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Calculate Your Mulch Needs
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Unit system toggle */}
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
                    mode === 'dimensions'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Length &times; width
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
                  Total area
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
                    !isMetric
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Imperial (ft, in)
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
                  Metric (m, cm)
                </button>
              </div>
            </div>
          </div>

          {/* Bed shape toggle — only relevant when entering dimensions, not total area */}
          {mode === 'dimensions' && (
            <div>
              <span className="label-field">Bed shape</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={shape === 'rectangle'}
                  onClick={() => setShape('rectangle')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    shape === 'rectangle'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Rectangle
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={shape === 'circle'}
                  onClick={() => setShape('circle')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    shape === 'circle'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Circle
                </button>
              </div>
            </div>
          )}

          {/* Inputs */}
          <div className="grid gap-4 sm:grid-cols-2">
            {mode === 'dimensions' ? (
              shape === 'rectangle' ? (
                <>
                  <div>
                    <label htmlFor="mulch-length" className="label-field">
                      Length <span className="text-bark-500">({lengthUnit})</span>
                    </label>
                    <input
                      id="mulch-length"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={length}
                      onChange={handleNumericChange(setLength)}
                      className="input-field mt-1.5"
                    />
                  </div>
                  <div>
                    <label htmlFor="mulch-width" className="label-field">
                      Width <span className="text-bark-500">({lengthUnit})</span>
                    </label>
                    <input
                      id="mulch-width"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={width}
                      onChange={handleNumericChange(setWidth)}
                      className="input-field mt-1.5"
                    />
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2">
                  <label htmlFor="mulch-radius" className="label-field">
                    Radius <span className="text-bark-500">({lengthUnit})</span>
                  </label>
                  <input
                    id="mulch-radius"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={radius}
                    onChange={handleNumericChange(setRadius)}
                    className="input-field mt-1.5"
                  />
                  <p className="mt-1.5 text-xs text-bark-500">
                    Half the full width of the bed (diameter &divide; 2).
                  </p>
                </div>
              )
            ) : (
              <div className="sm:col-span-2">
                <label htmlFor="mulch-area" className="label-field">
                  Total area <span className="text-bark-500">({areaUnit})</span>
                </label>
                <input
                  id="mulch-area"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={area}
                  onChange={handleNumericChange(setArea)}
                  className="input-field mt-1.5"
                />
              </div>
            )}

            <div>
              <label htmlFor="mulch-depth" className="label-field">
                Desired depth <span className="text-bark-500">({depthUnit})</span>
              </label>
              <input
                id="mulch-depth"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.25"
                value={depth}
                onChange={handleNumericChange(setDepth)}
                className="input-field mt-1.5"
              />
              <p className="mt-1.5 text-xs text-bark-500">
                {isMetric ? '5–8 cm is typical for garden beds.' : '2–3″ is typical for garden beds.'}
              </p>
            </div>

            <div>
              <label htmlFor="mulch-bag-size" className="label-field">
                Bag size <span className="text-bark-500">(cubic feet)</span>
              </label>
              <select
                id="mulch-bag-size"
                value={bagSize}
                onChange={(e) => setBagSize(e.target.value)}
                className="input-field mt-1.5"
              >
                <option value="2">2 cu ft (standard bagged mulch)</option>
                <option value="1.5">1.5 cu ft</option>
                <option value="1">1 cu ft</option>
                <option value="3">3 cu ft (bulk bag)</option>
              </select>
              <p className="mt-1.5 text-xs text-bark-500">Most home-store bags are 2 cu ft.</p>
            </div>
          </div>

          {/* Formula display */}
          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
              {mode === 'dimensions' && shape === 'circle'
                ? 'Cubic Feet = π × Radius² × (Depth ÷ 12)'
                : 'Cubic Feet = Length × Width × (Depth ÷ 12)'}
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Cubic Yards = Cubic Feet ÷ 27 &nbsp;·&nbsp; Bags = Cubic Feet ÷ Bag Size
            </p>
          </div>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter an area and depth above to see how much mulch you need.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  {/* Left: cubic feet */}
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                        <path d="M16 4c-3 4-5 7-5 11a5 5 0 0 0 10 0c0-4-2-7-5-11Z" />
                        <path d="M16 26c-2-3-4-5-4-8a4 4 0 0 1 8 0c0 3-2 5-4 8Z" opacity="0.5" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">You need approximately</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {round(result.cubicFeet, 1).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        cubic feet of mulch
                        {isMetric && (
                          <span className="ml-1 text-bark-400">
                            ({round(result.cubicMeters, 2)} m³)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: bag count */}
                  <div className="bg-moss-700 p-4 sm:p-5">
                    <p className="text-xs text-moss-200">That's about</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {result.bags.toLocaleString()} bags
                    </p>
                    <p className="text-xs text-moss-200">
                      ({parsedBagSize || 2} cu ft per bag)
                    </p>
                    <p className="mt-1 text-xs text-moss-300">
                      {round(result.cubicYards, 2)} cu yd total
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    For {round(result.sqft, 1).toLocaleString()} sq ft at {round(result.depthIn, 1)}&Prime; deep.
                    Add 10% extra for settling.
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

          {/* Unit conversion table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-xs font-medium uppercase tracking-wider text-bark-400">
                Quick unit conversions
              </caption>
              <thead>
                <tr className="border-b border-moss-100 text-bark-500">
                  <th scope="col" className="py-2 pr-4 font-medium">1 unit</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Cubic feet</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Cubic yards</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Cubic meters</th>
                  <th scope="col" className="py-2 font-medium">2 cu ft bags</th>
                </tr>
              </thead>
              <tbody className="text-bark-700">
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1 cubic yard</th>
                  <td className="py-2 pr-4">27</td>
                  <td className="py-2 pr-4">1</td>
                  <td className="py-2 pr-4">0.765</td>
                  <td className="py-2">13.5</td>
                </tr>
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1 cubic meter</th>
                  <td className="py-2 pr-4">35.3</td>
                  <td className="py-2 pr-4">1.308</td>
                  <td className="py-2 pr-4">1</td>
                  <td className="py-2">17.7</td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1 cu ft bag</th>
                  <td className="py-2 pr-4">2</td>
                  <td className="py-2 pr-4">0.074</td>
                  <td className="py-2 pr-4">0.057</td>
                  <td className="py-2">1</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bag-size comparison table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-xs font-medium uppercase tracking-wider text-bark-400">
                Bag-size comparison (per 100 sq ft at 3″ deep)
              </caption>
              <thead>
                <tr className="border-b border-moss-100 text-bark-500">
                  <th scope="col" className="py-2 pr-4 font-medium">Bag size</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Cubic feet per bag</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Bags needed</th>
                  <th scope="col" className="py-2 font-medium">Total cubic feet</th>
                </tr>
              </thead>
              <tbody className="text-bark-700">
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">Small</th>
                  <td className="py-2 pr-4">1.0</td>
                  <td className="py-2 pr-4">25</td>
                  <td className="py-2">25</td>
                </tr>
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">Standard</th>
                  <td className="py-2 pr-4">1.5</td>
                  <td className="py-2 pr-4">17</td>
                  <td className="py-2">25</td>
                </tr>
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">Standard</th>
                  <td className="py-2 pr-4">2.0</td>
                  <td className="py-2 pr-4">13</td>
                  <td className="py-2">25</td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">Bulk bag</th>
                  <td className="py-2 pr-4">3.0</td>
                  <td className="py-2 pr-4">9</td>
                  <td className="py-2">25</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
