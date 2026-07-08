import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type UnitSystem = 'imperial' | 'metric';
type BagSize = '1.5' | '2';

// Preset bed sizes in feet (length × width) — depth auto-filled separately.
type Preset = { label: string; length: string; width: string };

const PRESETS: Preset[] = [
  { label: '4×4', length: '4', width: '4' },
  { label: '4×8', length: '4', width: '8' },
  { label: '4×2', length: '4', width: '2' },
  { label: 'Custom', length: '', width: '' },
];

const DEFAULT_DEPTH_IN = '10';
const DEFAULT_DEPTH_CM = '25';

// Weight estimate: ~40 lbs per 0.75 cu ft bag → ~53.3 lbs/cu ft → ~1,440 lbs/cu yd
// Expressed as lbs per cubic foot for the weight calc.
const LBS_PER_CU_FT = 40 / 0.75; // ≈ 53.33 lbs/cu ft (labeled as approximate)

const STORAGE_KEY = 'raised-bed-soil-calculator-state-v1';

interface SavedState {
  unitSystem: UnitSystem;
  presetIndex: number;
  length: string;
  width: string;
  depth: string;
  bagSize: BagSize;
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
  if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
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
    // localStorage unavailable — fail silently.
  }
}

const M_TO_FT = 3.28084;
const CM_TO_IN = 0.393701;

export default function RaisedBedSoilCalculator() {
  const hasLoaded = useRef(false);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [presetIndex, setPresetIndex] = useState<number>(1); // 4×8 default
  const [length, setLength] = useState<string>('4');
  const [width, setWidth] = useState<string>('8');
  const [depth, setDepth] = useState<string>(DEFAULT_DEPTH_IN);
  const [bagSize, setBagSize] = useState<BagSize>('1.5');

  useEffect(() => {
    const s = loadSavedState();
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.presetIndex !== undefined && s.presetIndex >= 0 && s.presetIndex < PRESETS.length) {
      setPresetIndex(s.presetIndex);
    }
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.depth !== undefined) setDepth(s.depth);
    if (s.bagSize) setBagSize(s.bagSize);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ unitSystem, presetIndex, length, width, depth, bagSize });
  }, [unitSystem, presetIndex, length, width, depth, bagSize]);

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';
  const depthUnit = isMetric ? 'cm' : 'in';

  const handlePreset = (idx: number) => {
    setPresetIndex(idx);
    const preset = PRESETS[idx];
    if (preset.label !== 'Custom') {
      // Preset values are always in feet; convert to metric if needed.
      if (isMetric) {
        const toM = (v: string) => v ? round(parseFloat(v) / M_TO_FT, 2).toString() : '';
        setLength(toM(preset.length));
        setWidth(toM(preset.width));
      } else {
        setLength(preset.length);
        setWidth(preset.width);
      }
    }
  };

  // When unit system changes, convert current values.
  const prevUnit = useRef<UnitSystem>(unitSystem);
  useEffect(() => {
    if (!hasLoaded.current) return;
    if (prevUnit.current === unitSystem) return;
    prevUnit.current = unitSystem;
    if (isMetric) {
      // ft → m for dimensions
      const toM = (v: string) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? round(n / M_TO_FT, 2).toString() : '';
      };
      setLength(toM(length));
      setWidth(toM(width));
      // in → cm for depth
      const depIn = parseFloat(depth);
      setDepth(Number.isFinite(depIn) ? round(depIn / CM_TO_IN, 1).toString() : DEFAULT_DEPTH_CM);
    } else {
      // m → ft
      const toFt = (v: string) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? round(n * M_TO_FT, 2).toString() : '';
      };
      setLength(toFt(length));
      setWidth(toFt(width));
      // cm → in
      const depCm = parseFloat(depth);
      setDepth(Number.isFinite(depCm) ? round(depCm * CM_TO_IN, 1).toString() : DEFAULT_DEPTH_IN);
    }
  }, [unitSystem]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNumericChange = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(sanitizeNumericInput(e.target.value));
    };

  const handleLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPresetIndex(3); // switch to Custom
    handleNumericChange(setLength)(e);
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPresetIndex(3); // switch to Custom
    handleNumericChange(setWidth)(e);
  };

  const result = useMemo(() => {
    let l = parseFloat(length);
    let w = parseFloat(width);
    let depthRaw = parseFloat(depth);

    if (!Number.isFinite(l)) l = 0;
    if (!Number.isFinite(w)) w = 0;
    if (!Number.isFinite(depthRaw)) depthRaw = 0;

    // Convert to feet / inches.
    if (isMetric) {
      l = l * M_TO_FT;
      w = w * M_TO_FT;
      depthRaw = depthRaw * CM_TO_IN; // cm → in
    }

    const depthFt = depthRaw / 12;
    const cubicFeet = Math.max(0, l * w * depthFt);
    const cubicYards = cubicFeet / 27;
    const bagSizeNum = parseFloat(bagSize);
    const bags = cubicFeet > 0 ? Math.ceil(cubicFeet / bagSizeNum) : 0;
    const weightLbs = cubicFeet * LBS_PER_CU_FT;

    return { cubicFeet, cubicYards, bags, weightLbs, depthIn: depthRaw, sqft: l * w };
  }, [unitSystem, length, width, depth, bagSize, isMetric]);

  const hasResult = result.cubicFeet > 0;

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Raised Bed Soil Calculator Results', margin, y);
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
    [
      `Length: ${length || 0} ${lengthUnit}`,
      `Width: ${width || 0} ${lengthUnit}`,
      `Depth: ${depth || 0} ${depthUnit}`,
      `Bag size: ${bagSize} cu ft`,
    ].forEach((line) => { doc.text(line, margin, y); y += 16; });

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Results', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    [
      `Cubic feet: ${round(result.cubicFeet, 1).toLocaleString()} cu ft`,
      `Cubic yards: ${round(result.cubicYards, 2).toLocaleString()} cu yd`,
      `Bags (${bagSize} cu ft): ~${result.bags.toLocaleString()} bags`,
      `Estimated weight: ~${Math.round(result.weightLbs).toLocaleString()} lbs (approximate)`,
    ].forEach((line) => { doc.text(line, margin, y); y += 16; });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Weight estimated at ~40 lbs per 0.75 cu ft bag. Actual weight varies by soil moisture and mix.', margin, y);

    doc.save('raised-bed-soil-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header */}
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Calculate Your Raised Bed Soil
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Preset buttons + unit toggle row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="label-field">Common bed sizes</span>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Bed size presets">
                {PRESETS.map((preset, idx) => (
                  <button
                    key={preset.label}
                    type="button"
                    aria-pressed={presetIndex === idx}
                    onClick={() => handlePreset(idx)}
                    className={`rounded-lg px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition ${
                      presetIndex === idx
                        ? 'bg-moss-700 text-white ring-moss-700'
                        : 'bg-white text-bark-700 ring-moss-200 hover:bg-moss-50 hover:text-moss-800'
                    }`}
                  >
                    {preset.label === 'Custom' ? 'Custom' : (
                      <>
                        {preset.label}
                        {' '}
                        <span className="text-xs opacity-70">ft</span>
                      </>
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-bark-400">
                Select a size to auto-fill length &amp; width, or enter custom dimensions below.
              </p>
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

          {/* Dimension inputs */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="rb-length" className="label-field">
                Length <span className="text-bark-500">({lengthUnit})</span>
              </label>
              <input
                id="rb-length"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={length}
                onChange={handleLengthChange}
                className="input-field mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="rb-width" className="label-field">
                Width <span className="text-bark-500">({lengthUnit})</span>
              </label>
              <input
                id="rb-width"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={width}
                onChange={handleWidthChange}
                className="input-field mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="rb-depth" className="label-field">
                Fill depth <span className="text-bark-500">({depthUnit})</span>
              </label>
              <input
                id="rb-depth"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={depth}
                onChange={handleNumericChange(setDepth)}
                className="input-field mt-1.5"
              />
              <p className="mt-1.5 text-xs text-bark-500">
                {isMetric ? '20–30 cm is typical.' : '8–12″ is typical.'}
              </p>
            </div>
          </div>

          {/* Bag size selector */}
          <div>
            <span className="label-field">Bag size</span>
            <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Bag size">
              <button
                type="button"
                aria-pressed={bagSize === '1.5'}
                onClick={() => setBagSize('1.5')}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                  bagSize === '1.5' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                1.5 cu ft
              </button>
              <button
                type="button"
                aria-pressed={bagSize === '2'}
                onClick={() => setBagSize('2')}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                  bagSize === '2' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                2 cu ft
              </button>
            </div>
          </div>

          {/* Formula display */}
          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
              Cubic Feet = Length × Width × (Depth ÷ 12)
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Cubic Yards = Cubic Feet ÷ 27
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Bags = ⌈ Cubic Feet ÷ Bag Size ⌉ &nbsp;·&nbsp; Weight ≈ Cubic Feet × 53.3 lbs
            </p>
          </div>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your bed dimensions and depth above to see how much soil you need.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  {/* Left: cubic feet */}
                  <div className="flex items-start gap-3 p-4 sm:p-5">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
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
                      <p className="text-xs font-medium text-bark-600">cubic feet of soil</p>
                      <p className="mt-0.5 text-xs text-bark-400">
                        ({round(result.cubicYards, 2)} cu yd)
                      </p>
                    </div>
                  </div>

                  {/* Right: bags */}
                  <div className="bg-moss-700 p-4 sm:p-5">
                    <p className="text-xs text-moss-200">That&apos;s about</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      ~{result.bags.toLocaleString()}
                    </p>
                    <p className="text-xs text-moss-200">
                      {bagSize} cu ft bags
                    </p>
                  </div>
                </div>

                {/* Weight estimate */}
                <div className="flex items-center gap-3 border-t border-moss-200 px-4 py-3 sm:px-5">
                  <div>
                    <p className="text-xs text-bark-500">Estimated weight</p>
                    <p className="font-display text-xl font-bold text-moss-700">
                      ~{Math.round(result.weightLbs).toLocaleString()} lbs
                    </p>
                    <p className="text-xs text-bark-400">
                      Based on ~40 lbs per 0.75 cu ft bag. Varies with soil moisture and mix.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    For {round(result.sqft, 1)} sq ft at {round(result.depthIn, 1)}&Prime; deep.
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

          {/* Comparison table: 1.5 cu ft vs 2 cu ft bags */}
          {hasResult && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="mb-2 text-xs font-medium uppercase tracking-wider text-bark-400">
                  Bag count comparison
                </caption>
                <thead>
                  <tr className="border-b border-moss-100 text-bark-500">
                    <th scope="col" className="py-2 pr-4 font-medium">Bag size</th>
                    <th scope="col" className="py-2 pr-4 font-medium">Bags needed</th>
                    <th scope="col" className="py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-bark-700">
                  <tr className="border-b border-moss-50">
                    <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1.5 cu ft bag</th>
                    <td className="py-2 pr-4">~{Math.ceil(result.cubicFeet / 1.5)}</td>
                    <td className="py-2 text-bark-500">Common at hardware stores</td>
                  </tr>
                  <tr>
                    <th scope="row" className="py-2 pr-4 font-medium text-bark-800">2 cu ft bag</th>
                    <td className="py-2 pr-4">~{Math.ceil(result.cubicFeet / 2)}</td>
                    <td className="py-2 text-bark-500">Fewer bags, heavier to carry</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Unit conversion reference table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-xs font-medium uppercase tracking-wider text-bark-400">
                Soil volume unit conversions
              </caption>
              <thead>
                <tr className="border-b border-moss-100 text-bark-500">
                  <th scope="col" className="py-2 pr-4 font-medium">1 unit</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Cubic feet</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Cubic yards</th>
                  <th scope="col" className="py-2 font-medium">1.5 cu ft bags</th>
                </tr>
              </thead>
              <tbody className="text-bark-700">
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1 cubic yard</th>
                  <td className="py-2 pr-4">27</td>
                  <td className="py-2 pr-4">1</td>
                  <td className="py-2">18</td>
                </tr>
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1.5 cu ft bag</th>
                  <td className="py-2 pr-4">1.5</td>
                  <td className="py-2 pr-4">0.056</td>
                  <td className="py-2">1</td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">2 cu ft bag</th>
                  <td className="py-2 pr-4">2</td>
                  <td className="py-2 pr-4">0.074</td>
                  <td className="py-2">1.33</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
