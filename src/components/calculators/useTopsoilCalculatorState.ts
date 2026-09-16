import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from TopsoilCalculator.tsx (Calculator Page Redesign rollout --
// see CALC_ROLLOUT_PATTERN.md). This hook is the single source of truth for
// inputs/result/reset; TopsoilCalculatorCard.tsx is now a pure
// presentational component driven entirely by its return value, and
// TopsoilCalculatorPanel.tsx is the one place that calls it, so the card,
// the action row, and the Share/Embed/Cite modal all read/write the same
// state.

export type InputMode = 'dimensions' | 'area';
export type UnitSystem = 'imperial' | 'metric';
export type UseCase = 'fill-bed' | 'topdress-lawn';

const STORAGE_KEY = 'topsoil-calculator-state-v1';

// Average weight of topsoil: ~1.2 US tons per cubic yard (loose, moist).
const TONS_PER_CUBIC_YARD = 1.2;

export interface SavedState {
  mode: InputMode;
  unitSystem: UnitSystem;
  useCase: UseCase;
  length: string;
  width: string;
  area: string;
  depth: string;
}

export interface CalculatorResult {
  sqft: number;
  cubicFeet: number;
  cubicYards: number;
  cubicMeters: number;
  tons: number;
  bags40lb: number;
  depthIn: number;
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
 * Reads mode/units/useCase/length/width/area/depth from the page's URL
 * query string -- the foundation of the "share with results" feature. Only
 * returns a non-null object when at least one of the params essential to
 * the primary result (length, width, area, depth -- any of which can drive
 * the cubic-feet result depending on which entry mode is shared) is
 * present, so a plain bookmarked/shared-without-results URL never
 * accidentally overrides a returning visitor's saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (
    !params.has('length') &&
    !params.has('width') &&
    !params.has('area') &&
    !params.has('depth')
  ) {
    return null;
  }

  const out: Partial<SavedState> = {};
  const mode = params.get('mode');
  const units = params.get('units');
  const useCase = params.get('useCase');
  const length = params.get('length');
  const width = params.get('width');
  const area = params.get('area');
  const depth = params.get('depth');

  if (mode === 'dimensions' || mode === 'area') out.mode = mode;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;
  if (useCase === 'fill-bed' || useCase === 'topdress-lawn') out.useCase = useCase;
  if (length && /^\d*\.?\d*$/.test(length)) out.length = length;
  if (width && /^\d*\.?\d*$/.test(width)) out.width = width;
  if (area && /^\d*\.?\d*$/.test(area)) out.area = area;
  if (depth && /^\d*\.?\d*$/.test(depth)) out.depth = depth;

  return out;
}

const M_TO_FT = 3.28084;
const CM_TO_IN = 0.393701;
const SQM_TO_SQFT = 10.7639;

export function useTopsoilCalculatorState() {
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<InputMode>('dimensions');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [useCase, setUseCase] = useState<UseCase>('fill-bed');
  const [length, setLength] = useState<string>('10');
  const [width, setWidth] = useState<string>('10');
  const [area, setArea] = useState<string>('100');
  const [depth, setDepth] = useState<string>('4');

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the
    // calculator here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.useCase) setUseCase(s.useCase);
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.area !== undefined) setArea(s.area);
    if (s.depth !== undefined) setDepth(s.depth);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ mode, unitSystem, useCase, length, width, area, depth });
  }, [mode, unitSystem, useCase, length, width, area, depth]);

  // When the use case changes, set a sensible default depth (in the current unit system).
  const prevUseCase = useRef<UseCase>(useCase);
  useEffect(() => {
    if (!hasLoaded.current) return;
    if (prevUseCase.current === useCase) return;
    prevUseCase.current = useCase;
    if (useCase === 'fill-bed') {
      setDepth(unitSystem === 'metric' ? '25' : '10');
    } else {
      setDepth(unitSystem === 'metric' ? '1' : '0.375');
    }
  }, [useCase, unitSystem]);

  const result: CalculatorResult = useMemo(() => {
    let sqft = 0;
    if (mode === 'dimensions') {
      let l = parseFloat(length);
      let w = parseFloat(width);
      if (unitSystem === 'metric') {
        l = Number.isFinite(l) ? l * M_TO_FT : 0;
        w = Number.isFinite(w) ? w * M_TO_FT : 0;
      }
      sqft = Number.isFinite(l) && Number.isFinite(w) ? l * w : 0;
    } else {
      let a = parseFloat(area);
      if (unitSystem === 'metric') {
        a = Number.isFinite(a) ? a * SQM_TO_SQFT : 0;
      }
      sqft = Number.isFinite(a) ? a : 0;
    }

    let depthIn = parseFloat(depth);
    if (unitSystem === 'metric') {
      depthIn = Number.isFinite(depthIn) ? depthIn * CM_TO_IN : 0;
    }
    const depthFt = Number.isFinite(depthIn) ? depthIn / 12 : 0;
    const cubicFeet = Math.max(0, sqft * depthFt);
    const cubicYards = cubicFeet / 27;
    const cubicMeters = cubicFeet * 0.0283168;
    const tons = cubicYards * TONS_PER_CUBIC_YARD;
    const bags40lb = Math.ceil(cubicFeet / 0.75);

    return { sqft, cubicFeet, cubicYards, cubicMeters, tons, bags40lb, depthIn };
  }, [mode, unitSystem, length, width, area, depth]);

  const hasResult = result.cubicFeet > 0;

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';
  const depthUnit = isMetric ? 'cm' : 'in';
  const areaUnit = isMetric ? 'm²' : 'sq ft';

  const handleNumericChange = (
    setter: (v: string) => void,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = enforceNonNegative(sanitizeNumericInput(e.target.value));
    setter(cleaned);
  };

  const handleLengthChange = handleNumericChange(setLength);
  const handleWidthChange = handleNumericChange(setWidth);
  const handleAreaChange = handleNumericChange(setArea);
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
    doc.text('Topsoil Calculator Results', margin, y);
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
    inputLines.push(`Use case: ${useCase === 'fill-bed' ? 'Fill a raised bed' : 'Topdress / level a lawn'}`);
    if (mode === 'dimensions') {
      inputLines.push(`Length: ${length || 0} ${lengthUnit}`);
      inputLines.push(`Width: ${width || 0} ${lengthUnit}`);
    } else {
      inputLines.push(`Total area: ${area || 0} ${areaUnit}`);
    }
    inputLines.push(`Depth: ${depth || 0} ${depthUnit}`);
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
      `Cubic feet: ${round(result.cubicFeet, 1).toLocaleString()} cu ft`,
      `Cubic yards: ${round(result.cubicYards, 2).toLocaleString()} cu yd`,
      `Cubic meters: ${round(result.cubicMeters, 3).toLocaleString()} m³`,
      `Estimated weight: ~${round(result.tons, 2).toLocaleString()} tons (approximate)`,
      `40 lb bags: ~${result.bags40lb.toLocaleString()} bags (avg. 0.75 cu ft/bag)`,
    ];
    resultLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Weight is an approximate estimate based on ~1.2 tons per cubic yard.',
      margin, y,
    );
    y += 12;
    doc.text(
      'Actual weight varies with moisture content and soil composition.',
      margin, y,
    );

    doc.save('topsoil-calculator-results.pdf');
  };

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setMode('dimensions');
    setUnitSystem('imperial');
    setUseCase('fill-bed');
    setLength('10');
    setWidth('10');
    setArea('100');
    setDepth('4');
  };

  return {
    mode,
    setMode,
    unitSystem,
    setUnitSystem,
    useCase,
    setUseCase,
    length,
    width,
    area,
    depth,
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
    exportPdf,
    reset,
  };
}

export type TopsoilCalculatorState = ReturnType<typeof useTopsoilCalculatorState>;
