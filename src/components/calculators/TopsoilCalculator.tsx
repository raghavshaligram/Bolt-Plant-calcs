import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type InputMode = 'dimensions' | 'area';
type UnitSystem = 'imperial' | 'metric';
type UseCase = 'fill-bed' | 'topdress-lawn';

const STORAGE_KEY = 'topsoil-calculator-state-v1';

// Average weight of topsoil: ~1.2 US tons per cubic yard (loose, moist).
const TONS_PER_CUBIC_YARD = 1.2;

interface SavedState {
  mode: InputMode;
  unitSystem: UnitSystem;
  useCase: UseCase;
  length: string;
  width: string;
  area: string;
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
const SQM_TO_SQFT = 10.7639;

export default function TopsoilCalculator() {
  const saved = useRef<Partial<SavedState>>({});
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<InputMode>('dimensions');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [useCase, setUseCase] = useState<UseCase>('fill-bed');
  const [length, setLength] = useState<string>('10');
  const [width, setWidth] = useState<string>('10');
  const [area, setArea] = useState<string>('100');
  const [depth, setDepth] = useState<string>('4');

  useEffect(() => {
    const s = loadSavedState();
    saved.current = s;
    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.useCase) setUseCase(s.useCase);
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.area !== undefined) setArea(s.area);
    if (s.depth !== undefined) setDepth(s.depth);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ mode, unitSystem, useCase, length, width, area, depth });
  }, [mode, unitSystem, useCase, length, width, area, depth]);

  // When the use case changes, set a sensible default depth (in the current unit system).
  const prevUseCase = useRef<UseCase>(useCase);
  useEffect(() => {
    if (!hasLoaded.current) return;
    if (prevUseCase.current === useCase) return;
    prevUseCase.current = useCase;
    if (useCase === 'fill-bed') {
      setDepth(unitSystem === 'metric' ? '25' : '10');
    } else {
      setDepth(unitSystem === 'metric' ? '1' : '0.375');
    }
  }, [useCase, unitSystem]);

  const result = useMemo(() => {
    let sqft = 0;
    if (mode === 'dimensions') {
      let l = parseFloat(length);
      let w = parseFloat(width);
      if (unitSystem === 'metric') {
        l = Number.isFinite(l) ? l * M_TO_FT : 0;
        w = Number.isFinite(w) ? w * M_TO_FT : 0;
      }
      sqft = Number.isFinite(l) && Number.isFinite(w) ? l * w : 0;
    } else {
      let a = parseFloat(area);
      if (unitSystem === 'metric') {
        a = Number.isFinite(a) ? a * SQM_TO_SQFT : 0;
      }
      sqft = Number.isFinite(a) ? a : 0;
    }

    let depthIn = parseFloat(depth);
    if (unitSystem === 'metric') {
      depthIn = Number.isFinite(depthIn) ? depthIn * CM_TO_IN : 0;
    }
    const depthFt = Number.isFinite(depthIn) ? depthIn / 12 : 0;
    const cubicFeet = Math.max(0, sqft * depthFt);
    const cubicYards = cubicFeet / 27;
    const cubicMeters = cubicFeet * 0.0283168;
    const tons = cubicYards * TONS_PER_CUBIC_YARD;
    const bags40lb = Math.ceil(cubicFeet / 0.75);

    return { sqft, cubicFeet, cubicYards, cubicMeters, tons, bags40lb, depthIn };
  }, [mode, unitSystem, length, width, area, depth]);

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
    doc.text('Topsoil Calculator Results', margin, y);
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
    const inputLines: string[] = [];
    inputLines.push(`Use case: ${useCase === 'fill-bed' ? 'Fill a raised bed' : 'Topdress / level a lawn'}`);
    if (mode === 'dimensions') {
      inputLines.push(`Length: ${length || 0} ${lengthUnit}`);
      inputLines.push(`Width: ${width || 0} ${lengthUnit}`);
    } else {
      inputLines.push(`Total area: ${area || 0} ${areaUnit}`);
    }
    inputLines.push(`Depth: ${depth || 0} ${depthUnit}`);
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
      `Estimated weight: ~${round(result.tons, 2).toLocaleString()} tons (approximate)`,
      `40 lb bags: ~${result.bags40lb.toLocaleString()} bags (avg. 0.75 cu ft/bag)`,
    ];
    resultLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Weight is an approximate estimate based on ~1.2 tons per cubic yard.',
      margin, y,
    );
    y += 12;
    doc.text(
      'Actual weight varies with moisture content and soil composition.',
      margin, y,
    );

    doc.save('topsoil-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header */}
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Calculate Your Topsoil Needs
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Use case toggle + unit system toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">What are you doing?</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={useCase === 'fill-bed'}
                  onClick={() => setUseCase('fill-bed')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    useCase === 'fill-bed'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Fill a bed
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={useCase === 'topdress-lawn'}
                  onClick={() => setUseCase('topdress-lawn')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    useCase === 'topdress-lawn'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Topdress a lawn
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

          {/* Area input mode toggle */}
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

          {/* Inputs */}
          <div className="grid gap-4 sm:grid-cols-2">
            {mode === 'dimensions' ? (
              <>
                <div>
                  <label htmlFor="topsoil-length" className="label-field">
                    Length <span className="text-bark-500">({lengthUnit})</span>
                  </label>
                  <input
                    id="topsoil-length"
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
                  <label htmlFor="topsoil-width" className="label-field">
                    Width <span className="text-bark-500">({lengthUnit})</span>
                  </label>
                  <input
                    id="topsoil-width"
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
                <label htmlFor="topsoil-area" className="label-field">
                  Total area <span className="text-bark-500">({areaUnit})</span>
                </label>
                <input
                  id="topsoil-area"
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
              <label htmlFor="topsoil-depth" className="label-field">
                Desired depth <span className="text-bark-500">({depthUnit})</span>
              </label>
              <input
                id="topsoil-depth"
                type="number"
                inputMode="decimal"
                min="0"
                step={useCase === 'fill-bed' ? '1' : '0.125'}
                value={depth}
                onChange={handleNumericChange(setDepth)}
                className="input-field mt-1.5"
              />
              <p className="mt-1.5 text-xs text-bark-500">
                {useCase === 'fill-bed'
                  ? (isMetric ? '20–30 cm is typical for raised beds.' : '8–12″ is typical for raised beds.')
                  : (isMetric ? '0.5–1 cm is typical for topdressing a lawn.' : '0.25–0.5″ is typical for topdressing a lawn.')}
              </p>
            </div>
          </div>

          {/* Formula display */}
          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
              Cubic Feet = Length × Width × (Depth ÷ 12)
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Cubic Yards = Cubic Feet ÷ 27 &nbsp;·&nbsp; Tons ≈ Cubic Yards × 1.2
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Bags (40 lb) ≈ Cubic Feet ÷ 0.75
            </p>
          </div>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter an area and depth above to see how much topsoil you need.
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
                        cubic feet of topsoil
                        {isMetric && (
                          <span className="ml-1 text-bark-400">
                            ({round(result.cubicMeters, 2)} m³)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: tons + cubic yards */}
                  <div className="bg-moss-700 p-4 sm:p-5">
                    <p className="text-xs text-moss-200">That's about</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      ~{round(result.tons, 2).toLocaleString()} tons
                    </p>
                    <p className="text-xs text-moss-200">
                      ({round(result.cubicYards, 2)} cu yd)
                    </p>
                    <p className="mt-1 text-xs text-moss-300">
                      Weight is approximate
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-moss-200 px-4 py-3 sm:px-5">
                  <div>
                    <p className="text-xs text-bark-500">Also approximately</p>
                    <p className="font-display text-2xl font-bold text-moss-700">
                      ~{result.bags40lb.toLocaleString()}
                    </p>
                    <p className="text-xs font-medium text-bark-600">
                      bags of topsoil (40 lb){' '}
                      <span className="font-normal text-bark-400">avg. 0.75 cu ft/bag</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    For {round(result.sqft, 1).toLocaleString()} sq ft at {round(result.depthIn, 2)}&Prime; deep.
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
                Quick topsoil unit conversions
              </caption>
              <thead>
                <tr className="border-b border-moss-100 text-bark-500">
                  <th scope="col" className="py-2 pr-4 font-medium">1 unit</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Cubic feet</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Cubic yards</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Cubic meters</th>
                  <th scope="col" className="py-2 font-medium">Est. tons</th>
                </tr>
              </thead>
              <tbody className="text-bark-700">
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1 cubic yard</th>
                  <td className="py-2 pr-4">27</td>
                  <td className="py-2 pr-4">1</td>
                  <td className="py-2 pr-4">0.765</td>
                  <td className="py-2">~1.2</td>
                </tr>
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1 cubic meter</th>
                  <td className="py-2 pr-4">35.3</td>
                  <td className="py-2 pr-4">1.308</td>
                  <td className="py-2 pr-4">1</td>
                  <td className="py-2">~1.57</td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1 ton (approx.)</th>
                  <td className="py-2 pr-4">22.5</td>
                  <td className="py-2 pr-4">0.83</td>
                  <td className="py-2 pr-4">0.64</td>
                  <td className="py-2">1</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Depth guidelines table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-xs font-medium uppercase tracking-wider text-bark-400">
                Topsoil depth guidelines by project
              </caption>
              <thead>
                <tr className="border-b border-moss-100 text-bark-500">
                  <th scope="col" className="py-2 pr-4 font-medium">Project</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Typical depth</th>
                  <th scope="col" className="py-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="text-bark-700">
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">New raised bed</th>
                  <td className="py-2 pr-4">8–12″</td>
                  <td className="py-2">Fill to within 1–2″ of the rim.</td>
                </tr>
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">New lawn (from scratch)</th>
                  <td className="py-2 pr-4">4–6″</td>
                  <td className="py-2">Spread before seeding or sodding.</td>
                </tr>
                <tr className="border-b border-moss-50">
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">Topdress existing lawn</th>
                  <td className="py-2 pr-4">0.25–0.5″</td>
                  <td className="py-2">Thin layer, raked level. Don&rsquo;t smother grass.</td>
                </tr>
                <tr>
                  <th scope="row" className="py-2 pr-4 font-medium text-bark-800">Level low spots</th>
                  <td className="py-2 pr-4">0.5–2″</td>
                  <td className="py-2">Build up gradually; let grass grow through.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
