import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from VegetableYieldCalculator.tsx (Calculator Page Redesign
// rollout -- see CALC_ROLLOUT_PATTERN.md). This hook is the single source of
// truth for all of the calculator's inputs/result/reset/PDF-export logic, so
// it's reachable both from the sticky card (VegetableYieldCalculatorCard.tsx)
// and from the action row + Share/Embed/Cite modal that render outside the
// card's own component tree (VegetableYieldCalculatorPanel.tsx, via the
// shared CalculatorPanel.tsx).
//
// The page's "Vegetable Yield Reference Chart" and "Plants Per Person Guide"
// tables already lived in the article body (outside the original component),
// not inside the calculator card -- so unlike some other calculators in this
// rollout, there is no ReferenceTables component to extract here.

export type InputMode = 'plants' | 'area';
export type UnitSystem = 'imperial' | 'metric';

export interface CropData {
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
export const CROPS: CropData[] = [
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

const CROP_IDS = new Set(CROPS.map((c) => c.id));

const STORAGE_KEY = 'vegetable-yield-calculator-state-v1';

export interface SavedState {
  mode: InputMode;
  unitSystem: UnitSystem;
  cropId: string;
  plants: string;
  area: string;
}

export interface CalculatorResult {
  plantCount: number;
  totalLbs: number;
  totalKg: number;
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
    // localStorage may be unavailable (private mode, quota) — fail silently.
  }
}

/**
 * Reads mode/units/crop/plants/area from the page's URL query string -- the
 * foundation of the "share with results" feature. Only returns a non-null
 * object when at least one of the "core" params (plants or area -- whichever
 * one actually drives the primary result, depending on mode) is present, so
 * a plain bookmarked/shared-without-results URL never accidentally overrides
 * a returning visitor's saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('plants') && !params.has('area')) return null;

  const out: Partial<SavedState> = {};
  const mode = params.get('mode');
  const units = params.get('units');
  const crop = params.get('crop');
  const plants = params.get('plants');
  const area = params.get('area');

  if (crop && CROP_IDS.has(crop)) out.cropId = crop;
  if (plants && /^\d+$/.test(plants)) out.plants = plants;
  if (area && /^\d*\.?\d*$/.test(area)) out.area = area;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;

  if (mode === 'plants' || mode === 'area') {
    out.mode = mode;
  } else if (out.plants !== undefined) {
    out.mode = 'plants';
  } else if (out.area !== undefined) {
    out.mode = 'area';
  }

  return out;
}

const LBS_PER_KG = 0.453592;
const SQM_PER_SQFT = 0.092903;

const DEFAULT_MODE: InputMode = 'plants';
const DEFAULT_UNIT_SYSTEM: UnitSystem = 'imperial';
const DEFAULT_CROP_ID = 'tomato';
const DEFAULT_PLANTS = '6';
const DEFAULT_AREA = '16';

export function useVegetableYieldCalculatorState() {
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<InputMode>(DEFAULT_MODE);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(DEFAULT_UNIT_SYSTEM);
  const [cropId, setCropId] = useState<string>(DEFAULT_CROP_ID);
  const [plants, setPlants] = useState<string>(DEFAULT_PLANTS);
  const [area, setArea] = useState<string>(DEFAULT_AREA);

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

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

  const result: CalculatorResult | null = useMemo(() => {
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

  const hasResult = result !== null;

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
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

  /** Restores the calculator's original defaults -- the action panel's Reset button. */
  const reset = () => {
    setMode(DEFAULT_MODE);
    setUnitSystem(DEFAULT_UNIT_SYSTEM);
    setCropId(DEFAULT_CROP_ID);
    setPlants(DEFAULT_PLANTS);
    setArea(DEFAULT_AREA);
  };

  return {
    mode,
    setMode,
    unitSystem,
    cropId,
    setCropId,
    plants,
    area,
    isMetric,
    areaUnit,
    weightUnit,
    handleUnitToggle,
    handlePlantsChange,
    handleAreaChange,
    crop,
    result,
    hasResult,
    exportPdf,
    reset,
  };
}

export type VegetableYieldCalculatorState = ReturnType<typeof useVegetableYieldCalculatorState>;
