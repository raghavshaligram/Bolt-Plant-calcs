import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type ShapeMode = 'rectangle' | 'circle' | 'triangle' | 'multi';
type UnitSystem = 'imperial' | 'metric';
type GrassType =
  | 'unsure'
  | 'bermuda'
  | 'zoysia'
  | 'st-augustine'
  | 'centipede'
  | 'tall-fescue'
  | 'kentucky-bluegrass'
  | 'ryegrass'
  | 'custom';
type WasteFactor = '5' | '10' | '15';

interface RectSection {
  length: string;
  width: string;
}

const STORAGE_KEY = 'sod-calculator-state-v1';

// Typical pallet coverage in sq ft by grass type. Warm-season grasses are
// cut as thicker slabs with more soil attached (their stolon/rhizome root
// systems don't roll cleanly), so a pallet carries less area. Cool-season
// grasses are cut thinner and sold as rolls, so a pallet carries more.
// "Not sure" defaults to 450 sq ft, the Turfgrass Producers International
// industry-standard figure -- see the calculator page for sourcing.
const GRASS_COVERAGE: Record<Exclude<GrassType, 'custom'>, number> = {
  unsure: 450,
  bermuda: 400,
  zoysia: 400,
  'st-augustine': 450,
  centipede: 450,
  'tall-fescue': 500,
  'kentucky-bluegrass': 500,
  ryegrass: 600,
};

const GRASS_LABEL: Record<GrassType, string> = {
  unsure: 'Not sure / use industry standard',
  bermuda: 'Bermuda',
  zoysia: 'Zoysia',
  'st-augustine': 'St. Augustine',
  centipede: 'Centipede',
  'tall-fescue': 'Tall Fescue',
  'kentucky-bluegrass': 'Kentucky Bluegrass',
  ryegrass: 'Ryegrass',
  custom: "Custom — enter my supplier's coverage",
};

const GRASS_SOLD_AS: Record<GrassType, string> = {
  unsure: 'varies',
  bermuda: 'slabs',
  zoysia: 'slabs',
  'st-augustine': 'slabs',
  centipede: 'slabs',
  'tall-fescue': 'rolls',
  'kentucky-bluegrass': 'rolls',
  ryegrass: 'rolls',
  custom: 'varies',
};

// One piece is a standard 16" x 24" slab. 16 x 24 = 384 sq in = 2.667 sq ft
// exactly, but suppliers commonly quote pieces at roughly 2.75 sq ft to
// account for slightly oversized cuts -- we use that supplier-facing figure
// here rather than the bare geometric one.
const SQFT_PER_PIECE = 2.75;

function round(value: number, decimals = 1): number {
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

interface SavedState {
  shape: ShapeMode;
  unitSystem: UnitSystem;
  grassType: GrassType;
  customCoverage: string;
  wasteFactor: WasteFactor;
  length: string;
  width: string;
  radius: string;
  triBase: string;
  triHeight: string;
  sections: RectSection[];
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

export default function SodCalculator() {
  const hasLoaded = useRef(false);

  const [shape, setShape] = useState<ShapeMode>('rectangle');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [grassType, setGrassType] = useState<GrassType>('unsure');
  const [customCoverage, setCustomCoverage] = useState<string>('450');
  const [wasteFactor, setWasteFactor] = useState<WasteFactor>('10');

  const [length, setLength] = useState<string>('40');
  const [width, setWidth] = useState<string>('25');
  const [radius, setRadius] = useState<string>('15');
  const [triBase, setTriBase] = useState<string>('30');
  const [triHeight, setTriHeight] = useState<string>('20');
  const [sections, setSections] = useState<RectSection[]>([
    { length: '20', width: '15' },
    { length: '10', width: '8' },
  ]);

  useEffect(() => {
    const s = loadSavedState();
    if (s.shape) setShape(s.shape);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.grassType) setGrassType(s.grassType);
    if (s.customCoverage !== undefined) setCustomCoverage(s.customCoverage);
    if (s.wasteFactor) setWasteFactor(s.wasteFactor);
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.radius !== undefined) setRadius(s.radius);
    if (s.triBase !== undefined) setTriBase(s.triBase);
    if (s.triHeight !== undefined) setTriHeight(s.triHeight);
    if (s.sections && Array.isArray(s.sections) && s.sections.length > 0) setSections(s.sections);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({
      shape, unitSystem, grassType, customCoverage, wasteFactor,
      length, width, radius, triBase, triHeight, sections,
    });
  }, [shape, unitSystem, grassType, customCoverage, wasteFactor, length, width, radius, triBase, triHeight, sections]);

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';

  const handleNumericChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
  };

  const updateSection = (index: number, field: keyof RectSection, value: string) => {
    const cleaned = enforceNonNegative(sanitizeNumericInput(value));
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: cleaned } : s)));
  };

  const addSection = () => {
    setSections((prev) => [...prev, { length: '', width: '' }]);
  };

  const removeSection = (index: number) => {
    setSections((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const result = useMemo(() => {
    const toFt = (v: string) => {
      const n = parseFloat(v);
      if (!Number.isFinite(n)) return 0;
      return isMetric ? n * M_TO_FT : n;
    };

    let sqft = 0;
    if (shape === 'rectangle') {
      sqft = toFt(length) * toFt(width);
    } else if (shape === 'circle') {
      const r = toFt(radius);
      sqft = Math.PI * r * r;
    } else if (shape === 'triangle') {
      sqft = 0.5 * toFt(triBase) * toFt(triHeight);
    } else {
      sqft = sections.reduce((sum, s) => sum + toFt(s.length) * toFt(s.width), 0);
    }
    sqft = Math.max(0, sqft);

    const wastePct = parseFloat(wasteFactor) / 100;
    const sqftWithWaste = sqft * (1 + wastePct);

    const coverage = grassType === 'custom'
      ? parseFloat(customCoverage)
      : GRASS_COVERAGE[grassType];
    const validCoverage = Number.isFinite(coverage) && coverage > 0 ? coverage : 0;

    const pallets = validCoverage > 0 ? Math.ceil(sqftWithWaste / validCoverage) : 0;
    const pieces = sqftWithWaste > 0 ? Math.ceil(sqftWithWaste / SQFT_PER_PIECE) : 0;

    return { sqft, sqftWithWaste, coverage: validCoverage, pallets, pieces };
  }, [shape, unitSystem, length, width, radius, triBase, triHeight, sections, wasteFactor, grassType, customCoverage]);

  const hasResult = result.sqft > 0;
  const sqmWithWaste = result.sqftWithWaste / 10.7639;

  const soldAs = GRASS_SOLD_AS[grassType];

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Sod Calculator Results', margin, y);
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
    doc.text('Inputs', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const inputLines: string[] = [`Shape: ${shape[0].toUpperCase()}${shape.slice(1)}`];
    if (shape === 'rectangle') {
      inputLines.push(`Length: ${length || 0} ${lengthUnit}`, `Width: ${width || 0} ${lengthUnit}`);
    } else if (shape === 'circle') {
      inputLines.push(`Radius: ${radius || 0} ${lengthUnit}`);
    } else if (shape === 'triangle') {
      inputLines.push(`Base: ${triBase || 0} ${lengthUnit}`, `Height: ${triHeight || 0} ${lengthUnit}`);
    } else {
      sections.forEach((s, i) => inputLines.push(`Section ${i + 1}: ${s.length || 0} × ${s.width || 0} ${lengthUnit}`));
    }
    inputLines.push(`Grass type: ${GRASS_LABEL[grassType]}`);
    inputLines.push(`Pallet coverage: ${result.coverage || 0} sq ft`);
    inputLines.push(`Waste factor: ${wasteFactor}%`);
    inputLines.forEach((line) => { doc.text(line, margin, y); y += 16; });

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Results', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const resultLines: string[] = [
      `Area: ${round(result.sqft, 1).toLocaleString()} sq ft`,
      `Area with waste factor: ${round(result.sqftWithWaste, 1).toLocaleString()} sq ft`,
      `Pallets needed: ${result.pallets.toLocaleString()}`,
      `Individual pieces (approx.): ${result.pieces.toLocaleString()}`,
    ];
    resultLines.forEach((line) => { doc.text(line, margin, y); y += 16; });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Estimates only — confirm exact pallet coverage with your supplier before ordering.', margin, y);
    y += 12;
    doc.text('Pallet and piece counts are rounded up to whole units.', margin, y);

    doc.save('sod-calculator-results.pdf');
  };

  const shapeTabs: { id: ShapeMode; label: string }[] = [
    { id: 'rectangle', label: 'Rectangle' },
    { id: 'circle', label: 'Circle' },
    { id: 'triangle', label: 'Triangle' },
    { id: 'multi', label: 'Multiple Sections' },
  ];

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">Calculate How Much Sod You Need</h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Units */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">Lawn shape</span>
              <div className="mt-2 inline-flex flex-wrap rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Lawn shape">
                {shapeTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={shape === tab.id}
                    onClick={() => setShape(tab.id)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                      shape === tab.id ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
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
                  Imperial (ft)
                </button>
                <button
                  type="button"
                  aria-pressed={isMetric}
                  onClick={() => setUnitSystem('metric')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Metric (m)
                </button>
              </div>
            </div>
          </div>

          {/* Shape inputs */}
          {shape === 'rectangle' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sod-length" className="label-field">Length <span className="text-bark-500">({lengthUnit})</span></label>
                <input id="sod-length" type="number" inputMode="decimal" min="0" step="0.1" value={length} onChange={handleNumericChange(setLength)} className="input-field mt-1.5" />
              </div>
              <div>
                <label htmlFor="sod-width" className="label-field">Width <span className="text-bark-500">({lengthUnit})</span></label>
                <input id="sod-width" type="number" inputMode="decimal" min="0" step="0.1" value={width} onChange={handleNumericChange(setWidth)} className="input-field mt-1.5" />
              </div>
            </div>
          )}

          {shape === 'circle' && (
            <div>
              <label htmlFor="sod-radius" className="label-field">Radius <span className="text-bark-500">({lengthUnit})</span></label>
              <input id="sod-radius" type="number" inputMode="decimal" min="0" step="0.5" value={radius} onChange={handleNumericChange(setRadius)} className="input-field mt-1.5" />
              <p className="mt-1.5 text-xs text-bark-500">Half the full width of the circle (diameter &divide; 2).</p>
            </div>
          )}

          {shape === 'triangle' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sod-tri-base" className="label-field">Base <span className="text-bark-500">({lengthUnit})</span></label>
                <input id="sod-tri-base" type="number" inputMode="decimal" min="0" step="0.1" value={triBase} onChange={handleNumericChange(setTriBase)} className="input-field mt-1.5" />
              </div>
              <div>
                <label htmlFor="sod-tri-height" className="label-field">Height <span className="text-bark-500">({lengthUnit})</span></label>
                <input id="sod-tri-height" type="number" inputMode="decimal" min="0" step="0.1" value={triHeight} onChange={handleNumericChange(setTriHeight)} className="input-field mt-1.5" />
                <p className="mt-1.5 text-xs text-bark-500">Perpendicular height, not the slanted side.</p>
              </div>
            </div>
          )}

          {shape === 'multi' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-bark-500">
                Break an L-shaped or irregular lawn into simple rectangles and add each one below &mdash; the calculator sums them.
              </p>
              {sections.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 rounded-lg bg-sand-50 p-3 ring-1 ring-moss-100">
                  <div>
                    <label htmlFor={`sod-section-length-${i}`} className="label-field">Section {i + 1} length <span className="text-bark-500">({lengthUnit})</span></label>
                    <input
                      id={`sod-section-length-${i}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={s.length}
                      onChange={(e) => updateSection(i, 'length', e.target.value)}
                      className="input-field mt-1.5"
                    />
                  </div>
                  <div>
                    <label htmlFor={`sod-section-width-${i}`} className="label-field">Width <span className="text-bark-500">({lengthUnit})</span></label>
                    <input
                      id={`sod-section-width-${i}`}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.1"
                      value={s.width}
                      onChange={(e) => updateSection(i, 'width', e.target.value)}
                      className="input-field mt-1.5"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSection(i)}
                    disabled={sections.length <= 1}
                    aria-label={`Remove section ${i + 1}`}
                    className="mb-0.5 inline-flex h-10 w-10 items-center justify-center rounded-lg text-bark-400 transition hover:bg-white hover:text-bark-700 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSection}
                className="inline-flex w-fit items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Add another section
              </button>
            </div>
          )}

          {/* Grass type + waste factor */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sod-grass-type" className="label-field">Grass type</label>
              <select
                id="sod-grass-type"
                value={grassType}
                onChange={(e) => setGrassType(e.target.value as GrassType)}
                className="input-field mt-1.5"
              >
                <option value="unsure">Not sure &mdash; use industry standard (450 sq ft)</option>
                <optgroup label="Warm-season (sold as slabs)">
                  <option value="bermuda">Bermuda</option>
                  <option value="zoysia">Zoysia</option>
                  <option value="st-augustine">St. Augustine</option>
                  <option value="centipede">Centipede</option>
                </optgroup>
                <optgroup label="Cool-season (sold as rolls)">
                  <option value="tall-fescue">Tall Fescue</option>
                  <option value="kentucky-bluegrass">Kentucky Bluegrass</option>
                  <option value="ryegrass">Ryegrass</option>
                </optgroup>
                <option value="custom">Custom &mdash; enter my supplier's coverage</option>
              </select>
              {grassType === 'custom' ? (
                <div className="mt-2">
                  <label htmlFor="sod-custom-coverage" className="label-field">Supplier's pallet coverage <span className="text-bark-500">(sq ft)</span></label>
                  <input
                    id="sod-custom-coverage"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={customCoverage}
                    onChange={handleNumericChange(setCustomCoverage)}
                    className="input-field mt-1.5"
                  />
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-bark-500">
                  ~{GRASS_COVERAGE[grassType]} sq ft per pallet, sold as {soldAs}. Confirm with your supplier.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="sod-waste-factor" className="label-field">Waste factor</label>
              <select
                id="sod-waste-factor"
                value={wasteFactor}
                onChange={(e) => setWasteFactor(e.target.value as WasteFactor)}
                className="input-field mt-1.5"
              >
                <option value="5">5% &mdash; straight edges</option>
                <option value="10">10% &mdash; curved edges</option>
                <option value="15">15% &mdash; complex / multiple obstacles</option>
              </select>
              <p className="mt-1.5 text-xs text-bark-500">Accounts for offcuts from fitting rectangular pieces to your lawn's edges.</p>
            </div>
          </div>

          {/* Formula display */}
          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
              {shape === 'circle'
                ? 'Area = π × Radius²'
                : shape === 'triangle'
                ? 'Area = (Base × Height) ÷ 2'
                : shape === 'multi'
                ? 'Area = Σ (Length × Width) of each section'
                : 'Area = Length × Width'}
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Pallets = ROUNDUP( Area &times; (1 + Waste %) &divide; Pallet Coverage )
            </p>
          </div>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">Enter your lawn&rsquo;s dimensions above to see how much sod you need.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                        <path d="M4 24h24v4H4zM6 22V10l7-4 7 4v12M6 22h14M9 22v-6h4v6" opacity="0.85" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">You need approximately</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {result.pallets.toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        pallet{result.pallets === 1 ? '' : 's'} of sod
                      </p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-4 sm:p-5">
                    <p className="text-xs text-moss-200">Or in individual pieces</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {result.pieces.toLocaleString()}
                    </p>
                    <p className="text-xs text-moss-200">pieces (~{SQFT_PER_PIECE} sq ft each)</p>
                    <p className="mt-1 text-xs text-moss-300">
                      {round(result.sqftWithWaste, 1).toLocaleString()} sq ft with waste
                      {isMetric && <span> ({round(sqmWithWaste, 1)} m&sup2;)</span>}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    Lawn area: {round(result.sqft, 1).toLocaleString()} sq ft, before the {wasteFactor}% waste factor.
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
