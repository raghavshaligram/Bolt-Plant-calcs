import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type InputMode = 'dimensions' | 'sqft' | 'acres';
type UnitSystem = 'imperial' | 'metric';
type SeedingMode = 'new-lawn' | 'overseeding';

const STORAGE_KEY = 'grass-seed-calculator-state-v1';

interface GrassPreset {
  name: string;
  /** lb of seed per 1,000 sq ft for a brand-new lawn from bare soil. */
  newLawnRate: number;
  /** lb of seed per 1,000 sq ft when overseeding an existing lawn. */
  overseedRate: number;
}

// Seeding rates are commonly published midpoints from university turfgrass
// extension guidance (Penn State, Purdue, Clemson HGIC, and similar). Actual
// label rates vary by cultivar/blend — always check the bag.
const GRASS_PRESETS: GrassPreset[] = [
  { name: 'Kentucky Bluegrass', newLawnRate: 2, overseedRate: 1 },
  { name: 'Tall Fescue', newLawnRate: 7, overseedRate: 3.5 },
  { name: 'Perennial Ryegrass', newLawnRate: 8, overseedRate: 4 },
  { name: 'Fine Fescue', newLawnRate: 5, overseedRate: 2.5 },
  { name: 'Bermuda (hulled)', newLawnRate: 2, overseedRate: 1 },
  { name: 'Zoysia', newLawnRate: 1.5, overseedRate: 0.75 },
];

const BAG_SIZE_LB = 50;
const SQFT_PER_ACRE = 43560;

interface SavedState {
  mode: InputMode;
  unitSystem: UnitSystem;
  seedingMode: SeedingMode;
  grass: string;
  length: string;
  width: string;
  sqft: string;
  acres: string;
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
const SQM_TO_SQFT = 10.7639;
const HECTARE_TO_SQFT = 107639;
const LB_TO_KG = 0.453592;

export default function GrassSeedCalculator() {
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<InputMode>('sqft');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [seedingMode, setSeedingMode] = useState<SeedingMode>('new-lawn');
  const [grass, setGrass] = useState<string>('Tall Fescue');
  const [length, setLength] = useState<string>('50');
  const [width, setWidth] = useState<string>('100');
  const [sqft, setSqft] = useState<string>('5000');
  const [acres, setAcres] = useState<string>('1');

  useEffect(() => {
    const s = loadSavedState();
    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.seedingMode) setSeedingMode(s.seedingMode);
    if (s.grass) setGrass(s.grass);
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.sqft !== undefined) setSqft(s.sqft);
    if (s.acres !== undefined) setAcres(s.acres);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ mode, unitSystem, seedingMode, grass, length, width, sqft, acres });
  }, [mode, unitSystem, seedingMode, grass, length, width, sqft, acres]);

  const preset = useMemo(
    () => GRASS_PRESETS.find((p) => p.name === grass) ?? GRASS_PRESETS[0],
    [grass],
  );

  const ratePer1000 = seedingMode === 'new-lawn' ? preset.newLawnRate : preset.overseedRate;

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';
  const areaUnit = isMetric ? 'm²' : 'sq ft';
  const bigAreaLabel = isMetric ? 'Hectares' : 'Acres';
  const bigAreaUnit = isMetric ? 'ha' : 'acres';

  const handleNumericChange = (
    setter: (v: string) => void,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = enforceNonNegative(sanitizeNumericInput(e.target.value));
    setter(cleaned);
  };

  const result = useMemo(() => {
    let totalSqft = 0;

    if (mode === 'dimensions') {
      let l = parseFloat(length);
      let w = parseFloat(width);
      if (isMetric) {
        l = Number.isFinite(l) ? l * M_TO_FT : 0;
        w = Number.isFinite(w) ? w * M_TO_FT : 0;
      }
      totalSqft = Number.isFinite(l) && Number.isFinite(w) ? l * w : 0;
    } else if (mode === 'sqft') {
      let a = parseFloat(sqft);
      if (isMetric) {
        a = Number.isFinite(a) ? a * SQM_TO_SQFT : 0;
      }
      totalSqft = Number.isFinite(a) ? a : 0;
    } else {
      let a = parseFloat(acres);
      if (isMetric) {
        totalSqft = Number.isFinite(a) ? a * HECTARE_TO_SQFT : 0;
      } else {
        totalSqft = Number.isFinite(a) ? a * SQFT_PER_ACRE : 0;
      }
    }

    totalSqft = Math.max(0, totalSqft);

    const totalLb = (totalSqft / 1000) * ratePer1000;
    const bags = Math.ceil(totalLb / BAG_SIZE_LB || 0);
    const ratePerAcre = ratePer1000 * (SQFT_PER_ACRE / 1000);
    const bagsPerAcre = ratePerAcre / BAG_SIZE_LB;
    const totalKg = totalLb * LB_TO_KG;
    const acresEquivalent = totalSqft / SQFT_PER_ACRE;

    return { totalSqft, totalLb, bags, ratePerAcre, bagsPerAcre, totalKg, acresEquivalent };
  }, [mode, isMetric, length, width, sqft, acres, ratePer1000]);

  const hasResult = result.totalSqft > 0;

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Grass Seed Calculator Results', margin, y);
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
    inputLines.push(`Grass type: ${grass}`);
    inputLines.push(`Mode: ${seedingMode === 'new-lawn' ? 'New lawn' : 'Overseeding'}`);
    if (mode === 'dimensions') {
      inputLines.push(`Length: ${length || 0} ${lengthUnit}`);
      inputLines.push(`Width: ${width || 0} ${lengthUnit}`);
    } else if (mode === 'sqft') {
      inputLines.push(`Total area: ${sqft || 0} ${areaUnit}`);
    } else {
      inputLines.push(`Total area: ${acres || 0} ${bigAreaUnit}`);
    }
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
      `Area: ${round(result.totalSqft, 0).toLocaleString()} sq ft (${round(result.acresEquivalent, 3)} acres)`,
      `Seeding rate: ${ratePer1000} lb per 1,000 sq ft`,
      `Total seed needed: ${round(result.totalLb, 1).toLocaleString()} lb (${round(result.totalKg, 1)} kg)`,
      `50 lb bags: ${result.bags.toLocaleString()} bags`,
      `Rate per acre: ${round(result.ratePerAcre, 1).toLocaleString()} lb/acre (~${round(result.bagsPerAcre, 1)} bags/acre)`,
    ];
    resultLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Rates are general midpoints from university turfgrass extension guidance.',
      margin, y,
    );
    y += 12;
    doc.text(
      'Always check the seed label — cultivar and blend can shift the recommended rate.',
      margin, y,
    );

    doc.save('grass-seed-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header */}
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Calculate Your Grass Seed Needs
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Seeding mode toggle + unit system toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">What are you doing?</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={seedingMode === 'new-lawn'}
                  onClick={() => setSeedingMode('new-lawn')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    seedingMode === 'new-lawn'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  New lawn
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={seedingMode === 'overseeding'}
                  onClick={() => setSeedingMode('overseeding')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    seedingMode === 'overseeding'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Overseeding
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
                  Imperial (ft, lb)
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
                  Metric (m, kg)
                </button>
              </div>
            </div>
          </div>

          {/* Grass type selector */}
          <div>
            <label htmlFor="gsc-grass" className="label-field">Grass type</label>
            <select
              id="gsc-grass"
              value={grass}
              onChange={(e) => setGrass(e.target.value)}
              className="input-field mt-1.5"
            >
              {GRASS_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-bark-500">
              Recommended rate: {ratePer1000} lb per 1,000 sq ft for {seedingMode === 'new-lawn' ? 'a new lawn' : 'overseeding'}.
            </p>
          </div>

          {/* Area input mode toggle */}
          <div>
            <span className="label-field">How do you want to enter your area?</span>
            <div className="mt-2 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist">
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
                aria-selected={mode === 'sqft'}
                onClick={() => setMode('sqft')}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                  mode === 'sqft'
                    ? 'bg-white text-moss-800 shadow-sm'
                    : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                Total {areaUnit}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'acres'}
                onClick={() => setMode('acres')}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                  mode === 'acres'
                    ? 'bg-white text-moss-800 shadow-sm'
                    : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                {bigAreaLabel}
              </button>
            </div>
          </div>

          {/* Inputs */}
          <div className="grid gap-4 sm:grid-cols-2">
            {mode === 'dimensions' && (
              <>
                <div>
                  <label htmlFor="gsc-length" className="label-field">
                    Length <span className="text-bark-500">({lengthUnit})</span>
                  </label>
                  <input
                    id="gsc-length"
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
                  <label htmlFor="gsc-width" className="label-field">
                    Width <span className="text-bark-500">({lengthUnit})</span>
                  </label>
                  <input
                    id="gsc-width"
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
            )}

            {mode === 'sqft' && (
              <div className="sm:col-span-2">
                <label htmlFor="gsc-sqft" className="label-field">
                  Total area <span className="text-bark-500">({areaUnit})</span>
                </label>
                <input
                  id="gsc-sqft"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={sqft}
                  onChange={handleNumericChange(setSqft)}
                  className="input-field mt-1.5"
                />
              </div>
            )}

            {mode === 'acres' && (
              <div className="sm:col-span-2">
                <label htmlFor="gsc-acres" className="label-field">
                  Total area <span className="text-bark-500">({bigAreaUnit})</span>
                </label>
                <input
                  id="gsc-acres"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={acres}
                  onChange={handleNumericChange(setAcres)}
                  className="input-field mt-1.5"
                />
              </div>
            )}
          </div>

          {/* Formula display */}
          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
              Seed (lb) = (Area &divide; 1,000) &times; Rate per 1,000 sq ft
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              50 lb Bags = Seed (lb) &divide; 50, rounded up
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Rate per Acre = Rate per 1,000 sq ft &times; 43.56
            </p>
          </div>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your lawn area above to see how much grass seed you need.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  {/* Left: total pounds */}
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
                        {round(result.totalLb, 1).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        lb of {grass.toLowerCase()} seed
                        {isMetric && (
                          <span className="ml-1 text-bark-400">
                            ({round(result.totalKg, 1)} kg)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: bags */}
                  <div className="bg-moss-700 p-4 sm:p-5">
                    <p className="text-xs text-moss-200">That&rsquo;s about</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {result.bags.toLocaleString()} {result.bags === 1 ? 'bag' : 'bags'}
                    </p>
                    <p className="text-xs text-moss-200">
                      (50 lb bags)
                    </p>
                    <p className="mt-1 text-xs text-moss-300">
                      For {round(result.totalSqft, 0).toLocaleString()} sq ft
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-moss-200 px-4 py-3 sm:px-5">
                  <div>
                    <p className="text-xs text-bark-500">Rate per 1,000 sq ft / per acre</p>
                    <p className="font-display text-lg font-bold text-moss-700">
                      {ratePer1000} lb <span className="text-sm font-medium text-bark-500">per 1,000 sq ft</span>
                    </p>
                    <p className="text-xs font-medium text-bark-600">
                      &asymp; {round(result.ratePerAcre, 1).toLocaleString()} lb/acre{' '}
                      <span className="font-normal text-bark-400">
                        (~{round(result.bagsPerAcre, 1)} bags of 50 lb per acre)
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    Buy a little extra for edges and touch-ups &mdash; seed keeps if stored cool and dry.
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

          {/* Seeding rate reference table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-xs font-medium uppercase tracking-wider text-bark-400">
                Grass seed rate reference by type
              </caption>
              <thead>
                <tr className="border-b border-moss-100 text-bark-500">
                  <th scope="col" className="py-2 pr-4 font-medium">Grass type</th>
                  <th scope="col" className="py-2 pr-4 font-medium">New lawn (lb/1,000 sq ft)</th>
                  <th scope="col" className="py-2 font-medium">Overseeding (lb/1,000 sq ft)</th>
                </tr>
              </thead>
              <tbody className="text-bark-700">
                {GRASS_PRESETS.map((p) => (
                  <tr key={p.name} className={`border-b border-moss-50 ${p.name === grass ? 'bg-moss-50/60 font-semibold text-bark-900' : ''}`}>
                    <th scope="row" className="py-2 pr-4 font-medium text-bark-800">{p.name}</th>
                    <td className="py-2 pr-4">{p.newLawnRate}</td>
                    <td className="py-2">{p.overseedRate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
