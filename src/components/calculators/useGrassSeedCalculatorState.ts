import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from GrassSeedCalculator.tsx (Calculator Page Redesign rollout --
// see CALC_ROLLOUT_PATTERN.md). This hook is the single source of truth for
// all of the calculator's inputs/result/reset/PDF-export logic, so it's
// reachable both from the sticky card (GrassSeedCalculatorCard.tsx) and from
// the action row + Share/Embed/Cite modal that render outside the card's own
// component tree (GrassSeedCalculatorPanel.tsx, via the shared
// CalculatorPanel.tsx).

export type InputMode = 'dimensions' | 'sqft' | 'acres';
export type UnitSystem = 'imperial' | 'metric';
export type SeedingMode = 'new-lawn' | 'overseeding';

const STORAGE_KEY = 'grass-seed-calculator-state-v1';

export interface GrassPreset {
  name: string;
  /** lb of seed per 1,000 sq ft for a brand-new lawn from bare soil. */
  newLawnRate: number;
  /** lb of seed per 1,000 sq ft when overseeding an existing lawn. */
  overseedRate: number;
}

// Seeding rates are commonly published midpoints from university turfgrass
// extension guidance (Penn State, Purdue, Clemson HGIC, and similar). Actual
// label rates vary by cultivar/blend — always check the bag.
export const GRASS_PRESETS: GrassPreset[] = [
  { name: 'Kentucky Bluegrass', newLawnRate: 2, overseedRate: 1 },
  { name: 'Tall Fescue', newLawnRate: 7, overseedRate: 3.5 },
  { name: 'Perennial Ryegrass', newLawnRate: 8, overseedRate: 4 },
  { name: 'Fine Fescue', newLawnRate: 5, overseedRate: 2.5 },
  { name: 'Bermuda (hulled)', newLawnRate: 2, overseedRate: 1 },
  { name: 'Zoysia', newLawnRate: 1.5, overseedRate: 0.75 },
];

const BAG_SIZE_LB = 50;
const SQFT_PER_ACRE = 43560;

export interface SavedState {
  mode: InputMode;
  unitSystem: UnitSystem;
  seedingMode: SeedingMode;
  grass: string;
  length: string;
  width: string;
  sqft: string;
  acres: string;
}

export interface CalculatorResult {
  totalSqft: number;
  totalLb: number;
  bags: number;
  ratePerAcre: number;
  bagsPerAcre: number;
  totalKg: number;
  acresEquivalent: number;
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

const GRASS_NAMES = new Set(GRASS_PRESETS.map((p) => p.name));

/**
 * Reads mode/units/seedingMode/grass/length/width/sqft/acres from the page's
 * URL query string -- the foundation of the "share with results" feature.
 * Only returns a non-null object when at least one of length/width/sqft/
 * acres is present, so a plain bookmarked/shared-without-results URL never
 * accidentally overrides a returning visitor's saved state with blanks.
 *
 * Like the mulch calculator (and unlike the pilot's single length/width
 * pair), this calculator's primary result can be driven by any ONE of three
 * mutually-exclusive inputs depending on mode -- length+width (dimensions),
 * sqft (total area), or acres -- so the "core" guard here checks for any of
 * them rather than a single fixed pair.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);

  const hasDimension =
    params.has('length') || params.has('width') || params.has('sqft') || params.has('acres');
  if (!hasDimension) return null;

  const out: Partial<SavedState> = {};
  const mode = params.get('mode');
  const units = params.get('units');
  const seedingMode = params.get('seedingMode');
  const grass = params.get('grass');
  const length = params.get('length');
  const width = params.get('width');
  const sqft = params.get('sqft');
  const acres = params.get('acres');

  if (mode === 'dimensions' || mode === 'sqft' || mode === 'acres') out.mode = mode;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;
  if (seedingMode === 'new-lawn' || seedingMode === 'overseeding') out.seedingMode = seedingMode;
  if (grass && GRASS_NAMES.has(grass)) out.grass = grass;

  if (length && /^\d*\.?\d*$/.test(length)) out.length = length;
  if (width && /^\d*\.?\d*$/.test(width)) out.width = width;
  if (sqft && /^\d*\.?\d*$/.test(sqft)) out.sqft = sqft;
  if (acres && /^\d*\.?\d*$/.test(acres)) out.acres = acres;

  return out;
}

const M_TO_FT = 3.28084;
const SQM_TO_SQFT = 10.7639;
const HECTARE_TO_SQFT = 107639;
const LB_TO_KG = 0.453592;

export function useGrassSeedCalculatorState() {
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<InputMode>('sqft');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [seedingMode, setSeedingMode] = useState<SeedingMode>('new-lawn');
  const [grass, setGrass] = useState<string>('Tall Fescue');
  const [length, setLength] = useState<string>('50');
  const [width, setWidth] = useState<string>('100');
  const [sqft, setSqft] = useState<string>('5000');
  const [acres, setAcres] = useState<string>('1');

  // Load cached/shared state once on mount (client-only). A shared link's
  // query params take priority over this browser's own saved state --
  // someone opening a shared result should see THAT result, not their own
  // last visit, even if they've used the calculator here before.
  useEffect(() => {
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.seedingMode) setSeedingMode(s.seedingMode);
    if (s.grass) setGrass(s.grass);
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.sqft !== undefined) setSqft(s.sqft);
    if (s.acres !== undefined) setAcres(s.acres);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ mode, unitSystem, seedingMode, grass, length, width, sqft, acres });
  }, [mode, unitSystem, seedingMode, grass, length, width, sqft, acres]);

  const preset = useMemo(
    () => GRASS_PRESETS.find((p) => p.name === grass) ?? GRASS_PRESETS[0],
    [grass],
  );

  const ratePer1000 = seedingMode === 'new-lawn' ? preset.newLawnRate : preset.overseedRate;

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';
  const areaUnit = isMetric ? 'm²' : 'sq ft';
  const bigAreaLabel = isMetric ? 'Hectares' : 'Acres';
  const bigAreaUnit = isMetric ? 'ha' : 'acres';

  const handleNumericChange = (
    setter: (v: string) => void,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = enforceNonNegative(sanitizeNumericInput(e.target.value));
    setter(cleaned);
  };

  const handleLengthChange = handleNumericChange(setLength);
  const handleWidthChange = handleNumericChange(setWidth);
  const handleSqftChange = handleNumericChange(setSqft);
  const handleAcresChange = handleNumericChange(setAcres);

  const result: CalculatorResult = useMemo(() => {
    let totalSqft = 0;

    if (mode === 'dimensions') {
      let l = parseFloat(length);
      let w = parseFloat(width);
      if (isMetric) {
        l = Number.isFinite(l) ? l * M_TO_FT : 0;
        w = Number.isFinite(w) ? w * M_TO_FT : 0;
      }
      totalSqft = Number.isFinite(l) && Number.isFinite(w) ? l * w : 0;
    } else if (mode === 'sqft') {
      let a = parseFloat(sqft);
      if (isMetric) {
        a = Number.isFinite(a) ? a * SQM_TO_SQFT : 0;
      }
      totalSqft = Number.isFinite(a) ? a : 0;
    } else {
      let a = parseFloat(acres);
      if (isMetric) {
        totalSqft = Number.isFinite(a) ? a * HECTARE_TO_SQFT : 0;
      } else {
        totalSqft = Number.isFinite(a) ? a * SQFT_PER_ACRE : 0;
      }
    }

    totalSqft = Math.max(0, totalSqft);

    const totalLb = (totalSqft / 1000) * ratePer1000;
    const bags = Math.ceil(totalLb / BAG_SIZE_LB || 0);
    const ratePerAcre = ratePer1000 * (SQFT_PER_ACRE / 1000);
    const bagsPerAcre = ratePerAcre / BAG_SIZE_LB;
    const totalKg = totalLb * LB_TO_KG;
    const acresEquivalent = totalSqft / SQFT_PER_ACRE;

    return { totalSqft, totalLb, bags, ratePerAcre, bagsPerAcre, totalKg, acresEquivalent };
  }, [mode, isMetric, length, width, sqft, acres, ratePer1000]);

  const hasResult = result.totalSqft > 0;

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Grass Seed Calculator Results', margin, y);
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
    inputLines.push(`Grass type: ${grass}`);
    inputLines.push(`Mode: ${seedingMode === 'new-lawn' ? 'New lawn' : 'Overseeding'}`);
    if (mode === 'dimensions') {
      inputLines.push(`Length: ${length || 0} ${lengthUnit}`);
      inputLines.push(`Width: ${width || 0} ${lengthUnit}`);
    } else if (mode === 'sqft') {
      inputLines.push(`Total area: ${sqft || 0} ${areaUnit}`);
    } else {
      inputLines.push(`Total area: ${acres || 0} ${bigAreaUnit}`);
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
      `Area: ${round(result.totalSqft, 0).toLocaleString()} sq ft (${round(result.acresEquivalent, 3)} acres)`,
      `Seeding rate: ${ratePer1000} lb per 1,000 sq ft`,
      `Total seed needed: ${round(result.totalLb, 1).toLocaleString()} lb (${round(result.totalKg, 1)} kg)`,
      `50 lb bags: ${result.bags.toLocaleString()} bags`,
      `Rate per acre: ${round(result.ratePerAcre, 1).toLocaleString()} lb/acre (~${round(result.bagsPerAcre, 1)} bags/acre)`,
    ];
    resultLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Rates are general midpoints from university turfgrass extension guidance.',
      margin, y,
    );
    y += 12;
    doc.text(
      'Always check the seed label — cultivar and blend can shift the recommended rate.',
      margin, y,
    );

    doc.save('grass-seed-calculator-results.pdf');
  };

  /** Restores the default 5,000 sq ft / Tall Fescue / new-lawn setup. */
  const reset = () => {
    setMode('sqft');
    setUnitSystem('imperial');
    setSeedingMode('new-lawn');
    setGrass('Tall Fescue');
    setLength('50');
    setWidth('100');
    setSqft('5000');
    setAcres('1');
  };

  return {
    mode,
    setMode,
    unitSystem,
    setUnitSystem,
    seedingMode,
    setSeedingMode,
    grass,
    setGrass,
    length,
    width,
    sqft,
    acres,
    preset,
    ratePer1000,
    isMetric,
    lengthUnit,
    areaUnit,
    bigAreaLabel,
    bigAreaUnit,
    handleLengthChange,
    handleWidthChange,
    handleSqftChange,
    handleAcresChange,
    result,
    hasResult,
    exportPdf,
    reset,
  };
}

export type GrassSeedCalculatorState = ReturnType<typeof useGrassSeedCalculatorState>;
