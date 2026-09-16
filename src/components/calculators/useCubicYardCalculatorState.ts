import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from CubicYardCalculator.tsx (Build Prompt: Calculator Page
// Redesign -- Roll Out to All Remaining Calculators). This hook is the
// single source of truth for the calculator's state -- inputs, live
// results, reset, PDF export -- reachable from the action panel and the
// Share/Embed/Cite modal, which live outside the calculator card's own
// component tree in the sticky sidebar. CubicYardCalculatorCard.tsx is now
// a pure presentational component driven entirely by this hook's return
// value, and CubicYardCalculatorPanel.tsx is the one place that calls it.

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
export type Material = 'soil' | 'gravel' | 'mulch';

interface MaterialInfo {
  label: string;
  lbsPerCuYd: number;
  rangeLbs: [number, number];
}

export const MATERIALS: Record<Material, MaterialInfo> = {
  soil: { label: 'Dirt / Soil', lbsPerCuYd: 2400, rangeLbs: [2000, 3400] },
  gravel: { label: 'Gravel', lbsPerCuYd: 2700, rangeLbs: [2400, 2900] },
  mulch: { label: 'Mulch', lbsPerCuYd: 500, rangeLbs: [400, 800] },
};

export type Mode = 'dimensions' | 'weight' | 'area';
export type UnitSystem = 'imperial' | 'metric';
export type WeightDirection = 'toVolume' | 'toWeight';

const STORAGE_KEY = 'cubic-yard-calculator-state-v1';

const M_TO_FT = 3.28084;
const CM_TO_IN = 0.393701;
const CUYD_TO_CUM = 0.764555;
const LB_TO_KG = 0.453592;

export interface SavedState {
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

/**
 * Reads material/mode/units/length/width/depth/direction/weightValue/
 * volumeValue/area/areaDepth from the page's URL query string -- the
 * foundation of the "share with results" feature. Unlike the pilot (one
 * mode, so a single length/width/depth guard covers it), this calculator
 * has three independent conversion modes, each with its own primary numeric
 * input -- so the non-null guard checks for any ONE of those three modes'
 * "core" values (length for Dimensions, weightValue/volumeValue for Weight
 * <-> Volume, area for Area to Volume) rather than a single fixed trio. A
 * plain bookmarked/shared-without-results URL (none of those present) never
 * accidentally overrides a returning visitor's saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const hasCoreParam =
    params.has('length') || params.has('weightValue') || params.has('volumeValue') || params.has('area');
  if (!hasCoreParam) return null;

  const out: Partial<SavedState> = {};

  const material = params.get('material');
  const mode = params.get('mode');
  const units = params.get('units');
  const length = params.get('length');
  const width = params.get('width');
  const depth = params.get('depth');
  const direction = params.get('direction');
  const weightValue = params.get('weightValue');
  const volumeValue = params.get('volumeValue');
  const area = params.get('area');
  const areaDepth = params.get('areaDepth');

  const numericPattern = /^\d*\.?\d*$/;

  if (material === 'soil' || material === 'gravel' || material === 'mulch') out.material = material;
  if (mode === 'dimensions' || mode === 'weight' || mode === 'area') out.mode = mode;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;
  if (length && numericPattern.test(length)) out.dimLength = length;
  if (width && numericPattern.test(width)) out.dimWidth = width;
  if (depth && numericPattern.test(depth)) out.dimDepth = depth;
  if (direction === 'toVolume' || direction === 'toWeight') out.weightDirection = direction;
  if (weightValue && numericPattern.test(weightValue)) out.weightValue = weightValue;
  if (volumeValue && numericPattern.test(volumeValue)) out.volumeValue = volumeValue;
  if (area && numericPattern.test(area)) out.areaValue = area;
  if (areaDepth && numericPattern.test(areaDepth)) out.areaDepth = areaDepth;

  return out;
}

export function useCubicYardCalculatorState() {
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
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

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

  const handleDimLengthChange = handleNumericChange(setDimLength);
  const handleDimWidthChange = handleNumericChange(setDimWidth);
  const handleDimDepthChange = handleNumericChange(setDimDepth);
  const handleWeightValueChange = handleNumericChange(setWeightValue);
  const handleVolumeValueChange = handleNumericChange(setVolumeValue);
  const handleAreaValueChange = handleNumericChange(setAreaValue);
  const handleAreaDepthChange = handleNumericChange(setAreaDepth);

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
      // `kind` is a literal discriminant, not just a label -- it's what lets
      // TypeScript narrow this union by a plain `weightResult.kind === '...'`
      // check instead of an `in` check. `in` can't fully eliminate the other
      // branch here: TS's return-type inference back-fills each branch with
      // the other's keys as optional `undefined` (so this object also has an
      // implicit `tons?: undefined`), which means both branches technically
      // "have" every key and `in` narrowing can't tell them apart -- that
      // was the actual cause of the 8 pre-existing tsc errors on this file.
      return { kind: 'volume' as const, cubicYards, cubicMeters };
    } else {
      const v = parseFloat(volumeValue);
      if (!Number.isFinite(v) || v <= 0) return null;
      const cubicYards = isMetric ? v / CUYD_TO_CUM : v;
      const lbs = cubicYards * lbsPerCuYd;
      const tons = lbs / 2000;
      const tonnes = (lbs * LB_TO_KG) / 1000;
      return { kind: 'weight' as const, tons, tonnes };
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
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
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
      if (weightResult.kind === 'volume') {
        doc.text(`Mode: Weight to Volume`, margin, y); y += 16;
        doc.text(`Input: ${weightValue || 0} ${weightUnit}`, margin, y); y += 16;
        doc.text(`Cubic yards: ${round(weightResult.cubicYards, 2).toLocaleString()} cu yd`, margin, y); y += 16;
        doc.text(`Cubic meters: ${round(weightResult.cubicMeters, 3).toLocaleString()} m³`, margin, y); y += 16;
      } else {
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

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setMaterial('soil');
    setMode('dimensions');
    setUnitSystem('imperial');
    setDimLength('10');
    setDimWidth('10');
    setDimDepth('4');
    setWeightDirection('toVolume');
    setWeightValue('3');
    setVolumeValue('2');
    setAreaValue('300');
    setAreaDepth('3');
  };

  return {
    material,
    setMaterial,
    mode,
    setMode,
    unitSystem,
    setUnitSystem,
    dimLength,
    dimWidth,
    dimDepth,
    weightDirection,
    setWeightDirection,
    weightValue,
    volumeValue,
    areaValue,
    areaDepth,
    isMetric,
    lengthUnit,
    depthUnit,
    areaUnit,
    weightUnit,
    volumeUnit,
    lbsPerCuYd,
    handleDimLengthChange,
    handleDimWidthChange,
    handleDimDepthChange,
    handleWeightValueChange,
    handleVolumeValueChange,
    handleAreaValueChange,
    handleAreaDepthChange,
    dimensionsResult,
    weightResult,
    areaResult,
    exportPdf,
    reset,
  };
}

export type CubicYardCalculatorState = ReturnType<typeof useCubicYardCalculatorState>;
