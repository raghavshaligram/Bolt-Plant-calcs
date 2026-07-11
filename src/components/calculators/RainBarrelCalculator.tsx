import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type UnitSystem = 'imperial' | 'metric';

const STORAGE_KEY = 'rain-barrel-calculator-state-v1';

// Gallons per sq ft per inch of rain: 1 inch of rain over 1 sq ft = 0.623
// gallons (a standard rainwater-harvesting conversion factor).
const GALLONS_PER_SQFT_PER_INCH = 0.623;
const BARREL_SIZE_GAL = 50;

// PSI per foot of water height (hydrostatic pressure), a physical constant.
const PSI_PER_FT = 0.433;

const SQM_TO_SQFT = 10.7639;
const MM_TO_IN = 0.0393701;
const M_TO_FT = 3.28084;
const GAL_TO_L = 3.78541;

interface SavedState {
  unitSystem: UnitSystem;
  roofArea: string;
  rainfall: string;
  efficiency: string;
  height: string;
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

export default function RainBarrelCalculator() {
  const hasLoaded = useRef(false);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [roofArea, setRoofArea] = useState<string>('1200');
  const [rainfall, setRainfall] = useState<string>('1');
  const [efficiency, setEfficiency] = useState<string>('85');
  const [height, setHeight] = useState<string>('3');

  useEffect(() => {
    const s = loadSavedState();
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.roofArea !== undefined) setRoofArea(s.roofArea);
    if (s.rainfall !== undefined) setRainfall(s.rainfall);
    if (s.efficiency !== undefined) setEfficiency(s.efficiency);
    if (s.height !== undefined) setHeight(s.height);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ unitSystem, roofArea, rainfall, efficiency, height });
  }, [unitSystem, roofArea, rainfall, efficiency, height]);

  const isMetric = unitSystem === 'metric';
  const areaUnit = isMetric ? 'm²' : 'sq ft';
  const rainUnit = isMetric ? 'mm' : 'in';
  const heightUnit = isMetric ? 'm' : 'ft';

  const harvest = useMemo(() => {
    let area = parseFloat(roofArea);
    area = Number.isFinite(area) ? area : 0;
    const sqft = isMetric ? area * SQM_TO_SQFT : area;

    let rain = parseFloat(rainfall);
    rain = Number.isFinite(rain) ? rain : 0;
    const rainIn = isMetric ? rain * MM_TO_IN : rain;

    let eff = parseFloat(efficiency);
    eff = Number.isFinite(eff) ? eff : 0;
    const effFraction = Math.min(100, Math.max(0, eff)) / 100;

    const gallons = sqft * rainIn * GALLONS_PER_SQFT_PER_INCH * effFraction;
    const barrels = Math.ceil(gallons / BARREL_SIZE_GAL);
    const liters = gallons * GAL_TO_L;

    return { sqft, rainIn, effFraction, gallons, barrels, liters };
  }, [roofArea, rainfall, efficiency, isMetric]);

  const pressure = useMemo(() => {
    let h = parseFloat(height);
    h = Number.isFinite(h) ? h : 0;
    const heightFt = isMetric ? h * M_TO_FT : h;
    const psi = Math.max(0, heightFt * PSI_PER_FT);
    return { heightFt, psi };
  }, [height, isMetric]);

  const hasHarvestResult = harvest.sqft > 0 && harvest.rainIn > 0;
  const hasPressureResult = pressure.heightFt > 0;

  const handleNumericChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Rain Barrel Calculator Results', margin, y);
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
    doc.text('Rainwater Harvesting', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const harvestLines = [
      `Roof area: ${roofArea || 0} ${areaUnit}`,
      `Rainfall: ${rainfall || 0} ${rainUnit}`,
      `Collection efficiency: ${efficiency || 0}%`,
      `Gallons collected: ${round(harvest.gallons, 1).toLocaleString()} gal (${round(harvest.liters, 1).toLocaleString()} L)`,
      `Recommended 50-gal barrels: ${harvest.barrels.toLocaleString()}`,
    ];
    harvestLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Water Pressure (PSI)', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const pressureLines = [
      `Water surface height above spigot: ${height || 0} ${heightUnit}`,
      `Water pressure: ${round(pressure.psi, 2)} PSI`,
    ];
    pressureLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 20;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Collection is an estimate; real-world yield varies with roof material and rainfall intensity.', margin, y);

    doc.save('rain-barrel-calculator-results.pdf');
  };

  return (
    <div className="not-prose flex flex-col gap-6">
      {/* Section 1: Rainwater Harvesting */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">Rainwater Harvesting</h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="label-field">Units</span>
            <div className="inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
              <button
                type="button"
                aria-pressed={!isMetric}
                onClick={() => setUnitSystem('imperial')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  !isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                Imperial (ft, in)
              </button>
              <button
                type="button"
                aria-pressed={isMetric}
                onClick={() => setUnitSystem('metric')}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                Metric (m, mm)
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="rb-roof-area" className="label-field">
                Roof area <span className="text-bark-500">({areaUnit})</span>
              </label>
              <input
                id="rb-roof-area"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={roofArea}
                onChange={handleNumericChange(setRoofArea)}
                className="input-field mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="rb-rainfall" className="label-field">
                Rainfall <span className="text-bark-500">({rainUnit})</span>
              </label>
              <input
                id="rb-rainfall"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.1"
                value={rainfall}
                onChange={handleNumericChange(setRainfall)}
                className="input-field mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="rb-efficiency" className="label-field">
                Collection efficiency <span className="text-bark-500">(%)</span>
              </label>
              <input
                id="rb-efficiency"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="1"
                value={efficiency}
                onChange={handleNumericChange(setEfficiency)}
                className="input-field mt-1.5"
              />
              <p className="mt-1.5 text-xs text-bark-500">85% is a common default (evaporation, overflow, first-flush loss).</p>
            </div>
          </div>

          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
              Gallons = Roof area (sq ft) &times; Rainfall (in) &times; 0.623 &times; Efficiency
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasHarvestResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your roof area and rainfall amount above to see how much water you can collect.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                        <path d="M16 3c3 6 8 13 8 18a8 8 0 1 1-16 0c0-5 5-12 8-18Z" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">You can collect</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {round(harvest.gallons, 1).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        gallons <span className="ml-1 text-bark-400">({round(harvest.liters, 1).toLocaleString()} L)</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-4 sm:p-5">
                    <p className="text-xs text-moss-200">That&rsquo;s about</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">{harvest.barrels.toLocaleString()}</p>
                    <p className="text-xs text-moss-200">{harvest.barrels === 1 ? 'standard 50-gal barrel' : 'standard 50-gal barrels'}</p>
                  </div>
                </div>
                <div className="border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    At {efficiency || 0}% collection efficiency, from {round(harvest.sqft, 0).toLocaleString()} sq ft.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: Water Pressure (PSI) */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">Water Pressure (PSI)</h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="max-w-xs">
            <label htmlFor="rb-height" className="label-field">
              Height of water surface above spigot <span className="text-bark-500">({heightUnit})</span>
            </label>
            <input
              id="rb-height"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={height}
              onChange={handleNumericChange(setHeight)}
              className="input-field mt-1.5"
            />
          </div>

          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">PSI = 0.433 &times; height (ft)</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasPressureResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter the height of the water surface above your spigot to see the water pressure.
              </p>
            ) : (
              <>
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-bark-500">Water pressure</p>
                  <p className="font-display text-3xl font-bold text-moss-700">{round(pressure.psi, 2)} PSI</p>
                </div>
                <div className="border-t border-moss-200 bg-white px-4 py-3">
                  <p className="text-xs leading-relaxed text-bark-600">
                    {pressure.psi < 3
                      ? 'Under 3 PSI: enough for gravity-fed drip irrigation, not much else.'
                      : pressure.psi < 8
                      ? '3–8 PSI: workable for drip irrigation and soaker hoses. A standard sprinkler needs 15–30 PSI, so you’ll need a pump for that.'
                      : 'Above 8 PSI: still well under standard sprinkler pressure (15–30 PSI) — a booster pump is the practical way to get there from a barrel alone.'}
                  </p>
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
        </div>
      </div>
    </div>
  );
}
