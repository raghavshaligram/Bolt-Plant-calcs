import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from CompostCalculator.tsx (Calculator Page Redesign rollout --
// see CALC_ROLLOUT_PATTERN.md). This hook is the single source of truth for
// the compost calculator's state; CompostCalculatorCard.tsx is now a pure
// presentational component driven entirely by its return value, and
// CompostCalculatorPanel.tsx is the one place that calls it, so the card,
// the action row, and the Share/Embed/Cite modal all read/write the same
// state despite living in different parts of the DOM.

export type InputMode = 'dimensions' | 'area';
export type UnitSystem = 'imperial' | 'metric';
export type BagSize = '1' | '1.5' | '2';

const STORAGE_KEY = 'compost-calculator-state-v1';

export interface SavedState {
  mode: InputMode;
  unitSystem: UnitSystem;
  length: string;
  width: string;
  area: string;
  depth: string;
  bagSize: BagSize;
}

export interface CalculatorResult {
  sqft: number;
  cubicFeet: number;
  cubicYards: number;
  cubicMeters: number;
  bags: number;
  weightLbLow: number;
  weightLbHigh: number;
  weightLbMid: number;
}

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function bagCount(cubicFeet: number, bagSize = 1.5): number {
  if (cubicFeet <= 0) return 0;
  return Math.ceil(cubicFeet / bagSize);
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
 * Reads mode/length/width/area/depth/bagSize/units from the page's URL
 * query string -- the foundation of the "share with results" feature. Only
 * returns a non-null object when at least one "core" param is present
 * (length, area, or depth -- the three that most directly drive the primary
 * cubic-feet result, covering both the length×width and total-area input
 * modes), so a plain bookmarked/shared-without-results URL never
 * accidentally overrides a returning visitor's saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('length') && !params.has('area') && !params.has('depth')) return null;

  const out: Partial<SavedState> = {};
  const mode = params.get('mode');
  const units = params.get('units');
  const length = params.get('length');
  const width = params.get('width');
  const area = params.get('area');
  const depth = params.get('depth');
  const bagSize = params.get('bagSize');

  if (length && /^\d*\.?\d*$/.test(length)) out.length = length;
  if (width && /^\d*\.?\d*$/.test(width)) out.width = width;
  if (area && /^\d*\.?\d*$/.test(area)) out.area = area;
  if (depth && /^\d*\.?\d*$/.test(depth)) out.depth = depth;
  if (bagSize === '1' || bagSize === '1.5' || bagSize === '2') out.bagSize = bagSize;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;

  if (mode === 'dimensions' || mode === 'area') {
    out.mode = mode;
  } else if (out.area !== undefined) {
    out.mode = 'area';
  } else if (out.length !== undefined || out.width !== undefined) {
    out.mode = 'dimensions';
  }

  return out;
}

const M_TO_FT = 3.28084;
const CM_TO_IN = 0.393701;
const SQM_TO_SQFT = 10.7639;
const LB_TO_KG = 0.453592;

// Finished compost bulk density varies with moisture content and source
// material; ~44-50 lb per cubic foot is a commonly cited average range for
// screened, finished compost. We use the midpoint (47 lb/cu ft) as the
// headline estimate and show the full range alongside it — this is an
// estimate, not a lab-measured density for your specific batch.
const COMPOST_LB_PER_CUFT_LOW = 44;
const COMPOST_LB_PER_CUFT_HIGH = 50;
const COMPOST_LB_PER_CUFT_MID = 47;

const DEFAULT_MODE: InputMode = 'dimensions';
const DEFAULT_UNIT_SYSTEM: UnitSystem = 'imperial';
const DEFAULT_LENGTH = '8';
const DEFAULT_WIDTH = '4';
const DEFAULT_AREA = '32';
const DEFAULT_DEPTH = '2';
const DEFAULT_BAG_SIZE: BagSize = '1.5';

export function useCompostCalculatorState() {
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<InputMode>(DEFAULT_MODE);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(DEFAULT_UNIT_SYSTEM);
  const [length, setLength] = useState(DEFAULT_LENGTH);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [area, setArea] = useState(DEFAULT_AREA);
  const [depth, setDepth] = useState(DEFAULT_DEPTH);
  const [bagSize, setBagSize] = useState<BagSize>(DEFAULT_BAG_SIZE);

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.area !== undefined) setArea(s.area);
    if (s.depth !== undefined) setDepth(s.depth);
    if (s.bagSize !== undefined) setBagSize(s.bagSize);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ mode, unitSystem, length, width, area, depth, bagSize });
  }, [mode, unitSystem, length, width, area, depth, bagSize]);

  const parsedBagSize = parseFloat(bagSize);
  const isMetric = unitSystem === 'metric';

  const handleNumericChange = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
    };

  const handleLengthChange = handleNumericChange(setLength);
  const handleWidthChange = handleNumericChange(setWidth);
  const handleAreaChange = handleNumericChange(setArea);
  const handleDepthChange = handleNumericChange(setDepth);

  const result: CalculatorResult = useMemo(() => {
    let sqft = 0;
    if (mode === 'dimensions') {
      let l = parseFloat(length);
      let w = parseFloat(width);
      if (isMetric) {
        l = Number.isFinite(l) ? l * M_TO_FT : 0;
        w = Number.isFinite(w) ? w * M_TO_FT : 0;
      }
      sqft = Number.isFinite(l) && Number.isFinite(w) ? l * w : 0;
    } else {
      let a = parseFloat(area);
      if (isMetric) {
        a = Number.isFinite(a) ? a * SQM_TO_SQFT : 0;
      }
      sqft = Number.isFinite(a) ? a : 0;
    }

    let depthIn = parseFloat(depth);
    if (isMetric) {
      depthIn = Number.isFinite(depthIn) ? depthIn * CM_TO_IN : 0;
    }
    const depthFt = Number.isFinite(depthIn) ? depthIn / 12 : 0;
    const cubicFeet = Math.max(0, sqft * depthFt);
    const cubicYards = cubicFeet / 27;
    const cubicMeters = cubicFeet * 0.0283168;
    const bags = Number.isFinite(parsedBagSize) && parsedBagSize > 0
      ? bagCount(cubicFeet, parsedBagSize)
      : 0;
    const weightLbLow = cubicFeet * COMPOST_LB_PER_CUFT_LOW;
    const weightLbHigh = cubicFeet * COMPOST_LB_PER_CUFT_HIGH;
    const weightLbMid = cubicFeet * COMPOST_LB_PER_CUFT_MID;

    return { sqft, cubicFeet, cubicYards, cubicMeters, bags, weightLbLow, weightLbHigh, weightLbMid };
  }, [mode, length, width, area, depth, isMetric, parsedBagSize]);

  const hasResult = result.cubicFeet > 0;
  const lengthUnit = isMetric ? 'm' : 'ft';
  const depthUnit = isMetric ? 'cm' : 'in';
  const areaUnit = isMetric ? 'm²' : 'sq ft';

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Compost Calculator Results', margin, y);
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
    doc.text('Inputs', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const inputLines: string[] = [];
    if (mode === 'dimensions') {
      inputLines.push(`Length: ${length || 0} ${lengthUnit}`);
      inputLines.push(`Width: ${width || 0} ${lengthUnit}`);
    } else {
      inputLines.push(`Total area: ${area || 0} ${areaUnit}`);
    }
    inputLines.push(`Depth: ${depth || 0} ${depthUnit}`);
    inputLines.push(`Bag size: ${parsedBagSize || 1.5} cu ft`);
    inputLines.forEach((line) => { doc.text(line, margin, y); y += 16; });

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Results', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const resultLines = [
      `Area: ${round(result.sqft, 1).toLocaleString()} sq ft`,
      `Cubic feet: ${round(result.cubicFeet, 1).toLocaleString()} cu ft`,
      `Cubic yards: ${round(result.cubicYards, 2).toLocaleString()} cu yd`,
      `Cubic meters: ${round(result.cubicMeters, 3).toLocaleString()} m³`,
      `Bags (${parsedBagSize || 1.5} cu ft): ${result.bags.toLocaleString()}`,
      `Estimated weight: ${round(result.weightLbLow, 0).toLocaleString()}-${round(result.weightLbHigh, 0).toLocaleString()} lb (~${round(result.weightLbMid * LB_TO_KG, 0).toLocaleString()} kg)`,
    ];
    resultLines.forEach((line) => { doc.text(line, margin, y); y += 16; });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Estimates only — verify before buying materials. Weight assumes 44-50 lb per cubic', margin, y); y += 12;
    doc.text('foot of finished compost, which varies with moisture and material.', margin, y);

    doc.save('compost-calculator-results.pdf');
  };

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setMode(DEFAULT_MODE);
    setUnitSystem(DEFAULT_UNIT_SYSTEM);
    setLength(DEFAULT_LENGTH);
    setWidth(DEFAULT_WIDTH);
    setArea(DEFAULT_AREA);
    setDepth(DEFAULT_DEPTH);
    setBagSize(DEFAULT_BAG_SIZE);
  };

  return {
    mode,
    setMode,
    unitSystem,
    setUnitSystem,
    length,
    width,
    area,
    depth,
    bagSize,
    setBagSize,
    isMetric,
    lengthUnit,
    depthUnit,
    areaUnit,
    handleLengthChange,
    handleWidthChange,
    handleAreaChange,
    handleDepthChange,
    result,
    hasResult,
    parsedBagSize,
    exportPdf,
    reset,
  };
}

export type CompostCalculatorState = ReturnType<typeof useCompostCalculatorState>;
