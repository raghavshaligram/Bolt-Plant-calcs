import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from HydroponicNutrientCalculator.tsx (Calculator Page Redesign
// rollout -- see CALC_ROLLOUT_PATTERN.md). This hook is now the single
// source of truth for both sections -- Nutrient Dosing and the EC/PPM
// converter -- so HydroponicNutrientCalculatorCard.tsx (pure presentational),
// HydroponicNutrientReferenceTables.tsx (the static PPM-scale lookup table,
// portaled into the article), and HydroponicNutrientCalculatorPanel.tsx (the
// action row + Share/Embed/Cite modal) all read/write the same state.

export type VolumeUnit = 'ml' | 'tsp' | 'tbsp';
export type ReservoirUnit = 'gal' | 'l';
export type GrowthStage = 'seedling' | 'vegetative' | 'flowering';

const STORAGE_KEY = 'hydroponic-nutrient-calculator-state-v1';

// Growth-stage dose multipliers, expressed as the midpoint of each range
// given in the page spec (Seedling/Clone 25-50%, Vegetative 75-100%,
// Flowering/Fruiting 100-125% for heavy feeders). These are generic
// scaling percentages applied to whatever dose rate the user's own
// product label specifies -- not a fixed brand recipe.
export const GROWTH_STAGES: Record<GrowthStage, { label: string; range: string; percent: number }> = {
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

export interface SavedState {
  reservoirVolume: string;
  reservoirUnit: ReservoirUnit;
  perUnitVolume: string;
  doseAmount: string;
  doseUnit: VolumeUnit;
  growthStage: GrowthStage;
  ecValue: string;
}

export interface DosingResult {
  reservoirLiters: number;
  units: number;
  baseAmountMl: number;
  scaledAmountMl: number;
  scaledAmountDisplay: number;
}

export interface EcConversionResult {
  ec: number;
  ppm500: number;
  ppm640: number;
  ppm700: number;
}

export function round(value: number, decimals = 2): number {
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

/**
 * Reads reservoirVolume/reservoirUnit/perUnitVolume/doseAmount/doseUnit/
 * growthStage/ecValue from the page's URL query string -- the foundation of
 * the "share with results" feature. Only returns a non-null object when at
 * least one of the "core" params -- reservoirVolume, doseAmount, or ecValue
 * (one essential to each of this calculator's two independent results) -- is
 * present, so a plain bookmarked/shared-without-results URL never
 * accidentally overrides a returning visitor's saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('reservoirVolume') && !params.has('doseAmount') && !params.has('ecValue')) return null;

  const out: Partial<SavedState> = {};
  const reservoirVolume = params.get('reservoirVolume');
  const reservoirUnit = params.get('reservoirUnit');
  const perUnitVolume = params.get('perUnitVolume');
  const doseAmount = params.get('doseAmount');
  const doseUnit = params.get('doseUnit');
  const growthStage = params.get('growthStage');
  const ecValue = params.get('ecValue');

  if (reservoirVolume && /^\d*\.?\d*$/.test(reservoirVolume)) out.reservoirVolume = reservoirVolume;
  if (reservoirUnit === 'gal' || reservoirUnit === 'l') out.reservoirUnit = reservoirUnit;
  if (perUnitVolume && /^\d*\.?\d*$/.test(perUnitVolume)) out.perUnitVolume = perUnitVolume;
  if (doseAmount && /^\d*\.?\d*$/.test(doseAmount)) out.doseAmount = doseAmount;
  if (doseUnit === 'ml' || doseUnit === 'tsp' || doseUnit === 'tbsp') out.doseUnit = doseUnit;
  if (growthStage === 'seedling' || growthStage === 'vegetative' || growthStage === 'flowering') out.growthStage = growthStage;
  if (ecValue && /^\d*\.?\d*$/.test(ecValue)) out.ecValue = ecValue;

  return out;
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

export const UNIT_LABELS: Record<VolumeUnit, string> = { ml: 'ml', tsp: 'tsp', tbsp: 'tbsp' };

const DEFAULT_RESERVOIR_VOLUME = '5';
const DEFAULT_RESERVOIR_UNIT: ReservoirUnit = 'gal';
const DEFAULT_PER_UNIT_VOLUME = '1';
const DEFAULT_DOSE_AMOUNT = '5';
const DEFAULT_DOSE_UNIT: VolumeUnit = 'ml';
const DEFAULT_GROWTH_STAGE: GrowthStage = 'vegetative';
const DEFAULT_EC_VALUE = '1.8';

export function useHydroponicNutrientCalculatorState() {
  const hasLoaded = useRef(false);

  // Section 1: Nutrient Dosing
  const [reservoirVolume, setReservoirVolume] = useState<string>(DEFAULT_RESERVOIR_VOLUME);
  const [reservoirUnit, setReservoirUnit] = useState<ReservoirUnit>(DEFAULT_RESERVOIR_UNIT);
  const [perUnitVolume, setPerUnitVolume] = useState<string>(DEFAULT_PER_UNIT_VOLUME);
  const [doseAmount, setDoseAmount] = useState<string>(DEFAULT_DOSE_AMOUNT);
  const [doseUnit, setDoseUnit] = useState<VolumeUnit>(DEFAULT_DOSE_UNIT);
  const [growthStage, setGrowthStage] = useState<GrowthStage>(DEFAULT_GROWTH_STAGE);

  // Section 2: EC <-> PPM Converter
  const [ecValue, setEcValue] = useState<string>(DEFAULT_EC_VALUE);

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

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

  const dosing: DosingResult = useMemo(() => {
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

  const ecConversion: EcConversionResult = useMemo(() => {
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
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
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

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setReservoirVolume(DEFAULT_RESERVOIR_VOLUME);
    setReservoirUnit(DEFAULT_RESERVOIR_UNIT);
    setPerUnitVolume(DEFAULT_PER_UNIT_VOLUME);
    setDoseAmount(DEFAULT_DOSE_AMOUNT);
    setDoseUnit(DEFAULT_DOSE_UNIT);
    setGrowthStage(DEFAULT_GROWTH_STAGE);
    setEcValue(DEFAULT_EC_VALUE);
  };

  return {
    reservoirVolume,
    setReservoirVolume,
    reservoirUnit,
    setReservoirUnit,
    perUnitVolume,
    setPerUnitVolume,
    doseAmount,
    setDoseAmount,
    doseUnit,
    setDoseUnit,
    growthStage,
    setGrowthStage,
    ecValue,
    setEcValue,
    handleNumericChange,
    dosing,
    ecConversion,
    hasDosingResult,
    hasEcResult,
    exportPdf,
    reset,
  };
}

export type HydroponicNutrientCalculatorState = ReturnType<typeof useHydroponicNutrientCalculatorState>;
