import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type Shape = 'hoop' | 'gable' | 'lean-to';
type UnitSystem = 'imperial' | 'metric';
type GlazingKey = 'single-poly' | 'double-poly' | 'single-glass' | 'twinwall-poly' | 'triplewall-poly';
type FuelKey = 'electric' | 'propane' | 'natgas';

const STORAGE_KEY = 'greenhouse-heater-calculator-state-v1';

// U-factors in BTU/(hr·ft²·°F) — approximate heat-transfer coefficients by
// glazing material. Single/double poly and double-polycarbonate values match
// Purdue University's published worked example (see Sources on this page);
// single-pane glass and twin-wall polycarbonate are widely-cited industry
// figures for those materials.
const GLAZING_OPTIONS: Record<GlazingKey, { label: string; u: number }> = {
  'single-poly': { label: 'Single-layer poly film', u: 1.2 },
  'double-poly': { label: 'Double-layer inflated poly', u: 0.7 },
  'single-glass': { label: 'Single-pane glass', u: 1.1 },
  'twinwall-poly': { label: 'Twin-wall polycarbonate', u: 0.65 },
  'triplewall-poly': { label: 'Triple-wall polycarbonate', u: 0.55 },
};

const FUEL_OPTIONS: Record<FuelKey, { label: string; efficiency: number }> = {
  electric: { label: 'Electric', efficiency: 99 },
  propane: { label: 'Propane', efficiency: 80 },
  natgas: { label: 'Natural gas', efficiency: 78 },
};

// Assumed roof pitch used to derive slant length for sloped-roof shapes.
// Not a user input — treated as a fixed, clearly-labeled assumption.
// 30° is a commonly cited pitch for freestanding gable/A-frame greenhouses
// (steep enough to shed snow); lean-to roofs are typically shallower since
// they run from a tall back wall down to a shorter front wall.
const GABLE_PITCH_DEG = 30;
const LEAN_TO_PITCH_DEG = 20;
const SAFETY_FACTOR = 1.15;

interface SavedState {
  shape: Shape;
  unitSystem: UnitSystem;
  length: string;
  width: string;
  height: string;
  glazing: GlazingKey;
  insideTemp: string;
  outsideTemp: string;
  fuel: FuelKey;
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

function sanitizeTempInput(raw: string): string {
  // Temperatures can be negative (record lows), so allow a single leading minus.
  if (typeof raw !== 'string') return '';
  let cleaned = raw.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  const negative = cleaned.trim().startsWith('-');
  cleaned = cleaned.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return negative ? `-${cleaned}` : cleaned;
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
const BTU_TO_KW = 0.000293071;

function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

export default function GreenhouseHeaterCalculator() {
  const hasLoaded = useRef(false);

  const [shape, setShape] = useState<Shape>('hoop');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [length, setLength] = useState<string>('48');
  const [width, setWidth] = useState<string>('20');
  const [height, setHeight] = useState<string>('7');
  const [glazing, setGlazing] = useState<GlazingKey>('double-poly');
  const [insideTemp, setInsideTemp] = useState<string>('65');
  const [outsideTemp, setOutsideTemp] = useState<string>('10');
  const [fuel, setFuel] = useState<FuelKey>('propane');

  useEffect(() => {
    const s = loadSavedState();
    if (s.shape) setShape(s.shape);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.height !== undefined) setHeight(s.height);
    if (s.glazing) setGlazing(s.glazing);
    if (s.insideTemp !== undefined) setInsideTemp(s.insideTemp);
    if (s.outsideTemp !== undefined) setOutsideTemp(s.outsideTemp);
    if (s.fuel) setFuel(s.fuel);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ shape, unitSystem, length, width, height, glazing, insideTemp, outsideTemp, fuel });
  }, [shape, unitSystem, length, width, height, glazing, insideTemp, outsideTemp, fuel]);

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';
  const tempUnit = isMetric ? '°C' : '°F';

  const result = useMemo(() => {
    let l = parseFloat(length);
    let w = parseFloat(width);
    let h = parseFloat(height);
    l = Number.isFinite(l) ? l : 0;
    w = Number.isFinite(w) ? w : 0;
    h = Number.isFinite(h) ? h : 0;

    if (isMetric) {
      l *= M_TO_FT;
      w *= M_TO_FT;
      h *= M_TO_FT;
    }

    let areaSqFt = 0;
    let pitchDeg = 0;
    let riseFt = 0;
    let slantFt = 0;

    if (shape === 'hoop') {
      const r = w / 2;
      areaSqFt = Math.PI * r * r + Math.PI * r * l;
      h = r; // peak height for a semicircular hoop is always half the width
    } else if (shape === 'gable') {
      pitchDeg = GABLE_PITCH_DEG;
      const pitchRad = (pitchDeg * Math.PI) / 180;
      const halfW = w / 2;
      riseFt = halfW * Math.tan(pitchRad);
      slantFt = Math.sqrt(halfW * halfW + riseFt * riseFt);
      const sideWalls = 2 * (h * l);
      const roofPanels = 2 * (slantFt * l);
      // End walls = full gable end (rectangle up to eave height + triangular
      // peak above it), not just the triangle — this is the complete
      // exposed-surface area for each short end of the structure.
      const endWalls = 2 * (w * h + 0.5 * w * riseFt);
      areaSqFt = sideWalls + roofPanels + endWalls;
    } else {
      // lean-to: simplified rectangular prism (uniform wall height) plus one
      // sloped roof panel. The back wall is assumed to be the shared wall
      // against an existing structure (house, barn) and is excluded from
      // heat-loss area since it doesn't face outside air.
      pitchDeg = LEAN_TO_PITCH_DEG;
      const pitchRad = (pitchDeg * Math.PI) / 180;
      riseFt = w * Math.tan(pitchRad);
      slantFt = Math.sqrt(w * w + riseFt * riseFt);
      const endWalls = 2 * (h * w);
      const frontWall = h * l;
      const roofPanel = slantFt * l;
      areaSqFt = endWalls + frontWall + roofPanel;
    }

    const insideF = isMetric ? cToF(parseFloat(insideTemp) || 0) : parseFloat(insideTemp) || 0;
    const outsideF = isMetric ? cToF(parseFloat(outsideTemp) || 0) : parseFloat(outsideTemp) || 0;
    const deltaT = Math.max(0, insideF - outsideF);

    const uFactor = GLAZING_OPTIONS[glazing].u;
    const efficiency = FUEL_OPTIONS[fuel].efficiency;

    const heatLossBtuHr = areaSqFt * deltaT * uFactor;
    const afterSafety = heatLossBtuHr * SAFETY_FACTOR;
    const recommendedBtuHr = afterSafety / (efficiency / 100);

    return {
      areaSqFt,
      deltaT,
      uFactor,
      efficiency,
      heatLossBtuHr,
      afterSafety,
      recommendedBtuHr,
      heatLossKw: heatLossBtuHr * BTU_TO_KW,
      recommendedKw: recommendedBtuHr * BTU_TO_KW,
      peakHeightFt: shape === 'hoop' ? h : null,
      pitchDeg,
    };
  }, [shape, unitSystem, length, width, height, glazing, insideTemp, outsideTemp, fuel, isMetric]);

  const hasResult = result.areaSqFt > 0 && result.deltaT >= 0;

  const handleNumericChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
  };

  const handleTempChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(sanitizeTempInput(e.target.value));
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Greenhouse Heater Calculator Results', margin, y);
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
    const shapeLabel = shape === 'hoop' ? 'Hoop / Quonset' : shape === 'gable' ? 'Gable (A-frame)' : 'Lean-to';
    const inputLines = [
      `Shape: ${shapeLabel}`,
      `Length: ${length || 0} ${lengthUnit}`,
      `Width: ${width || 0} ${lengthUnit}`,
      shape !== 'hoop' ? `Wall height: ${height || 0} ${lengthUnit}` : 'Peak height: automatic (half the width)',
      `Glazing: ${GLAZING_OPTIONS[glazing].label} (U = ${GLAZING_OPTIONS[glazing].u})`,
      `Desired inside temp: ${insideTemp || 0}${tempUnit}`,
      `Record low outside temp: ${outsideTemp || 0}${tempUnit}`,
      `Heater fuel: ${FUEL_OPTIONS[fuel].label} (${FUEL_OPTIONS[fuel].efficiency}% efficiency)`,
    ];
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
    const resultLines = [
      `Surface area: ${round(result.areaSqFt, 0).toLocaleString()} sq ft`,
      `Temperature differential: ${round(result.deltaT, 1)}°F`,
      `Heat loss (Q = U × A × ΔT): ${round(result.heatLossBtuHr, 0).toLocaleString()} BTU/hr (${round(result.heatLossKw, 2)} kW)`,
      `With 15% safety factor: ${round(result.afterSafety, 0).toLocaleString()} BTU/hr`,
      `Recommended heater size (÷ ${result.efficiency}% efficiency): ${round(result.recommendedBtuHr, 0).toLocaleString()} BTU/hr (${round(result.recommendedKw, 2)} kW)`,
    ];
    resultLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    [
      'Estimate assumes a well-sealed structure with no significant air infiltration.',
      'Add 10–15% for windy or exposed sites. Consider the ASHRAE 99% design',
      'temperature instead of record low for a more rigorous sizing standard.',
    ].forEach((line) => {
      doc.text(line, margin, y);
      y += 12;
    });

    doc.save('greenhouse-heater-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Calculate Your Greenhouse Heater Size
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <label htmlFor="gh-shape" className="label-field">
                Greenhouse shape
              </label>
              <select
                id="gh-shape"
                value={shape}
                onChange={(e) => setShape(e.target.value as Shape)}
                className="input-field mt-1.5"
              >
                <option value="hoop">Hoop / Quonset</option>
                <option value="gable">Gable (A-frame)</option>
                <option value="lean-to">Lean-to</option>
              </select>
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
                  Imperial (ft, °F)
                </button>
                <button
                  type="button"
                  aria-pressed={isMetric}
                  onClick={() => setUnitSystem('metric')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Metric (m, °C)
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="gh-length" className="label-field">
                Length <span className="text-bark-500">({lengthUnit})</span>
              </label>
              <input
                id="gh-length"
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
              <label htmlFor="gh-width" className="label-field">
                Width {shape === 'hoop' && <span className="text-bark-500">(diameter)</span>}{' '}
                <span className="text-bark-500">({lengthUnit})</span>
              </label>
              <input
                id="gh-width"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={width}
                onChange={handleNumericChange(setWidth)}
                className="input-field mt-1.5"
              />
            </div>

            {shape === 'hoop' ? (
              <div className="sm:col-span-2 rounded-lg bg-sand-50 px-4 py-2.5 text-xs text-bark-500 ring-1 ring-moss-100">
                A semicircular hoop house&rsquo;s peak height is automatically half the width
                {result.peakHeightFt !== null && (
                  <> &mdash; about {round(result.peakHeightFt, 1)} ft here.</>
                )}
              </div>
            ) : (
              <div>
                <label htmlFor="gh-height" className="label-field">
                  {shape === 'gable' ? 'Eave / wall height' : 'Wall height'}{' '}
                  <span className="text-bark-500">({lengthUnit})</span>
                </label>
                <input
                  id="gh-height"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={height}
                  onChange={handleNumericChange(setHeight)}
                  className="input-field mt-1.5"
                />
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="gh-glazing" className="label-field">
                Glazing type
              </label>
              <select
                id="gh-glazing"
                value={glazing}
                onChange={(e) => setGlazing(e.target.value as GlazingKey)}
                className="input-field mt-1.5"
              >
                {(Object.keys(GLAZING_OPTIONS) as GlazingKey[]).map((key) => (
                  <option key={key} value={key}>
                    {GLAZING_OPTIONS[key].label} (U = {GLAZING_OPTIONS[key].u})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="gh-fuel" className="label-field">
                Heater fuel type
              </label>
              <select
                id="gh-fuel"
                value={fuel}
                onChange={(e) => setFuel(e.target.value as FuelKey)}
                className="input-field mt-1.5"
              >
                {(Object.keys(FUEL_OPTIONS) as FuelKey[]).map((key) => (
                  <option key={key} value={key}>
                    {FUEL_OPTIONS[key].label} ({FUEL_OPTIONS[key].efficiency}% efficient)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="gh-inside-temp" className="label-field">
                Desired inside temperature <span className="text-bark-500">({tempUnit})</span>
              </label>
              <input
                id="gh-inside-temp"
                type="number"
                inputMode="decimal"
                step="1"
                value={insideTemp}
                onChange={handleTempChange(setInsideTemp)}
                className="input-field mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="gh-outside-temp" className="label-field">
                Record low outside temperature <span className="text-bark-500">({tempUnit})</span>
              </label>
              <input
                id="gh-outside-temp"
                type="number"
                inputMode="decimal"
                step="1"
                value={outsideTemp}
                onChange={handleTempChange(setOutsideTemp)}
                className="input-field mt-1.5"
                aria-describedby="gh-outside-temp-note"
              />
              <p id="gh-outside-temp-note" className="mt-1.5 text-xs text-bark-500">
                Some professionals use the ASHRAE 99% design temperature instead of the
                historical record low, since a record low can be an outlier. Record low is a
                fine, simple default for a home greenhouse.
              </p>
            </div>
          </div>

          {/* Formula display */}
          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
              Heat Loss (Q) = U-factor × Surface Area × ΔT
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Recommended Heater Size = (Q × 1.15) ÷ (Fuel Efficiency ÷ 100)
            </p>
          </div>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your greenhouse dimensions and temperatures above to see your heat loss
                and recommended heater size.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                        <path
                          d="M16 4v6M9 8l4 4M23 8l-4 4M6 16h6M20 16h6M9 24l4-4M23 24l-4-4M16 22v6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <circle cx="16" cy="16" r="4" fill="currentColor" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">Estimated heat loss</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {round(result.heatLossBtuHr, 0).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        BTU/hr <span className="ml-1 text-bark-400">({round(result.heatLossKw, 2)} kW)</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-4 sm:p-5">
                    <p className="text-xs text-moss-200">Recommended heater size</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {round(result.recommendedBtuHr, 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-moss-200">
                      BTU/hr ({round(result.recommendedKw, 2)} kW)
                    </p>
                    <p className="mt-1 text-xs text-moss-300">Includes safety factor + efficiency</p>
                  </div>
                </div>

                <div className="border-t border-moss-200 px-4 py-3 sm:px-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-bark-400">Breakdown</p>
                  <dl className="mt-2 grid gap-1.5 text-xs text-bark-600 sm:grid-cols-2">
                    <div className="flex justify-between gap-2 sm:block">
                      <dt className="text-bark-500">Surface area</dt>
                      <dd className="font-medium text-bark-800">{round(result.areaSqFt, 0).toLocaleString()} sq ft</dd>
                    </div>
                    <div className="flex justify-between gap-2 sm:block">
                      <dt className="text-bark-500">Temp. differential (ΔT)</dt>
                      <dd className="font-medium text-bark-800">{round(result.deltaT, 1)}°F</dd>
                    </div>
                    <div className="flex justify-between gap-2 sm:block">
                      <dt className="text-bark-500">U-factor</dt>
                      <dd className="font-medium text-bark-800">{result.uFactor}</dd>
                    </div>
                    <div className="flex justify-between gap-2 sm:block">
                      <dt className="text-bark-500">Heat loss (U × A × ΔT)</dt>
                      <dd className="font-medium text-bark-800">{round(result.heatLossBtuHr, 0).toLocaleString()} BTU/hr</dd>
                    </div>
                    <div className="flex justify-between gap-2 sm:block">
                      <dt className="text-bark-500">+ 15% safety factor</dt>
                      <dd className="font-medium text-bark-800">{round(result.afterSafety, 0).toLocaleString()} BTU/hr</dd>
                    </div>
                    <div className="flex justify-between gap-2 sm:block">
                      <dt className="text-bark-500">÷ {result.efficiency}% fuel efficiency</dt>
                      <dd className="font-medium text-bark-800">
                        {round(result.recommendedBtuHr, 0).toLocaleString()} BTU/hr
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    Estimate assumes a well-sealed structure. Add 10&ndash;15% in windy/exposed sites.
                  </p>
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path
                        d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M3 16h14"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Export PDF
                  </button>
                </div>
              </>
            )}
          </div>

          {/* U-factor reference table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-xs font-medium uppercase tracking-wider text-bark-400">
                U-factor by glazing type
              </caption>
              <thead>
                <tr className="border-b border-moss-100 text-bark-500">
                  <th scope="col" className="py-2 pr-4 font-medium">Glazing</th>
                  <th scope="col" className="py-2 font-medium">U-factor (BTU/hr&middot;ft&sup2;&middot;&deg;F)</th>
                </tr>
              </thead>
              <tbody className="text-bark-700">
                {(Object.keys(GLAZING_OPTIONS) as GlazingKey[]).map((key, i, arr) => (
                  <tr key={key} className={i < arr.length - 1 ? 'border-b border-moss-50' : ''}>
                    <th scope="row" className="py-2 pr-4 font-medium text-bark-800">
                      {GLAZING_OPTIONS[key].label}
                    </th>
                    <td className="py-2">{GLAZING_OPTIONS[key].u}</td>
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
