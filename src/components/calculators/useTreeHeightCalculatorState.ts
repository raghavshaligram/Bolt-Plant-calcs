import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from TreeHeightCalculator.tsx per CALC_ROLLOUT_PATTERN.md -- same
// inputs/result/reset/PDF-export logic, now reachable from the sticky
// action panel and the Share/Embed/Cite modal, which live outside the
// calculator's own component tree. This hook is the single source of
// truth; TreeHeightCalculatorCard.tsx is a pure presentational component
// driven entirely by its return value, and TreeHeightCalculatorPanel.tsx is
// the one place that calls it.

export type UnitSystem = 'imperial' | 'metric';
export type Method = 'angle' | 'shadow' | 'stick';
export type SlopeMode = 'none' | 'below' | 'above';

const STORAGE_KEY = 'tree-height-calculator-state-v1';

const DEG_TO_RAD = Math.PI / 180;

function round(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Lengths (distance, height, shadow, stick) can be decimals but not
// negative or garbage -- strip anything that isn't a digit or a single
// decimal point. Angle inputs reuse this too; negative angles aren't
// meaningful for this calculator (elevation is always measured upward
// from eye level, never below it).
function sanitizeNumberInput(raw: string): string {
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

export interface SavedState {
  unitSystem: UnitSystem;
  method: Method;
  // Angle method
  angleDistance: string;
  angleTop: string;
  eyeHeight: string;
  slopeMode: SlopeMode;
  angleBase: string;
  // Shadow method
  treeShadow: string;
  refHeight: string;
  refShadow: string;
  // Stick method
  stickLength: string;
  armDistance: string;
  stickDistance: string;
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
 * Reads method + whichever method's measurements from the page's URL query
 * string -- the foundation of the "share with results" feature. Gated on
 * the three primary distance-like inputs (one per method: angleDistance,
 * treeShadow, stickDistance) rather than a single field, since which one is
 * "core" depends on which method the shared link was using. Only returns a
 * non-null object when at least one of those is present, so a plain
 * bookmarked/shared-without-results URL never accidentally overrides a
 * returning visitor's saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('angleDistance') && !params.has('treeShadow') && !params.has('stickDistance')) return null;

  const out: Partial<SavedState> = {};
  const units = params.get('units');
  const method = params.get('method');
  const angleDistance = params.get('angleDistance');
  const angleTop = params.get('angleTop');
  const eyeHeight = params.get('eyeHeight');
  const slopeMode = params.get('slopeMode');
  const angleBase = params.get('angleBase');
  const treeShadow = params.get('treeShadow');
  const refHeight = params.get('refHeight');
  const refShadow = params.get('refShadow');
  const stickLength = params.get('stickLength');
  const armDistance = params.get('armDistance');
  const stickDistance = params.get('stickDistance');

  if (units === 'imperial' || units === 'metric') out.unitSystem = units;
  if (method === 'angle' || method === 'shadow' || method === 'stick') out.method = method;
  if (angleDistance && /^\d*\.?\d*$/.test(angleDistance)) out.angleDistance = angleDistance;
  if (angleTop && /^\d*\.?\d*$/.test(angleTop)) out.angleTop = angleTop;
  if (eyeHeight && /^\d*\.?\d*$/.test(eyeHeight)) out.eyeHeight = eyeHeight;
  if (slopeMode === 'none' || slopeMode === 'below' || slopeMode === 'above') out.slopeMode = slopeMode;
  if (angleBase && /^\d*\.?\d*$/.test(angleBase)) out.angleBase = angleBase;
  if (treeShadow && /^\d*\.?\d*$/.test(treeShadow)) out.treeShadow = treeShadow;
  if (refHeight && /^\d*\.?\d*$/.test(refHeight)) out.refHeight = refHeight;
  if (refShadow && /^\d*\.?\d*$/.test(refShadow)) out.refShadow = refShadow;
  if (stickLength && /^\d*\.?\d*$/.test(stickLength)) out.stickLength = stickLength;
  if (armDistance && /^\d*\.?\d*$/.test(armDistance)) out.armDistance = armDistance;
  if (stickDistance && /^\d*\.?\d*$/.test(stickDistance)) out.stickDistance = stickDistance;

  return out;
}

export function useTreeHeightCalculatorState() {
  const hasLoaded = useRef(false);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [method, setMethod] = useState<Method>('angle');

  // Angle method
  const [angleDistance, setAngleDistance] = useState('50');
  const [angleTop, setAngleTop] = useState('28');
  const [eyeHeight, setEyeHeight] = useState('5.5');
  const [slopeMode, setSlopeMode] = useState<SlopeMode>('none');
  const [angleBase, setAngleBase] = useState('8');

  // Shadow method
  const [treeShadow, setTreeShadow] = useState('54');
  const [refHeight, setRefHeight] = useState('6');
  const [refShadow, setRefShadow] = useState('9');

  // Stick method
  const [stickLength, setStickLength] = useState('1.5');
  const [armDistance, setArmDistance] = useState('2');
  const [stickDistance, setStickDistance] = useState('60');

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.method) setMethod(s.method);
    if (s.angleDistance !== undefined) setAngleDistance(s.angleDistance);
    if (s.angleTop !== undefined) setAngleTop(s.angleTop);
    if (s.eyeHeight !== undefined) setEyeHeight(s.eyeHeight);
    if (s.slopeMode) setSlopeMode(s.slopeMode);
    if (s.angleBase !== undefined) setAngleBase(s.angleBase);
    if (s.treeShadow !== undefined) setTreeShadow(s.treeShadow);
    if (s.refHeight !== undefined) setRefHeight(s.refHeight);
    if (s.refShadow !== undefined) setRefShadow(s.refShadow);
    if (s.stickLength !== undefined) setStickLength(s.stickLength);
    if (s.armDistance !== undefined) setArmDistance(s.armDistance);
    if (s.stickDistance !== undefined) setStickDistance(s.stickDistance);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({
      unitSystem, method,
      angleDistance, angleTop, eyeHeight, slopeMode, angleBase,
      treeShadow, refHeight, refShadow,
      stickLength, armDistance, stickDistance,
    });
  }, [
    unitSystem, method,
    angleDistance, angleTop, eyeHeight, slopeMode, angleBase,
    treeShadow, refHeight, refShadow,
    stickLength, armDistance, stickDistance,
  ]);

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';

  const handleNumericChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(sanitizeNumberInput(e.target.value));
  };

  const handleAngleDistanceChange = handleNumericChange(setAngleDistance);
  const handleAngleTopChange = handleNumericChange(setAngleTop);
  const handleEyeHeightChange = handleNumericChange(setEyeHeight);
  const handleAngleBaseChange = handleNumericChange(setAngleBase);
  const handleTreeShadowChange = handleNumericChange(setTreeShadow);
  const handleRefHeightChange = handleNumericChange(setRefHeight);
  const handleRefShadowChange = handleNumericChange(setRefShadow);
  const handleStickLengthChange = handleNumericChange(setStickLength);
  const handleArmDistanceChange = handleNumericChange(setArmDistance);
  const handleStickDistanceChange = handleNumericChange(setStickDistance);

  // ---- Angle method -------------------------------------------------
  const angleResult = useMemo(() => {
    const dist = parseFloat(angleDistance);
    const top = parseFloat(angleTop);
    const eye = parseFloat(eyeHeight);
    if (!Number.isFinite(dist) || !Number.isFinite(top) || dist <= 0) {
      return { valid: false, height: 0 };
    }
    const topRad = top * DEG_TO_RAD;
    if (slopeMode === 'none') {
      const e = Number.isFinite(eye) ? eye : 0;
      const height = dist * Math.tan(topRad) + e;
      return { valid: true, height, mode: 'none' as const, dist, top, eye: e };
    }
    const base = parseFloat(angleBase);
    if (!Number.isFinite(base)) return { valid: false, height: 0 };
    const baseRad = base * DEG_TO_RAD;
    const height =
      slopeMode === 'below'
        ? dist * (Math.tan(topRad) + Math.tan(baseRad))
        : dist * (Math.tan(topRad) - Math.tan(baseRad));
    return { valid: true, height, mode: slopeMode, dist, top, base };
  }, [angleDistance, angleTop, eyeHeight, slopeMode, angleBase]);

  // ---- Shadow method --------------------------------------------------
  const shadowResult = useMemo(() => {
    const ts = parseFloat(treeShadow);
    const rh = parseFloat(refHeight);
    const rs = parseFloat(refShadow);
    if (!Number.isFinite(ts) || !Number.isFinite(rh) || !Number.isFinite(rs) || rs <= 0) {
      return { valid: false, height: 0 };
    }
    const height = (ts / rs) * rh;
    return { valid: true, height, ts, rh, rs };
  }, [treeShadow, refHeight, refShadow]);

  // ---- Stick method -----------------------------------------------------
  const stickResult = useMemo(() => {
    const sl = parseFloat(stickLength);
    const ad = parseFloat(armDistance);
    const sd = parseFloat(stickDistance);
    if (!Number.isFinite(sl) || !Number.isFinite(ad) || !Number.isFinite(sd) || ad <= 0) {
      return { valid: false, height: 0 };
    }
    const height = (sl / ad) * sd;
    return { valid: true, height, sl, ad, sd };
  }, [stickLength, armDistance, stickDistance]);

  const activeResult =
    method === 'angle' ? angleResult : method === 'shadow' ? shadowResult : stickResult;

  const formulaLine = useMemo(() => {
    if (method === 'angle' && angleResult.valid) {
      if (angleResult.mode === 'none') {
        return `(${angleResult.dist} × tan(${angleResult.top}°)) + ${angleResult.eye} = ${round(angleResult.height)} ${lengthUnit}`;
      }
      const sign = angleResult.mode === 'below' ? '+' : '−';
      return `${angleResult.dist} × (tan(${angleResult.top}°) ${sign} tan(${angleResult.base}°)) = ${round(angleResult.height)} ${lengthUnit}`;
    }
    if (method === 'shadow' && shadowResult.valid) {
      return `(${shadowResult.ts} ÷ ${shadowResult.rs}) × ${shadowResult.rh} = ${round(shadowResult.height)} ${lengthUnit}`;
    }
    if (method === 'stick' && stickResult.valid) {
      return `(${stickResult.sl} ÷ ${stickResult.ad}) × ${stickResult.sd} = ${round(stickResult.height)} ${lengthUnit}`;
    }
    return '';
  }, [method, angleResult, shadowResult, stickResult, lengthUnit]);

  const methodLabel = method === 'angle' ? 'Angle Method' : method === 'shadow' ? 'Shadow Method' : 'Stick Method';

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Tree Height Calculator Results', margin, y);
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
    doc.text(`Method: ${methodLabel}`, margin, y);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    if (!activeResult.valid) {
      doc.text('Enter measurements to see a result.', margin, y);
    } else {
      if (method === 'angle') {
        const lines = [
          `Horizontal distance: ${angleDistance} ${lengthUnit}`,
          `Angle to treetop: ${angleTop}°`,
          slopeMode === 'none'
            ? `Eye height: ${eyeHeight} ${lengthUnit}`
            : `Slope correction: ${slopeMode === 'below' ? 'base below eye level' : 'base above eye level'}, angle to base ${angleBase}°`,
        ];
        lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
      } else if (method === 'shadow') {
        const lines = [
          `Tree shadow length: ${treeShadow} ${lengthUnit}`,
          `Reference object height: ${refHeight} ${lengthUnit}`,
          `Reference object shadow length: ${refShadow} ${lengthUnit}`,
        ];
        lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
      } else {
        const lines = [
          `Stick length: ${stickLength} ${lengthUnit}`,
          `Arm distance (eye to stick): ${armDistance} ${lengthUnit}`,
          `Distance to tree: ${stickDistance} ${lengthUnit}`,
        ];
        lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
      }

      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(`Estimated tree height: ${round(activeResult.height)} ${lengthUnit}`, margin, y);
      y += 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(formulaLine, margin, y);
    }

    y += 30;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Each method has its own accuracy limits — see harvestmath.com for details on this method.', margin, y);

    doc.save('tree-height-calculator-results.pdf');
  };

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setUnitSystem('imperial');
    setMethod('angle');
    setAngleDistance('50');
    setAngleTop('28');
    setEyeHeight('5.5');
    setSlopeMode('none');
    setAngleBase('8');
    setTreeShadow('54');
    setRefHeight('6');
    setRefShadow('9');
    setStickLength('1.5');
    setArmDistance('2');
    setStickDistance('60');
  };

  return {
    unitSystem,
    setUnitSystem,
    method,
    setMethod,
    angleDistance,
    angleTop,
    eyeHeight,
    slopeMode,
    setSlopeMode,
    angleBase,
    treeShadow,
    refHeight,
    refShadow,
    stickLength,
    armDistance,
    stickDistance,
    isMetric,
    lengthUnit,
    handleAngleDistanceChange,
    handleAngleTopChange,
    handleEyeHeightChange,
    handleAngleBaseChange,
    handleTreeShadowChange,
    handleRefHeightChange,
    handleRefShadowChange,
    handleStickLengthChange,
    handleArmDistanceChange,
    handleStickDistanceChange,
    angleResult,
    shadowResult,
    stickResult,
    activeResult,
    formulaLine,
    methodLabel,
    exportPdf,
    reset,
  };
}

export type TreeHeightCalculatorState = ReturnType<typeof useTreeHeightCalculatorState>;
