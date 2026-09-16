import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from SodCalculator.tsx (Calculator Page Redesign rollout -- see
// CALC_ROLLOUT_PATTERN.md). This hook is the single source of truth for the
// Sod Calculator's state; SodCalculatorCard.tsx is a pure presentational
// component driven entirely by its return value, and SodCalculatorPanel.tsx
// is the one place that calls it, so the card, the action row, and the
// Share/Embed/Cite modal all read/write the same state despite living in
// different parts of the DOM.

export type ShapeMode = 'rectangle' | 'circle' | 'triangle' | 'multi';
export type UnitSystem = 'imperial' | 'metric';
export type GrassType =
  | 'unsure'
  | 'bermuda'
  | 'zoysia'
  | 'st-augustine'
  | 'centipede'
  | 'tall-fescue'
  | 'kentucky-bluegrass'
  | 'ryegrass'
  | 'custom';
export type WasteFactor = '5' | '10' | '15';

export interface RectSection {
  length: string;
  width: string;
}

const STORAGE_KEY = 'sod-calculator-state-v1';

// Typical pallet coverage in sq ft by grass type. Warm-season grasses are
// cut as thicker slabs with more soil attached (their stolon/rhizome root
// systems don't roll cleanly), so a pallet carries less area. Cool-season
// grasses are cut thinner and sold as rolls, so a pallet carries more.
// "Not sure" defaults to 450 sq ft, the Turfgrass Producers International
// industry-standard figure -- see the calculator page for sourcing.
export const GRASS_COVERAGE: Record<Exclude<GrassType, 'custom'>, number> = {
  unsure: 450,
  bermuda: 400,
  zoysia: 400,
  'st-augustine': 450,
  centipede: 450,
  'tall-fescue': 500,
  'kentucky-bluegrass': 500,
  ryegrass: 600,
};

export const GRASS_LABEL: Record<GrassType, string> = {
  unsure: 'Not sure / use industry standard',
  bermuda: 'Bermuda',
  zoysia: 'Zoysia',
  'st-augustine': 'St. Augustine',
  centipede: 'Centipede',
  'tall-fescue': 'Tall Fescue',
  'kentucky-bluegrass': 'Kentucky Bluegrass',
  ryegrass: 'Ryegrass',
  custom: "Custom — enter my supplier's coverage",
};

export const GRASS_SOLD_AS: Record<GrassType, string> = {
  unsure: 'varies',
  bermuda: 'slabs',
  zoysia: 'slabs',
  'st-augustine': 'slabs',
  centipede: 'slabs',
  'tall-fescue': 'rolls',
  'kentucky-bluegrass': 'rolls',
  ryegrass: 'rolls',
  custom: 'varies',
};

// One piece is a standard 16" x 24" slab. 16 x 24 = 384 sq in = 2.667 sq ft
// exactly, but suppliers commonly quote pieces at roughly 2.75 sq ft to
// account for slightly oversized cuts -- we use that supplier-facing figure
// here rather than the bare geometric one.
export const SQFT_PER_PIECE = 2.75;

function round(value: number, decimals = 1): number {
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

export interface SavedState {
  shape: ShapeMode;
  unitSystem: UnitSystem;
  grassType: GrassType;
  customCoverage: string;
  wasteFactor: WasteFactor;
  length: string;
  width: string;
  radius: string;
  triBase: string;
  triHeight: string;
  sections: RectSection[];
}

export interface CalculatorResult {
  sqft: number;
  sqftWithWaste: number;
  coverage: number;
  pallets: number;
  pieces: number;
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

const GRASS_TYPES: GrassType[] = [
  'unsure', 'bermuda', 'zoysia', 'st-augustine', 'centipede',
  'tall-fescue', 'kentucky-bluegrass', 'ryegrass', 'custom',
];

/**
 * Reads shape/units/length/width/radius/triBase/triHeight/grassType/
 * customCoverage/wasteFactor from the page's URL query string -- the
 * foundation of the "share with results" feature. Only returns a non-null
 * object when the shape param and that shape's own core dimension param(s)
 * are present, so a plain bookmarked/shared-without-results URL never
 * accidentally overrides a returning visitor's saved state with blanks.
 * "Multiple sections" mode isn't shareable via URL (its per-section list
 * doesn't map cleanly to flat query params), so a shape=multi URL with no
 * matching single-shape dimensions simply falls through to the visitor's
 * own saved state, same as a bare/bookmarked URL would.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);

  const shapeParam = params.get('shape');
  const shape: ShapeMode | null =
    shapeParam === 'rectangle' || shapeParam === 'circle' || shapeParam === 'triangle' || shapeParam === 'multi'
      ? shapeParam
      : null;
  if (!shape) return null;

  const hasCoreDimension =
    (shape === 'rectangle' && params.has('length') && params.has('width')) ||
    (shape === 'circle' && params.has('radius')) ||
    (shape === 'triangle' && params.has('triBase') && params.has('triHeight'));
  if (!hasCoreDimension) return null;

  const out: Partial<SavedState> = { shape };

  const units = params.get('units');
  const length = params.get('length');
  const width = params.get('width');
  const radius = params.get('radius');
  const triBase = params.get('triBase');
  const triHeight = params.get('triHeight');
  const grassType = params.get('grassType');
  const customCoverage = params.get('customCoverage');
  const wasteFactor = params.get('wasteFactor');

  if (units === 'imperial' || units === 'metric') out.unitSystem = units;
  if (length && /^\d*\.?\d*$/.test(length)) out.length = length;
  if (width && /^\d*\.?\d*$/.test(width)) out.width = width;
  if (radius && /^\d*\.?\d*$/.test(radius)) out.radius = radius;
  if (triBase && /^\d*\.?\d*$/.test(triBase)) out.triBase = triBase;
  if (triHeight && /^\d*\.?\d*$/.test(triHeight)) out.triHeight = triHeight;
  if (grassType && (GRASS_TYPES as string[]).includes(grassType)) out.grassType = grassType as GrassType;
  if (customCoverage && /^\d*\.?\d*$/.test(customCoverage)) out.customCoverage = customCoverage;
  if (wasteFactor === '5' || wasteFactor === '10' || wasteFactor === '15') out.wasteFactor = wasteFactor;

  return out;
}

const M_TO_FT = 3.28084;

const DEFAULTS: SavedState = {
  shape: 'rectangle',
  unitSystem: 'imperial',
  grassType: 'unsure',
  customCoverage: '450',
  wasteFactor: '10',
  length: '40',
  width: '25',
  radius: '15',
  triBase: '30',
  triHeight: '20',
  sections: [
    { length: '20', width: '15' },
    { length: '10', width: '8' },
  ],
};

export function useSodCalculatorState() {
  const hasLoaded = useRef(false);

  const [shape, setShape] = useState<ShapeMode>(DEFAULTS.shape);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(DEFAULTS.unitSystem);
  const [grassType, setGrassType] = useState<GrassType>(DEFAULTS.grassType);
  const [customCoverage, setCustomCoverage] = useState<string>(DEFAULTS.customCoverage);
  const [wasteFactor, setWasteFactor] = useState<WasteFactor>(DEFAULTS.wasteFactor);

  const [length, setLength] = useState<string>(DEFAULTS.length);
  const [width, setWidth] = useState<string>(DEFAULTS.width);
  const [radius, setRadius] = useState<string>(DEFAULTS.radius);
  const [triBase, setTriBase] = useState<string>(DEFAULTS.triBase);
  const [triHeight, setTriHeight] = useState<string>(DEFAULTS.triHeight);
  const [sections, setSections] = useState<RectSection[]>(DEFAULTS.sections);

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.shape) setShape(s.shape);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.grassType) setGrassType(s.grassType);
    if (s.customCoverage !== undefined) setCustomCoverage(s.customCoverage);
    if (s.wasteFactor) setWasteFactor(s.wasteFactor);
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.radius !== undefined) setRadius(s.radius);
    if (s.triBase !== undefined) setTriBase(s.triBase);
    if (s.triHeight !== undefined) setTriHeight(s.triHeight);
    if (!fromUrl && s.sections && Array.isArray(s.sections) && s.sections.length > 0) setSections(s.sections);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({
      shape, unitSystem, grassType, customCoverage, wasteFactor,
      length, width, radius, triBase, triHeight, sections,
    });
  }, [shape, unitSystem, grassType, customCoverage, wasteFactor, length, width, radius, triBase, triHeight, sections]);

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';

  const handleNumericChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
  };

  const handleLengthChange = handleNumericChange(setLength);
  const handleWidthChange = handleNumericChange(setWidth);
  const handleRadiusChange = handleNumericChange(setRadius);
  const handleTriBaseChange = handleNumericChange(setTriBase);
  const handleTriHeightChange = handleNumericChange(setTriHeight);
  const handleCustomCoverageChange = handleNumericChange(setCustomCoverage);

  const updateSection = (index: number, field: keyof RectSection, value: string) => {
    const cleaned = enforceNonNegative(sanitizeNumericInput(value));
    setSections((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: cleaned } : s)));
  };

  const addSection = () => {
    setSections((prev) => [...prev, { length: '', width: '' }]);
  };

  const removeSection = (index: number) => {
    setSections((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const result: CalculatorResult = useMemo(() => {
    const toFt = (v: string) => {
      const n = parseFloat(v);
      if (!Number.isFinite(n)) return 0;
      return isMetric ? n * M_TO_FT : n;
    };

    let sqft = 0;
    if (shape === 'rectangle') {
      sqft = toFt(length) * toFt(width);
    } else if (shape === 'circle') {
      const r = toFt(radius);
      sqft = Math.PI * r * r;
    } else if (shape === 'triangle') {
      sqft = 0.5 * toFt(triBase) * toFt(triHeight);
    } else {
      sqft = sections.reduce((sum, s) => sum + toFt(s.length) * toFt(s.width), 0);
    }
    sqft = Math.max(0, sqft);

    const wastePct = parseFloat(wasteFactor) / 100;
    const sqftWithWaste = sqft * (1 + wastePct);

    const coverage = grassType === 'custom'
      ? parseFloat(customCoverage)
      : GRASS_COVERAGE[grassType];
    const validCoverage = Number.isFinite(coverage) && coverage > 0 ? coverage : 0;

    const pallets = validCoverage > 0 ? Math.ceil(sqftWithWaste / validCoverage) : 0;
    const pieces = sqftWithWaste > 0 ? Math.ceil(sqftWithWaste / SQFT_PER_PIECE) : 0;

    return { sqft, sqftWithWaste, coverage: validCoverage, pallets, pieces };
  }, [shape, unitSystem, length, width, radius, triBase, triHeight, sections, wasteFactor, grassType, customCoverage]);

  const hasResult = result.sqft > 0;
  const sqmWithWaste = result.sqftWithWaste / 10.7639;
  const soldAs = GRASS_SOLD_AS[grassType];

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Sod Calculator Results', margin, y);
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
    const inputLines: string[] = [`Shape: ${shape[0].toUpperCase()}${shape.slice(1)}`];
    if (shape === 'rectangle') {
      inputLines.push(`Length: ${length || 0} ${lengthUnit}`, `Width: ${width || 0} ${lengthUnit}`);
    } else if (shape === 'circle') {
      inputLines.push(`Radius: ${radius || 0} ${lengthUnit}`);
    } else if (shape === 'triangle') {
      inputLines.push(`Base: ${triBase || 0} ${lengthUnit}`, `Height: ${triHeight || 0} ${lengthUnit}`);
    } else {
      sections.forEach((s, i) => inputLines.push(`Section ${i + 1}: ${s.length || 0} × ${s.width || 0} ${lengthUnit}`));
    }
    inputLines.push(`Grass type: ${GRASS_LABEL[grassType]}`);
    inputLines.push(`Pallet coverage: ${result.coverage || 0} sq ft`);
    inputLines.push(`Waste factor: ${wasteFactor}%`);
    inputLines.forEach((line) => { doc.text(line, margin, y); y += 16; });

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Results', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const resultLines: string[] = [
      `Area: ${round(result.sqft, 1).toLocaleString()} sq ft`,
      `Area with waste factor: ${round(result.sqftWithWaste, 1).toLocaleString()} sq ft`,
      `Pallets needed: ${result.pallets.toLocaleString()}`,
      `Individual pieces (approx.): ${result.pieces.toLocaleString()}`,
    ];
    resultLines.forEach((line) => { doc.text(line, margin, y); y += 16; });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Estimates only — confirm exact pallet coverage with your supplier before ordering.', margin, y);
    y += 12;
    doc.text('Pallet and piece counts are rounded up to whole units.', margin, y);

    doc.save('sod-calculator-results.pdf');
  };

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setShape(DEFAULTS.shape);
    setUnitSystem(DEFAULTS.unitSystem);
    setGrassType(DEFAULTS.grassType);
    setCustomCoverage(DEFAULTS.customCoverage);
    setWasteFactor(DEFAULTS.wasteFactor);
    setLength(DEFAULTS.length);
    setWidth(DEFAULTS.width);
    setRadius(DEFAULTS.radius);
    setTriBase(DEFAULTS.triBase);
    setTriHeight(DEFAULTS.triHeight);
    setSections(DEFAULTS.sections);
  };

  return {
    shape,
    setShape,
    unitSystem,
    setUnitSystem,
    grassType,
    setGrassType,
    customCoverage,
    wasteFactor,
    setWasteFactor,
    length,
    width,
    radius,
    triBase,
    triHeight,
    sections,
    isMetric,
    lengthUnit,
    soldAs,
    handleLengthChange,
    handleWidthChange,
    handleRadiusChange,
    handleTriBaseChange,
    handleTriHeightChange,
    handleCustomCoverageChange,
    updateSection,
    addSection,
    removeSection,
    result,
    hasResult,
    sqmWithWaste,
    exportPdf,
    reset,
  };
}

export type SodCalculatorState = ReturnType<typeof useSodCalculatorState>;
