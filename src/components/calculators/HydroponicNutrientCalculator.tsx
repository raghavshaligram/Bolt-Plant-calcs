import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type VolumeUnit = 'ml' | 'tsp' | 'tbsp';
type GrowthStage = 'seedling' | 'vegetative' | 'flowering';

const STORAGE_KEY = 'hydroponic-nutrient-calculator-state-v1';

// Growth-stage dose multipliers, expressed as the midpoint of each range
// given in the page spec (Seedling/Clone 25-50%, Vegetative 75-100%,
// Flowering/Fruiting 100-125% for heavy feeders). These are generic
// scaling percentages applied to whatever dose rate the user's own
// product label specifies -- not a fixed brand recipe.
const GROWTH_STAGES: Record<GrowthStage, { label: string; range: string; percent: number }> = {
  seedling: { label: 'Seedling / Clone', range: '25-50% of label dose', percent: 37.5 },
  vegetative: { label: 'Vegetative', range: '75-100% of label dose', percent: 87.5 },
  flowering: { label: 'Flowering / Fruiting', range: '100-125% of label dose (heavy feeders)', percent: 112.5 },
};

// Volume conversions to milliliters.
const TSP_TO_ML = 4.92892;
const TBSP_TO_ML = 14.7868;
const GAL_TO_L = 3.78541;

// EC-to-PPM conversion factors for the three scales used across meter
// brands. EC (mS/cm, the international standard) x factor = PPM on that
// scale. Confirmed against Bluelab's own technical reference article
// (support.bluelab.com) and cross-checked via independent hydroponics
// industry sources.
const PPM_500_FACTOR = 500;
const PPM_640_FACTOR = 640;
const PPM_700_FACTOR = 700;

interface SavedState {
  reservoirVolume: string;
  reservoirUnit: 'gal' | 'l';
  perUnitVolume: string;
  doseAmount: string;
  doseUnit: VolumeUnit;
  growthStage: GrowthStage;
  ecValue: string;
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
    // localStorage may be unavailable (private mode, quota) -- fail silently.
  }
}

function toMl(value: number, unit: VolumeUnit): number {
  if (unit === 'tsp') return value * TSP_TO_ML;
  if (unit === 'tbsp') return value * TBSP_TO_ML;
  return value;
}

function fromMl(value: number, unit: VolumeUnit): number {
  if (unit === 'tsp') return value / TSP_TO_ML;
  if (unit === 'tbsp') return value / TBSP_TO_ML;
  return value;
}

const UNIT_LABELS: Record<VolumeUnit, string> = { ml: 'ml', tsp: 'tsp', tbsp: 'tbsp' };

export default function HydroponicNutrientCalculator() {
  const hasLoaded = useRef(false);

  // Section 1: Nutrient Dosing
  const [reservoirVolume, setReservoirVolume] = useState<string>('5');
  const [reservoirUnit, setReservoirUnit] = useState<'gal' | 'l'>('gal');
  const [perUnitVolume, setPerUnitVolume] = useState<string>('1');
  const [doseAmount, setDoseAmount] = useState<string>('5');
  const [doseUnit, setDoseUnit] = useState<VolumeUnit>('ml');
  const [growthStage, setGrowthStage] = useState<GrowthStage>('vegetative');

  // Section 2: EC <-> PPM Converter
  const [ecValue, setEcValue] = useState<string>('1.8');

  useEffect(() => {
    const s = loadSavedState();
    if (s.reservoirVolume !== undefined) setReservoirVolume(s.reservoirVolume);
    if (s.reservoirUnit) setReservoirUnit(s.reservoirUnit);
    if (s.perUnitVolume !== undefined) setPerUnitVolume(s.perUnitVolume);
    if (s.doseAmount !== undefined) setDoseAmount(s.doseAmount);
    if (s.doseUnit) setDoseUnit(s.doseUnit);
    if (s.growthStage) setGrowthStage(s.growthStage);
    if (s.ecValue !== undefined) setEcValue(s.ecValue);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({
      reservoirVolume,
      reservoirUnit,
      perUnitVolume,
      doseAmount,
      doseUnit,
      growthStage,
      ecValue,
    });
  }, [reservoirVolume, reservoirUnit, perUnitVolume, doseUnit, doseAmount, growthStage, ecValue]);

  const dosing = useMemo(() => {
    let resVol = parseFloat(reservoirVolume);
    resVol = Number.isFinite(resVol) ? resVol : 0;
    const reservoirLiters = reservoirUnit === 'gal' ? resVol * GAL_TO_L : resVol;

    // "Per-unit volume" is entered in the SAME unit as the reservoir (gal
    // or L) -- e.g. a label that doses "5ml per gallon" means per-unit
    // volume = 1 gallon. Keeping both sides of the division in the same
    // unit is what makes "Reservoir volume / label's per-unit volume"
    // dimensionally correct (a plain count of label-defined units).
    let perUnit = parseFloat(perUnitVolume);
    perUnit = Number.isFinite(perUnit) && perUnit > 0 ? perUnit : 0;

    let dose = parseFloat(doseAmount);
    dose = Number.isFinite(dose) ? dose : 0;
    const doseMl = toMl(dose, doseUnit);

    const stagePercent = GROWTH_STAGES[growthStage].percent / 100;

    // Nutrient amount = (Reservoir volume / label's per-unit volume) x
    // label's dose x growth-stage %.
    const units = perUnit > 0 ? resVol / perUnit : 0;
    const baseAmountMl = units * doseMl;
    const scaledAmountMl = baseAmountMl * stagePercent;

    return {
      reservoirLiters,
      units,
      baseAmountMl,
      scaledAmountMl,
      scaledAmountDisplay: fromMl(scaledAmountMl, doseUnit),
    };
  }, [reservoirVolume, reservoirUnit, perUnitVolume, doseAmount, doseUnit, growthStage]);

  const ecConversion = useMemo(() => {
    let ec = parseFloat(ecValue);
    ec = Number.isFinite(ec) ? Math.max(0, ec) : 0;
    return {
      ec,
      ppm500: ec * PPM_500_FACTOR,
      ppm640: ec * PPM_640_FACTOR,
      ppm700: ec * PPM_700_FACTOR,
    };
  }, [ecValue]);

  const hasDosingResult = dosing.units > 0 && dosing.scaledAmountMl > 0;
  const hasEcResult = ecConversion.ec > 0;

  const handleNumericChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Hydroponic Nutrient Calculator Results', margin, y);
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
    doc.text('Nutrient Dosing', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const dosingLines = [
      `Reservoir volume: ${reservoirVolume || 0} ${reservoirUnit === 'gal' ? 'gal' : 'L'}`,
      `Label dose: ${doseAmount || 0} ${UNIT_LABELS[doseUnit]} per ${perUnitVolume || 0} ${reservoirUnit === 'gal' ? 'gal' : 'L'}`,
      `Growth stage: ${GROWTH_STAGES[growthStage].label} (${GROWTH_STAGES[growthStage].percent}% of label dose)`,
      `Nutrient concentrate needed: ${round(dosing.scaledAmountDisplay, 2).toLocaleString()} ${UNIT_LABELS[doseUnit]}`,
    ];
    dosingLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 16;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('EC ↔ PPM Converter', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const ecLines = [
      `EC: ${ecValue || 0} mS/cm`,
      `PPM (500 scale): ${round(ecConversion.ppm500, 0).toLocaleString()}`,
      `PPM (640 scale): ${round(ecConversion.ppm640, 0).toLocaleString()}`,
      `PPM (700 scale): ${round(ecConversion.ppm700, 0).toLocaleString()}`,
    ];
    ecLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 20;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('This tool scales your own product label dose -- it does not prescribe a brand-specific recipe.', margin, y);

    doc.save('hydroponic-nutrient-calculator-results.pdf');
  };

  return (
    <div className="not-prose flex flex-col gap-6">
      {/* Section 1: Nutrient Dosing */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">Nutrient Dosing</h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="hn-reservoir-volume" className="label-field">
                Reservoir volume
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="hn-reservoir-volume"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.5"
                  value={reservoirVolume}
                  onChange={handleNumericChange(setReservoirVolume)}
                  className="input-field"
                />
                <select
                  aria-label="Reservoir volume unit"
                  value={reservoirUnit}
                  onChange={(e) => setReservoirUnit(e.target.value as 'gal' | 'l')}
                  className="input-field w-24"
                >
                  <option value="gal">gal</option>
                  <option value="l">L</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="hn-growth-stage" className="label-field">
                Growth stage
              </label>
              <select
                id="hn-growth-stage"
                value={growthStage}
                onChange={(e) => setGrowthStage(e.target.value as GrowthStage)}
                className="input-field mt-1.5"
              >
                {(Object.keys(GROWTH_STAGES) as GrowthStage[]).map((key) => (
                  <option key={key} value={key}>
                    {GROWTH_STAGES[key].label} ({GROWTH_STAGES[key].percent}%)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-lg bg-sand-50 p-4 ring-1 ring-moss-100">
            <p className="mb-3 text-sm font-medium text-bark-700">Your product&rsquo;s label dose</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="hn-dose-amount" className="label-field">
                  Dose amount
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="hn-dose-amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={doseAmount}
                    onChange={handleNumericChange(setDoseAmount)}
                    className="input-field"
                  />
                  <select
                    aria-label="Dose amount unit"
                    value={doseUnit}
                    onChange={(e) => setDoseUnit(e.target.value as VolumeUnit)}
                    className="input-field w-24"
                  >
                    <option value="ml">ml</option>
                    <option value="tsp">tsp</option>
                    <option value="tbsp">tbsp</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="hn-per-unit-volume" className="label-field">
                  Per how many {reservoirUnit === 'gal' ? 'gallons' : 'liters'}
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="hn-per-unit-volume"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.5"
                    value={perUnitVolume}
                    onChange={handleNumericChange(setPerUnitVolume)}
                    className="input-field"
                  />
                  <span className="input-field flex w-24 items-center justify-center text-bark-500">
                    {reservoirUnit === 'gal' ? 'gal' : 'L'}
                  </span>
                </div>
              </div>
            </div>
            <p className="mt-2.5 text-xs text-bark-500">
              Read this straight off your product&rsquo;s label &mdash; most say &ldquo;per gallon&rdquo; or
              &ldquo;per liter,&rdquo; so enter 1 here to match. A label dosing every 2 gallons would use 2
              instead.
            </p>
          </div>

          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
              Nutrient amount = (Reservoir volume &divide; label&rsquo;s per-unit volume) &times; label&rsquo;s dose &times; growth-stage %
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasDosingResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your reservoir volume and your product&rsquo;s label dose above to see how much concentrate to add.
              </p>
            ) : (
              <>
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-bark-500">Add this much concentrate</p>
                  <p className="font-display text-3xl font-bold text-moss-700">
                    {round(dosing.scaledAmountDisplay, 2).toLocaleString()} {UNIT_LABELS[doseUnit]}
                  </p>
                </div>
                <div className="border-t border-moss-200 bg-white px-4 py-3">
                  <p className="text-xs leading-relaxed text-bark-600">
                    That&rsquo;s the label&rsquo;s base dose scaled to {GROWTH_STAGES[growthStage].percent}% for{' '}
                    {GROWTH_STAGES[growthStage].label.toLowerCase()} ({GROWTH_STAGES[growthStage].range}).
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Section 2: EC <-> PPM Converter */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">EC &harr; PPM Converter</h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="max-w-xs">
            <label htmlFor="hn-ec-value" className="label-field">
              EC <span className="text-bark-500">(mS/cm)</span>
            </label>
            <input
              id="hn-ec-value"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={ecValue}
              onChange={handleNumericChange(setEcValue)}
              className="input-field mt-1.5"
            />
          </div>

          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
              PPM = EC &times; scale factor (500, 640, or 700)
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasEcResult ? (
              <p className="p-5 text-sm text-bark-500">Enter your EC reading above to convert it to all three PPM scales.</p>
            ) : (
              <div className="grid grid-cols-1 divide-y divide-moss-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-bark-500">500 scale</p>
                  <p className="font-display text-2xl font-bold text-moss-700">{round(ecConversion.ppm500, 0).toLocaleString()}</p>
                  <p className="text-xs text-bark-500">Hanna, Milwaukee, GH, Oakton</p>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-bark-500">640 scale</p>
                  <p className="font-display text-2xl font-bold text-moss-700">{round(ecConversion.ppm640, 0).toLocaleString()}</p>
                  <p className="text-xs text-bark-500">Some European meters</p>
                </div>
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-bark-500">700 scale</p>
                  <p className="font-display text-2xl font-bold text-moss-700">{round(ecConversion.ppm700, 0).toLocaleString()}</p>
                  <p className="text-xs text-bark-500">Bluelab, Eutech, Truncheon</p>
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-moss-200">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Which PPM scale does my meter use?</caption>
              <thead className="bg-moss-50 text-xs uppercase tracking-wide text-bark-500">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Scale</th>
                  <th scope="col" className="px-4 py-2.5 font-semibold">Common meter brands</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-moss-100">
                <tr>
                  <td className="px-4 py-2.5 font-medium text-bark-800">500</td>
                  <td className="px-4 py-2.5 text-bark-600">Hanna, Milwaukee, General Hydroponics, Oakton</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-bark-800">640</td>
                  <td className="px-4 py-2.5 text-bark-600">Some European meters</td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-bark-800">700</td>
                  <td className="px-4 py-2.5 text-bark-600">Bluelab, Eutech, Truncheon</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-xs leading-relaxed text-bark-600">
            <strong className="text-bark-800">EC is the reliable number.</strong> It&rsquo;s the international,
            meter-agnostic measurement of conductivity. PPM is a convenience conversion that depends entirely on
            which scale your meter uses &mdash; treat EC as your primary reading, and use this converter only
            when you need to translate someone else&rsquo;s PPM-based chart or feeding schedule into a number
            your meter will actually show.
          </p>

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
