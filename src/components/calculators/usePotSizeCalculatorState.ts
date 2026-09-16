import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from PotSizeCalculator.tsx (Build Prompt: Calculator Page
// Redesign -- Roll Out to All Remaining Calculators) so the same state --
// inputs, results for all three modes, reset -- is reachable from the action
// panel and the Share/Embed/Cite modal, which live outside the calculator's
// own component tree in the sticky sidebar. This hook is the single source
// of truth; PotSizeCalculatorCard.tsx is now a pure presentational
// component driven entirely by its return value, and
// PotSizeCalculatorPanel.tsx is the one place that calls it.
//
// PotSizeCalculator.tsx itself is left untouched -- it's still used directly
// (with its own local state) by src/pages/embed/pot-size-calculator.astro,
// which must keep working standalone.
//
// This calculator has three independent modes (unit converter, repotting
// size-up, plant/vegetable container guide), each with its own inputs and
// "primary result" -- unlike a single-formula calculator, there's no one
// trio of core params. Like useSoilTypeCalculatorState's percent/jar-test
// split, the URL-gating below checks across all three modes' identifying
// fields.

export type Mode = 'convert' | 'sizeup' | 'guide';
export type UnitSystem = 'imperial' | 'metric';
export type ConvertType = 'standard' | 'custom';
export type CustomType = 'dims' | 'volume';
export type VolUnit = 'gal' | 'qt' | 'L';

const STORAGE_KEY = 'pot-size-calculator-state-v1';

export const GAL_TO_L = 3.78541;
export const GAL_TO_QT = 4;
export const IN_TO_CM = 2.54;
export const IN3_TO_GAL = 1 / 231; // 1 US gallon = 231 cubic inches

export interface SavedState {
  mode: Mode;
  unitSystem: UnitSystem;
  convertType: ConvertType;
  standardSizeId: string;
  customType: CustomType;
  customDiameter: string;
  customHeight: string;
  customVolume: string;
  customVolUnit: VolUnit;
  sizeupCurrentId: string;
  guidePlantId: string;
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

// Standard nursery pot sizes, sorted by ascending diameter.
// Trade-gallon dimensions (1 qt through 15 gal) reflect real, commonly published
// nursery container dimensions; the industry has no single enforced standard and
// exact sizes vary slightly by manufacturer. The 2/3/4 in rows are geometric
// estimates (assumes a round pot roughly as tall as it is wide) since small
// starter pots are conventionally sold by diameter only, not by rated volume.
export interface StandardSize {
  id: string;
  label: string;
  diameterIn: number;
  volGal: number;
  estimated: boolean;
}

export const STANDARD_SIZES: StandardSize[] = [
  { id: '2in', label: '2 in pot', diameterIn: 2, volGal: 0.03, estimated: true },
  { id: '3in', label: '3 in pot', diameterIn: 3, volGal: 0.09, estimated: true },
  { id: '4in', label: '4 in pot', diameterIn: 4, volGal: 0.22, estimated: true },
  { id: '1qt', label: '1 quart', diameterIn: 4.25, volGal: 0.25, estimated: false },
  { id: '6in-1gal', label: '6 in / 1 gallon (#1)', diameterIn: 6, volGal: 0.76, estimated: false },
  { id: '8in-2gal', label: '8 in / 2 gallon (#2)', diameterIn: 8.5, volGal: 1.6, estimated: false },
  { id: '3gal', label: '3 gallon (#3)', diameterIn: 10.5, volGal: 2.5, estimated: false },
  { id: '5gal', label: '5 gallon (#5)', diameterIn: 10.5, volGal: 3.6, estimated: false },
  { id: '7gal', label: '7 gallon (#7)', diameterIn: 12, volGal: 6.5, estimated: false },
  { id: '10gal', label: '10 gallon (#10)', diameterIn: 14.75, volGal: 8, estimated: false },
  { id: '15gal', label: '15 gallon (#15)', diameterIn: 17.5, volGal: 12, estimated: false },
];

export type PlantCategory =
  | 'large' | 'medium' | 'small' | 'succulent'
  | 'houseSmall' | 'houseMed' | 'houseLarge'
  | 'potato' | 'strawberry' | 'fruitTree' | 'shrub';

export interface CategoryInfo {
  minGal?: string;
  diamIn?: string;
  depthIn?: string;
  note: string;
}

export const CATEGORY_INFO: Record<PlantCategory, CategoryInfo> = {
  large: { minGal: '8–10', depthIn: '12–16', note: 'One plant per container.' },
  medium: { minGal: '4–6', depthIn: '8–12', note: '' },
  small: { minGal: '1–3', depthIn: '4–6', note: '' },
  succulent: { diamIn: '2–4', note: 'Sized by diameter — succulents and cacti generally prefer a snug pot, not a large one.' },
  houseSmall: { diamIn: '4–6', note: 'General nursery sizing guidance, not tied to a single species.' },
  houseMed: { diamIn: '6–10 (roughly 2–3 gal)', note: 'General nursery sizing guidance, not tied to a single species.' },
  houseLarge: { diamIn: '10–14+ (roughly 5–15 gal)', note: 'General nursery sizing guidance, not tied to a single species.' },
  potato: { minGal: '30', note: 'Deep container; soil is mounded up around the vines as they grow ("hilling").' },
  strawberry: { depthIn: '8', note: 'Width matters less than depth — a wide, shallow container works well.' },
  fruitTree: { minGal: '25–30', note: '' },
  shrub: { minGal: '25', note: '' },
};

export interface PlantEntry {
  id: string;
  name: string;
  cat: PlantCategory;
}

export const PLANT_GUIDE: PlantEntry[] = [
  { id: 'tomato-full', name: 'Tomato (full-size)', cat: 'large' },
  { id: 'pepper-full', name: 'Pepper (full-size)', cat: 'large' },
  { id: 'eggplant', name: 'Eggplant', cat: 'large' },
  { id: 'cucumber', name: 'Cucumber', cat: 'large' },
  { id: 'winter-squash', name: 'Winter squash', cat: 'large' },
  { id: 'tomato-dwarf', name: 'Tomato (dwarf / patio variety)', cat: 'medium' },
  { id: 'pepper-dwarf', name: 'Pepper (dwarf variety)', cat: 'medium' },
  { id: 'summer-squash', name: 'Summer squash / zucchini', cat: 'medium' },
  { id: 'cole-crops', name: 'Broccoli / cabbage / kale', cat: 'medium' },
  { id: 'beans', name: 'Beans (pole or bush)', cat: 'medium' },
  { id: 'root-veg', name: 'Beets / carrots', cat: 'medium' },
  { id: 'chard', name: 'Swiss chard', cat: 'medium' },
  { id: 'large-herbs', name: 'Rosemary / lavender / fennel', cat: 'medium' },
  { id: 'basil-etc', name: 'Basil / cilantro / parsley', cat: 'small' },
  { id: 'thyme-etc', name: 'Thyme / mint / marjoram', cat: 'small' },
  { id: 'lettuce', name: 'Lettuce / salad greens', cat: 'small' },
  { id: 'radish-scallion', name: 'Radish / scallions', cat: 'small' },
  { id: 'spinach-etc', name: 'Spinach / Asian greens', cat: 'small' },
  { id: 'peas', name: 'Peas', cat: 'small' },
  { id: 'succulent', name: 'Succulent / cactus', cat: 'succulent' },
  { id: 'house-small', name: 'Small houseplant (pothos, small fern)', cat: 'houseSmall' },
  { id: 'house-med', name: 'Medium houseplant (peace lily, snake plant)', cat: 'houseMed' },
  { id: 'house-large', name: 'Large houseplant (fiddle leaf fig, floor palm)', cat: 'houseLarge' },
  { id: 'potato', name: 'Potatoes', cat: 'potato' },
  { id: 'strawberry', name: 'Strawberries', cat: 'strawberry' },
  { id: 'fruit-tree', name: 'Dwarf fruit tree', cat: 'fruitTree' },
  { id: 'shrub', name: 'Shrub (container-grown)', cat: 'shrub' },
];

const STANDARD_SIZE_IDS = new Set(STANDARD_SIZES.map((s) => s.id));
const PLANT_GUIDE_IDS = new Set(PLANT_GUIDE.map((p) => p.id));

/**
 * Reads mode/units/convertType/standardSizeId/customType/customDiameter/
 * customHeight/customVolume/customVolUnit/sizeupCurrentId/guidePlantId from
 * the page's URL query string -- the "share with results" feature, same as
 * the pilot.
 *
 * This calculator has three independent modes, so (same approach as
 * useSoilTypeCalculatorState) the "at least one core param present" guard
 * checks one identifying field per mode/branch -- standardSizeId (convert:
 * standard), customDiameter (convert: custom dims), customVolume (convert:
 * custom volume), sizeupCurrentId (size-up), guidePlantId (plant guide).
 * Any one of those being present is enough to know a shared link is
 * carrying real inputs; without at least one there's nothing to compute, so
 * a bare/bookmarked URL never silently overrides a returning visitor's
 * saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const coreParams = ['standardSizeId', 'customDiameter', 'customVolume', 'sizeupCurrentId', 'guidePlantId'];
  if (!coreParams.some((p) => params.has(p))) return null;

  const out: Partial<SavedState> = {};
  const mode = params.get('mode');
  const units = params.get('units');
  const convertType = params.get('convertType');
  const standardSizeId = params.get('standardSizeId');
  const customType = params.get('customType');
  const customDiameter = params.get('customDiameter');
  const customHeight = params.get('customHeight');
  const customVolume = params.get('customVolume');
  const customVolUnit = params.get('customVolUnit');
  const sizeupCurrentId = params.get('sizeupCurrentId');
  const guidePlantId = params.get('guidePlantId');

  const numeric = /^\d*\.?\d*$/;

  if (mode === 'convert' || mode === 'sizeup' || mode === 'guide') out.mode = mode;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;
  if (convertType === 'standard' || convertType === 'custom') out.convertType = convertType;
  if (standardSizeId && STANDARD_SIZE_IDS.has(standardSizeId)) out.standardSizeId = standardSizeId;
  if (customType === 'dims' || customType === 'volume') out.customType = customType;
  if (customDiameter && numeric.test(customDiameter)) out.customDiameter = customDiameter;
  if (customHeight && numeric.test(customHeight)) out.customHeight = customHeight;
  if (customVolume && numeric.test(customVolume)) out.customVolume = customVolume;
  if (customVolUnit === 'gal' || customVolUnit === 'qt' || customVolUnit === 'L') out.customVolUnit = customVolUnit;
  if (sizeupCurrentId && STANDARD_SIZE_IDS.has(sizeupCurrentId)) out.sizeupCurrentId = sizeupCurrentId;
  if (guidePlantId && PLANT_GUIDE_IDS.has(guidePlantId)) out.guidePlantId = guidePlantId;

  return out;
}

export function usePotSizeCalculatorState() {
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<Mode>('convert');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');

  // Convert state
  const [convertType, setConvertType] = useState<ConvertType>('standard');
  const [standardSizeId, setStandardSizeId] = useState('6in-1gal');
  const [customType, setCustomType] = useState<CustomType>('dims');
  const [customDiameter, setCustomDiameter] = useState('8');
  const [customHeight, setCustomHeight] = useState('8');
  const [customVolume, setCustomVolume] = useState('2');
  const [customVolUnit, setCustomVolUnit] = useState<VolUnit>('gal');

  // Size-up state
  const [sizeupCurrentId, setSizeupCurrentId] = useState('4in');

  // Guide state
  const [guidePlantId, setGuidePlantId] = useState('tomato-full');

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.convertType) setConvertType(s.convertType);
    if (s.standardSizeId) setStandardSizeId(s.standardSizeId);
    if (s.customType) setCustomType(s.customType);
    if (s.customDiameter !== undefined) setCustomDiameter(s.customDiameter);
    if (s.customHeight !== undefined) setCustomHeight(s.customHeight);
    if (s.customVolume !== undefined) setCustomVolume(s.customVolume);
    if (s.customVolUnit) setCustomVolUnit(s.customVolUnit);
    if (s.sizeupCurrentId) setSizeupCurrentId(s.sizeupCurrentId);
    if (s.guidePlantId) setGuidePlantId(s.guidePlantId);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({
      mode, unitSystem, convertType, standardSizeId, customType,
      customDiameter, customHeight, customVolume, customVolUnit,
      sizeupCurrentId, guidePlantId,
    });
  }, [mode, unitSystem, convertType, standardSizeId, customType, customDiameter,
      customHeight, customVolume, customVolUnit, sizeupCurrentId, guidePlantId]);

  const isMetric = unitSystem === 'metric';

  const handleNumericChange = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
    };

  const handleCustomDiameterChange = handleNumericChange(setCustomDiameter);
  const handleCustomHeightChange = handleNumericChange(setCustomHeight);
  const handleCustomVolumeChange = handleNumericChange(setCustomVolume);

  // ---------------- Mode 1: Unit Converter ----------------
  const convertResult = useMemo(() => {
    if (convertType === 'standard') {
      const size = STANDARD_SIZES.find((s) => s.id === standardSizeId);
      if (!size) return null;
      return {
        diameterIn: size.diameterIn,
        volGal: size.volGal,
        estimated: size.estimated,
      };
    }
    // custom
    if (customType === 'dims') {
      const dIn = parseFloat(isMetric ? String(parseFloat(customDiameter || '0') / IN_TO_CM) : customDiameter);
      const hIn = parseFloat(isMetric ? String(parseFloat(customHeight || '0') / IN_TO_CM) : customHeight);
      if (!Number.isFinite(dIn) || !Number.isFinite(hIn) || dIn <= 0 || hIn <= 0) return null;
      const volIn3 = Math.PI * (dIn / 2) ** 2 * hIn;
      const volGal = volIn3 * IN3_TO_GAL;
      return { diameterIn: dIn, heightIn: hIn, volGal, estimated: true, isCylinderEstimate: true };
    }
    // volume -> estimated diameter (assumes height = diameter)
    const rawVol = parseFloat(customVolume || '0');
    if (!Number.isFinite(rawVol) || rawVol <= 0) return null;
    let volGal = rawVol;
    if (customVolUnit === 'qt') volGal = rawVol / GAL_TO_QT;
    if (customVolUnit === 'L') volGal = rawVol / GAL_TO_L;
    const volIn3 = volGal / IN3_TO_GAL;
    // V = pi * (d/2)^2 * d = pi*d^3/4  =>  d = cuberoot(4V/pi)
    const dIn = Math.cbrt((4 * volIn3) / Math.PI);
    return { diameterIn: dIn, heightIn: dIn, volGal, estimated: true, isVolumeEstimate: true };
  }, [convertType, standardSizeId, customType, customDiameter, customHeight, customVolume, customVolUnit, isMetric]);

  // ---------------- Mode 2: Repotting Size-Up ----------------
  const sizeupResult = useMemo(() => {
    const idx = STANDARD_SIZES.findIndex((s) => s.id === sizeupCurrentId);
    if (idx === -1) return null;
    const current = STANDARD_SIZES[idx];
    const next = idx < STANDARD_SIZES.length - 1 ? STANDARD_SIZES[idx + 1] : null;
    return {
      current,
      next,
      diameterIncreaseIn: next ? round(next.diameterIn - current.diameterIn, 2) : null,
      isLast: next === null,
    };
  }, [sizeupCurrentId]);

  // ---------------- Mode 3: Plant/Vegetable Container Guide ----------------
  const guideResult = useMemo(() => {
    const plant = PLANT_GUIDE.find((p) => p.id === guidePlantId);
    if (!plant) return null;
    return { plant, info: CATEGORY_INFO[plant.cat] };
  }, [guidePlantId]);

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Pot Size Calculator Results', margin, y);
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
    doc.text(`Mode: ${mode === 'convert' ? 'Unit Converter' : mode === 'sizeup' ? 'Repotting Size-Up' : 'Plant/Vegetable Container Guide'}`, margin, y);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    if (mode === 'convert' && convertResult) {
      const lines = [
        `Diameter: ${round(convertResult.diameterIn, 2)} in (${round(convertResult.diameterIn * IN_TO_CM, 1)} cm)`,
        `Volume: ${round(convertResult.volGal, 2)} gal / ${round(convertResult.volGal * GAL_TO_QT, 2)} qt / ${round(convertResult.volGal * GAL_TO_L, 2)} L`,
        convertResult.estimated ? '(Estimated — see note on the calculator page.)' : '(Standard nursery container dimensions.)',
      ];
      lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    } else if (mode === 'sizeup' && sizeupResult) {
      doc.text(`Current size: ${sizeupResult.current.label}`, margin, y); y += 16;
      if (sizeupResult.next) {
        doc.text(`Recommended next size: ${sizeupResult.next.label}`, margin, y); y += 16;
        doc.text(`Diameter increase: ~${sizeupResult.diameterIncreaseIn} in`, margin, y); y += 16;
      } else {
        doc.text('Already at the largest common nursery size — go up 1-2 sizes at a time from here.', margin, y, { maxWidth: 500 }); y += 32;
      }
    } else if (mode === 'guide' && guideResult) {
      doc.text(`Plant: ${guideResult.plant.name}`, margin, y); y += 16;
      if (guideResult.info.minGal) { doc.text(`Minimum container size: ${guideResult.info.minGal} gal`, margin, y); y += 16; }
      if (guideResult.info.diamIn) { doc.text(`Minimum pot diameter: ${guideResult.info.diamIn} in`, margin, y); y += 16; }
      if (guideResult.info.depthIn) { doc.text(`Minimum soil depth: ${guideResult.info.depthIn} in`, margin, y); y += 16; }
      if (guideResult.info.note) { doc.text(guideResult.info.note, margin, y, { maxWidth: 500 }); y += 32; }
    }

    y += 20;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Nursery container sizes vary by manufacturer; treat all figures here as general guidance', margin, y); y += 12;
    doc.text('and adjust based on your specific pot and plant.', margin, y);

    doc.save('pot-size-calculator-results.pdf');
  };

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setMode('convert');
    setUnitSystem('imperial');
    setConvertType('standard');
    setStandardSizeId('6in-1gal');
    setCustomType('dims');
    setCustomDiameter('8');
    setCustomHeight('8');
    setCustomVolume('2');
    setCustomVolUnit('gal');
    setSizeupCurrentId('4in');
    setGuidePlantId('tomato-full');
  };

  return {
    mode,
    setMode,
    unitSystem,
    setUnitSystem,
    isMetric,
    convertType,
    setConvertType,
    standardSizeId,
    setStandardSizeId,
    customType,
    setCustomType,
    customDiameter,
    handleCustomDiameterChange,
    customHeight,
    handleCustomHeightChange,
    customVolume,
    handleCustomVolumeChange,
    customVolUnit,
    setCustomVolUnit,
    sizeupCurrentId,
    setSizeupCurrentId,
    guidePlantId,
    setGuidePlantId,
    convertResult,
    sizeupResult,
    guideResult,
    exportPdf,
    reset,
  };
}

export type PotSizeCalculatorState = ReturnType<typeof usePotSizeCalculatorState>;
