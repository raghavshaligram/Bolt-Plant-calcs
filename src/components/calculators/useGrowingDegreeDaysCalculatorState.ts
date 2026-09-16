import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from GrowingDegreeDaysCalculator.tsx (Calculator Page Redesign
// rollout -- see CALC_ROLLOUT_PATTERN.md). This hook is the single source of
// truth for both of this calculator's modes -- the single-day quick check
// and the season-long accumulation tracker -- so the sticky panel's action
// row and the Share/Embed/Cite modal can read/reset the same state as the
// card even though they render outside the card's own component tree.

export type UnitSystem = 'imperial' | 'metric';
export type Mode = 'single' | 'accumulation';
export type PresetId = 'most' | 'cool-season' | 'turf' | 'custom';

export interface Row {
  tmax: string;
  tmin: string;
}

const STORAGE_KEY = 'growing-degree-days-calculator-state-v1';

// Base temperatures below which development effectively stops for that
// organism. Fahrenheit values are the ones actually published by university
// extension sources; Celsius values are the exact conversions ((F-32) x 5/9),
// rounded to one decimal for display. Switching units switches which scale
// the whole calculation runs in -- GDD accumulated in Celsius is NOT the same
// number as GDD accumulated in Fahrenheit for the same physical day, even
// though the underlying base threshold is the same temperature, so this
// calculator computes entirely in one scale at a time rather than converting
// a running total after the fact.
export const BASE_PRESETS: Record<Exclude<PresetId, 'custom'>, { f: number; c: number; sublabel: string }> = {
  most: { f: 50, c: 10, sublabel: 'Most landscape pests & warm-season plants' },
  'cool-season': { f: 43, c: 6.1, sublabel: 'Some cool-season insects' },
  turf: { f: 32, c: 0, sublabel: 'Turf models, incl. crabgrass pre-emergent' },
};

// The "86/50 cap" (a.k.a. modified/corn GDD method): before averaging, treat
// any high above 86°F as 86°F and any low below 50°F as 50°F, on the theory
// that development doesn't meaningfully speed up above ~86°F and effectively
// stops below 50°F regardless of how far below it the actual low was.
// 86°F = 30°C and 50°F = 10°C exactly, so these stay clean round numbers in
// both unit systems.
const CAP_HI_F = 86;
const CAP_LO_F = 50;
const CAP_HI_C = 30;
const CAP_LO_C = 10;

export function round(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Temperature inputs, unlike most of this site's length/area inputs, need to
// allow a leading minus sign -- early-season lows below 0°F or 0°C are real.
export function sanitizeTempInput(raw: string): string {
  if (typeof raw !== 'string') return '';
  let cleaned = raw.replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  const negative = cleaned.trim().startsWith('-');
  cleaned = cleaned.replace(/[^\d.]/g, '');
  cleaned = cleaned.replace(/^0+(?=\d)/, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return (negative ? '-' : '') + cleaned;
}

export interface SavedState {
  unitSystem: UnitSystem;
  mode: Mode;
  preset: PresetId;
  customBase: string;
  capEnabled: boolean;
  singleTmax: string;
  singleTmin: string;
  rows: Row[];
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

// A signed decimal, allowing an optional leading minus sign -- the same
// shape sanitizeTempInput() produces. Empty string and a bare "-" are
// rejected so a stray/incomplete query param never gets treated as a valid
// temperature.
const TEMP_RE = /^-?\d+\.?\d*$/;

/**
 * Reads the single-day quick-check inputs from the page's URL query string --
 * the foundation of the "share with results" feature. Only the single-day
 * mode is covered: the accumulation tracker's daily log is an
 * open-ended, user-grown list of rows that doesn't serialize compactly into
 * a URL the way a handful of numeric fields does (unlike length/width/depth
 * on the volume calculators, there's no fixed number of fields to encode,
 * and a long log would produce an unshareable, unbookmarkable URL). Loading
 * from a shared link always resolves to the single-day mode so the shared
 * result is the one actually shown.
 *
 * Only returns a non-null object when at least one of the three inputs most
 * essential to the primary result -- high, low, or the base-temperature
 * preset -- is present, so a plain bookmarked/shared-without-results URL
 * never accidentally overrides a returning visitor's saved state with
 * blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('tmax') && !params.has('tmin') && !params.has('preset')) return null;

  const out: Partial<SavedState> = { mode: 'single' };
  const tmax = params.get('tmax');
  const tmin = params.get('tmin');
  const preset = params.get('preset');
  const customBase = params.get('customBase');
  const cap = params.get('cap');
  const units = params.get('units');

  if (tmax && TEMP_RE.test(tmax)) out.singleTmax = tmax;
  if (tmin && TEMP_RE.test(tmin)) out.singleTmin = tmin;
  if (preset === 'most' || preset === 'cool-season' || preset === 'turf' || preset === 'custom') out.preset = preset;
  if (customBase && TEMP_RE.test(customBase)) out.customBase = customBase;
  if (cap === '1' || cap === '0') out.capEnabled = cap === '1';
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;

  return out;
}

export interface DayResult {
  valid: boolean;
  rawHi: number;
  rawLo: number;
  hi: number;
  lo: number;
  cappedHi: boolean;
  cappedLo: boolean;
  gdd: number;
  negativeClamped: boolean;
}

function computeDay(tmaxStr: string, tminStr: string, base: number, capEnabled: boolean, capHi: number, capLo: number): DayResult {
  const rawHi = parseFloat(tmaxStr);
  const rawLo = parseFloat(tminStr);
  if (!Number.isFinite(rawHi) || !Number.isFinite(rawLo)) {
    return { valid: false, rawHi: 0, rawLo: 0, hi: 0, lo: 0, cappedHi: false, cappedLo: false, gdd: 0, negativeClamped: false };
  }
  let hi = rawHi;
  let lo = rawLo;
  let cappedHi = false;
  let cappedLo = false;
  if (capEnabled) {
    if (hi > capHi) { hi = capHi; cappedHi = true; }
    if (lo < capLo) { lo = capLo; cappedLo = true; }
  }
  const raw = (hi + lo) / 2 - base;
  const gdd = Math.max(0, raw);
  return { valid: true, rawHi, rawLo, hi, lo, cappedHi, cappedLo, gdd, negativeClamped: raw < 0 };
}

export function formulaLine(hi: number, lo: number, b: number, gdd: number): string {
  return `((${hi} + ${lo}) ÷ 2) − ${b} = ${round(gdd, 1)} GDD`;
}

export function useGrowingDegreeDaysCalculatorState() {
  const hasLoaded = useRef(false);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [mode, setMode] = useState<Mode>('single');
  const [preset, setPreset] = useState<PresetId>('most');
  const [customBase, setCustomBase] = useState<string>('');
  const [capEnabled, setCapEnabled] = useState<boolean>(true);

  const [singleTmax, setSingleTmax] = useState<string>('75');
  const [singleTmin, setSingleTmin] = useState<string>('55');

  const [rows, setRows] = useState<Row[]>([
    { tmax: '58', tmin: '38' },
    { tmax: '62', tmin: '41' },
    { tmax: '71', tmin: '45' },
  ]);

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.mode) setMode(s.mode);
    if (s.preset) setPreset(s.preset);
    if (s.customBase !== undefined) setCustomBase(s.customBase);
    if (typeof s.capEnabled === 'boolean') setCapEnabled(s.capEnabled);
    if (s.singleTmax !== undefined) setSingleTmax(s.singleTmax);
    if (s.singleTmin !== undefined) setSingleTmin(s.singleTmin);
    if (!fromUrl && s.rows && Array.isArray(s.rows) && s.rows.length > 0) setRows(s.rows);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ unitSystem, mode, preset, customBase, capEnabled, singleTmax, singleTmin, rows });
  }, [unitSystem, mode, preset, customBase, capEnabled, singleTmax, singleTmin, rows]);

  const isMetric = unitSystem === 'metric';
  const tempUnit = isMetric ? '°C' : '°F';

  const capHi = isMetric ? CAP_HI_C : CAP_HI_F;
  const capLo = isMetric ? CAP_LO_C : CAP_LO_F;

  const base = useMemo(() => {
    if (preset === 'custom') {
      const v = parseFloat(customBase);
      return Number.isFinite(v) ? v : 0;
    }
    return isMetric ? BASE_PRESETS[preset].c : BASE_PRESETS[preset].f;
  }, [preset, customBase, isMetric]);

  // Selecting a preset also sets a sensible default for the cap, matching
  // the fact that the 86/50 cap is specifically calibrated to a 50°F base --
  // it's still available at other bases, but it isn't turned on by default
  // for them since there's no published convention for capping at, say, a
  // 32°F turf model.
  function selectPreset(id: PresetId) {
    setPreset(id);
    if (id === 'most') setCapEnabled(true);
    else if (id !== 'custom') setCapEnabled(false);
  }

  function updateRow(index: number, field: keyof Row, value: string) {
    const cleaned = sanitizeTempInput(value);
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: cleaned } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { tmax: '', tmin: '' }]);
  }

  function removeRow(index: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  const singleResult = useMemo(
    () => computeDay(singleTmax, singleTmin, base, capEnabled, capHi, capLo),
    [singleTmax, singleTmin, base, capEnabled, capHi, capLo]
  );

  const accumulationResults = useMemo(() => {
    let running = 0;
    return rows.map((r) => {
      const day = computeDay(r.tmax, r.tmin, base, capEnabled, capHi, capLo);
      if (day.valid) running += day.gdd;
      return { ...day, cumulative: running };
    });
  }, [rows, base, capEnabled, capHi, capLo]);

  const accumulationTotal = accumulationResults.length > 0 ? accumulationResults[accumulationResults.length - 1].cumulative : 0;
  const validRowCount = accumulationResults.filter((r) => r.valid).length;

  const presetLabel = (id: Exclude<PresetId, 'custom'>) => {
    const v = isMetric ? BASE_PRESETS[id].c : BASE_PRESETS[id].f;
    return `${v}${tempUnit}`;
  };

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Growing Degree Days Calculator Results', margin, y);
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
    doc.text('Settings', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const settingLines: string[] = [
      `Base temperature: ${base}${tempUnit}`,
      `86/50 cap: ${capEnabled ? 'On' : 'Off'}`,
      `Mode: ${mode === 'single' ? 'Single day' : 'Accumulation'}`,
    ];
    settingLines.forEach((line) => { doc.text(line, margin, y); y += 16; });

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Results', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    if (mode === 'single') {
      if (singleResult.valid) {
        const lines = [
          `High: ${singleResult.rawHi}${tempUnit}${singleResult.cappedHi ? ` (capped to ${singleResult.hi}${tempUnit})` : ''}`,
          `Low: ${singleResult.rawLo}${tempUnit}${singleResult.cappedLo ? ` (raised to ${singleResult.lo}${tempUnit})` : ''}`,
          `Growing degree days: ${round(singleResult.gdd, 1)} GDD`,
          formulaLine(singleResult.hi, singleResult.lo, base, singleResult.gdd),
        ];
        lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
      } else {
        doc.text('Enter a high and low temperature to see a result.', margin, y);
        y += 16;
      }
    } else {
      doc.text('Day    High    Low    GDD    Cumulative', margin, y);
      y += 16;
      accumulationResults.forEach((r, i) => {
        if (!r.valid) return;
        doc.text(
          `${i + 1}      ${r.rawHi}${tempUnit}    ${r.rawLo}${tempUnit}    ${round(r.gdd, 1)}    ${round(r.cumulative, 1)}`,
          margin,
          y
        );
        y += 16;
      });
      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total: ${round(accumulationTotal, 1)} GDD over ${validRowCount} day${validRowCount === 1 ? '' : 's'}`, margin, y);
      y += 16;
    }

    y += 20;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('A GDD total only means something alongside its base temperature and start date — note both when comparing.', margin, y);
    y += 12;
    doc.text('GDD is a heat model; it does not account for moisture, day length, or soil fertility.', margin, y);

    doc.save('growing-degree-days-calculator-results.pdf');
  };

  /** Restores the calculator's original defaults -- the action panel's Reset button. */
  const reset = () => {
    setUnitSystem('imperial');
    setMode('single');
    setPreset('most');
    setCustomBase('');
    setCapEnabled(true);
    setSingleTmax('75');
    setSingleTmin('55');
    setRows([
      { tmax: '58', tmin: '38' },
      { tmax: '62', tmin: '41' },
      { tmax: '71', tmin: '45' },
    ]);
  };

  return {
    unitSystem,
    setUnitSystem,
    mode,
    setMode,
    preset,
    setPreset,
    customBase,
    setCustomBase,
    capEnabled,
    setCapEnabled,
    singleTmax,
    setSingleTmax,
    singleTmin,
    setSingleTmin,
    rows,
    isMetric,
    tempUnit,
    capHi,
    capLo,
    base,
    selectPreset,
    updateRow,
    addRow,
    removeRow,
    singleResult,
    accumulationResults,
    accumulationTotal,
    validRowCount,
    presetLabel,
    exportPdf,
    reset,
  };
}

export type GrowingDegreeDaysCalculatorState = ReturnType<typeof useGrowingDegreeDaysCalculatorState>;
