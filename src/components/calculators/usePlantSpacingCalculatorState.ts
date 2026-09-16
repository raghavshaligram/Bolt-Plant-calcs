import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from PlantSpacingCalculator.tsx (Calculator Page Redesign
// rollout -- see CALC_ROLLOUT_PATTERN.md). This hook is the single source of
// truth for all of the calculator's inputs/result/reset/PDF-export logic, so
// it's reachable both from the sticky card (PlantSpacingCalculatorCard.tsx)
// and from the action row + Share/Embed/Cite modal that render outside the
// card's own component tree (PlantSpacingCalculatorPanel.tsx, via the shared
// CalculatorPanel.tsx).

export type GardenMode = 'row' | 'sqft' | 'trees';
export type UnitSystem = 'imperial' | 'metric';

const STORAGE_KEY = 'plant-spacing-calculator-state-v1';

export interface CropPreset {
  name: string;
  inRowIn: number;   // in-row spacing, inches
  betweenRowIn: number; // between-row spacing, inches
  sqftPerPlant: number; // square foot gardening: sq ft per plant
}

export const CROP_PRESETS: CropPreset[] = [
  { name: 'Custom', inRowIn: 12, betweenRowIn: 18, sqftPerPlant: 1 },
  { name: 'Basil', inRowIn: 12, betweenRowIn: 18, sqftPerPlant: 1 },
  { name: 'Bean (bush)', inRowIn: 4, betweenRowIn: 18, sqftPerPlant: 0.25 },
  { name: 'Bean (pole)', inRowIn: 6, betweenRowIn: 24, sqftPerPlant: 0.25 },
  { name: 'Beet', inRowIn: 4, betweenRowIn: 12, sqftPerPlant: 0.25 },
  { name: 'Broccoli', inRowIn: 18, betweenRowIn: 24, sqftPerPlant: 1 },
  { name: 'Carrot', inRowIn: 3, betweenRowIn: 12, sqftPerPlant: 0.0625 },
  { name: 'Cilantro', inRowIn: 6, betweenRowIn: 12, sqftPerPlant: 0.25 },
  { name: 'Corn', inRowIn: 12, betweenRowIn: 30, sqftPerPlant: 1 },
  { name: 'Cucumber', inRowIn: 12, betweenRowIn: 36, sqftPerPlant: 1 },
  { name: 'Garlic', inRowIn: 6, betweenRowIn: 12, sqftPerPlant: 0.25 },
  { name: 'Kale', inRowIn: 12, betweenRowIn: 18, sqftPerPlant: 1 },
  { name: 'Lettuce (head)', inRowIn: 12, betweenRowIn: 12, sqftPerPlant: 1 },
  { name: 'Lettuce (leaf)', inRowIn: 6, betweenRowIn: 12, sqftPerPlant: 0.25 },
  { name: 'Marigold', inRowIn: 12, betweenRowIn: 18, sqftPerPlant: 1 },
  { name: 'Onion', inRowIn: 4, betweenRowIn: 12, sqftPerPlant: 0.25 },
  { name: 'Parsley', inRowIn: 8, betweenRowIn: 12, sqftPerPlant: 0.25 },
  { name: 'Pepper', inRowIn: 18, betweenRowIn: 24, sqftPerPlant: 1 },
  { name: 'Radish', inRowIn: 2, betweenRowIn: 12, sqftPerPlant: 0.0625 },
  { name: 'Spinach', inRowIn: 6, betweenRowIn: 12, sqftPerPlant: 0.25 },
  { name: 'Squash (summer)', inRowIn: 24, betweenRowIn: 36, sqftPerPlant: 4 },
  { name: 'Squash (winter)', inRowIn: 36, betweenRowIn: 48, sqftPerPlant: 9 },
  { name: 'Swiss Chard', inRowIn: 6, betweenRowIn: 18, sqftPerPlant: 0.25 },
  { name: 'Tomato (determinate)', inRowIn: 24, betweenRowIn: 36, sqftPerPlant: 4 },
  { name: 'Tomato (indeterminate)', inRowIn: 24, betweenRowIn: 48, sqftPerPlant: 4 },
  { name: 'Zucchini', inRowIn: 24, betweenRowIn: 36, sqftPerPlant: 4 },
];

// Trees & Shrubs mode -- home-garden and small-orchard scale only (no
// per-acre/hectare forestry math; that's a different audience and out of
// scope here). Spacing figures are real mature-spacing recommendations
// sourced from university extension publications -- see the page content
// for citations. Fruit trees are split by rootstock (standard vs.
// dwarf/semi-dwarf) since rootstock genuinely changes the spacing needed.
export interface TreePreset {
  name: string;
  spacingFt: number; // recommended distance between mature tree/shrub centers, in feet
  group: 'Fruit & Nut Trees' | 'Landscape Shrubs' | 'Custom';
}

export const TREE_PRESETS: TreePreset[] = [
  { name: 'Custom', spacingFt: 15, group: 'Custom' },
  { name: 'Apple (Standard)', spacingFt: 30, group: 'Fruit & Nut Trees' },
  { name: 'Apple (Semi-Dwarf)', spacingFt: 15, group: 'Fruit & Nut Trees' },
  { name: 'Apple (Dwarf)', spacingFt: 10, group: 'Fruit & Nut Trees' },
  { name: 'Pear (Standard)', spacingFt: 20, group: 'Fruit & Nut Trees' },
  { name: 'Pear (Dwarf/Semi-Dwarf)', spacingFt: 12, group: 'Fruit & Nut Trees' },
  { name: 'Peach (Standard)', spacingFt: 18, group: 'Fruit & Nut Trees' },
  { name: 'Peach (Dwarf)', spacingFt: 10, group: 'Fruit & Nut Trees' },
  { name: 'Plum (Standard)', spacingFt: 18, group: 'Fruit & Nut Trees' },
  { name: 'Plum (Dwarf)', spacingFt: 10, group: 'Fruit & Nut Trees' },
  { name: 'Cherry, Sweet (Standard)', spacingFt: 30, group: 'Fruit & Nut Trees' },
  { name: 'Cherry, Sweet (Dwarf/Semi-Dwarf)', spacingFt: 15, group: 'Fruit & Nut Trees' },
  { name: 'Pecan', spacingFt: 65, group: 'Fruit & Nut Trees' },
  { name: 'Large Shrub / Small Tree (lilac, dogwood)', spacingFt: 13, group: 'Landscape Shrubs' },
  { name: 'Medium Shrub (forsythia, rhododendron)', spacingFt: 8, group: 'Landscape Shrubs' },
  { name: 'Small Shrub (azalea, dwarf yew)', spacingFt: 4, group: 'Landscape Shrubs' },
  { name: 'Trimmed Hedge, Low (boxwood, barberry)', spacingFt: 2, group: 'Landscape Shrubs' },
  { name: 'Trimmed Hedge, Tall (privet, hemlock)', spacingFt: 3, group: 'Landscape Shrubs' },
  { name: 'Ground Cover Shrub (juniper, cotoneaster)', spacingFt: 2.5, group: 'Landscape Shrubs' },
];

export const TREE_PRESET_GROUPS: TreePreset['group'][] = ['Fruit & Nut Trees', 'Landscape Shrubs'];

export interface SavedState {
  mode: GardenMode;
  unitSystem: UnitSystem;
  crop: string;
  bedLength: string;
  bedWidth: string;
  inRow: string;
  betweenRow: string;
  sqftPerPlant: string;
  treeType?: string;
  treeSpacing?: string;
}

export type CalculatorResult =
  | {
      mode: 'row';
      totalPlants: number;
      plantsPerRow: number;
      numRows: number;
      areaFt: number;
      perAcre: number;
      perHectare: number;
    }
  | {
      mode: 'sqft';
      totalPlants: number;
      gridSpacingIn: number;
      areaFt: number;
      perAcre: number;
      perHectare: number;
    }
  | {
      mode: 'trees';
      totalPlants: number;
      treesPerRow: number;
      numRows: number;
      areaFt: number;
      spacingFtUsed: number;
    }
  | null;

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
    // localStorage unavailable — fail silently.
  }
}

const CM_TO_IN = 0.393701;
const M_TO_FT = 3.28084;

/**
 * Reads mode/units/crop/length/width/inRow/betweenRow/sqftPerPlant/
 * treeType/treeSpacing from the page's URL query string -- the foundation of
 * the "share with results" feature. Only returns a non-null object when at
 * least one of "length" or "width" is present -- those two are the only
 * inputs essential to the primary result in all three modes (row, sqft, and
 * trees all need a bed length and width) -- so a plain bookmarked/shared-
 * without-results URL never accidentally overrides a returning visitor's
 * saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('length') && !params.has('width')) return null;

  const out: Partial<SavedState> = {};
  const mode = params.get('mode');
  const units = params.get('units');
  const crop = params.get('crop');
  const length = params.get('length');
  const width = params.get('width');
  const inRow = params.get('inRow');
  const betweenRow = params.get('betweenRow');
  const sqftPerPlant = params.get('sqftPerPlant');
  const treeType = params.get('treeType');
  const treeSpacing = params.get('treeSpacing');

  if (mode === 'row' || mode === 'sqft' || mode === 'trees') out.mode = mode;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;
  if (crop && CROP_PRESETS.some((p) => p.name === crop)) out.crop = crop;
  if (length && /^\d*\.?\d*$/.test(length)) out.bedLength = length;
  if (width && /^\d*\.?\d*$/.test(width)) out.bedWidth = width;
  if (inRow && /^\d*\.?\d*$/.test(inRow)) out.inRow = inRow;
  if (betweenRow && /^\d*\.?\d*$/.test(betweenRow)) out.betweenRow = betweenRow;
  if (sqftPerPlant && /^\d*\.?\d*$/.test(sqftPerPlant)) out.sqftPerPlant = sqftPerPlant;
  if (treeType && TREE_PRESETS.some((p) => p.name === treeType)) out.treeType = treeType;
  if (treeSpacing && /^\d*\.?\d*$/.test(treeSpacing)) out.treeSpacing = treeSpacing;

  return out;
}

export function usePlantSpacingCalculatorState() {
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<GardenMode>('row');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [crop, setCrop] = useState<string>('Tomato (determinate)');
  const [bedLength, setBedLength] = useState<string>('8');
  const [bedWidth, setBedWidth] = useState<string>('4');
  const [inRow, setInRow] = useState<string>('24');
  const [betweenRow, setBetweenRow] = useState<string>('36');
  const [sqftPerPlant, setSqftPerPlant] = useState<string>('4');
  const [treeType, setTreeType] = useState<string>('Apple (Semi-Dwarf)');
  const [treeSpacing, setTreeSpacing] = useState<string>('15');

  // Load cached/shared state once on mount (client-only). A shared link's
  // query params take priority over this browser's own saved state --
  // someone opening a shared result should see THAT result, not their own
  // last visit, even if they've used the calculator here before.
  useEffect(() => {
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.crop) setCrop(s.crop);
    if (s.bedLength !== undefined) setBedLength(s.bedLength);
    if (s.bedWidth !== undefined) setBedWidth(s.bedWidth);
    if (s.inRow !== undefined) setInRow(s.inRow);
    if (s.betweenRow !== undefined) setBetweenRow(s.betweenRow);
    if (s.sqftPerPlant !== undefined) setSqftPerPlant(s.sqftPerPlant);
    if (s.treeType) setTreeType(s.treeType);
    if (s.treeSpacing !== undefined) setTreeSpacing(s.treeSpacing);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ mode, unitSystem, crop, bedLength, bedWidth, inRow, betweenRow, sqftPerPlant, treeType, treeSpacing });
  }, [mode, unitSystem, crop, bedLength, bedWidth, inRow, betweenRow, sqftPerPlant, treeType, treeSpacing]);

  const handleCropChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setCrop(name);
    const preset = CROP_PRESETS.find((p) => p.name === name);
    if (preset) {
      if (unitSystem === 'imperial') {
        setInRow(String(preset.inRowIn));
        setBetweenRow(String(preset.betweenRowIn));
      } else {
        setInRow(round(preset.inRowIn * 2.54, 1).toString());
        setBetweenRow(round(preset.betweenRowIn * 2.54, 1).toString());
      }
      setSqftPerPlant(String(preset.sqftPerPlant));
    }
  };

  const handleTreeTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setTreeType(name);
    const preset = TREE_PRESETS.find((p) => p.name === name);
    if (preset) {
      setTreeSpacing(
        unitSystem === 'imperial'
          ? String(preset.spacingFt)
          : round(preset.spacingFt / M_TO_FT, 1).toString()
      );
    }
  };

  const handleNumericChange =
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(sanitizeNumericInput(e.target.value));
    };

  const handleBedLengthChange = handleNumericChange(setBedLength);
  const handleBedWidthChange = handleNumericChange(setBedWidth);
  const handleInRowChange = handleNumericChange(setInRow);
  const handleBetweenRowChange = handleNumericChange(setBetweenRow);
  const handleSqftPerPlantChange = handleNumericChange(setSqftPerPlant);
  const handleTreeSpacingChange = handleNumericChange(setTreeSpacing);

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';
  const spacingUnit = isMetric ? 'cm' : 'in';

  const result: CalculatorResult = useMemo(() => {
    let lengthFt = parseFloat(bedLength);
    let widthFt = parseFloat(bedWidth);
    if (isMetric) {
      lengthFt = Number.isFinite(lengthFt) ? lengthFt * M_TO_FT : 0;
      widthFt = Number.isFinite(widthFt) ? widthFt * M_TO_FT : 0;
    }
    if (!Number.isFinite(lengthFt) || lengthFt <= 0) return null;
    if (!Number.isFinite(widthFt) || widthFt <= 0) return null;

    const areaFt = lengthFt * widthFt;

    if (mode === 'row') {
      let inRowRaw = parseFloat(inRow);
      let betweenRowRaw = parseFloat(betweenRow);
      if (isMetric) {
        inRowRaw = Number.isFinite(inRowRaw) ? inRowRaw * CM_TO_IN : 0;
        betweenRowRaw = Number.isFinite(betweenRowRaw) ? betweenRowRaw * CM_TO_IN : 0;
      }
      if (!Number.isFinite(inRowRaw) || inRowRaw <= 0) return null;
      if (!Number.isFinite(betweenRowRaw) || betweenRowRaw <= 0) return null;

      const inRowFt = inRowRaw / 12;
      const betweenRowFt = betweenRowRaw / 12;

      const plantsPerRow = Math.floor(lengthFt / inRowFt);
      const numRows = Math.floor(widthFt / betweenRowFt);
      const totalPlants = plantsPerRow * numRows;
      const sqftPerPlantVal = (inRowFt * betweenRowFt);
      const perAcre = sqftPerPlantVal > 0 ? Math.round(43560 / sqftPerPlantVal) : 0;
      const perHectare = sqftPerPlantVal > 0 ? Math.round(107639 / sqftPerPlantVal) : 0;

      return { totalPlants, plantsPerRow, numRows, areaFt, perAcre, perHectare, mode: 'row' as const };
    } else if (mode === 'sqft') {
      const sqftVal = parseFloat(sqftPerPlant);
      if (!Number.isFinite(sqftVal) || sqftVal <= 0) return null;
      const totalPlants = Math.floor(areaFt / sqftVal);
      const gridSpacingIn = round(Math.sqrt(sqftVal) * 12, 1);
      const perAcre = Math.round(43560 / sqftVal);
      const perHectare = Math.round(107639 / sqftVal);

      return { totalPlants, gridSpacingIn, areaFt, perAcre, perHectare, mode: 'sqft' as const };
    } else {
      // Trees & Shrubs -- home-garden / small-orchard scale only. Same
      // simple grid model as Row Garden mode (floor division, no per-acre
      // or per-hectare figures -- that's forestry-scale math and out of
      // scope for this mode on purpose).
      let spacingRaw = parseFloat(treeSpacing);
      if (isMetric) {
        spacingRaw = Number.isFinite(spacingRaw) ? spacingRaw * M_TO_FT : 0;
      }
      if (!Number.isFinite(spacingRaw) || spacingRaw <= 0) return null;

      const treesPerRow = Math.floor(lengthFt / spacingRaw);
      const numRows = Math.floor(widthFt / spacingRaw);
      const totalPlants = treesPerRow * numRows;

      return { totalPlants, treesPerRow, numRows, areaFt, spacingFtUsed: spacingRaw, mode: 'trees' as const };
    }
  }, [mode, unitSystem, bedLength, bedWidth, inRow, betweenRow, sqftPerPlant, treeSpacing, isMetric]);

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Plant Spacing Calculator Results', margin, y);
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
    const lines: string[] = [
      `Crop: ${crop}`,
      `Bed: ${bedLength} × ${bedWidth} ${lengthUnit}`,
      `Mode: ${mode === 'row' ? 'Row Garden' : mode === 'sqft' ? 'Square Foot Gardening' : 'Trees & Shrubs'}`,
    ];
    if (mode === 'row') {
      lines.push(`In-row spacing: ${inRow} ${spacingUnit}`);
      lines.push(`Between-row spacing: ${betweenRow} ${spacingUnit}`);
    } else if (mode === 'sqft') {
      lines.push(`Sq ft per plant: ${sqftPerPlant}`);
    } else {
      lines.push(`Tree/shrub type: ${treeType}`);
      lines.push(`Spacing: ${treeSpacing} ${lengthUnit}`);
    }
    lines.forEach((line) => { doc.text(line, margin, y); y += 16; });

    if (result) {
      y += 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Results', margin, y);
      y += 20;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const resultLines: string[] = [
        `Total ${result.mode === 'trees' ? 'trees/shrubs' : 'plants'}: ${result.totalPlants.toLocaleString()}`,
        `Bed area: ${round(result.areaFt, 1)} sq ft`,
      ];
      if (result.mode === 'row') {
        resultLines.push(`Plants per row: ${result.plantsPerRow}`);
        resultLines.push(`Number of rows: ${result.numRows}`);
        resultLines.push(`Plants per acre: ${result.perAcre.toLocaleString()}`);
        resultLines.push(`Plants per hectare: ${result.perHectare.toLocaleString()}`);
      } else if (result.mode === 'sqft') {
        resultLines.push(`Grid spacing: ${result.gridSpacingIn}" apart`);
        resultLines.push(`Plants per acre: ${result.perAcre.toLocaleString()}`);
        resultLines.push(`Plants per hectare: ${result.perHectare.toLocaleString()}`);
      } else {
        resultLines.push(`Trees/shrubs per row: ${result.treesPerRow}`);
        resultLines.push(`Number of rows: ${result.numRows}`);
        resultLines.push(`Spacing used: ${round(result.spacingFtUsed, 1)} ${lengthUnit}`);
        resultLines.push('Note: spacing is based on mature canopy width, not planting size.');
      }
      resultLines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    }

    doc.save('plant-spacing-calculator-results.pdf');
  };

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setMode('row');
    setUnitSystem('imperial');
    setCrop('Tomato (determinate)');
    setBedLength('8');
    setBedWidth('4');
    setInRow('24');
    setBetweenRow('36');
    setSqftPerPlant('4');
    setTreeType('Apple (Semi-Dwarf)');
    setTreeSpacing('15');
  };

  const selectedPreset = useMemo(() => CROP_PRESETS.find((p) => p.name === crop), [crop]);
  const selectedTreePreset = useMemo(() => TREE_PRESETS.find((p) => p.name === treeType), [treeType]);

  return {
    mode,
    setMode,
    unitSystem,
    setUnitSystem,
    crop,
    bedLength,
    bedWidth,
    inRow,
    betweenRow,
    sqftPerPlant,
    treeType,
    treeSpacing,
    isMetric,
    lengthUnit,
    spacingUnit,
    handleCropChange,
    handleTreeTypeChange,
    handleBedLengthChange,
    handleBedWidthChange,
    handleInRowChange,
    handleBetweenRowChange,
    handleSqftPerPlantChange,
    handleTreeSpacingChange,
    result,
    selectedPreset,
    selectedTreePreset,
    exportPdf,
    reset,
  };
}

export type PlantSpacingCalculatorState = ReturnType<typeof usePlantSpacingCalculatorState>;
