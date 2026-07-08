import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type BedShape = 'rectangle' | 'cylinder';
type UnitSystem = 'imperial' | 'metric';

const STORAGE_KEY = 'soil-volume-calculator-state-v1';

// Estimated weight: average of moist potting/garden mix (~40 lbs/cu ft).
// Dry potting mix: 20–25 lbs/cu ft; dense garden soil: 70–80 lbs/cu ft.
const LBS_PER_CUBIC_FOOT = 40;
const LITERS_PER_CUBIC_FOOT = 28.3168;

interface SavedState {
  shape: BedShape;
  unitSystem: UnitSystem;
  length: string;
  width: string;
  diameter: string;
  depth: string;
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

export default function SoilVolumeCalculator() {
  const saved = useRef<Partial<SavedState>>({});
  const hasLoaded = useRef(false);

  const [shape, setShape] = useState<BedShape>('rectangle');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [length, setLength] = useState<string>('4');
  const [width, setWidth] = useState<string>('8');
  const [diameter, setDiameter] = useState<string>('1');
  const [depth, setDepth] = useState<string>('6');

  useEffect(() => {
    const s = loadSavedState();
    saved.current = s;
    if (s.shape) setShape(s.shape);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.diameter !== undefined) setDiameter(s.diameter);
    if (s.depth !== undefined) setDepth(s.depth);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ shape, unitSystem, length, width, diameter, depth });
  }, [shape, unitSystem, length, width, diameter, depth]);

  const result = useMemo(() => {
    let sqft = 0;

    if (shape === 'rectangle') {
      let l = parseFloat(length);
      let w = parseFloat(width);
      if (unitSystem === 'metric') {
        l = Number.isFinite(l) ? l * M_TO_FT : 0;
        w = Number.isFinite(w) ? w * M_TO_FT : 0;
      }
      sqft = Number.isFinite(l) && Number.isFinite(w) ? l * w : 0;
    } else {
      let d = parseFloat(diameter);
      let r_ft: number;
      if (unitSystem === 'metric') {
        // diameter in m → radius in ft
        r_ft = Number.isFinite(d) ? (d / 2) * M_TO_FT : 0;
      } else {
        // diameter in ft
        r_ft = Number.isFinite(d) ? d / 2 : 0;
      }
      sqft = r_ft > 0 ? Math.PI * r_ft * r_ft : 0;
    }

    let depthIn = parseFloat(depth);
    if (unitSystem === 'metric') {
      depthIn = Number.isFinite(depthIn) ? depthIn * CM_TO_IN : 0;
    }
    const depthFt = Number.isFinite(depthIn) ? depthIn / 12 : 0;
    const cubicFeet = Math.max(0, sqft * depthFt);
    const cubicYards = cubicFeet / 27;
    const cubicMeters = cubicFeet * 0.0283168;
    const liters = cubicFeet * LITERS_PER_CUBIC_FOOT;
    const weightLbs = cubicFeet * LBS_PER_CUBIC_FOOT;
    const weightKg = weightLbs * 0.453592;

    return { sqft, cubicFeet, cubicYards, cubicMeters, liters, weightLbs, weightKg, depthIn };
  }, [shape, unitSystem, length, width, diameter, depth]);

  const hasResult = result.cubicFeet > 0;

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';
  const depthUnit = isMetric ? 'cm' : 'in';

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
    doc.text('Soil Volume Calculator Results', margin, y);
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
    inputLines.push(`Shape: ${shape === 'rectangle' ? 'Rectangle' : 'Cylinder / Round pot'}`);
    if (shape === 'rectangle') {
      inputLines.push(`Length: ${length || 0} ${lengthUnit}`);
      inputLines.push(`Width: ${width || 0} ${lengthUnit}`);
    } else {
      inputLines.push(`Diameter: ${diameter || 0} ${lengthUnit}`);
    }
    inputLines.push(`Fill depth: ${depth || 0} ${depthUnit}`);
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
      `Cubic feet: ${round(result.cubicFeet, 2).toLocaleString()} cu ft`,
      `Cubic yards: ${round(result.cubicYards, 2).toLocaleString()} cu yd`,
      `Cubic meters: ${round(result.cubicMeters, 3).toLocaleString()} m³`,
      `Liters: ${round(result.liters, 1).toLocaleString()} L`,
      `Est. weight: ~${round(result.weightLbs, 0).toLocaleString()} lbs (~${round(result.weightKg, 0).toLocaleString()} kg)`,
    ];
    resultLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Weight is approximate. Dry potting mix: 20–25 lbs/cu ft. Dense garden soil: 70–80 lbs/cu ft.', margin, y);
    y += 12;
    doc.text('This calculator uses 40 lbs/cu ft as a midpoint estimate.', margin, y);

    doc.save('soil-volume-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header */}
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Calculate Your Soil Volume
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Shape + Units toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">Shape</span>
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
                  aria-selected={shape === 'cylinder'}
                  onClick={() => setShape('cylinder')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    shape === 'cylinder'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Cylinder / Pot
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

          {/* Inputs */}
          <div className="grid gap-4 sm:grid-cols-2">
            {shape === 'rectangle' ? (
              <>
                <div>
                  <label htmlFor="soil-length" className="label-field">
                    Length <span className="text-bark-500">({lengthUnit})</span>
                  </label>
                  <input
                    id="soil-length"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={length}
                    onChange={handleNumericChange(setLength)}
                    className="input-field mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="soil-width" className="label-field">
                    Width <span className="text-bark-500">({lengthUnit})</span>
                  </label>
                  <input
                    id="soil-width"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={width}
                    onChange={handleNumericChange(setWidth)}
                    className="input-field mt-1.5"
                  />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2">
                <label htmlFor="soil-diameter" className="label-field">
                  Diameter <span className="text-bark-500">({lengthUnit})</span>
                </label>
                <input
                  id="soil-diameter"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.25"
                  value={diameter}
                  onChange={handleNumericChange(setDiameter)}
                  className="input-field mt-1.5"
                />
                {!isMetric && (
                  <p className="mt-1.5 text-xs text-bark-500">
                    In feet: 6&Prime; pot&nbsp;= 0.5&nbsp;ft, 12&Prime;&nbsp;= 1&nbsp;ft, 16&Prime;&nbsp;= 1.33&nbsp;ft, 24&Prime;&nbsp;= 2&nbsp;ft.
                  </p>
                )}
              </div>
            )}

            <div className="sm:col-span-2">
              <label htmlFor="soil-depth" className="label-field">
                Fill depth <span className="text-bark-500">({depthUnit})</span>
              </label>
              <input
                id="soil-depth"
                type="number"
                inputMode="decimal"
                min="0"
                step={shape === 'cylinder' ? '0.5' : '1'}
                value={depth}
                onChange={handleNumericChange(setDepth)}
                className="input-field mt-1.5"
              />
              <p className="mt-1.5 text-xs text-bark-500">
                {shape === 'cylinder'
                  ? (isMetric ? 'Leave 3–5 cm from the rim for watering headspace.' : 'Leave 1–2″ from the rim for watering headspace.')
                  : (isMetric ? 'Typical raised bed: 20–30 cm. New lawn: 10–15 cm.' : 'Typical raised bed: 6–12″. New lawn: 4–6″.')}
              </p>
            </div>
          </div>

          {/* Formula display */}
          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            {shape === 'rectangle' ? (
              <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                Cubic Feet = Length × Width × (Depth ÷ 12)
              </p>
            ) : (
              <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                Cubic Feet = π × (Diameter ÷ 2)² × (Depth ÷ 12)
              </p>
            )}
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Liters = Cubic Feet × 28.32 &nbsp;·&nbsp; Cu Yd = Cubic Feet ÷ 27
            </p>
          </div>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter dimensions and fill depth above to see your soil volume.
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
                        {round(result.cubicFeet, 2).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        cubic feet of soil
                        {isMetric && (
                          <span className="ml-1 text-bark-400">
                            ({round(result.cubicMeters, 3)} m³)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: liters + cubic yards */}
                  <div className="bg-moss-700 p-4 sm:p-5">
                    <p className="text-xs text-moss-200">That's about</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {round(result.liters, 1).toLocaleString()} L
                    </p>
                    <p className="text-xs text-moss-200">
                      ({round(result.cubicYards, 2)} cu yd)
                    </p>
                    <p className="mt-1 text-xs text-moss-300">
                      Liters useful for bag shopping
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    ~{round(result.weightLbs, 0).toLocaleString()} lbs&nbsp;/&nbsp;~{round(result.weightKg, 0).toLocaleString()} kg &mdash; est. weight at 40 lbs/cu ft.
                    Add 10–15% for settling.
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

          {/* Common pot size reference */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-xs font-medium uppercase tracking-wider text-bark-400">
                Common pot sizes — approximate soil needed
              </caption>
              <thead>
                <tr className="border-b border-moss-100 text-bark-500">
                  <th scope="col" className="py-2 pr-4 font-medium">Pot diameter</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Fill depth</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Cubic feet</th>
                  <th scope="col" className="py-2 font-medium">Liters</th>
                </tr>
              </thead>
              <tbody className="text-bark-700">
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">6&Prime;</th>
                  <td className="py-2 pr-4">5&Prime;</td>
                  <td className="py-2 pr-4">0.08</td>
                  <td className="py-2">2.3</td>
                </tr>
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">10&Prime;</th>
                  <td className="py-2 pr-4">7&Prime;</td>
                  <td className="py-2 pr-4">0.32</td>
                  <td className="py-2">9.0</td>
                </tr>
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">12&Prime;</th>
                  <td className="py-2 pr-4">8&Prime;</td>
                  <td className="py-2 pr-4">0.52</td>
                  <td className="py-2">14.8</td>
                </tr>
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">16&Prime;</th>
                  <td className="py-2 pr-4">10&Prime;</td>
                  <td className="py-2 pr-4">1.16</td>
                  <td className="py-2">32.9</td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">20&Prime;</th>
                  <td className="py-2 pr-4">12&Prime;</td>
                  <td className="py-2 pr-4">2.18</td>
                  <td className="py-2">61.8</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Common raised bed reference */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-xs font-medium uppercase tracking-wider text-bark-400">
                Common raised bed sizes — soil volume needed
              </caption>
              <thead>
                <tr className="border-b border-moss-100 text-bark-500">
                  <th scope="col" className="py-2 pr-4 font-medium">Bed size</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Fill depth</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Cubic feet</th>
                  <th scope="col" className="py-2 font-medium">Cubic yards</th>
                </tr>
              </thead>
              <tbody className="text-bark-700">
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">4 &times; 4 ft</th>
                  <td className="py-2 pr-4">6&Prime;</td>
                  <td className="py-2 pr-4">8.0</td>
                  <td className="py-2">0.30</td>
                </tr>
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">4 &times; 8 ft</th>
                  <td className="py-2 pr-4">6&Prime;</td>
                  <td className="py-2 pr-4">16.0</td>
                  <td className="py-2">0.59</td>
                </tr>
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">4 &times; 8 ft</th>
                  <td className="py-2 pr-4">10&Prime;</td>
                  <td className="py-2 pr-4">26.7</td>
                  <td className="py-2">0.99</td>
                </tr>
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">4 &times; 12 ft</th>
                  <td className="py-2 pr-4">10&Prime;</td>
                  <td className="py-2 pr-4">40.0</td>
                  <td className="py-2">1.48</td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">8 &times; 8 ft</th>
                  <td className="py-2 pr-4">8&Prime;</td>
                  <td className="py-2 pr-4">42.7</td>
                  <td className="py-2">1.58</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
