import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from SoilVolumeCalculator.tsx (Calculator Page Redesign rollout
// -- see CALC_ROLLOUT_PATTERN.md). This hook is the single source of truth
// for the Soil Volume Calculator's state; SoilVolumeCalculatorCard.tsx is a
// pure presentational component driven entirely by its return value, and
// SoilVolumeCalculatorPanel.tsx is the one place that calls it, so the card,
// the action row, and the Share/Embed/Cite modal all read/write the same
// state despite living in different parts of the DOM.

export type SoilShape = 'rectangle' | 'cylinder';
export type UnitSystem = 'imperial' | 'metric';

const STORAGE_KEY = 'soil-volume-calculator-state-v1';

// Estimated weight: average of moist potting/garden mix (~40 lbs/cu ft).
// Dry potting mix: 20–25 lbs/cu ft; dense garden soil: 70–80 lbs/cu ft.
const LBS_PER_CUBIC_FOOT = 40;
const LITERS_PER_CUBIC_FOOT = 28.3168;

// Standard retail potting mix bag sizes are labeled in US dry quarts.
// 1 US dry quart = 0.038889 cu ft (1 cu ft ≈ 25.71 dry quarts) — the
// conversion used across the potting soil industry.
const CUFT_PER_DRY_QUART = 0.038889;
export const BAG_SIZES_QT = [8, 16, 25] as const;

export interface SavedState {
  shape: SoilShape;
  unitSystem: UnitSystem;
  length: string;
  width: string;
  diameter: string;
  depth: string;
}

export interface CalculatorResult {
  sqft: number;
  cubicFeet: number;
  cubicYards: number;
  cubicMeters: number;
  liters: number;
  weightLbs: number;
  weightKg: number;
  depthIn: number;
  bagCounts: Record<(typeof BAG_SIZES_QT)[number], number>;
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

/**
 * Reads shape/units/length/width/diameter/depth from the page's URL query
 * string -- the foundation of the "share with results" feature. Only
 * returns a non-null object when at least one "core" param is present
 * (depth, together with a dimension -- length, width, or diameter), so a
 * plain bookmarked/shared-without-results URL never accidentally overrides
 * a returning visitor's saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const hasDimension = params.has('length') || params.has('width') || params.has('diameter');
  if (!hasDimension || !params.has('depth')) return null;

  const out: Partial<SavedState> = {};
  const shape = params.get('shape');
  const units = params.get('units');
  const length = params.get('length');
  const width = params.get('width');
  const diameter = params.get('diameter');
  const depth = params.get('depth');

  if (shape === 'rectangle' || shape === 'cylinder') out.shape = shape;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;
  if (length && /^\d*\.?\d*$/.test(length)) out.length = length;
  if (width && /^\d*\.?\d*$/.test(width)) out.width = width;
  if (diameter && /^\d*\.?\d*$/.test(diameter)) out.diameter = diameter;
  if (depth && /^\d*\.?\d*$/.test(depth)) out.depth = depth;

  return out;
}

const M_TO_FT = 3.28084;
const CM_TO_IN = 0.393701;

const DEFAULTS: SavedState = {
  shape: 'rectangle',
  unitSystem: 'imperial',
  length: '4',
  width: '8',
  diameter: '1',
  depth: '6',
};

export function useSoilVolumeCalculatorState() {
  const hasLoaded = useRef(false);

  const [shape, setShape] = useState<SoilShape>(DEFAULTS.shape);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(DEFAULTS.unitSystem);
  const [length, setLength] = useState<string>(DEFAULTS.length);
  const [width, setWidth] = useState<string>(DEFAULTS.width);
  const [diameter, setDiameter] = useState<string>(DEFAULTS.diameter);
  const [depth, setDepth] = useState<string>(DEFAULTS.depth);

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.shape) setShape(s.shape);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.diameter !== undefined) setDiameter(s.diameter);
    if (s.depth !== undefined) setDepth(s.depth);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ shape, unitSystem, length, width, diameter, depth });
  }, [shape, unitSystem, length, width, diameter, depth]);

  const result: CalculatorResult = useMemo(() => {
    let sqft = 0;

    if (shape === 'rectangle') {
      let l = parseFloat(length);
      let w = parseFloat(width);
      if (unitSystem === 'metric') {
        l = Number.isFinite(l) ? l * M_TO_FT : 0;
        w = Number.isFinite(w) ? w * M_TO_FT : 0;
      }
      sqft = Number.isFinite(l) && Number.isFinite(w) ? l * w : 0;
    } else {
      let d = parseFloat(diameter);
      let r_ft: number;
      if (unitSystem === 'metric') {
        // diameter in m → radius in ft
        r_ft = Number.isFinite(d) ? (d / 2) * M_TO_FT : 0;
      } else {
        // diameter in ft
        r_ft = Number.isFinite(d) ? d / 2 : 0;
      }
      sqft = r_ft > 0 ? Math.PI * r_ft * r_ft : 0;
    }

    let depthIn = parseFloat(depth);
    if (unitSystem === 'metric') {
      depthIn = Number.isFinite(depthIn) ? depthIn * CM_TO_IN : 0;
    }
    const depthFt = Number.isFinite(depthIn) ? depthIn / 12 : 0;
    const cubicFeet = Math.max(0, sqft * depthFt);
    const cubicYards = cubicFeet / 27;
    const cubicMeters = cubicFeet * 0.0283168;
    const liters = cubicFeet * LITERS_PER_CUBIC_FOOT;
    const weightLbs = cubicFeet * LBS_PER_CUBIC_FOOT;
    const weightKg = weightLbs * 0.453592;

    const bagCounts = Object.fromEntries(
      BAG_SIZES_QT.map((qt) => [qt, cubicFeet > 0 ? Math.ceil(cubicFeet / (qt * CUFT_PER_DRY_QUART)) : 0]),
    ) as Record<(typeof BAG_SIZES_QT)[number], number>;

    return { sqft, cubicFeet, cubicYards, cubicMeters, liters, weightLbs, weightKg, depthIn, bagCounts };
  }, [shape, unitSystem, length, width, diameter, depth]);

  const hasResult = result.cubicFeet > 0;

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';
  const depthUnit = isMetric ? 'cm' : 'in';

  const handleNumericChange = (
    setter: (v: string) => void,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = enforceNonNegative(sanitizeNumericInput(e.target.value));
    setter(cleaned);
  };

  const handleLengthChange = handleNumericChange(setLength);
  const handleWidthChange = handleNumericChange(setWidth);
  const handleDiameterChange = handleNumericChange(setDiameter);
  const handleDepthChange = handleNumericChange(setDepth);

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Soil Volume Calculator Results', margin, y);
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
    const inputLines: string[] = [];
    inputLines.push(`Shape: ${shape === 'rectangle' ? 'Rectangle' : 'Cylinder / Round pot'}`);
    if (shape === 'rectangle') {
      inputLines.push(`Length: ${length || 0} ${lengthUnit}`);
      inputLines.push(`Width: ${width || 0} ${lengthUnit}`);
    } else {
      inputLines.push(`Diameter: ${diameter || 0} ${lengthUnit}`);
    }
    inputLines.push(`Fill depth: ${depth || 0} ${depthUnit}`);
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
    const resultLines: string[] = [
      `Area: ${round(result.sqft, 1).toLocaleString()} sq ft`,
      `Cubic feet: ${round(result.cubicFeet, 2).toLocaleString()} cu ft`,
      `Cubic yards: ${round(result.cubicYards, 2).toLocaleString()} cu yd`,
      `Cubic meters: ${round(result.cubicMeters, 3).toLocaleString()} m³`,
      `Liters: ${round(result.liters, 1).toLocaleString()} L`,
      `Est. weight: ~${round(result.weightLbs, 0).toLocaleString()} lbs (~${round(result.weightKg, 0).toLocaleString()} kg)`,
      `Bags needed: ${BAG_SIZES_QT.map((qt) => `${result.bagCounts[qt]} × ${qt}qt`).join('  ·  ')}`,
    ];
    resultLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Weight is approximate. Dry potting mix: 20–25 lbs/cu ft. Dense garden soil: 70–80 lbs/cu ft.', margin, y);
    y += 12;
    doc.text('This calculator uses 40 lbs/cu ft as a midpoint estimate.', margin, y);

    doc.save('soil-volume-calculator-results.pdf');
  };

  /** Restores the default rectangle 4×8/6in preset -- the action panel's Reset button. */
  const reset = () => {
    setShape(DEFAULTS.shape);
    setUnitSystem(DEFAULTS.unitSystem);
    setLength(DEFAULTS.length);
    setWidth(DEFAULTS.width);
    setDiameter(DEFAULTS.diameter);
    setDepth(DEFAULTS.depth);
  };

  return {
    shape,
    setShape,
    unitSystem,
    setUnitSystem,
    length,
    width,
    diameter,
    depth,
    isMetric,
    lengthUnit,
    depthUnit,
    handleLengthChange,
    handleWidthChange,
    handleDiameterChange,
    handleDepthChange,
    result,
    hasResult,
    exportPdf,
    reset,
  };
}

export type SoilVolumeCalculatorState = ReturnType<typeof useSoilVolumeCalculatorState>;
