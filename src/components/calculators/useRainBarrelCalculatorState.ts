import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from RainBarrelCalculator.tsx for the sticky-layout rollout (see
// CALC_ROLLOUT_PATTERN.md) -- same inputs/results/reset/PDF-export, now
// reachable from the action panel and the Share/Embed/Cite modal, which live
// outside the calculator's own component tree in the sticky sidebar. This
// hook is the single source of truth; RainBarrelCalculatorCard.tsx is now a
// pure presentational component driven entirely by its return value, and
// RainBarrelCalculatorPanel.tsx is the one place that calls it.
//
// Unlike most other calculators in this rollout, this one covers TWO
// independent results at once -- rainwater harvest volume and spigot water
// pressure -- from a single shared unit toggle. Both stay in one hook/state
// object (matching the original component), and both are gated into
// readStateFromUrl's "core" params below, since a shared link might be
// pointing at either result.

export type UnitSystem = 'imperial' | 'metric';

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

export interface SavedState {
  unitSystem: UnitSystem;
  roofArea: string;
  rainfall: string;
  efficiency: string;
  height: string;
}

export interface HarvestResult {
  sqft: number;
  rainIn: number;
  effFraction: number;
  gallons: number;
  barrels: number;
  liters: number;
}

export interface PressureResult {
  heightFt: number;
  psi: number;
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
    // localStorage may be unavailable (private mode, quota) — fail silently.
  }
}

/**
 * Reads roofArea/rainfall/efficiency/height/units from the page's URL query
 * string -- the foundation of the "share with results" feature. Only returns
 * a non-null object when at least one of roofArea/rainfall/height is present
 * -- the essential driver of one of this calculator's two independent
 * results -- so a plain bookmarked/shared-without-results URL never
 * accidentally overrides a returning visitor's saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('roofArea') && !params.has('rainfall') && !params.has('height')) return null;

  const out: Partial<SavedState> = {};
  const roofArea = params.get('roofArea');
  const rainfall = params.get('rainfall');
  const efficiency = params.get('efficiency');
  const height = params.get('height');
  const units = params.get('units');

  if (roofArea && /^\d*\.?\d*$/.test(roofArea)) out.roofArea = roofArea;
  if (rainfall && /^\d*\.?\d*$/.test(rainfall)) out.rainfall = rainfall;
  if (efficiency && /^\d*\.?\d*$/.test(efficiency)) out.efficiency = efficiency;
  if (height && /^\d*\.?\d*$/.test(height)) out.height = height;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;

  return out;
}

export function useRainBarrelCalculatorState() {
  const hasLoaded = useRef(false);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [roofArea, setRoofArea] = useState<string>('1200');
  const [rainfall, setRainfall] = useState<string>('1');
  const [efficiency, setEfficiency] = useState<string>('85');
  const [height, setHeight] = useState<string>('3');

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

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

  const harvest: HarvestResult = useMemo(() => {
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

  const pressure: PressureResult = useMemo(() => {
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
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
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

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setUnitSystem('imperial');
    setRoofArea('1200');
    setRainfall('1');
    setEfficiency('85');
    setHeight('3');
  };

  return {
    unitSystem,
    setUnitSystem,
    roofArea,
    rainfall,
    efficiency,
    height,
    isMetric,
    areaUnit,
    rainUnit,
    heightUnit,
    handleNumericChange,
    setRoofArea,
    setRainfall,
    setEfficiency,
    setHeight,
    harvest,
    pressure,
    hasHarvestResult,
    hasPressureResult,
    exportPdf,
    reset,
  };
}

export type RainBarrelCalculatorState = ReturnType<typeof useRainBarrelCalculatorState>;
