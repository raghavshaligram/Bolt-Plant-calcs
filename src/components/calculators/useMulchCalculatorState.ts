import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from MulchCalculator.tsx (Calculator Page Redesign rollout --
// see CALC_ROLLOUT_PATTERN.md). This hook is the single source of truth for
// all of the calculator's inputs/result/reset/PDF-export logic, so it's
// reachable both from the sticky card (MulchCalculatorCard.tsx) and from the
// action row + Share/Embed/Cite modal that render outside the card's own
// component tree (MulchCalculatorPanel.tsx, via the shared CalculatorPanel.tsx).

export type InputMode = 'dimensions' | 'area';
export type BedShape = 'rectangle' | 'circle';
export type UnitSystem = 'imperial' | 'metric';
export type Material = 'generic' | 'pine-straw';

const STORAGE_KEY = 'mulch-calculator-state-v1';

// Pine straw is sold by the bale, not by cubic yard or bag, so it needs its
// own coverage-based conversion instead of the generic bag-size divisor.
// Reference figure: "A 40-pound bale will typically cover about 100 square
// feet ... to a 2-inch depth" — N.C. Cooperative Extension (Lee County
// Center), "Pine Needle Mulch — the Myths and Legends," citing Texas
// AgriLife Extension Service. See the Pine Straw Coverage section on this
// page for the full citation. We convert that reference figure into an
// equivalent volume per bale (100 sq ft × 2/12 ft ≈ 16.67 cu ft), then scale
// it to whatever depth the user actually enters — the same way bag counts
// scale with depth for every other material here.
export const PINE_STRAW_SQFT_PER_BALE_AT_2IN = 100;
const PINE_STRAW_CUFT_PER_BALE = PINE_STRAW_SQFT_PER_BALE_AT_2IN * (2 / 12);

export interface SavedState {
  mode: InputMode;
  shape: BedShape;
  unitSystem: UnitSystem;
  material: Material;
  length: string;
  width: string;
  radius: string;
  area: string;
  depth: string;
  bagSize: string;
}

export interface CalculatorResult {
  sqft: number;
  cubicFeet: number;
  cubicYards: number;
  cubicMeters: number;
  bags: number;
  pineStrawBales: number;
  depthIn: number;
}

function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function bagCount(cubicFeet: number, bagSize = 2): number {
  if (cubicFeet <= 0) return 0;
  return Math.ceil(cubicFeet / bagSize);
}

function sanitizeNumericInput(raw: string): string {
  if (typeof raw !== 'string') return '';
  // Strip any HTML/script tags and angle brackets outright.
  let cleaned = raw.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  // Allow only digits, one decimal point, and a leading minus sign (which we then strip).
  cleaned = cleaned.replace(/[^\d.]/g, '');
  // Remove leading zeros but keep "0." valid
  cleaned = cleaned.replace(/^0+(?=\d)/, '');
  // Allow only one decimal point
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
}

function enforceNonNegative(value: string): string {
  // Strip any minus signs — negative dimensions/depth are nonsensical here.
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
 * Reads mode/shape/units/material/length/width/radius/area/depth/bagSize
 * from the page's URL query string -- the foundation of the "share with
 * results" feature. Only returns a non-null object when at least one of the
 * "core" params below is present, so a plain bookmarked/shared-without-
 * results URL never accidentally overrides a returning visitor's saved
 * state with blanks.
 *
 * Unlike the pilot (Raised Bed Soil, which always enters dimensions as
 * length x width), this calculator's primary result can be driven by any
 * ONE of three mutually-exclusive inputs depending on mode/shape --
 * length+width (rectangle), radius (circle), or area (total-area mode) --
 * always combined with depth. So the "core" guard here is: depth is present,
 * together with at least one of the shape-specific dimension params. That
 * covers all three input paths the pilot's simpler length/width/depth guard
 * didn't need to.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);

  const hasDimension = params.has('length') || params.has('radius') || params.has('area');
  if (!hasDimension || !params.has('depth')) return null;

  const out: Partial<SavedState> = {};
  const mode = params.get('mode');
  const shape = params.get('shape');
  const units = params.get('units');
  const material = params.get('material');
  const length = params.get('length');
  const width = params.get('width');
  const radius = params.get('radius');
  const area = params.get('area');
  const depth = params.get('depth');
  const bagSize = params.get('bagSize');

  if (mode === 'dimensions' || mode === 'area') out.mode = mode;
  if (shape === 'rectangle' || shape === 'circle') out.shape = shape;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;
  if (material === 'generic' || material === 'pine-straw') out.material = material;

  if (length && /^\d*\.?\d*$/.test(length)) out.length = length;
  if (width && /^\d*\.?\d*$/.test(width)) out.width = width;
  if (radius && /^\d*\.?\d*$/.test(radius)) out.radius = radius;
  if (area && /^\d*\.?\d*$/.test(area)) out.area = area;
  if (depth && /^\d*\.?\d*$/.test(depth)) out.depth = depth;
  if (bagSize && /^\d*\.?\d*$/.test(bagSize)) out.bagSize = bagSize;

  return out;
}

// Conversion helpers: metric inputs → internal imperial (feet/inches) for the math.
const M_TO_FT = 3.28084;
const CM_TO_IN = 0.393701;
const SQM_TO_SQFT = 10.7639;

export function useMulchCalculatorState() {
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<InputMode>('dimensions');
  const [shape, setShape] = useState<BedShape>('rectangle');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [material, setMaterial] = useState<Material>('generic');
  const [length, setLength] = useState<string>('8');
  const [width, setWidth] = useState<string>('4');
  const [radius, setRadius] = useState<string>('5');
  const [area, setArea] = useState<string>('32');
  const [depth, setDepth] = useState<string>('3');
  const [bagSize, setBagSize] = useState<string>('2');

  // Load cached/shared state once on mount (client-only). A shared link's
  // query params take priority over this browser's own saved state --
  // someone opening a shared result should see THAT result, not their own
  // last visit, even if they've used the calculator here before.
  useEffect(() => {
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.mode) setMode(s.mode);
    if (s.shape) setShape(s.shape);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.material) setMaterial(s.material);
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.radius !== undefined) setRadius(s.radius);
    if (s.area !== undefined) setArea(s.area);
    if (s.depth !== undefined) setDepth(s.depth);
    if (s.bagSize !== undefined) setBagSize(s.bagSize);
    hasLoaded.current = true;
  }, []);

  // Persist to localStorage whenever inputs change (after initial load).
  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ mode, shape, unitSystem, material, length, width, radius, area, depth, bagSize });
  }, [mode, shape, unitSystem, material, length, width, radius, area, depth, bagSize]);

  const parsedBagSize = parseFloat(bagSize);

  const result: CalculatorResult = useMemo(() => {
    let sqft = 0;
    if (mode === 'dimensions') {
      if (shape === 'rectangle') {
        let l = parseFloat(length);
        let w = parseFloat(width);
        if (unitSystem === 'metric') {
          l = Number.isFinite(l) ? l * M_TO_FT : 0;
          w = Number.isFinite(w) ? w * M_TO_FT : 0;
        }
        sqft = Number.isFinite(l) && Number.isFinite(w) ? l * w : 0;
      } else {
        let r = parseFloat(radius);
        if (unitSystem === 'metric') {
          r = Number.isFinite(r) ? r * M_TO_FT : 0;
        }
        sqft = Number.isFinite(r) ? Math.PI * r * r : 0;
      }
    } else {
      let a = parseFloat(area);
      if (unitSystem === 'metric') {
        a = Number.isFinite(a) ? a * SQM_TO_SQFT : 0;
      }
      sqft = Number.isFinite(a) ? a : 0;
    }

    let depthIn = parseFloat(depth);
    if (unitSystem === 'metric') {
      // depth is in cm in metric mode
      depthIn = Number.isFinite(depthIn) ? depthIn * CM_TO_IN : 0;
    }
    const depthFt = Number.isFinite(depthIn) ? depthIn / 12 : 0;
    const cubicFeet = Math.max(0, sqft * depthFt);
    const cubicYards = cubicFeet / 27;
    const cubicMeters = cubicFeet * 0.0283168;
    const bags = Number.isFinite(parsedBagSize) && parsedBagSize > 0
      ? bagCount(cubicFeet, parsedBagSize)
      : 0;
    const pineStrawBales = cubicFeet > 0 ? Math.ceil(cubicFeet / PINE_STRAW_CUFT_PER_BALE) : 0;

    return { sqft, cubicFeet, cubicYards, cubicMeters, bags, pineStrawBales, depthIn };
  }, [mode, shape, unitSystem, length, width, radius, area, depth, parsedBagSize]);

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
  const handleRadiusChange = handleNumericChange(setRadius);
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
    doc.text('Mulch Calculator Results', margin, y);
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
    if (mode === 'dimensions') {
      if (shape === 'rectangle') {
        inputLines.push(`Length: ${length || 0} ${lengthUnit}`);
        inputLines.push(`Width: ${width || 0} ${lengthUnit}`);
      } else {
        inputLines.push(`Shape: Circle`);
        inputLines.push(`Radius: ${radius || 0} ${lengthUnit}`);
      }
    } else {
      inputLines.push(`Total area: ${area || 0} ${areaUnit}`);
    }
    inputLines.push(`Depth: ${depth || 0} ${depthUnit}`);
    inputLines.push(`Material: ${material === 'pine-straw' ? 'Pine straw (sold by the bale)' : 'Bark, wood chips & other mulch'}`);
    if (material !== 'pine-straw') {
      inputLines.push(`Bag size: ${parsedBagSize || 2} cu ft`);
    }
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
      material === 'pine-straw'
        ? `Bales (~${PINE_STRAW_SQFT_PER_BALE_AT_2IN} sq ft at 2in depth): ${result.pineStrawBales.toLocaleString()}`
        : `Bags (${parsedBagSize || 2} cu ft): ${result.bags.toLocaleString()}`,
    ];
    resultLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    if (material === 'pine-straw') {
      doc.text(
        'Estimates only — verify coverage with your supplier. Bale coverage',
        margin, y,
      );
      y += 12;
      doc.text(
        'varies by bale size and how densely straw is packed.',
        margin, y,
      );
    } else {
      doc.text(
        'Estimates only — verify before buying materials. Bag counts assume',
        margin, y,
      );
      y += 12;
      doc.text(
        `standard ${parsedBagSize || 2} cu ft bags and round up to the next whole bag.`,
        margin, y,
      );
    }

    doc.save('mulch-calculator-results.pdf');
  };

  /** Restores the calculator's original defaults -- the action panel's Reset button. */
  const reset = () => {
    setMode('dimensions');
    setShape('rectangle');
    setUnitSystem('imperial');
    setMaterial('generic');
    setLength('8');
    setWidth('4');
    setRadius('5');
    setArea('32');
    setDepth('3');
    setBagSize('2');
  };

  return {
    mode,
    setMode,
    shape,
    setShape,
    unitSystem,
    setUnitSystem,
    material,
    setMaterial,
    length,
    width,
    radius,
    area,
    depth,
    bagSize,
    setBagSize,
    isMetric,
    lengthUnit,
    depthUnit,
    areaUnit,
    parsedBagSize,
    handleLengthChange,
    handleWidthChange,
    handleRadiusChange,
    handleAreaChange,
    handleDepthChange,
    result,
    hasResult,
    exportPdf,
    reset,
  };
}

export type MulchCalculatorState = ReturnType<typeof useMulchCalculatorState>;
