import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from RaisedBedSoilCalculator.tsx (the sticky-layout pilot needs
// this same state -- inputs, result, reset -- reachable from the action
// panel and the Share/Embed/Cite modal, which live outside the calculator's
// own component tree in the sticky sidebar). This hook is the single source
// of truth; RaisedBedSoilCalculatorCard.tsx is now a pure presentational
// component driven entirely by its return value, and
// RaisedBedSoilCalculatorPanel.tsx is the one place that calls it, so the
// card, the action panel, and the modal all read/write the same state.

export type UnitSystem = 'imperial' | 'metric';
export type BagSize = '1.5' | '2';

export type Preset = { label: string; length: string; width: string };

export const PRESETS: Preset[] = [
  { label: '4×4', length: '4', width: '4' },
  { label: '4×8', length: '4', width: '8' },
  { label: '4×2', length: '4', width: '2' },
  { label: 'Custom', length: '', width: '' },
];

const DEFAULT_DEPTH_IN = '10';
const DEFAULT_DEPTH_CM = '25';

// Weight estimate: ~40 lbs per 0.75 cu ft bag → ~53.3 lbs/cu ft → ~1,440 lbs/cu yd
const LBS_PER_CU_FT = 40 / 0.75; // ≈ 53.33 lbs/cu ft (labeled as approximate)

const STORAGE_KEY = 'raised-bed-soil-calculator-state-v1';

export interface SavedState {
  unitSystem: UnitSystem;
  presetIndex: number;
  length: string;
  width: string;
  depth: string;
  bagSize: BagSize;
}

export interface CalculatorResult {
  cubicFeet: number;
  cubicYards: number;
  bags: number;
  weightLbs: number;
  depthIn: number;
  sqft: number;
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
  if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
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

/**
 * Reads length/width/depth/bagSize/units from the page's URL query string --
 * the foundation of the "share with results" feature (Part 3, Tab 1). Only
 * returns a non-null object when at least one of length/width/depth is
 * present, so a plain bookmarked/shared-without-results URL never
 * accidentally overrides a returning visitor's saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('length') && !params.has('width') && !params.has('depth')) return null;

  const out: Partial<SavedState> = {};
  const length = params.get('length');
  const width = params.get('width');
  const depth = params.get('depth');
  const bagSize = params.get('bagSize');
  const units = params.get('units');

  if (length && /^\d*\.?\d*$/.test(length)) out.length = length;
  if (width && /^\d*\.?\d*$/.test(width)) out.width = width;
  if (depth && /^\d*\.?\d*$/.test(depth)) out.depth = depth;
  if (bagSize === '1.5' || bagSize === '2') out.bagSize = bagSize;
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;

  return out;
}

const M_TO_FT = 3.28084;
const CM_TO_IN = 0.393701;

export function useRaisedBedSoilCalculatorState() {
  const hasLoaded = useRef(false);
  const loadedFromUrl = useRef(false);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [presetIndex, setPresetIndex] = useState<number>(1); // 4×8 default
  const [length, setLength] = useState<string>('4');
  const [width, setWidth] = useState<string>('8');
  const [depth, setDepth] = useState<string>(DEFAULT_DEPTH_IN);
  const [bagSize, setBagSize] = useState<BagSize>('1.5');

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.length !== undefined) setLength(s.length);
    if (s.width !== undefined) setWidth(s.width);
    if (s.depth !== undefined) setDepth(s.depth);
    if (s.bagSize) setBagSize(s.bagSize);

    if (fromUrl) {
      // Shared dimensions rarely land exactly on a preset -- show "Custom"
      // rather than silently highlighting the wrong preset button.
      setPresetIndex(3);
      loadedFromUrl.current = true;
    } else if (s.presetIndex !== undefined && s.presetIndex >= 0 && s.presetIndex < PRESETS.length) {
      setPresetIndex(s.presetIndex);
    }
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ unitSystem, presetIndex, length, width, depth, bagSize });
  }, [unitSystem, presetIndex, length, width, depth, bagSize]);

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';
  const depthUnit = isMetric ? 'cm' : 'in';

  const handlePreset = (idx: number) => {
    setPresetIndex(idx);
    const preset = PRESETS[idx];
    if (preset.label !== 'Custom') {
      if (isMetric) {
        const toM = (v: string) => (v ? round(parseFloat(v) / M_TO_FT, 2).toString() : '');
        setLength(toM(preset.length));
        setWidth(toM(preset.width));
      } else {
        setLength(preset.length);
        setWidth(preset.width);
      }
    }
  };

  const prevUnit = useRef<UnitSystem>(unitSystem);
  useEffect(() => {
    if (!hasLoaded.current) return;
    if (prevUnit.current === unitSystem) return;
    prevUnit.current = unitSystem;
    if (isMetric) {
      const toM = (v: string) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? round(n / M_TO_FT, 2).toString() : '';
      };
      setLength(toM(length));
      setWidth(toM(width));
      const depIn = parseFloat(depth);
      setDepth(Number.isFinite(depIn) ? round(depIn / CM_TO_IN, 1).toString() : DEFAULT_DEPTH_CM);
    } else {
      const toFt = (v: string) => {
        const n = parseFloat(v);
        return Number.isFinite(n) ? round(n * M_TO_FT, 2).toString() : '';
      };
      setLength(toFt(length));
      setWidth(toFt(width));
      const depCm = parseFloat(depth);
      setDepth(Number.isFinite(depCm) ? round(depCm * CM_TO_IN, 1).toString() : DEFAULT_DEPTH_IN);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitSystem]);

  const handleNumericChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(sanitizeNumericInput(e.target.value));
  };

  const handleLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPresetIndex(3);
    handleNumericChange(setLength)(e);
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPresetIndex(3);
    handleNumericChange(setWidth)(e);
  };

  const handleDepthChange = handleNumericChange(setDepth);

  const result: CalculatorResult = useMemo(() => {
    let l = parseFloat(length);
    let w = parseFloat(width);
    let depthRaw = parseFloat(depth);

    if (!Number.isFinite(l)) l = 0;
    if (!Number.isFinite(w)) w = 0;
    if (!Number.isFinite(depthRaw)) depthRaw = 0;

    if (isMetric) {
      l = l * M_TO_FT;
      w = w * M_TO_FT;
      depthRaw = depthRaw * CM_TO_IN;
    }

    const depthFt = depthRaw / 12;
    const cubicFeet = Math.max(0, l * w * depthFt);
    const cubicYards = cubicFeet / 27;
    const bagSizeNum = parseFloat(bagSize);
    const bags = cubicFeet > 0 ? Math.ceil(cubicFeet / bagSizeNum) : 0;
    const weightLbs = cubicFeet * LBS_PER_CU_FT;

    return { cubicFeet, cubicYards, bags, weightLbs, depthIn: depthRaw, sqft: l * w };
  }, [unitSystem, length, width, depth, bagSize, isMetric]);

  const hasResult = result.cubicFeet > 0;

  const exportPdf = () => {
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Raised Bed Soil Calculator Results', margin, y);
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
    [
      `Length: ${length || 0} ${lengthUnit}`,
      `Width: ${width || 0} ${lengthUnit}`,
      `Depth: ${depth || 0} ${depthUnit}`,
      `Bag size: ${bagSize} cu ft`,
    ].forEach((line) => {
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
    [
      `Cubic feet: ${round(result.cubicFeet, 1).toLocaleString()} cu ft`,
      `Cubic yards: ${round(result.cubicYards, 2).toLocaleString()} cu yd`,
      `Bags (${bagSize} cu ft): ~${result.bags.toLocaleString()} bags`,
      `Estimated weight: ~${Math.round(result.weightLbs).toLocaleString()} lbs (approximate)`,
    ].forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Weight estimated at ~40 lbs per 0.75 cu ft bag. Actual weight varies by soil moisture and mix.', margin, y);

    doc.save('raised-bed-soil-calculator-results.pdf');
  };

  /** Restores the default 4×8/10in preset -- the action panel's Reset button. */
  const reset = () => {
    setUnitSystem('imperial');
    setPresetIndex(1);
    setLength('4');
    setWidth('8');
    setDepth(DEFAULT_DEPTH_IN);
    setBagSize('1.5');
  };

  return {
    unitSystem,
    setUnitSystem,
    presetIndex,
    length,
    width,
    depth,
    bagSize,
    setBagSize,
    isMetric,
    lengthUnit,
    depthUnit,
    handlePreset,
    handleLengthChange,
    handleWidthChange,
    handleDepthChange,
    result,
    hasResult,
    exportPdf,
    reset,
  };
}

export type RaisedBedSoilCalculatorState = ReturnType<typeof useRaisedBedSoilCalculatorState>;
