import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type Mode = 'coverage' | 'dli' | 'distance';
type UnitSystem = 'imperial' | 'metric';
type LightNeed = 'low' | 'medium' | 'high';
type PlantCategory = 'seedlings' | 'houseplants' | 'leafy-greens' | 'fruiting';
type LightType = 'led' | 'fluorescent';
type GrowthStage = 'seedling' | 'mature';

const STORAGE_KEY = 'grow-light-calculator-state-v1';

interface SavedState {
  mode: Mode;
  unitSystem: UnitSystem;
  area: string;
  lightNeed: LightNeed;
  hoursPerDay: string;
  electricityRate: string;
  ppfd: string;
  photoperiod: string;
  comparePlant: PlantCategory | 'none';
  lightType: LightType;
  growthStage: GrowthStage;
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
  if (value === '' || value === '.') return value;
  const num = parseFloat(value);
  if (!Number.isFinite(num) || num < 0) return '';
  return value;
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

const CM_PER_IN = 2.54;
const SQM_PER_SQFT = 0.092903;

// Typical actual-watt (input wattage, not "equivalent") LED guidance per
// square foot of growing area, by plant light-need tier. General industry
// rule-of-thumb ranges, not tied to a single study.
const WATTAGE_PER_SQFT: Record<LightNeed, [number, number]> = {
  low: [15, 20],
  medium: [25, 35],
  high: [40, 50],
};

const LIGHT_NEED_LABELS: Record<LightNeed, string> = {
  low: 'Low (seedlings, low-light houseplants)',
  medium: 'Medium (leafy greens, herbs)',
  high: 'High (fruiting vegetables)',
};

// Target DLI ranges (mol/m2/day), cited from Virginia Cooperative Extension
// (SPES-720) and Michigan State University Extension floriculture guidance.
const DLI_TARGETS: Record<PlantCategory, [number, number]> = {
  seedlings: [5, 10],
  houseplants: [6, 10],
  'leafy-greens': [12, 20],
  fruiting: [20, 30],
};

const PLANT_CATEGORY_LABELS: Record<PlantCategory, string> = {
  seedlings: 'Seedlings / cuttings',
  houseplants: 'Low-light houseplants',
  'leafy-greens': 'Leafy greens & herbs',
  fruiting: 'Fruiting vegetables',
};

// Recommended hanging distance (inches) by light type and growth stage —
// typical manufacturer guidance for home-grower LED panels and T5
// fluorescent fixtures.
const DISTANCE_IN: Record<LightType, Record<GrowthStage, [number, number]>> = {
  led: {
    seedling: [18, 24],
    mature: [12, 18],
  },
  fluorescent: {
    seedling: [6, 12],
    mature: [6, 12],
  },
};

export default function GrowLightCalculator() {
  const saved = useRef<Partial<SavedState>>({});
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<Mode>('coverage');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');

  // Mode 1: Coverage & Wattage
  const [area, setArea] = useState<string>('9');
  const [lightNeed, setLightNeed] = useState<LightNeed>('medium');
  const [hoursPerDay, setHoursPerDay] = useState<string>('14');
  const [electricityRate, setElectricityRate] = useState<string>('0.18');

  // Mode 2: DLI Calculator
  const [ppfd, setPpfd] = useState<string>('400');
  const [photoperiod, setPhotoperiod] = useState<string>('14');
  const [comparePlant, setComparePlant] = useState<PlantCategory | 'none'>('leafy-greens');

  // Mode 3: Light Distance
  const [lightType, setLightType] = useState<LightType>('led');
  const [growthStage, setGrowthStage] = useState<GrowthStage>('mature');

  useEffect(() => {
    const s = loadSavedState();
    saved.current = s;
    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.area !== undefined) setArea(s.area);
    if (s.lightNeed) setLightNeed(s.lightNeed);
    if (s.hoursPerDay !== undefined) setHoursPerDay(s.hoursPerDay);
    if (s.electricityRate !== undefined) setElectricityRate(s.electricityRate);
    if (s.ppfd !== undefined) setPpfd(s.ppfd);
    if (s.photoperiod !== undefined) setPhotoperiod(s.photoperiod);
    if (s.comparePlant) setComparePlant(s.comparePlant);
    if (s.lightType) setLightType(s.lightType);
    if (s.growthStage) setGrowthStage(s.growthStage);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({
      mode, unitSystem, area, lightNeed, hoursPerDay, electricityRate,
      ppfd, photoperiod, comparePlant, lightType, growthStage,
    });
  }, [mode, unitSystem, area, lightNeed, hoursPerDay, electricityRate, ppfd, photoperiod, comparePlant, lightType, growthStage]);

  const isMetric = unitSystem === 'metric';
  const areaUnit = isMetric ? 'sq m' : 'sq ft';
  const distanceUnit = isMetric ? 'cm' : 'in';

  const handleUnitToggle = (next: UnitSystem) => {
    if (next === unitSystem) return;
    const goingMetric = next === 'metric';
    const a = parseFloat(area);
    if (Number.isFinite(a)) {
      setArea(round(goingMetric ? a * SQM_PER_SQFT : a / SQM_PER_SQFT, 2).toString());
    }
    setUnitSystem(next);
  };

  const handleNumericChange =
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
    };

  // --- Mode 1: Coverage & Wattage ---
  const coverageResult = useMemo(() => {
    const areaVal = parseFloat(area);
    const hours = parseFloat(hoursPerDay);
    const rate = parseFloat(electricityRate);
    if (!Number.isFinite(areaVal) || areaVal <= 0) return null;
    const areaSqFt = isMetric ? areaVal / SQM_PER_SQFT : areaVal;
    const [wLow, wHigh] = WATTAGE_PER_SQFT[lightNeed];
    const wattsLow = areaSqFt * wLow;
    const wattsHigh = areaSqFt * wHigh;
    const wattsMid = (wattsLow + wattsHigh) / 2;

    let dailyCost: number | null = null;
    let monthlyCost: number | null = null;
    if (Number.isFinite(hours) && hours > 0 && Number.isFinite(rate) && rate >= 0) {
      const dailyKwh = (wattsMid / 1000) * hours;
      dailyCost = dailyKwh * rate;
      monthlyCost = dailyCost * 30;
    }

    return { wattsLow, wattsHigh, wattsMid, dailyCost, monthlyCost, areaSqFt };
  }, [area, lightNeed, hoursPerDay, electricityRate, isMetric]);

  // --- Mode 2: DLI Calculator ---
  const dliResult = useMemo(() => {
    const ppfdVal = parseFloat(ppfd);
    const hoursVal = parseFloat(photoperiod);
    if (!Number.isFinite(ppfdVal) || ppfdVal <= 0) return null;
    if (!Number.isFinite(hoursVal) || hoursVal <= 0) return null;

    const dli = (ppfdVal * 3600 * hoursVal) / 1_000_000;

    let comparison: 'below' | 'within' | 'above' | null = null;
    if (comparePlant !== 'none') {
      const [lo, hi] = DLI_TARGETS[comparePlant];
      if (dli < lo) comparison = 'below';
      else if (dli > hi) comparison = 'above';
      else comparison = 'within';
    }

    return { dli, comparison };
  }, [ppfd, photoperiod, comparePlant]);

  // --- Mode 3: Light Distance ---
  const distanceResult = useMemo(() => {
    const [lowIn, highIn] = DISTANCE_IN[lightType][growthStage];
    const low = isMetric ? lowIn * CM_PER_IN : lowIn;
    const high = isMetric ? highIn * CM_PER_IN : highIn;
    return { low: round(low, 1), high: round(high, 1) };
  }, [lightType, growthStage, isMetric]);

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Grow Light Calculator Results', margin, y);
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
    doc.text(
      mode === 'coverage' ? 'Coverage & Wattage' : mode === 'dli' ? 'DLI Calculator' : 'Light Distance',
      margin, y,
    );
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    if (mode === 'coverage' && coverageResult) {
      const lines = [
        `Growing area: ${area} ${areaUnit}`,
        `Plant light need: ${LIGHT_NEED_LABELS[lightNeed]}`,
        `Recommended wattage: ${Math.round(coverageResult.wattsLow)}–${Math.round(coverageResult.wattsHigh)} W`,
      ];
      if (coverageResult.dailyCost !== null) {
        lines.push(`Photoperiod: ${hoursPerDay} hr/day`);
        lines.push(`Electricity rate: $${electricityRate}/kWh`);
        lines.push(`Estimated cost: $${round(coverageResult.dailyCost, 2)}/day · $${round(coverageResult.monthlyCost!, 2)}/month`);
      }
      lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    } else if (mode === 'dli' && dliResult) {
      const lines = [
        `PPFD: ${ppfd} µmol/m²/s`,
        `Photoperiod: ${photoperiod} hr/day`,
        `Calculated DLI: ${round(dliResult.dli, 1)} mol/m²/day`,
      ];
      if (comparePlant !== 'none' && dliResult.comparison) {
        lines.push(`vs. ${PLANT_CATEGORY_LABELS[comparePlant]} target (${DLI_TARGETS[comparePlant][0]}–${DLI_TARGETS[comparePlant][1]}): ${dliResult.comparison}`);
      }
      lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    } else if (mode === 'distance' && distanceResult) {
      const lines = [
        `Light type: ${lightType === 'led' ? 'LED' : 'Fluorescent'}`,
        `Growth stage: ${growthStage === 'seedling' ? 'Seedling' : 'Mature'}`,
        `Recommended hanging distance: ${distanceResult.low}–${distanceResult.high} ${distanceUnit}`,
      ];
      lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    }

    doc.save('grow-light-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Grow Light Calculator
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Mode + unit toggles */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="label-field">Mode</span>
              <div className="mt-2 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'coverage'}
                  onClick={() => setMode('coverage')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'coverage'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Coverage & Wattage
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'dli'}
                  onClick={() => setMode('dli')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'dli'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  DLI Calculator
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'distance'}
                  onClick={() => setMode('distance')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'distance'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Light Distance
                </button>
              </div>
            </div>

            {(mode === 'coverage' || mode === 'distance') && (
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

          {/* --- Mode 1: Coverage & Wattage --- */}
          {mode === 'coverage' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="glc-area" className="label-field">
                    Growing area <span className="text-bark-500">({areaUnit})</span>
                  </label>
                  <input
                    id="glc-area"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={area}
                    onChange={handleNumericChange(setArea)}
                    className="input-field mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="glc-need" className="label-field">
                    Plant light need
                  </label>
                  <select
                    id="glc-need"
                    value={lightNeed}
                    onChange={(e) => setLightNeed(e.target.value as LightNeed)}
                    className="input-field mt-1.5"
                  >
                    <option value="low">{LIGHT_NEED_LABELS.low}</option>
                    <option value="medium">{LIGHT_NEED_LABELS.medium}</option>
                    <option value="high">{LIGHT_NEED_LABELS.high}</option>
                  </select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="glc-hours" className="label-field">
                    Hours per day <span className="text-bark-500">(optional, for cost)</span>
                  </label>
                  <input
                    id="glc-hours"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="24"
                    step="0.5"
                    value={hoursPerDay}
                    onChange={handleNumericChange(setHoursPerDay)}
                    className="input-field mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="glc-rate" className="label-field">
                    Electricity rate <span className="text-bark-500">($/kWh)</span>
                  </label>
                  <input
                    id="glc-rate"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={electricityRate}
                    onChange={handleNumericChange(setElectricityRate)}
                    className="input-field mt-1.5"
                  />
                  <p className="mt-1.5 text-xs text-bark-500">
                    Defaults to a recent US residential average. Edit to match your bill.
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
                <p className="font-medium text-bark-700">The math:</p>
                <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                  Wattage = Area &times; Watts per {isMetric ? 'sq m' : 'sq ft'} (tier range)
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  Daily cost = (Watts &divide; 1000) &times; Hours &times; Rate
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!coverageResult ? (
                  <p className="p-5 text-sm text-bark-500">
                    Enter your growing area above to see a recommended wattage range.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 divide-x divide-moss-200">
                      <div className="flex items-center gap-3 p-4 sm:p-5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                          <svg className="h-5 w-5 text-moss-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M12 2a7 7 0 0 0-4 12.7V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.3A7 7 0 0 0 12 2ZM10 21h4" stroke="currentColor" strokeWidth="0.5"/>
                          </svg>
                        </span>
                        <div>
                          <p className="text-xs text-bark-500">Recommended wattage</p>
                          <p className="font-display text-2xl font-bold text-moss-700">
                            {Math.round(coverageResult.wattsLow)}&ndash;{Math.round(coverageResult.wattsHigh)} W
                          </p>
                          <p className="text-xs font-medium text-bark-600">actual input watts</p>
                        </div>
                      </div>

                      <div className="bg-moss-700 p-4 sm:p-5">
                        <p className="text-xs text-moss-200">Estimated cost</p>
                        {coverageResult.dailyCost !== null ? (
                          <>
                            <p className="font-display text-xl font-bold text-white">
                              ${round(coverageResult.dailyCost, 2)}/day
                            </p>
                            <p className="mt-1 text-xs text-moss-200">
                              ~${round(coverageResult.monthlyCost!, 2)}/month
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 text-xs text-moss-200">
                            Add hours/day and a rate to estimate cost.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-moss-200 bg-white px-4 py-2.5">
                      <p className="text-xs text-bark-500">
                        Rule-of-thumb ranges for home growing setups, not a professional lighting design.
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
            </>
          )}

          {/* --- Mode 2: DLI Calculator --- */}
          {mode === 'dli' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="glc-ppfd" className="label-field">
                    PPFD reading <span className="text-bark-500">(µmol/m&sup2;/s)</span>
                  </label>
                  <input
                    id="glc-ppfd"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="10"
                    value={ppfd}
                    onChange={handleNumericChange(setPpfd)}
                    className="input-field mt-1.5"
                  />
                  <p className="mt-1.5 text-xs text-bark-500">
                    From a light meter, held at plant canopy height.
                  </p>
                </div>
                <div>
                  <label htmlFor="glc-photoperiod" className="label-field">
                    Photoperiod <span className="text-bark-500">(hours/day)</span>
                  </label>
                  <input
                    id="glc-photoperiod"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max="24"
                    step="0.5"
                    value={photoperiod}
                    onChange={handleNumericChange(setPhotoperiod)}
                    className="input-field mt-1.5"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="glc-compare" className="label-field">
                  Compare against <span className="text-bark-500">(optional)</span>
                </label>
                <select
                  id="glc-compare"
                  value={comparePlant}
                  onChange={(e) => setComparePlant(e.target.value as PlantCategory | 'none')}
                  className="input-field mt-1.5"
                >
                  <option value="none">No comparison</option>
                  <option value="seedlings">{PLANT_CATEGORY_LABELS.seedlings}</option>
                  <option value="houseplants">{PLANT_CATEGORY_LABELS.houseplants}</option>
                  <option value="leafy-greens">{PLANT_CATEGORY_LABELS['leafy-greens']}</option>
                  <option value="fruiting">{PLANT_CATEGORY_LABELS.fruiting}</option>
                </select>
              </div>

              <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
                <p className="font-medium text-bark-700">The math:</p>
                <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                  DLI = (PPFD &times; 3600 &times; Photoperiod) &divide; 1,000,000
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!dliResult ? (
                  <p className="p-5 text-sm text-bark-500">
                    Enter a PPFD reading and photoperiod above to calculate DLI.
                  </p>
                ) : (
                  <>
                    <div className="p-4 sm:p-5">
                      <p className="text-xs text-bark-500">Calculated DLI</p>
                      <p className="font-display text-3xl font-bold text-moss-700">
                        {round(dliResult.dli, 1)} <span className="text-lg font-semibold">mol/m&sup2;/day</span>
                      </p>
                      {comparePlant !== 'none' && dliResult.comparison && (
                        <p className={`mt-2 text-sm font-medium ${
                          dliResult.comparison === 'within' ? 'text-moss-700' : 'text-bark-700'
                        }`}>
                          {dliResult.comparison === 'within' && `Within the typical target range for ${PLANT_CATEGORY_LABELS[comparePlant]} (${DLI_TARGETS[comparePlant][0]}–${DLI_TARGETS[comparePlant][1]} mol/m²/day).`}
                          {dliResult.comparison === 'below' && `Below the typical target range for ${PLANT_CATEGORY_LABELS[comparePlant]} (${DLI_TARGETS[comparePlant][0]}–${DLI_TARGETS[comparePlant][1]} mol/m²/day) — consider more hours or a stronger light.`}
                          {dliResult.comparison === 'above' && `Above the typical target range for ${PLANT_CATEGORY_LABELS[comparePlant]} (${DLI_TARGETS[comparePlant][0]}–${DLI_TARGETS[comparePlant][1]} mol/m²/day) — likely more light than needed.`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-moss-200 bg-white px-4 py-2.5">
                      <p className="text-xs text-bark-500">
                        Target ranges are typical guidance, not a fixed requirement.
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
            </>
          )}

          {/* --- Mode 3: Light Distance --- */}
          {mode === 'distance' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="glc-light-type" className="label-field">
                    Light type
                  </label>
                  <select
                    id="glc-light-type"
                    value={lightType}
                    onChange={(e) => setLightType(e.target.value as LightType)}
                    className="input-field mt-1.5"
                  >
                    <option value="led">LED</option>
                    <option value="fluorescent">Fluorescent (T5)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="glc-stage" className="label-field">
                    Growth stage
                  </label>
                  <select
                    id="glc-stage"
                    value={growthStage}
                    onChange={(e) => setGrowthStage(e.target.value as GrowthStage)}
                    className="input-field mt-1.5"
                  >
                    <option value="seedling">Seedling</option>
                    <option value="mature">Mature / vegetative</option>
                  </select>
                </div>
              </div>

              <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
                <p className="font-medium text-bark-700">The logic:</p>
                <p className="mt-1 text-xs text-bark-600 sm:text-sm">
                  Closer light = higher intensity at the leaf, but less even coverage and more heat stress risk. Mature plants tolerate closer, more intense light better than seedlings.
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-bark-500">Recommended hanging distance</p>
                  <p className="font-display text-3xl font-bold text-moss-700">
                    {distanceResult.low}&ndash;{distanceResult.high} {distanceUnit}
                  </p>
                  <p className="mt-1 text-xs font-medium text-bark-600">
                    above the plant canopy
                  </p>
                </div>
                <div className="flex items-center justify-between border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    Typical manufacturer guidance — check your specific fixture&rsquo;s spec sheet too.
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
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
