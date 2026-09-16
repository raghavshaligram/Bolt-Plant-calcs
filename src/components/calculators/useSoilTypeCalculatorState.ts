import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from SoilTypeCalculator.tsx (Build Prompt: Calculator Page
// Redesign -- Roll Out to All Remaining Calculators) so the same state --
// inputs, classification result, reset -- is reachable from the action
// panel and the Share/Embed/Cite modal, which live outside the calculator's
// own component tree in the sticky sidebar. This hook is the single source
// of truth; SoilTypeCalculatorCard.tsx is now a pure presentational
// component driven entirely by its return value, and
// SoilTypeCalculatorPanel.tsx is the one place that calls it.
//
// Unlike the soil-and-amendments volume calculators, this is a diagnostic
// classification tool, not a "how much do I need" tool: its "result" is a
// USDA texture class (a string), not a bag/weight quantity. There is no
// static, browsable reference table to extract -- TEXTURE_INFO below is
// plain-language copy about the ONE class the live inputs classify to, not
// a lookup table of all 12 classes shown at once, so it stays here and is
// exported for the card (and PDF export) to read by key, same shape as this
// file's own internal use.

export type InputMode = 'percent' | 'jar-test';

const STORAGE_KEY = 'soil-type-calculator-state-v1';

// Plain-language gardening context per USDA texture class. Not a source of
// classification logic (that lives entirely in classifyTexture below) --
// just descriptive copy about drainage, retention, and workability.
export const TEXTURE_INFO: Record<string, string> = {
  sand: 'Drains very fast and dries out quickly. Low water and nutrient retention, but easy to work and warms up early in spring. Needs frequent watering and feeding to support most garden plants.',
  'loamy sand': 'Drains fast like sand, with slightly better water and nutrient retention. Easy to work; still needs more frequent watering than a loam soil.',
  'sandy loam': 'A sandy-leaning balance of drainage and retention. Warms early, is easy to work, and suits most vegetables with regular watering.',
  loam: 'The balance most gardeners aim for -- good drainage, solid water and nutrient retention, and easy to work across a wide moisture range.',
  'silt loam': 'Holds more water and nutrients than loam, but can crust or compact if worked when too wet. Generally fertile ground.',
  silt: 'High water and nutrient retention with a smooth, floury feel. Prone to crusting and compaction; structure benefits from added organic matter.',
  'sandy clay loam': 'A moderate mix leaning sandy, with some clay stickiness when wet. Drains reasonably well while holding more nutrients than a straight sandy loam.',
  'clay loam': 'Good water and nutrient retention, but heavier to dig and slower to warm and drain in spring. Workable only in a moderate moisture range.',
  'silty clay loam': 'Holds water and nutrients well but compacts easily. Has a narrow window of workable moisture -- too wet and it smears, too dry and it clods.',
  'sandy clay': 'Heavy and sticky when wet, hard when dry, though it drains a little better than a straight clay. Benefits from organic matter to improve structure.',
  'silty clay': 'High water and nutrient retention with poor drainage. Sticky when wet and hard when dry -- difficult to work outside a narrow moisture window.',
  clay: 'Drains slowly and holds water and nutrients tightly. Hard when dry, sticky and easily compacted when wet. Organic matter amendment helps the most here.',
};

export interface SavedState {
  mode: InputMode;
  sand: string;
  silt: string;
  clay: string;
  jarSand: string;
  jarSilt: string;
  jarClay: string;
}

export interface CalculatorResult {
  sandPct: number;
  siltPct: number;
  clayPct: number;
  normalized: boolean;
  hasInput: boolean;
  textureClass: string;
}

// Classifies USDA soil texture from sand/clay percentages (silt is derived
// as the remainder). Boundary rules are sourced directly from:
//   Benham, E., Ahrens, R.J., and Nettleton, W.D. (2009). "Clarification
//   of Soil Texture Class Boundaries." Nettleton National Soil Survey
//   Center, USDA-NRCS, Lincoln, Nebraska.
// This paper exists specifically to resolve ambiguity at class boundaries
// on the USDA soil texture triangle (Soil Survey Manual, 1993), so these
// inequalities -- rather than a hand-rolled point-in-polygon test -- are
// the authoritative, unambiguous definition of each class's edges.
function classifyTexture(sand: number, clay: number): string {
  const silt = 100 - sand - clay;

  if (silt + 1.5 * clay < 15) return 'sand';
  if (silt + 1.5 * clay >= 15 && silt + 2 * clay < 30) return 'loamy sand';
  if (
    (clay >= 7 && clay < 20 && sand > 52 && silt + 2 * clay >= 30) ||
    (clay < 7 && silt < 50 && silt + 2 * clay >= 30)
  )
    return 'sandy loam';
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return 'loam';
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return 'silt loam';
  if (silt >= 80 && clay < 12) return 'silt';
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return 'sandy clay loam';
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return 'clay loam';
  if (clay >= 27 && clay < 40 && sand <= 20) return 'silty clay loam';
  if (clay >= 35 && sand > 45) return 'sandy clay';
  if (clay >= 40 && silt >= 40) return 'silty clay';
  if (clay >= 40 && sand <= 45 && silt < 40) return 'clay';
  return null as unknown as string; // unreachable -- exhaustively verified, see build notes
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

/**
 * Reads mode/sand/silt/clay/jarSand/jarSilt/jarClay from the page's URL
 * query string -- the "share with results" feature, same as the pilot.
 *
 * This calculator has two mutually exclusive entry modes (raw percentages
 * vs. jar-test layer heights), so unlike the pilot's single length/width/
 * depth trio, the "at least one core param present" guard here checks
 * across BOTH modes' numeric fields -- sand/silt/clay for percent mode,
 * jarSand/jarSilt/jarClay for jar-test mode. Any one of those six being
 * present is enough to know a shared link is carrying real classification
 * inputs; without at least one there's nothing to classify, so a bare/
 * bookmarked URL never silently overrides a returning visitor's saved
 * state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const coreParams = ['sand', 'silt', 'clay', 'jarSand', 'jarSilt', 'jarClay'];
  if (!coreParams.some((p) => params.has(p))) return null;

  const out: Partial<SavedState> = {};
  const mode = params.get('mode');
  const sand = params.get('sand');
  const silt = params.get('silt');
  const clay = params.get('clay');
  const jarSand = params.get('jarSand');
  const jarSilt = params.get('jarSilt');
  const jarClay = params.get('jarClay');

  if (mode === 'percent' || mode === 'jar-test') out.mode = mode;
  const numeric = /^\d*\.?\d*$/;
  if (sand && numeric.test(sand)) out.sand = sand;
  if (silt && numeric.test(silt)) out.silt = silt;
  if (clay && numeric.test(clay)) out.clay = clay;
  if (jarSand && numeric.test(jarSand)) out.jarSand = jarSand;
  if (jarSilt && numeric.test(jarSilt)) out.jarSilt = jarSilt;
  if (jarClay && numeric.test(jarClay)) out.jarClay = jarClay;

  return out;
}

export function useSoilTypeCalculatorState() {
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<InputMode>('percent');
  const [sand, setSand] = useState<string>('40');
  const [silt, setSilt] = useState<string>('40');
  const [clay, setClay] = useState<string>('20');
  const [jarSand, setJarSand] = useState<string>('2.5');
  const [jarSilt, setJarSilt] = useState<string>('1.5');
  const [jarClay, setJarClay] = useState<string>('1');

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.mode) setMode(s.mode);
    if (s.sand !== undefined) setSand(s.sand);
    if (s.silt !== undefined) setSilt(s.silt);
    if (s.clay !== undefined) setClay(s.clay);
    if (s.jarSand !== undefined) setJarSand(s.jarSand);
    if (s.jarSilt !== undefined) setJarSilt(s.jarSilt);
    if (s.jarClay !== undefined) setJarClay(s.jarClay);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ mode, sand, silt, clay, jarSand, jarSilt, jarClay });
  }, [mode, sand, silt, clay, jarSand, jarSilt, jarClay]);

  const handleNumericChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
  };

  const handleSandChange = handleNumericChange(setSand);
  const handleSiltChange = handleNumericChange(setSilt);
  const handleClayChange = handleNumericChange(setClay);
  const handleJarSandChange = handleNumericChange(setJarSand);
  const handleJarSiltChange = handleNumericChange(setJarSilt);
  const handleJarClayChange = handleNumericChange(setJarClay);

  const result: CalculatorResult = useMemo(() => {
    let sandPct = 0;
    let siltPct = 0;
    let clayPct = 0;
    let normalized = false;

    if (mode === 'percent') {
      const s = parseFloat(sand) || 0;
      const si = parseFloat(silt) || 0;
      const c = parseFloat(clay) || 0;
      const sum = s + si + c;
      if (sum > 0) {
        sandPct = (s / sum) * 100;
        siltPct = (si / sum) * 100;
        clayPct = (c / sum) * 100;
        normalized = Math.abs(sum - 100) > 0.5;
      }
    } else {
      const s = parseFloat(jarSand) || 0;
      const si = parseFloat(jarSilt) || 0;
      const c = parseFloat(jarClay) || 0;
      const sum = s + si + c;
      if (sum > 0) {
        sandPct = (s / sum) * 100;
        siltPct = (si / sum) * 100;
        clayPct = (c / sum) * 100;
      }
    }

    const hasInput = sandPct + siltPct + clayPct > 0;
    const textureClass = hasInput ? classifyTexture(round(sandPct, 4), round(clayPct, 4)) : '';

    return { sandPct, siltPct, clayPct, normalized, hasInput, textureClass };
  }, [mode, sand, silt, clay, jarSand, jarSilt, jarClay]);

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Soil Type Calculator Results', margin, y);
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
    if (mode === 'jar-test') {
      doc.text(`Jar test layers: sand ${jarSand || 0}, silt ${jarSilt || 0}, clay ${jarClay || 0}`, margin, y);
      y += 16;
    }
    doc.text(
      `Sand ${round(result.sandPct)}% / Silt ${round(result.siltPct)}% / Clay ${round(result.clayPct)}%`,
      margin,
      y,
    );
    y += 28;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Result', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.text(`Texture class: ${result.textureClass || 'n/a'}`, margin, y);
    y += 24;

    doc.setFontSize(10);
    const info = TEXTURE_INFO[result.textureClass] || '';
    const lines = doc.splitTextToSize(info, 500);
    doc.text(lines, margin, y);

    doc.save('soil-type-calculator-results.pdf');
  };

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setMode('percent');
    setSand('40');
    setSilt('40');
    setClay('20');
    setJarSand('2.5');
    setJarSilt('1.5');
    setJarClay('1');
  };

  return {
    mode,
    setMode,
    sand,
    silt,
    clay,
    jarSand,
    jarSilt,
    jarClay,
    handleSandChange,
    handleSiltChange,
    handleClayChange,
    handleJarSandChange,
    handleJarSiltChange,
    handleJarClayChange,
    result,
    exportPdf,
    reset,
  };
}

export type SoilTypeCalculatorState = ReturnType<typeof useSoilTypeCalculatorState>;
