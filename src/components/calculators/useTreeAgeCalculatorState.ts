import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from TreeAgeCalculator.tsx as part of the sticky-layout rollout
// (see CALC_ROLLOUT_PATTERN.md). This hook is now the single source of
// truth for inputs/result/reset/PDF-export; TreeAgeCalculatorCard.tsx is a
// pure presentational component driven entirely by its return value, and
// TreeAgeCalculatorPanel.tsx is the one place that calls it, so the card,
// the action row, and the Share/Embed/Cite modal all read/write the same
// state. The original TreeAgeCalculator.tsx is left untouched -- the embed
// page (src/pages/embed/tree-age-calculator.astro) still imports it
// directly, the same way every other already-converted calculator's embed
// page keeps using its own original monolithic component.

export type UnitSystem = 'imperial' | 'metric';

export interface SpeciesPreset {
  name: string;
  /** Growth factor: estimated years of age per inch of trunk diameter (DBH). */
  growthFactor: number;
}

// Growth factors follow the widely-used International Society of Arboriculture
// diameter method (age ≈ DBH in inches × growth factor). Where a species isn't
// part of the standard ISA reference chart, the factor is derived from published
// diameter-growth-rate research and noted as a rougher estimate in the copy below.
export const SPECIES_PRESETS: SpeciesPreset[] = [
  { name: 'Oak', growthFactor: 5 },
  { name: 'Maple', growthFactor: 4.5 },
  { name: 'Pine', growthFactor: 5 },
  { name: 'Redwood', growthFactor: 10 },
  { name: 'Sycamore', growthFactor: 4 },
  { name: 'Magnolia', growthFactor: 4 },
  { name: 'Live Oak', growthFactor: 4 },
  { name: 'Apple', growthFactor: 3 },
  { name: 'Beech', growthFactor: 6 },
  { name: 'Cedar', growthFactor: 3 },
  { name: 'Cottonwood', growthFactor: 2 },
  { name: 'Hemlock', growthFactor: 7 },
  { name: 'Olive', growthFactor: 4 },
  { name: 'Pecan', growthFactor: 1 },
  { name: 'Average / Unknown species', growthFactor: 4 },
];

// The growth-factor method is a general estimate, not a precise measurement.
// A commonly cited accuracy range is roughly ±20% for healthy, typically-grown
// trees, with wider error for stressed urban trees. We surface a range instead
// of one falsely-precise number.
const VARIANCE = 0.2;

const STORAGE_KEY = 'tree-age-calculator-state-v1';

export interface SavedState {
  unitSystem: UnitSystem;
  species: string;
  circumference: string;
}

export interface CalculatorResult {
  circIn: number;
  diameterIn: number;
  diameterCm: number;
  ageMid: number;
  ageLow: number;
  ageHigh: number;
}

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

const CM_TO_IN = 0.393701;
const IN_TO_CM = 2.54;

// Round an age (in years) to a cleaner, appropriately-rough number.
function roundAge(years: number): number {
  if (!Number.isFinite(years) || years <= 0) return 0;
  if (years < 20) return Math.round(years);
  if (years < 100) return Math.round(years / 5) * 5;
  return Math.round(years / 10) * 10;
}

/**
 * Reads species/circumference/units from the page's URL query string -- the
 * foundation of the "share with results" feature. Only returns a non-null
 * object when circumference (the one param essential to the primary
 * result) is present, so a plain bookmarked/shared-without-results URL
 * never accidentally overrides a returning visitor's saved state with
 * blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('circumference')) return null;

  const out: Partial<SavedState> = {};
  const circumference = params.get('circumference');
  const species = params.get('species');
  const units = params.get('units');

  if (circumference && /^\d*\.?\d*$/.test(circumference)) out.circumference = circumference;
  if (species && SPECIES_PRESETS.some((p) => p.name === species)) out.species = species;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;

  return out;
}

export function useTreeAgeCalculatorState() {
  const hasLoaded = useRef(false);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [species, setSpecies] = useState<string>('Oak');
  const [circumference, setCircumference] = useState<string>('60');

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.species) setSpecies(s.species);
    if (s.circumference !== undefined) setCircumference(s.circumference);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ unitSystem, species, circumference });
  }, [unitSystem, species, circumference]);

  const preset = useMemo(
    () => SPECIES_PRESETS.find((p) => p.name === species) ?? SPECIES_PRESETS[0],
    [species],
  );

  const isMetric = unitSystem === 'metric';
  const circUnit = isMetric ? 'cm' : 'in';

  const handleCircumferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = enforceNonNegative(sanitizeNumericInput(e.target.value));
    setCircumference(cleaned);
  };

  const result: CalculatorResult = useMemo(() => {
    let circIn = parseFloat(circumference);
    if (!Number.isFinite(circIn)) circIn = 0;
    if (isMetric) circIn = circIn * CM_TO_IN;
    circIn = Math.max(0, circIn);

    const diameterIn = circIn / Math.PI;
    const ageMid = diameterIn * preset.growthFactor;
    const ageLow = roundAge(ageMid * (1 - VARIANCE));
    const ageHigh = roundAge(ageMid * (1 + VARIANCE));
    const diameterCm = diameterIn * IN_TO_CM;

    return { circIn, diameterIn, diameterCm, ageMid, ageLow, ageHigh };
  }, [circumference, isMetric, preset]);

  const hasResult = result.circIn > 0;

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Tree Age Calculator Results', margin, y);
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
    const inputLines: string[] = [
      `Species: ${species}`,
      `Growth factor: ${preset.growthFactor} (years per inch of diameter)`,
      `Trunk circumference (at 4.5 ft / breast height): ${circumference || 0} ${circUnit}`,
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
    const resultLines: string[] = [
      `Diameter (DBH): ${round(result.diameterIn, 1)} in (${round(result.diameterCm, 1)} cm)`,
      `Estimated age: ${result.ageLow}–${result.ageHigh} years`,
      `Midpoint estimate: ~${Math.round(result.ageMid)} years`,
    ];
    resultLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'This is an estimate, not a precise measurement. Actual age varies with',
      margin, y,
    );
    y += 12;
    doc.text(
      'soil, climate, competition, and care. Ring counting (coring) is the only exact method.',
      margin, y,
    );

    doc.save('tree-age-calculator-results.pdf');
  };

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setUnitSystem('imperial');
    setSpecies('Oak');
    setCircumference('60');
  };

  return {
    unitSystem,
    setUnitSystem,
    species,
    setSpecies,
    circumference,
    isMetric,
    circUnit,
    preset,
    handleCircumferenceChange,
    result,
    hasResult,
    exportPdf,
    reset,
  };
}

export type TreeAgeCalculatorState = ReturnType<typeof useTreeAgeCalculatorState>;
