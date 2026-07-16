import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

// ---------------------------------------------------------------------------
// Material weight-per-cubic-yard reference figures.
//
// Soil/dirt uses the same 1.2 tons/cu yd baseline (range 1.0–1.7 tons/cu yd
// depending on moisture) already established on the Topsoil Calculator, kept
// identical here rather than introducing a second, conflicting number.
// Gravel and mulch use standard, widely-cited landscaping-supply reference
// ranges — gravel/crushed stone typically runs ~2,400–2,900 lbs/cu yd, and
// bark/wood mulch typically runs ~400–800 lbs/cu yd depending on moisture
// and how finely it's shredded.
// ---------------------------------------------------------------------------
type Material = 'soil' | 'gravel' | 'mulch';

interface MaterialInfo {
  label: string;
  lbsPerCuYd: number;
  rangeLbs: [number, number];
}

const MATERIALS: Record<Material, MaterialInfo> = {
  soil: { label: 'Dirt / Soil', lbsPerCuYd: 2400, rangeLbs: [2000, 3400] },
  gravel: { label: 'Gravel', lbsPerCuYd: 2700, rangeLbs: [2400, 2900] },
  mulch: { label: 'Mulch', lbsPerCuYd: 500, rangeLbs: [400, 800] },
};

type Mode = 'dimensions' | 'weight' | 'area';
type UnitSystem = 'imperial' | 'metric';
type WeightDirection = 'toVolume' | 'toWeight';

const STORAGE_KEY = 'cubic-yard-calculator-state-v1';

const M_TO_FT = 3.28084;
const CM_TO_IN = 0.393701;
const CUYD_TO_CUM = 0.764555;
const LB_TO_KG = 0.453592;

interface SavedState {
  material: Material;
  mode: Mode;
  unitSystem: UnitSystem;
  dimLength: string;
  dimWidth: string;
  dimDepth: string;
  weightDirection: WeightDirection;
  weightValue: string;
  volumeValue: string;
  areaValue: string;
  areaDepth: string;
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

export default function CubicYardCalculator() {
  const hasLoaded = useRef(false);

  const [material, setMaterial] = useState<Material>('soil');
  const [mode, setMode] = useState<Mode>('dimensions');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');

  const [dimLength, setDimLength] = useState('10');
  const [dimWidth, setDimWidth] = useState('10');
  const [dimDepth, setDimDepth] = useState('4');

  const [weightDirection, setWeightDirection] = useState<WeightDirection>('toVolume');
  const [weightValue, setWeightValue] = useState('3');
  const [volumeValue, setVolumeValue] = useState('2');

  const [areaValue, setAreaValue] = useState('300');
  const [areaDepth, setAreaDepth] = useState('3');

  useEffect(() => {
    const s = loadSavedState();
    if (s.material) setMaterial(s.material);
    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.dimLength !== undefined) setDimLength(s.dimLength);
    if (s.dimWidth !== undefined) setDimWidth(s.dimWidth);
    if (s.dimDepth !== undefined) setDimDepth(s.dimDepth);
    if (s.weightDirection) setWeightDirection(s.weightDirection);
    if (s.weightValue !== undefined) setWeightValue(s.weightValue);
    if (s.volumeValue !== undefined) setVolumeValue(s.volumeValue);
    if (s.areaValue !== undefined) setAreaValue(s.areaValue);
    if (s.areaDepth !== undefined) setAreaDepth(s.areaDepth);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({
      material, mode, unitSystem, dimLength, dimWidth, dimDepth,
      weightDirection, weightValue, volumeValue, areaValue, areaDepth,
    });
  }, [material, mode, unitSystem, dimLength, dimWidth, dimDepth, weightDirection, weightValue, volumeValue, areaValue, areaDepth]);

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';
  const depthUnit = isMetric ? 'cm' : 'in';
  const areaUnit = isMetric ? 'm²' : 'sq ft';
  const weightUnit = isMetric ? 'tonnes' : 'tons';
  const volumeUnit = isMetric ? 'm³' : 'cu yd';

  const handleNumericChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
  };

  const lbsPerCuYd = MATERIALS[material].lbsPerCuYd;

  // ---- Mode 1: Dimensions -> Cubic Yards ----
  const dimensionsResult = useMemo(() => {
    let l = parseFloat(dimLength);
    let w = parseFloat(dimWidth);
    let d = parseFloat(dimDepth);
    if (!Number.isFinite(l) || !Number.isFinite(w) || !Number.isFinite(d)) return null;

    let lengthFt = l;
    let widthFt = w;
    let depthIn = d;
    if (isMetric) {
      lengthFt = l * M_TO_FT;
      widthFt = w * M_TO_FT;
      depthIn = d * CM_TO_IN;
    }
    const depthFt = depthIn / 12;
    const cubicFeet = Math.max(0, lengthFt * widthFt * depthFt);
    const cubicYards = cubicFeet / 27;
    const cubicMeters = cubicYards * CUYD_TO_CUM;
    const weightLbs = cubicYards * lbsPerCuYd;
    const weightTons = weightLbs / 2000;
    const weightKg = weightLbs * LB_TO_KG;
    const weightTonnes = weightKg / 1000;

    return { cubicFeet, cubicYards, cubicMeters, weightTons, weightTonnes };
  }, [dimLength, dimWidth, dimDepth, isMetric, lbsPerCuYd]);

  // ---- Mode 2: Weight <-> Volume ----
  const weightResult = useMemo(() => {
    if (weightDirection === 'toVolume') {
      const w = parseFloat(weightValue);
      if (!Number.isFinite(w) || w <= 0) return null;
      const lbs = isMetric ? (w * 1000) / LB_TO_KG : w * 2000;
      const cubicYards = lbs / lbsPerCuYd;
      const cubicMeters = cubicYards * CUYD_TO_CUM;
      return { cubicYards, cubicMeters };
    } else {
      const v = parseFloat(volumeValue);
      if (!Number.isFinite(v) || v <= 0) return null;
      const cubicYards = isMetric ? v / CUYD_TO_CUM : v;
      const lbs = cubicYards * lbsPerCuYd;
      const tons = lbs / 2000;
      const tonnes = (lbs * LB_TO_KG) / 1000;
      return { tons, tonnes };
    }
  }, [weightDirection, weightValue, volumeValue, isMetric, lbsPerCuYd]);

  // ---- Mode 3: Square Feet/Meters -> Cubic Yards ----
  const areaResult = useMemo(() => {
    const a = parseFloat(areaValue);
    const d = parseFloat(areaDepth);
    if (!Number.isFinite(a) || !Number.isFinite(d)) return null;

    let cubicFeet: number;
    let cubicYards: number;
    if (isMetric) {
      const cubicMeters = a * (d / 100);
      cubicYards = cubicMeters / CUYD_TO_CUM;
      cubicFeet = cubicYards * 27;
    } else {
      cubicFeet = Math.max(0, a * (d / 12));
      cubicYards = cubicFeet / 27;
    }
    const cubicMeters = cubicYards * CUYD_TO_CUM;
    const weightLbs = cubicYards * lbsPerCuYd;
    const weightTons = weightLbs / 2000;
    const weightTonnes = (weightLbs * LB_TO_KG) / 1000;

    return { cubicFeet, cubicYards, cubicMeters, weightTons, weightTonnes };
  }, [areaValue, areaDepth, isMetric, lbsPerCuYd]);

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Cubic Yard Calculator Results', margin, y);
    y += 28;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated ${dateStr} — HarvestMath.com`, margin, y);
    y += 24;

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Material: ${MATERIALS[material].label} (~${lbsPerCuYd.toLocaleString()} lbs/cu yd)`, margin, y);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    if (mode === 'dimensions' && dimensionsResult) {
      const lines = [
        `Mode: Dimensions to Cubic Yards`,
        `Length: ${dimLength || 0} ${lengthUnit}  ·  Width: ${dimWidth || 0} ${lengthUnit}  ·  Depth: ${dimDepth || 0} ${depthUnit}`,
        '',
        `Cubic feet: ${round(dimensionsResult.cubicFeet, 2).toLocaleString()} cu ft`,
        `Cubic yards: ${round(dimensionsResult.cubicYards, 2).toLocaleString()} cu yd`,
        `Cubic meters: ${round(dimensionsResult.cubicMeters, 3).toLocaleString()} m³`,
        `Est. weight: ~${round(dimensionsResult.weightTons, 2).toLocaleString()} tons (~${round(dimensionsResult.weightTonnes, 2).toLocaleString()} tonnes)`,
      ];
      lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    } else if (mode === 'weight' && weightResult) {
      if (weightDirection === 'toVolume' && 'cubicYards' in weightResult) {
        doc.text(`Mode: Weight to Volume`, margin, y); y += 16;
        doc.text(`Input: ${weightValue || 0} ${weightUnit}`, margin, y); y += 16;
        doc.text(`Cubic yards: ${round(weightResult.cubicYards, 2).toLocaleString()} cu yd`, margin, y); y += 16;
        doc.text(`Cubic meters: ${round(weightResult.cubicMeters, 3).toLocaleString()} m³`, margin, y); y += 16;
      } else if ('tons' in weightResult) {
        doc.text(`Mode: Volume to Weight`, margin, y); y += 16;
        doc.text(`Input: ${volumeValue || 0} ${volumeUnit}`, margin, y); y += 16;
        doc.text(`Est. weight: ~${round(weightResult.tons, 2).toLocaleString()} tons (~${round(weightResult.tonnes, 2).toLocaleString()} tonnes)`, margin, y); y += 16;
      }
    } else if (mode === 'area' && areaResult) {
      const lines = [
        `Mode: Square ${isMetric ? 'Meters' : 'Feet'} to Cubic Yards`,
        `Area: ${areaValue || 0} ${areaUnit}  ·  Depth: ${areaDepth || 0} ${depthUnit}`,
        '',
        `Cubic feet: ${round(areaResult.cubicFeet, 2).toLocaleString()} cu ft`,
        `Cubic yards: ${round(areaResult.cubicYards, 2).toLocaleString()} cu yd`,
        `Cubic meters: ${round(areaResult.cubicMeters, 3).toLocaleString()} m³`,
        `Est. weight: ~${round(areaResult.weightTons, 2).toLocaleString()} tons (~${round(areaResult.weightTonnes, 2).toLocaleString()} tonnes)`,
      ];
      lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    }

    y += 12;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(`Weight is approximate — ${MATERIALS[material].label} typically runs ${MATERIALS[material].rangeLbs[0].toLocaleString()}–${MATERIALS[material].rangeLbs[1].toLocaleString()} lbs/cu yd depending on moisture.`, margin, y, { maxWidth: 500 });

    doc.save('cubic-yard-calculator-results.pdf');
  };

  const tabButtonClass = (active: boolean) =>
    `rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
      active ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
    }`;

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">Cubic Yard Calculator</h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Material + Units */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">Material</span>
              <div className="mt-2 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Material">
                {(Object.keys(MATERIALS) as Material[]).map((m) => (
                  <button key={m} type="button" role="tab" aria-selected={material === m} onClick={() => setMaterial(m)} className={tabButtonClass(material === m)}>
                    {MATERIALS[m].label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="label-field">Units</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
                <button type="button" aria-pressed={!isMetric} onClick={() => setUnitSystem('imperial')} className={tabButtonClass(!isMetric)}>
                  Imperial
                </button>
                <button type="button" aria-pressed={isMetric} onClick={() => setUnitSystem('metric')} className={tabButtonClass(isMetric)}>
                  Metric
                </button>
              </div>
            </div>
          </div>

          <p className="text-xs text-bark-500">
            {MATERIALS[material].label} used at ~{lbsPerCuYd.toLocaleString()} lbs/cu yd (typical range {MATERIALS[material].rangeLbs[0].toLocaleString()}&ndash;{MATERIALS[material].rangeLbs[1].toLocaleString()} lbs/cu yd depending on moisture).
          </p>

          {/* Mode tabs */}
          <div>
            <span className="label-field">Conversion</span>
            <div className="mt-2 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Conversion mode">
              <button type="button" role="tab" aria-selected={mode === 'dimensions'} onClick={() => setMode('dimensions')} className={tabButtonClass(mode === 'dimensions')}>
                Dimensions
              </button>
              <button type="button" role="tab" aria-selected={mode === 'weight'} onClick={() => setMode('weight')} className={tabButtonClass(mode === 'weight')}>
                Weight &harr; Volume
              </button>
              <button type="button" role="tab" aria-selected={mode === 'area'} onClick={() => setMode('area')} className={tabButtonClass(mode === 'area')}>
                Area to Volume
              </button>
            </div>
          </div>

          {/* Mode 1: Dimensions */}
          {mode === 'dimensions' && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="cy-length" className="label-field">Length ({lengthUnit})</label>
                <input id="cy-length" type="number" inputMode="decimal" min="0" step="0.5" value={dimLength} onChange={handleNumericChange(setDimLength)} className="input-field mt-1.5" />
              </div>
              <div>
                <label htmlFor="cy-width" className="label-field">Width ({lengthUnit})</label>
                <input id="cy-width" type="number" inputMode="decimal" min="0" step="0.5" value={dimWidth} onChange={handleNumericChange(setDimWidth)} className="input-field mt-1.5" />
              </div>
              <div>
                <label htmlFor="cy-depth" className="label-field">Depth ({depthUnit})</label>
                <input id="cy-depth" type="number" inputMode="decimal" min="0" step="0.5" value={dimDepth} onChange={handleNumericChange(setDimDepth)} className="input-field mt-1.5" />
              </div>
            </div>
          )}

          {/* Mode 2: Weight <-> Volume */}
          {mode === 'weight' && (
            <div className="flex flex-col gap-4">
              <div className="inline-flex w-fit rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Weight conversion direction">
                <button type="button" role="tab" aria-selected={weightDirection === 'toVolume'} onClick={() => setWeightDirection('toVolume')} className={tabButtonClass(weightDirection === 'toVolume')}>
                  {weightUnit} &rarr; {volumeUnit}
                </button>
                <button type="button" role="tab" aria-selected={weightDirection === 'toWeight'} onClick={() => setWeightDirection('toWeight')} className={tabButtonClass(weightDirection === 'toWeight')}>
                  {volumeUnit} &rarr; {weightUnit}
                </button>
              </div>
              {weightDirection === 'toVolume' ? (
                <div className="max-w-[10rem]">
                  <label htmlFor="cy-weight" className="label-field">Weight ({weightUnit})</label>
                  <input id="cy-weight" type="number" inputMode="decimal" min="0" step="0.1" value={weightValue} onChange={handleNumericChange(setWeightValue)} className="input-field mt-1.5" />
                </div>
              ) : (
                <div className="max-w-[10rem]">
                  <label htmlFor="cy-volume" className="label-field">Volume ({volumeUnit})</label>
                  <input id="cy-volume" type="number" inputMode="decimal" min="0" step="0.1" value={volumeValue} onChange={handleNumericChange(setVolumeValue)} className="input-field mt-1.5" />
                </div>
              )}
            </div>
          )}

          {/* Mode 3: Area to Volume */}
          {mode === 'area' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="cy-area" className="label-field">Area ({areaUnit})</label>
                <input id="cy-area" type="number" inputMode="decimal" min="0" step="1" value={areaValue} onChange={handleNumericChange(setAreaValue)} className="input-field mt-1.5" />
              </div>
              <div>
                <label htmlFor="cy-area-depth" className="label-field">Depth ({depthUnit})</label>
                <input id="cy-area-depth" type="number" inputMode="decimal" min="0" step="0.5" value={areaDepth} onChange={handleNumericChange(setAreaDepth)} className="input-field mt-1.5" />
              </div>
            </div>
          )}

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {mode === 'dimensions' && (
              !dimensionsResult ? (
                <p className="p-5 text-sm text-bark-500">Enter length, width, and depth to see cubic yards.</p>
              ) : (
                <div className="grid grid-cols-2 divide-x divide-moss-200 sm:grid-cols-4">
                  <div className="p-4">
                    <p className="text-xs text-bark-500">Cubic feet</p>
                    <p className="font-display text-lg font-bold text-moss-700">{round(dimensionsResult.cubicFeet, 2).toLocaleString()}</p>
                  </div>
                  <div className="bg-moss-700 p-4">
                    <p className="text-xs text-moss-200">Cubic yards</p>
                    <p className="font-display text-lg font-bold text-white">{round(dimensionsResult.cubicYards, 2).toLocaleString()}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-bark-500">Cubic meters</p>
                    <p className="font-display text-lg font-bold text-moss-700">{round(dimensionsResult.cubicMeters, 3).toLocaleString()}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-bark-500">Est. weight</p>
                    <p className="font-display text-lg font-bold text-moss-700">~{round(dimensionsResult.weightTons, 2).toLocaleString()} tons</p>
                  </div>
                </div>
              )
            )}

            {mode === 'weight' && (
              !weightResult ? (
                <p className="p-5 text-sm text-bark-500">Enter a {weightDirection === 'toVolume' ? 'weight' : 'volume'} to convert.</p>
              ) : weightDirection === 'toVolume' && 'cubicYards' in weightResult ? (
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="bg-moss-700 p-5 text-center">
                    <p className="text-xs text-moss-200">Cubic yards</p>
                    <p className="font-display text-2xl font-bold text-white">{round(weightResult.cubicYards, 2).toLocaleString()}</p>
                  </div>
                  <div className="p-5 text-center">
                    <p className="text-xs text-bark-500">Cubic meters</p>
                    <p className="font-display text-2xl font-bold text-moss-700">{round(weightResult.cubicMeters, 3).toLocaleString()}</p>
                  </div>
                </div>
              ) : 'tons' in weightResult ? (
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="bg-moss-700 p-5 text-center">
                    <p className="text-xs text-moss-200">Est. tons</p>
                    <p className="font-display text-2xl font-bold text-white">~{round(weightResult.tons, 2).toLocaleString()}</p>
                  </div>
                  <div className="p-5 text-center">
                    <p className="text-xs text-bark-500">Est. tonnes</p>
                    <p className="font-display text-2xl font-bold text-moss-700">~{round(weightResult.tonnes, 2).toLocaleString()}</p>
                  </div>
                </div>
              ) : null
            )}

            {mode === 'area' && (
              !areaResult ? (
                <p className="p-5 text-sm text-bark-500">Enter an area and depth to see cubic yards.</p>
              ) : (
                <div className="grid grid-cols-2 divide-x divide-moss-200 sm:grid-cols-4">
                  <div className="p-4">
                    <p className="text-xs text-bark-500">Cubic feet</p>
                    <p className="font-display text-lg font-bold text-moss-700">{round(areaResult.cubicFeet, 2).toLocaleString()}</p>
                  </div>
                  <div className="bg-moss-700 p-4">
                    <p className="text-xs text-moss-200">Cubic yards</p>
                    <p className="font-display text-lg font-bold text-white">{round(areaResult.cubicYards, 2).toLocaleString()}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-bark-500">Cubic meters</p>
                    <p className="font-display text-lg font-bold text-moss-700">{round(areaResult.cubicMeters, 3).toLocaleString()}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-bark-500">Est. weight</p>
                    <p className="font-display text-lg font-bold text-moss-700">~{round(areaResult.weightTons, 2).toLocaleString()} tons</p>
                  </div>
                </div>
              )
            )}

            <div className="border-t border-moss-200 bg-white px-4 py-2.5">
              <p className="font-mono text-xs text-bark-500">
                {mode === 'dimensions' && 'Cubic Yards = (Length × Width × Depth ÷ 12) ÷ 27'}
                {mode === 'weight' && weightDirection === 'toVolume' && `Cubic Yards = (${weightUnit} × ${isMetric ? '1,000 kg' : '2,000 lbs'}) ÷ ${lbsPerCuYd.toLocaleString()} lbs/cu yd`}
                {mode === 'weight' && weightDirection === 'toWeight' && `Weight = Cubic Yards × ${lbsPerCuYd.toLocaleString()} lbs/cu yd`}
                {mode === 'area' && 'Cubic Yards = (Area × Depth ÷ 12) ÷ 27'}
              </p>
            </div>
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
              Export Results (PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
