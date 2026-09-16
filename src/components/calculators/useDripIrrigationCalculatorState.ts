import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from DripIrrigationCalculator.tsx (Calculator Page Redesign
// rollout -- see CALC_ROLLOUT_PATTERN.md). This hook is the single source of
// truth for all inputs/result/PDF export so the sticky panel's action row
// and the Share/Embed/Cite modal can read/reset the same state as the card
// even though they render outside the card's own component tree.

export type WaterMode = 'per-plant' | 'area';
export type UnitSystem = 'imperial' | 'metric';
export type FlowPreset = '0.5' | '1' | '2' | '4' | 'custom';

const STORAGE_KEY = 'drip-irrigation-calculator-state-v1';

export interface SavedState {
  mode: WaterMode;
  unitSystem: UnitSystem;
  emitterCount: string;
  flowPreset: FlowPreset;
  customFlowRate: string;
  perPlantAmount: string;
  areaValue: string;
  depthValue: string;
  sessionsPerWeek: string;
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
  if (value === '' || value === '.') return value;
  const num = parseFloat(value);
  if (!Number.isFinite(num) || num < 0) return '';
  return value;
}

function sanitizeIntegerInput(raw: string): string {
  if (typeof raw !== 'string') return '';
  const cleaned = raw.replace(/[^\d]/g, '').replace(/^0+(?=\d)/, '');
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
    // fail silently
  }
}

// Real conversion constants.
const L_PER_GAL = 3.78541;       // liters per US gallon
const SQM_PER_SQFT = 0.092903;   // sq meters per sq foot
const MM_PER_IN = 25.4;          // millimeters per inch
// Gallons needed to cover 1 sq ft with 1 inch of water depth. Cited from
// Utah State University Extension's Center for Water-Efficient Landscaping
// (precipitation-to-gallons formula: gallons = sq ft x inches x 0.623).
const GAL_PER_SQFT_INCH = 0.623;

export const FLOW_PRESETS: { value: FlowPreset; gph: number; label: string }[] = [
  { value: '0.5', gph: 0.5, label: '0.5 GPH' },
  { value: '1', gph: 1, label: '1 GPH' },
  { value: '2', gph: 2, label: '2 GPH' },
  { value: '4', gph: 4, label: '4 GPH' },
  { value: 'custom', gph: 0, label: 'Custom' },
];

const NUM_RE = /^\d*\.?\d*$/;
const INT_RE = /^\d+$/;

/**
 * Reads mode/emitters/flowPreset/... from the page's URL query string -- the
 * foundation of the "share with results" feature. Only returns a non-null
 * object when at least one of the 3 params most essential to the primary
 * result (run time) is present -- emitter count and flow rate multiply
 * together in BOTH modes, and mode determines how the rest of the inputs are
 * read -- so a plain bookmarked/shared-without-results URL never accidentally
 * overrides a returning visitor's saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('emitters') && !params.has('flowPreset') && !params.has('mode')) return null;

  const out: Partial<SavedState> = {};

  const mode = params.get('mode');
  if (mode === 'per-plant' || mode === 'area') out.mode = mode;

  const units = params.get('units');
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;

  const emitters = params.get('emitters');
  if (emitters && INT_RE.test(emitters)) out.emitterCount = emitters;

  const flowPreset = params.get('flowPreset');
  if (flowPreset === '0.5' || flowPreset === '1' || flowPreset === '2' || flowPreset === '4' || flowPreset === 'custom') {
    out.flowPreset = flowPreset;
  }

  const customFlow = params.get('customFlow');
  if (customFlow && NUM_RE.test(customFlow)) out.customFlowRate = customFlow;

  const perPlant = params.get('perPlant');
  if (perPlant && NUM_RE.test(perPlant)) out.perPlantAmount = perPlant;

  const area = params.get('area');
  if (area && NUM_RE.test(area)) out.areaValue = area;

  const depth = params.get('depth');
  if (depth && NUM_RE.test(depth)) out.depthValue = depth;

  const sessions = params.get('sessions');
  if (sessions && INT_RE.test(sessions)) out.sessionsPerWeek = sessions;

  return out;
}

export function formatDuration(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return '0 min';
  const totalMinutes = hours * 60;
  if (totalMinutes < 60) {
    return `${round(totalMinutes, totalMinutes < 10 ? 1 : 0)} min`;
  }
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) return `${wholeHours} hr`;
  return `${wholeHours} hr ${minutes} min`;
}

export interface CalculatorResult {
  runTimeHours: number;
  totalFlowGph: number;
  totalDeliveredGal: number;
  weeklyTotalGal: number | null;
  emitters: number;
}

export function useDripIrrigationCalculatorState() {
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<WaterMode>('per-plant');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [emitterCount, setEmitterCount] = useState<string>('10');
  const [flowPreset, setFlowPreset] = useState<FlowPreset>('1');
  const [customFlowRate, setCustomFlowRate] = useState<string>('1.5');
  const [perPlantAmount, setPerPlantAmount] = useState<string>('1');
  const [areaValue, setAreaValue] = useState<string>('50');
  const [depthValue, setDepthValue] = useState<string>('1');
  const [sessionsPerWeek, setSessionsPerWeek] = useState<string>('2');

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.emitterCount !== undefined) setEmitterCount(s.emitterCount);
    if (s.flowPreset) setFlowPreset(s.flowPreset);
    if (s.customFlowRate !== undefined) setCustomFlowRate(s.customFlowRate);
    if (s.perPlantAmount !== undefined) setPerPlantAmount(s.perPlantAmount);
    if (s.areaValue !== undefined) setAreaValue(s.areaValue);
    if (s.depthValue !== undefined) setDepthValue(s.depthValue);
    if (s.sessionsPerWeek !== undefined) setSessionsPerWeek(s.sessionsPerWeek);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({
      mode, unitSystem, emitterCount, flowPreset, customFlowRate,
      perPlantAmount, areaValue, depthValue, sessionsPerWeek,
    });
  }, [mode, unitSystem, emitterCount, flowPreset, customFlowRate, perPlantAmount, areaValue, depthValue, sessionsPerWeek]);

  const isMetric = unitSystem === 'metric';
  const flowUnit = isMetric ? 'LPH' : 'GPH';
  const volumeUnit = isMetric ? 'L' : 'gal';
  const areaUnit = isMetric ? 'sq m' : 'sq ft';
  const depthUnit = isMetric ? 'mm' : 'in';

  // Convert a GPH value to the current display unit (GPH or LPH).
  const gphToDisplay = (gph: number) => (isMetric ? gph * L_PER_GAL : gph);
  const displayToGph = (val: number) => (isMetric ? val / L_PER_GAL : val);

  const handleUnitToggle = (next: UnitSystem) => {
    if (next === unitSystem) return;
    const goingMetric = next === 'metric';

    // Convert custom flow rate
    const cfr = parseFloat(customFlowRate);
    if (Number.isFinite(cfr)) {
      setCustomFlowRate(round(goingMetric ? cfr * L_PER_GAL : cfr / L_PER_GAL, 2).toString());
    }
    // Convert per-plant amount (gal <-> L)
    const ppa = parseFloat(perPlantAmount);
    if (Number.isFinite(ppa)) {
      setPerPlantAmount(round(goingMetric ? ppa * L_PER_GAL : ppa / L_PER_GAL, 2).toString());
    }
    // Convert area (sq ft <-> sq m)
    const area = parseFloat(areaValue);
    if (Number.isFinite(area)) {
      setAreaValue(round(goingMetric ? area * SQM_PER_SQFT : area / SQM_PER_SQFT, 2).toString());
    }
    // Convert depth (in <-> mm)
    const depth = parseFloat(depthValue);
    if (Number.isFinite(depth)) {
      setDepthValue(round(goingMetric ? depth * MM_PER_IN : depth / MM_PER_IN, 1).toString());
    }
    setUnitSystem(next);
  };

  const handleNumericChange =
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
    };

  const handleIntegerChange =
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(sanitizeIntegerInput(e.target.value));
    };

  const flowRateGph = useMemo(() => {
    if (flowPreset === 'custom') {
      const val = parseFloat(customFlowRate);
      if (!Number.isFinite(val) || val <= 0) return 0;
      return displayToGph(val);
    }
    const preset = FLOW_PRESETS.find((p) => p.value === flowPreset);
    return preset ? preset.gph : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowPreset, customFlowRate, isMetric]);

  const result: CalculatorResult | null = useMemo(() => {
    const emitters = parseInt(emitterCount, 10);
    if (!Number.isFinite(emitters) || emitters <= 0) return null;
    if (!Number.isFinite(flowRateGph) || flowRateGph <= 0) return null;

    const totalFlowGph = emitters * flowRateGph;

    let totalGalNeeded = 0;
    let perPlantGal = 0;

    if (mode === 'per-plant') {
      const raw = parseFloat(perPlantAmount);
      if (!Number.isFinite(raw) || raw <= 0) return null;
      perPlantGal = isMetric ? raw / L_PER_GAL : raw;
      // Assumes one emitter per plant, so run time is driven by a single
      // emitter's flow rate, independent of how many plants are on the line.
      totalGalNeeded = perPlantGal * emitters;
    } else {
      const rawArea = parseFloat(areaValue);
      const rawDepth = parseFloat(depthValue);
      if (!Number.isFinite(rawArea) || rawArea <= 0) return null;
      if (!Number.isFinite(rawDepth) || rawDepth <= 0) return null;
      const areaSqFt = isMetric ? rawArea / SQM_PER_SQFT : rawArea;
      const depthIn = isMetric ? rawDepth / MM_PER_IN : rawDepth;
      totalGalNeeded = areaSqFt * depthIn * GAL_PER_SQFT_INCH;
    }

    const runTimeHours =
      mode === 'per-plant' ? perPlantGal / flowRateGph : totalGalNeeded / totalFlowGph;

    const totalDeliveredGal =
      mode === 'per-plant' ? totalGalNeeded : totalFlowGph * runTimeHours;

    const weeks = parseInt(sessionsPerWeek, 10);
    const weeklyTotalGal =
      Number.isFinite(weeks) && weeks > 0 ? totalDeliveredGal * weeks : null;

    return {
      runTimeHours,
      totalFlowGph,
      totalDeliveredGal,
      weeklyTotalGal,
      emitters,
    };
  }, [mode, emitterCount, flowRateGph, perPlantAmount, areaValue, depthValue, sessionsPerWeek, isMetric]);

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Drip Irrigation Calculator Results', margin, y);
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
    const flowLabel = flowPreset === 'custom' ? `${customFlowRate} ${flowUnit} (custom)` : `${FLOW_PRESETS.find(p => p.value === flowPreset)?.label ?? ''}`;
    const lines: string[] = [
      `Number of emitters: ${emitterCount}`,
      `Emitter flow rate: ${flowLabel}`,
      `Mode: ${mode === 'per-plant' ? 'Water per plant' : 'Water depth over area'}`,
    ];
    if (mode === 'per-plant') {
      lines.push(`Target water per plant: ${perPlantAmount} ${volumeUnit}`);
    } else {
      lines.push(`Area: ${areaValue} ${areaUnit}`);
      lines.push(`Target depth: ${depthValue} ${depthUnit}`);
    }
    if (sessionsPerWeek) lines.push(`Sessions per week: ${sessionsPerWeek}`);
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
        `Run time: ${formatDuration(result.runTimeHours)}`,
        `Total system flow: ${round(gphToDisplay(result.totalFlowGph), 2)} ${flowUnit}`,
        `Water delivered this session: ${round(gphToDisplay(result.totalDeliveredGal), 2)} ${volumeUnit}`,
      ];
      if (result.weeklyTotalGal !== null) {
        resultLines.push(`Weekly total (${sessionsPerWeek}x/week): ${round(gphToDisplay(result.weeklyTotalGal), 1)} ${volumeUnit}`);
      }
      resultLines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    }

    doc.save('drip-irrigation-calculator-results.pdf');
  };

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setMode('per-plant');
    setUnitSystem('imperial');
    setEmitterCount('10');
    setFlowPreset('1');
    setCustomFlowRate('1.5');
    setPerPlantAmount('1');
    setAreaValue('50');
    setDepthValue('1');
    setSessionsPerWeek('2');
  };

  return {
    mode,
    setMode,
    unitSystem,
    emitterCount,
    setEmitterCount,
    flowPreset,
    setFlowPreset,
    customFlowRate,
    setCustomFlowRate,
    perPlantAmount,
    areaValue,
    depthValue,
    sessionsPerWeek,
    isMetric,
    flowUnit,
    volumeUnit,
    areaUnit,
    depthUnit,
    gphToDisplay,
    handleUnitToggle,
    handleNumericChange,
    handleIntegerChange,
    setPerPlantAmount,
    setAreaValue,
    setDepthValue,
    setSessionsPerWeek,
    result,
    exportPdf,
    reset,
  };
}

export type DripIrrigationCalculatorState = ReturnType<typeof useDripIrrigationCalculatorState>;
