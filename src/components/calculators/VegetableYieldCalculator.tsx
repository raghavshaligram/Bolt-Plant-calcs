import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type InputMode = 'plants' | 'area';
type UnitSystem = 'imperial' | 'metric';

const STORAGE_KEY = 'vegetable-yield-calculator-state-v1';

interface CropData {
  id: string;
  name: string;
  yieldPerPlantLbs: number;
  sqftPerPlant: number;
  note: string;
}

// Per-plant yield figures are derived from LSU AgCenter's "Expected
// Vegetable Garden Yields" (published per 100-foot row) divided by plants
// per 100-foot row, using this site's own in-row spacing figures (the same
// spacing data used in the Plant Spacing Calculator) for consistency.
// Crops LSU reports by count (heads/ears) are converted to pounds using
// typical average unit weights — noted per crop below.
const CROPS: CropData[] = [
  { id: 'tomato', name: 'Tomato', yieldPerPlantLbs: 5.0, sqftPerPlant: 4, note: 'Based on 250 lbs per 100 ft row at 24" spacing.' },
  { id: 'tomato-cherry', name: 'Tomato (cherry)', yieldPerPlantLbs: 9.0, sqftPerPlant: 4, note: 'Based on 450 lbs per 100 ft row at 24" spacing — cherry types produce far more fruit by weight over a season.' },
  { id: 'pepper', name: 'Pepper (bell)', yieldPerPlantLbs: 1.9, sqftPerPlant: 1, note: 'Based on 125 lbs per 100 ft row at 18" spacing.' },
  { id: 'broccoli', name: 'Broccoli', yieldPerPlantLbs: 0.8, sqftPerPlant: 1, note: 'Based on 70 heads per 100 ft row at 18" spacing, ~0.75 lb per head (main head plus side shoots).' },
  { id: 'carrot', name: 'Carrot', yieldPerPlantLbs: 0.4, sqftPerPlant: 0.0625, note: 'Based on 150 lbs per 100 ft row at 3" spacing.' },
  { id: 'bean-bush', name: 'Bean (bush)', yieldPerPlantLbs: 0.1, sqftPerPlant: 0.25, note: 'Based on 30 lbs per 100 ft row at 4" spacing.' },
  { id: 'bean-pole', name: 'Bean (pole)', yieldPerPlantLbs: 0.15, sqftPerPlant: 0.25, note: 'Based on 30 lbs per 100 ft row at 6" spacing.' },
  { id: 'cucumber', name: 'Cucumber', yieldPerPlantLbs: 1.7, sqftPerPlant: 1, note: 'Based on 170 lbs per 100 ft row at 12" spacing.' },
  { id: 'corn', name: 'Corn', yieldPerPlantLbs: 0.7, sqftPerPlant: 1, note: 'Based on 120 ears per 100 ft row at 12" spacing, ~0.6 lb per ear with husk.' },
  { id: 'squash-summer', name: 'Squash (summer)', yieldPerPlantLbs: 1.6, sqftPerPlant: 4, note: 'Based on 80 lbs per 100 ft row at 24" spacing.' },
  { id: 'squash-winter', name: 'Squash (winter)', yieldPerPlantLbs: 4.5, sqftPerPlant: 9, note: 'Based on 150 lbs per 100 ft row at 36" spacing.' },
  { id: 'lettuce', name: 'Lettuce (head)', yieldPerPlantLbs: 1.0, sqftPerPlant: 1, note: 'Based on 100 heads per 100 ft row at 12" spacing, ~1 lb per head.' },
  { id: 'radish', name: 'Radish', yieldPerPlantLbs: 0.05, sqftPerPlant: 0.0625, note: 'Based on 30 lbs per 100 ft row at 2" spacing.' },
  { id: 'spinach', name: 'Spinach', yieldPerPlantLbs: 0.2, sqftPerPlant: 0.25, note: 'Based on 40 lbs per 100 ft row at 6" spacing.' },
  { id: 'onion', name: 'Onion', yieldPerPlantLbs: 0.73, sqftPerPlant: 0.25, note: 'Based on 220 lbs per 100 ft row at 4" spacing.' },
];

interface SavedState {
  mode: InputMode;
  unitSystem: UnitSystem;
  cropId: string;
  plants: string;
  area: string;
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

function sanitizeIntegerInput(raw: string): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
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

const LBS_PER_KG = 0.453592;
const SQM_PER_SQFT = 0.092903;

export default function VegetableYieldCalculator() {
  const saved = useRef<Partial<SavedState>>({});
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<InputMode>('plants');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [cropId, setCropId] = useState<string>('tomato');
  const [plants, setPlants] = useState<string>('6');
  const [area, setArea] = useState<string>('16');

  useEffect(() => {
    const s = loadSavedState();
    saved.current = s;
    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.cropId) setCropId(s.cropId);
    if (s.plants !== undefined) setPlants(s.plants);
    if (s.area !== undefined) setArea(s.area);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ mode, unitSystem, cropId, plants, area });
  }, [mode, unitSystem, cropId, plants, area]);

  const isMetric = unitSystem === 'metric';
  const areaUnit = isMetric ? 'sq m' : 'sq ft';
  const weightUnit = isMetric ? 'kg' : 'lbs';

  const handleUnitToggle = (next: UnitSystem) => {
    if (next === unitSystem) return;
    const goingMetric = next === 'metric';
    const a = parseFloat(area);
    if (Number.isFinite(a)) {
      setArea(round(goingMetric ? a * SQM_PER_SQFT : a / SQM_PER_SQFT, 2).toString());
    }
    setUnitSystem(next);
  };

  const handlePlantsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlants(sanitizeIntegerInput(e.target.value));
  };

  const handleAreaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setArea(sanitizeNumericInput(e.target.value));
  };

  const crop = useMemo(() => CROPS.find((c) => c.id === cropId) ?? CROPS[0], [cropId]);

  const result = useMemo(() => {
    let plantCount: number;
    if (mode === 'plants') {
      const p = parseInt(plants, 10);
      if (!Number.isFinite(p) || p <= 0) return null;
      plantCount = p;
    } else {
      const rawArea = parseFloat(area);
      if (!Number.isFinite(rawArea) || rawArea <= 0) return null;
      const areaSqFt = isMetric ? rawArea / SQM_PER_SQFT : rawArea;
      plantCount = Math.floor(areaSqFt / crop.sqftPerPlant);
      if (plantCount <= 0) return null;
    }

    const totalLbs = plantCount * crop.yieldPerPlantLbs;
    return { plantCount, totalLbs, totalKg: totalLbs * LBS_PER_KG };
  }, [mode, plants, area, crop, isMetric]);

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Vegetable Yield Calculator Results', margin, y);
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
    const lines: string[] = [
      `Crop: ${crop.name}`,
      `Mode: ${mode === 'plants' ? 'Number of plants' : 'Growing area'}`,
    ];
    if (mode === 'plants') {
      lines.push(`Number of plants: ${plants}`);
    } else {
      lines.push(`Area: ${area} ${areaUnit}`);
    }
    lines.push(`Yield per plant: ${crop.yieldPerPlantLbs} lbs`);
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
        `Plants: ${result.plantCount.toLocaleString()}`,
        `Estimated total yield: ${round(isMetric ? result.totalKg : result.totalLbs, 1)} ${weightUnit}`,
      ];
      resultLines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    }

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Estimate only — actual yield varies with variety, climate, soil, and care.', margin, y);
    y += 12;
    doc.text(crop.note, margin, y);

    doc.save('vegetable-yield-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Vegetable Yield Calculator
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Mode + unit toggles */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="label-field">Estimate by</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'plants'}
                  onClick={() => setMode('plants')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'plants'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Number of Plants
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
                  Growing Area
                </button>
              </div>
            </div>

            {mode === 'area' && (
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
            )}
          </div>

          {/* Crop selector */}
          <div>
            <label htmlFor="vyc-crop" className="label-field">Crop</label>
            <select
              id="vyc-crop"
              value={cropId}
              onChange={(e) => setCropId(e.target.value)}
              className="input-field mt-1.5"
            >
              {CROPS.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-bark-500">
              {crop.note}
            </p>
          </div>

          {/* Plants or area input */}
          {mode === 'plants' ? (
            <div>
              <label htmlFor="vyc-plants" className="label-field">Number of plants</label>
              <input
                id="vyc-plants"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={plants}
                onChange={handlePlantsChange}
                className="input-field mt-1.5"
              />
            </div>
          ) : (
            <div>
              <label htmlFor="vyc-area" className="label-field">
                Growing area <span className="text-bark-500">({areaUnit})</span>
              </label>
              <input
                id="vyc-area"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={area}
                onChange={handleAreaChange}
                className="input-field mt-1.5"
              />
              <p className="mt-1.5 text-xs text-bark-500">
                Plant count is estimated at {crop.sqftPerPlant} sq ft per {crop.name.toLowerCase()} plant.
              </p>
            </div>
          )}

          {/* Formula */}
          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            {mode === 'plants' ? (
              <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                Total yield = Number of plants &times; Yield per plant
              </p>
            ) : (
              <>
                <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                  Plants = Area &divide; Sq ft per plant
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  Total yield = Plants &times; Yield per plant
                </p>
              </>
            )}
          </div>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!result ? (
              <p className="p-5 text-sm text-bark-500">
                Enter {mode === 'plants' ? 'a number of plants' : 'a growing area'} above to estimate your yield.
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
                      <p className="text-xs text-bark-500">Estimated total yield</p>
                      <p className="font-display text-3xl font-bold text-moss-700">
                        {round(isMetric ? result.totalKg : result.totalLbs, 1).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">{weightUnit}</p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-4 sm:p-5">
                    <p className="text-xs text-moss-200">Plants</p>
                    <p className="font-display text-xl font-bold text-white">
                      {result.plantCount.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-moss-200">{crop.name}</p>
                    <p className="mt-2 text-xs text-moss-300">
                      ~{crop.yieldPerPlantLbs} lbs per plant
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    Estimate only — real yield varies with variety, climate, soil, and care.
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
