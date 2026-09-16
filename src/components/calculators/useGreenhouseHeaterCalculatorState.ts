import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from GreenhouseHeaterCalculator.tsx (Calculator Page Redesign
// rollout -- see CALC_ROLLOUT_PATTERN.md). This hook is the single source of
// truth for inputs/result/reset/PDF export, so the sticky panel's action row
// and the Share/Embed/Cite modal can read and reset the same state as the
// card even though they render outside the card's own component tree.

export type Shape = 'hoop' | 'gable' | 'lean-to';
export type UnitSystem = 'imperial' | 'metric';
export type GlazingKey = 'single-poly' | 'double-poly' | 'single-glass' | 'twinwall-poly' | 'triplewall-poly';
export type FuelKey = 'electric' | 'propane' | 'natgas';

const STORAGE_KEY = 'greenhouse-heater-calculator-state-v1';

// U-factors in BTU/(hr·ft²·°F) — approximate heat-transfer coefficients by
// glazing material. Single/double poly and double-polycarbonate values match
// Purdue University's published worked example (see Sources on this page);
// single-pane glass and twin-wall polycarbonate are widely-cited industry
// figures for those materials.
export const GLAZING_OPTIONS: Record<GlazingKey, { label: string; u: number }> = {
  'single-poly': { label: 'Single-layer poly film', u: 1.2 },
  'double-poly': { label: 'Double-layer inflated poly', u: 0.7 },
  'single-glass': { label: 'Single-pane glass', u: 1.1 },
  'twinwall-poly': { label: 'Twin-wall polycarbonate', u: 0.65 },
  'triplewall-poly': { label: 'Triple-wall polycarbonate', u: 0.55 },
};

export const FUEL_OPTIONS: Record<FuelKey, { label: string; efficiency: number }> = {
  electric: { label: 'Electric', efficiency: 99 },
  propane: { label: 'Propane', efficiency: 80 },
  natgas: { label: 'Natural gas', efficiency: 78 },
};

// Assumed roof pitch used to derive slant length for sloped-roof shapes.
// Not a user input — treated as a fixed, clearly-labeled assumption.
// 30° is a commonly cited pitch for freestanding gable/A-frame greenhouses
// (steep enough to shed snow); lean-to roofs are typically shallower since
// they run from a tall back wall down to a shorter front wall.
const GABLE_PITCH_DEG = 30;
const LEAN_TO_PITCH_DEG = 20;
const SAFETY_FACTOR = 1.15;

export interface SavedState {
  shape: Shape;
  unitSystem: UnitSystem;
  length: string;
  width: string;
  height: string;
  glazing: GlazingKey;
  insideTemp: string;
  outsideTemp: string;
  fuel: FuelKey;
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

function sanitizeTempInput(raw: string): string {
  // Temperatures can be negative (record lows), so allow a single leading minus.
  if (typeof raw !== 'string') return '';
  let cleaned = raw.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  const negative = cleaned.trim().startsWith('-');
  cleaned = cleaned.replace(/[^\d.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return negative ? `-${cleaned}` : cleaned;
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

const SHAPES: Shape[] = ['hoop', 'gable', 'lean-to'];
const NUM_RE = /^\d*\.?\d*$/;
// A signed decimal, allowing an optional leading minus sign -- the same
// shape sanitizeTempInput() produces. Empty string and a bare "-" are
// rejected so a stray/incomplete query param never gets treated as a valid
// temperature.
const TEMP_RE = /^-?\d+\.?\d*$/;

/**
 * Reads shape/dimensions/glazing/temps/fuel from the page's URL query string
 * -- the foundation of the "share with results" feature. Only returns a
 * non-null object when at least one of length/width/outsideTemp is present
 * -- length and width drive surface area, and outsideTemp drives the climate
 * side of the heat-loss math (Q = U × A × ΔT) that gives this calculator its
 * name -- so a plain bookmarked/shared-without-results URL never accidentally
 * overrides a returning visitor's saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('length') && !params.has('width') && !params.has('outsideTemp')) return null;

  const out: Partial<SavedState> = {};
  const shape = params.get('shape');
  const units = params.get('units');
  const length = params.get('length');
  const width = params.get('width');
  const height = params.get('height');
  const glazing = params.get('glazing');
  const insideTemp = params.get('insideTemp');
  const outsideTemp = params.get('outsideTemp');
  const fuel = params.get('fuel');

  if (shape && (SHAPES as string[]).includes(shape)) out.shape = shape as Shape;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;
  if (length && NUM_RE.test(length)) out.length = length;
  if (width && NUM_RE.test(width)) out.width = width;
  if (height && NUM_RE.test(height)) out.height = height;
  if (glazing && Object.prototype.hasOwnProperty.call(GLAZING_OPTIONS, glazing)) out.glazing = glazing as GlazingKey;
  if (insideTemp && TEMP_RE.test(insideTemp)) out.insideTemp = insideTemp;
  if (outsideTemp && TEMP_RE.test(outsideTemp)) out.outsideTemp = outsideTemp;
  if (fuel && Object.prototype.hasOwnProperty.call(FUEL_OPTIONS, fuel)) out.fuel = fuel as FuelKey;

  return out;
}

const M_TO_FT = 3.28084;
const BTU_TO_KW = 0.000293071;

function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}

export function useGreenhouseHeaterCalculatorState() {
  const hasLoaded = useRef(false);

  const [shape, setShape] = useState<Shape>('hoop');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [length, setLength] = useState<string>('48');
  const [width, setWidth] = useState<string>('20');
  const [height, setHeight] = useState<string>('7');
  const [glazing, setGlazing] = useState<GlazingKey>('double-poly');
  const [insideTemp, setInsideTemp] = useState<string>('65');
  const [outsideTemp, setOutsideTemp] = useState<string>('10');
  const [fuel, setFuel] = useState<FuelKey>('propane');

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
    if (s.height !== undefined) setHeight(s.height);
    if (s.glazing) setGlazing(s.glazing);
    if (s.insideTemp !== undefined) setInsideTemp(s.insideTemp);
    if (s.outsideTemp !== undefined) setOutsideTemp(s.outsideTemp);
    if (s.fuel) setFuel(s.fuel);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ shape, unitSystem, length, width, height, glazing, insideTemp, outsideTemp, fuel });
  }, [shape, unitSystem, length, width, height, glazing, insideTemp, outsideTemp, fuel]);

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';
  const tempUnit = isMetric ? '°C' : '°F';

  const result = useMemo(() => {
    let l = parseFloat(length);
    let w = parseFloat(width);
    let h = parseFloat(height);
    l = Number.isFinite(l) ? l : 0;
    w = Number.isFinite(w) ? w : 0;
    h = Number.isFinite(h) ? h : 0;

    if (isMetric) {
      l *= M_TO_FT;
      w *= M_TO_FT;
      h *= M_TO_FT;
    }

    let areaSqFt = 0;
    let pitchDeg = 0;
    let riseFt = 0;
    let slantFt = 0;

    if (shape === 'hoop') {
      const r = w / 2;
      areaSqFt = Math.PI * r * r + Math.PI * r * l;
      h = r; // peak height for a semicircular hoop is always half the width
    } else if (shape === 'gable') {
      pitchDeg = GABLE_PITCH_DEG;
      const pitchRad = (pitchDeg * Math.PI) / 180;
      const halfW = w / 2;
      riseFt = halfW * Math.tan(pitchRad);
      slantFt = Math.sqrt(halfW * halfW + riseFt * riseFt);
      const sideWalls = 2 * (h * l);
      const roofPanels = 2 * (slantFt * l);
      // End walls = full gable end (rectangle up to eave height + triangular
      // peak above it), not just the triangle — this is the complete
      // exposed-surface area for each short end of the structure.
      const endWalls = 2 * (w * h + 0.5 * w * riseFt);
      areaSqFt = sideWalls + roofPanels + endWalls;
    } else {
      // lean-to: simplified rectangular prism (uniform wall height) plus one
      // sloped roof panel. The back wall is assumed to be the shared wall
      // against an existing structure (house, barn) and is excluded from
      // heat-loss area since it doesn't face outside air.
      pitchDeg = LEAN_TO_PITCH_DEG;
      const pitchRad = (pitchDeg * Math.PI) / 180;
      riseFt = w * Math.tan(pitchRad);
      slantFt = Math.sqrt(w * w + riseFt * riseFt);
      const endWalls = 2 * (h * w);
      const frontWall = h * l;
      const roofPanel = slantFt * l;
      areaSqFt = endWalls + frontWall + roofPanel;
    }

    const insideF = isMetric ? cToF(parseFloat(insideTemp) || 0) : parseFloat(insideTemp) || 0;
    const outsideF = isMetric ? cToF(parseFloat(outsideTemp) || 0) : parseFloat(outsideTemp) || 0;
    const deltaT = Math.max(0, insideF - outsideF);

    const uFactor = GLAZING_OPTIONS[glazing].u;
    const efficiency = FUEL_OPTIONS[fuel].efficiency;

    const heatLossBtuHr = areaSqFt * deltaT * uFactor;
    const afterSafety = heatLossBtuHr * SAFETY_FACTOR;
    const recommendedBtuHr = afterSafety / (efficiency / 100);

    return {
      areaSqFt,
      deltaT,
      uFactor,
      efficiency,
      heatLossBtuHr,
      afterSafety,
      recommendedBtuHr,
      heatLossKw: heatLossBtuHr * BTU_TO_KW,
      recommendedKw: recommendedBtuHr * BTU_TO_KW,
      peakHeightFt: shape === 'hoop' ? h : null,
      pitchDeg,
    };
  }, [shape, unitSystem, length, width, height, glazing, insideTemp, outsideTemp, fuel, isMetric]);

  const hasResult = result.areaSqFt > 0 && result.deltaT >= 0;

  const handleNumericChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
  };

  const handleTempChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(sanitizeTempInput(e.target.value));
  };

  const handleLengthChange = handleNumericChange(setLength);
  const handleWidthChange = handleNumericChange(setWidth);
  const handleHeightChange = handleNumericChange(setHeight);
  const handleInsideTempChange = handleTempChange(setInsideTemp);
  const handleOutsideTempChange = handleTempChange(setOutsideTemp);

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Greenhouse Heater Calculator Results', margin, y);
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
    const shapeLabel = shape === 'hoop' ? 'Hoop / Quonset' : shape === 'gable' ? 'Gable (A-frame)' : 'Lean-to';
    const inputLines = [
      `Shape: ${shapeLabel}`,
      `Length: ${length || 0} ${lengthUnit}`,
      `Width: ${width || 0} ${lengthUnit}`,
      shape !== 'hoop' ? `Wall height: ${height || 0} ${lengthUnit}` : 'Peak height: automatic (half the width)',
      `Glazing: ${GLAZING_OPTIONS[glazing].label} (U = ${GLAZING_OPTIONS[glazing].u})`,
      `Desired inside temp: ${insideTemp || 0}${tempUnit}`,
      `Record low outside temp: ${outsideTemp || 0}${tempUnit}`,
      `Heater fuel: ${FUEL_OPTIONS[fuel].label} (${FUEL_OPTIONS[fuel].efficiency}% efficiency)`,
    ];
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
    const resultLines = [
      `Surface area: ${round(result.areaSqFt, 0).toLocaleString()} sq ft`,
      `Temperature differential: ${round(result.deltaT, 1)}°F`,
      `Heat loss (Q = U × A × ΔT): ${round(result.heatLossBtuHr, 0).toLocaleString()} BTU/hr (${round(result.heatLossKw, 2)} kW)`,
      `With 15% safety factor: ${round(result.afterSafety, 0).toLocaleString()} BTU/hr`,
      `Recommended heater size (÷ ${result.efficiency}% efficiency): ${round(result.recommendedBtuHr, 0).toLocaleString()} BTU/hr (${round(result.recommendedKw, 2)} kW)`,
    ];
    resultLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    [
      'Estimate assumes a well-sealed structure with no significant air infiltration.',
      'Add 10–15% for windy or exposed sites. Consider the ASHRAE 99% design',
      'temperature instead of record low for a more rigorous sizing standard.',
    ].forEach((line) => {
      doc.text(line, margin, y);
      y += 12;
    });

    doc.save('greenhouse-heater-calculator-results.pdf');
  };

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setShape('hoop');
    setUnitSystem('imperial');
    setLength('48');
    setWidth('20');
    setHeight('7');
    setGlazing('double-poly');
    setInsideTemp('65');
    setOutsideTemp('10');
    setFuel('propane');
  };

  return {
    shape,
    setShape,
    unitSystem,
    setUnitSystem,
    length,
    width,
    height,
    glazing,
    setGlazing,
    insideTemp,
    outsideTemp,
    fuel,
    setFuel,
    isMetric,
    lengthUnit,
    tempUnit,
    handleLengthChange,
    handleWidthChange,
    handleHeightChange,
    handleInsideTempChange,
    handleOutsideTempChange,
    result,
    hasResult,
    exportPdf,
    reset,
  };
}

export type GreenhouseHeaterCalculatorState = ReturnType<typeof useGreenhouseHeaterCalculatorState>;
