import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from GrowLightCalculator.tsx (Calculator Page Redesign rollout --
// see CALC_ROLLOUT_PATTERN.md). This hook is the single source of truth for
// all of the calculator's inputs/results/reset/PDF-export logic across its
// three modes (Coverage & Wattage, DLI Calculator, Light Distance), so it's
// reachable both from the sticky card (GrowLightCalculatorCard.tsx) and from
// the action row + Share/Embed/Cite modal that render outside the card's own
// component tree (GrowLightCalculatorPanel.tsx, via the shared
// CalculatorPanel.tsx).

export type Mode = 'coverage' | 'dli' | 'distance';
export type UnitSystem = 'imperial' | 'metric';
export type LightNeed = 'low' | 'medium' | 'high';
export type PlantCategory = 'seedlings' | 'houseplants' | 'leafy-greens' | 'fruiting';
export type LightType = 'led' | 'fluorescent';
export type GrowthStage = 'seedling' | 'mature';

const STORAGE_KEY = 'grow-light-calculator-state-v1';

export interface SavedState {
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

export interface CoverageResult {
  wattsLow: number;
  wattsHigh: number;
  wattsMid: number;
  dailyCost: number | null;
  monthlyCost: number | null;
  areaSqFt: number;
}

export interface DliResult {
  dli: number;
  comparison: 'below' | 'within' | 'above' | null;
}

export interface DistanceResult {
  low: number;
  high: number;
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
    // localStorage may be unavailable (private mode, quota) — fail silently.
  }
}

const CM_PER_IN = 2.54;
const SQM_PER_SQFT = 0.092903;

// Typical actual-watt (input wattage, not "equivalent") LED guidance per
// square foot of growing area, by plant light-need tier. General industry
// rule-of-thumb ranges, not tied to a single study.
export const WATTAGE_PER_SQFT: Record<LightNeed, [number, number]> = {
  low: [15, 20],
  medium: [25, 35],
  high: [40, 50],
};

export const LIGHT_NEED_LABELS: Record<LightNeed, string> = {
  low: 'Low (seedlings, low-light houseplants)',
  medium: 'Medium (leafy greens, herbs)',
  high: 'High (fruiting vegetables)',
};

// Target DLI ranges (mol/m2/day), cited from Virginia Cooperative Extension
// (SPES-720) and Michigan State University Extension floriculture guidance.
export const DLI_TARGETS: Record<PlantCategory, [number, number]> = {
  seedlings: [5, 10],
  houseplants: [6, 10],
  'leafy-greens': [12, 20],
  fruiting: [20, 30],
};

export const PLANT_CATEGORY_LABELS: Record<PlantCategory, string> = {
  seedlings: 'Seedlings / cuttings',
  houseplants: 'Low-light houseplants',
  'leafy-greens': 'Leafy greens & herbs',
  fruiting: 'Fruiting vegetables',
};

// Recommended hanging distance (inches) by light type and growth stage —
// typical manufacturer guidance for home-grower LED panels and T5
// fluorescent fixtures.
export const DISTANCE_IN: Record<LightType, Record<GrowthStage, [number, number]>> = {
  led: {
    seedling: [18, 24],
    mature: [12, 18],
  },
  fluorescent: {
    seedling: [6, 12],
    mature: [6, 12],
  },
};

/**
 * Reads mode/units/area/lightNeed/hoursPerDay/electricityRate/ppfd/
 * photoperiod/comparePlant/lightType/growthStage from the page's URL query
 * string -- the foundation of the "share with results" feature. This
 * calculator has three modes with different primary inputs (area for
 * Coverage & Wattage, ppfd for DLI, lightType for Light Distance), so --
 * like the grass seed and mulch calculators -- the "core" guard checks for
 * any ONE of those three anchors rather than a single fixed pair, and only
 * returns non-null when at least one is present. That keeps a plain
 * bookmarked/shared-without-results URL from silently overriding a
 * returning visitor's saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);

  const hasCore = params.has('area') || params.has('ppfd') || params.has('lightType');
  if (!hasCore) return null;

  const out: Partial<SavedState> = {};
  const mode = params.get('mode');
  const units = params.get('units');
  const area = params.get('area');
  const lightNeed = params.get('lightNeed');
  const hoursPerDay = params.get('hoursPerDay');
  const electricityRate = params.get('electricityRate');
  const ppfd = params.get('ppfd');
  const photoperiod = params.get('photoperiod');
  const comparePlant = params.get('comparePlant');
  const lightType = params.get('lightType');
  const growthStage = params.get('growthStage');

  if (mode === 'coverage' || mode === 'dli' || mode === 'distance') out.mode = mode;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;
  if (area && /^\d*\.?\d*$/.test(area)) out.area = area;
  if (lightNeed === 'low' || lightNeed === 'medium' || lightNeed === 'high') out.lightNeed = lightNeed;
  if (hoursPerDay && /^\d*\.?\d*$/.test(hoursPerDay)) out.hoursPerDay = hoursPerDay;
  if (electricityRate && /^\d*\.?\d*$/.test(electricityRate)) out.electricityRate = electricityRate;
  if (ppfd && /^\d*\.?\d*$/.test(ppfd)) out.ppfd = ppfd;
  if (photoperiod && /^\d*\.?\d*$/.test(photoperiod)) out.photoperiod = photoperiod;
  if (
    comparePlant === 'none' ||
    comparePlant === 'seedlings' ||
    comparePlant === 'houseplants' ||
    comparePlant === 'leafy-greens' ||
    comparePlant === 'fruiting'
  ) {
    out.comparePlant = comparePlant;
  }
  if (lightType === 'led' || lightType === 'fluorescent') out.lightType = lightType;
  if (growthStage === 'seedling' || growthStage === 'mature') out.growthStage = growthStage;

  return out;
}

export function useGrowLightCalculatorState() {
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

  // Load cached/shared state once on mount (client-only). A shared link's
  // query params take priority over this browser's own saved state --
  // someone opening a shared result should see THAT result, not their own
  // last visit, even if they've used the calculator here before.
  useEffect(() => {
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

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

  const handleAreaChange = handleNumericChange(setArea);
  const handleHoursPerDayChange = handleNumericChange(setHoursPerDay);
  const handleElectricityRateChange = handleNumericChange(setElectricityRate);
  const handlePpfdChange = handleNumericChange(setPpfd);
  const handlePhotoperiodChange = handleNumericChange(setPhotoperiod);

  // --- Mode 1: Coverage & Wattage ---
  const coverageResult: CoverageResult | null = useMemo(() => {
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
  const dliResult: DliResult | null = useMemo(() => {
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
  const distanceResult: DistanceResult = useMemo(() => {
    const [lowIn, highIn] = DISTANCE_IN[lightType][growthStage];
    const low = isMetric ? lowIn * CM_PER_IN : lowIn;
    const high = isMetric ? highIn * CM_PER_IN : highIn;
    return { low: round(low, 1), high: round(high, 1) };
  }, [lightType, growthStage, isMetric]);

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
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

  /** Restores the original defaults across all three modes. */
  const reset = () => {
    setMode('coverage');
    setUnitSystem('imperial');
    setArea('9');
    setLightNeed('medium');
    setHoursPerDay('14');
    setElectricityRate('0.18');
    setPpfd('400');
    setPhotoperiod('14');
    setComparePlant('leafy-greens');
    setLightType('led');
    setGrowthStage('mature');
  };

  return {
    mode,
    setMode,
    unitSystem,
    setUnitSystem,
    area,
    lightNeed,
    setLightNeed,
    hoursPerDay,
    electricityRate,
    ppfd,
    photoperiod,
    comparePlant,
    setComparePlant,
    lightType,
    setLightType,
    growthStage,
    setGrowthStage,
    isMetric,
    areaUnit,
    distanceUnit,
    handleUnitToggle,
    handleAreaChange,
    handleHoursPerDayChange,
    handleElectricityRateChange,
    handlePpfdChange,
    handlePhotoperiodChange,
    coverageResult,
    dliResult,
    distanceResult,
    exportPdf,
    reset,
  };
}

export type GrowLightCalculatorState = ReturnType<typeof useGrowLightCalculatorState>;
