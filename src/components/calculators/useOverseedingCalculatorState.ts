import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from OverseedingCalculator.tsx per CALC_ROLLOUT_PATTERN.md --
// same state/result/PDF-export logic, now reachable from the sticky action
// panel and the Share/Embed/Cite modal, which live outside the calculator's
// own component tree. This hook is the single source of truth;
// OverseedingCalculatorCard.tsx is now a pure presentational component
// driven entirely by its return value, and OverseedingCalculatorPanel.tsx is
// the one place that calls it, so the card, the action panel, and the modal
// all read/write the same state.

export type GrassKey = 'kentucky-bluegrass' | 'tall-fescue' | 'perennial-ryegrass' | 'bermuda-winter' | 'fine-fescue';
export type Condition = 'thin' | 'patchy' | 'very-thin';
export type TopdressMaterial = 'topsoil' | 'compost' | 'peat-moss';
export type UnitSystem = 'imperial' | 'metric';

const STORAGE_KEY = 'overseeding-calculator-state-v1';

// Overseeding rates (lb per 1,000 sq ft) by grass type and lawn condition.
// Roughly half of new-lawn seeding rates for the same species, since
// existing turf already covers most of the ground -- per Ask Extension's
// published seeding-rate guidance (see Sources on this page).
export const GRASS_RATES: Record<GrassKey, { label: string; thin: number; patchy: number; veryThin: number }> = {
  'kentucky-bluegrass': { label: 'Kentucky bluegrass', thin: 1, patchy: 1.5, veryThin: 2 },
  'tall-fescue': { label: 'Tall fescue', thin: 3, patchy: 4, veryThin: 5 },
  'perennial-ryegrass': { label: 'Perennial ryegrass', thin: 4, patchy: 5, veryThin: 6 },
  'bermuda-winter': { label: 'Bermuda (winter overseed)', thin: 5, patchy: 7, veryThin: 10 },
  'fine-fescue': { label: 'Fine fescue', thin: 3, patchy: 3.5, veryThin: 4 },
};

export const CONDITION_LABELS: Record<Condition, string> = {
  thin: 'Thin but mostly green',
  patchy: 'Patchy',
  'very-thin': 'Very thin with bare spots',
};

export const TOPDRESS_OPTIONS: Record<TopdressMaterial, string> = {
  topsoil: 'Topsoil',
  compost: 'Compost',
  'peat-moss': 'Peat moss',
};

export interface SavedState {
  area: string;
  grass: GrassKey;
  condition: Condition;
  unitSystem: UnitSystem;
  useTopdressing: boolean;
  topdressMaterial: TopdressMaterial;
  depth: string;
}

export interface CalculatorResult {
  sqft: number;
  rate: number;
  seedLbs: number;
  bags50lb: number;
  topdressCubicFt: number;
  topdressCubicYd: number;
  topdressCubicM: number;
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
 * Reads area/grass/condition/units/topdressing/material/depth from the
 * page's URL query string -- the foundation of the "share with results"
 * feature. Only returns a non-null object when at least one of the three
 * "core" params (area/grass/condition -- the ones essential to the primary
 * seed-amount result) is present, so a plain bookmarked/shared-without-
 * results URL never accidentally overrides a returning visitor's saved
 * state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('area') && !params.has('grass') && !params.has('condition')) return null;

  const out: Partial<SavedState> = {};
  const area = params.get('area');
  const grass = params.get('grass');
  const condition = params.get('condition');
  const units = params.get('units');
  const topdressing = params.get('topdressing');
  const material = params.get('material');
  const depth = params.get('depth');

  if (area && /^\d*\.?\d*$/.test(area)) out.area = area;
  if (grass && Object.prototype.hasOwnProperty.call(GRASS_RATES, grass)) out.grass = grass as GrassKey;
  if (condition === 'thin' || condition === 'patchy' || condition === 'very-thin') out.condition = condition;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;
  if (topdressing === '1' || topdressing === '0') out.useTopdressing = topdressing === '1';
  if (material && Object.prototype.hasOwnProperty.call(TOPDRESS_OPTIONS, material)) out.topdressMaterial = material as TopdressMaterial;
  if (depth && /^\d*\.?\d*$/.test(depth)) out.depth = depth;

  return out;
}

const SQM_TO_SQFT = 10.7639;
const CM_TO_IN = 0.393701;

function getRate(grass: GrassKey, condition: Condition): number {
  const r = GRASS_RATES[grass];
  if (condition === 'thin') return r.thin;
  if (condition === 'patchy') return r.patchy;
  return r.veryThin;
}

export function useOverseedingCalculatorState() {
  const hasLoaded = useRef(false);

  const [area, setArea] = useState<string>('5000');
  const [grass, setGrass] = useState<GrassKey>('tall-fescue');
  const [condition, setCondition] = useState<Condition>('patchy');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [useTopdressing, setUseTopdressing] = useState<boolean>(true);
  const [topdressMaterial, setTopdressMaterial] = useState<TopdressMaterial>('compost');
  const [depth, setDepth] = useState<string>('0.25');

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.area !== undefined) setArea(s.area);
    if (s.grass) setGrass(s.grass);
    if (s.condition) setCondition(s.condition);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.useTopdressing !== undefined) setUseTopdressing(s.useTopdressing);
    if (s.topdressMaterial) setTopdressMaterial(s.topdressMaterial);
    if (s.depth !== undefined) setDepth(s.depth);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ area, grass, condition, unitSystem, useTopdressing, topdressMaterial, depth });
  }, [area, grass, condition, unitSystem, useTopdressing, topdressMaterial, depth]);

  const isMetric = unitSystem === 'metric';
  const areaUnit = isMetric ? 'm²' : 'sq ft';
  const depthUnit = isMetric ? 'cm' : 'in';

  const result: CalculatorResult = useMemo(() => {
    let a = parseFloat(area);
    a = Number.isFinite(a) ? a : 0;
    const sqft = isMetric ? a * SQM_TO_SQFT : a;

    const rate = getRate(grass, condition);
    const seedLbs = (sqft / 1000) * rate;
    const bags50lb = Math.ceil(seedLbs / 50);

    let depthIn = parseFloat(depth);
    depthIn = Number.isFinite(depthIn) ? depthIn : 0;
    if (isMetric) depthIn *= CM_TO_IN;
    const depthFt = depthIn / 12;
    const topdressCubicFt = useTopdressing ? Math.max(0, sqft * depthFt) : 0;
    const topdressCubicYd = topdressCubicFt / 27;
    const topdressCubicM = topdressCubicFt * 0.0283168;

    return { sqft, rate, seedLbs, bags50lb, topdressCubicFt, topdressCubicYd, topdressCubicM, depthIn };
  }, [area, grass, condition, isMetric, useTopdressing, depth]);

  const hasResult = result.sqft > 0;

  const handleNumericChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
  };

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
    doc.text('Overseeding Calculator Results', margin, y);
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
    const inputLines = [
      `Lawn area: ${area || 0} ${areaUnit}`,
      `Grass type: ${GRASS_RATES[grass].label}`,
      `Lawn condition: ${CONDITION_LABELS[condition]}`,
      `Rate used: ${result.rate} lb per 1,000 sq ft`,
    ];
    if (useTopdressing) {
      inputLines.push(`Topdressing: ${TOPDRESS_OPTIONS[topdressMaterial]} at ${depth || 0} ${depthUnit} deep`);
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
    const resultLines = [
      `Seed needed: ${round(result.seedLbs, 1).toLocaleString()} lb`,
      `50 lb bags: ${result.bags50lb.toLocaleString()}`,
    ];
    if (useTopdressing) {
      resultLines.push(`Topdressing: ${round(result.topdressCubicFt, 1).toLocaleString()} cu ft (${round(result.topdressCubicYd, 2)} cu yd)`);
    }
    resultLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Overseeding rates run roughly half of new-lawn seeding rates for the same grass type.', margin, y);

    doc.save('overseeding-calculator-results.pdf');
  };

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setArea('5000');
    setGrass('tall-fescue');
    setCondition('patchy');
    setUnitSystem('imperial');
    setUseTopdressing(true);
    setTopdressMaterial('compost');
    setDepth('0.25');
  };

  return {
    area,
    grass,
    setGrass,
    condition,
    setCondition,
    unitSystem,
    setUnitSystem,
    useTopdressing,
    setUseTopdressing,
    topdressMaterial,
    setTopdressMaterial,
    depth,
    isMetric,
    areaUnit,
    depthUnit,
    handleAreaChange,
    handleDepthChange,
    result,
    hasResult,
    exportPdf,
    reset,
  };
}

export type OverseedingCalculatorState = ReturnType<typeof useOverseedingCalculatorState>;
