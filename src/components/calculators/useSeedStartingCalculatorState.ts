import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  findZoneForZip,
  ZONE_FROST_DATA,
  ALL_ZONES,
  mkDate,
  shiftWeeks,
  fmtDate,
  midpoint,
  sanitizeZip,
  fullZoneNumberFromZone,
} from '../../lib/frostZones';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from SeedStartingCalculator.tsx (Build Prompt: Calculator Page
// Redesign -- Roll Out to All Remaining Calculators) so the same state --
// inputs, computed calendar, reset -- is reachable from the action panel and
// the Share/Embed/Cite modal, which live outside the calculator's own
// component tree in the sticky sidebar. This hook is the single source of
// truth; SeedStartingCalculatorCard.tsx is now a pure presentational
// component driven entirely by its return value, and
// SeedStartingCalculatorPanel.tsx is the one place that calls it.

export type InputMode = 'zip' | 'zone';
export type SowMethod = 'indoor' | 'direct';

const STORAGE_KEY = 'seed-starting-calculator-state-v1';

export interface SavedState {
  inputMode: InputMode;
  zip: string;
  zone: string;
  cropId: string;
}

// ---------------------------------------------------------------------------
// Crop data: weeks-before/after-last-frost figures reflect commonly cited
// extension guidance (University of Missouri Extension's "Starting Plants
// Indoors From Seeds" and University of Maryland Extension's "Vegetable
// Planting Calendar" — see Sources below). Cold-hardy crops transplant BEFORE
// the last frost since they tolerate light frost once hardened off; tender
// crops transplant AFTER last frost with a 1-2 week safety buffer; crops that
// don't transplant well are sown directly in the ground.
// ---------------------------------------------------------------------------
export interface CropData {
  id: string;
  name: string;
  method: SowMethod;
  indoorWeeksBeforeFrost?: [number, number];
  transplantWeeksOffset?: [number, number]; // negative = before last frost, positive = after
  directSowWeeksOffset?: [number, number]; // negative = before last frost, positive = after
  note: string;
}

export const CROPS: CropData[] = [
  { id: 'tomato', name: 'Tomato', method: 'indoor', indoorWeeksBeforeFrost: [6, 8], transplantWeeksOffset: [1, 2], note: 'Tender — no frost tolerance. Wait for warm soil.' },
  { id: 'pepper', name: 'Pepper', method: 'indoor', indoorWeeksBeforeFrost: [8, 10], transplantWeeksOffset: [1, 2], note: 'Slower to size up than tomatoes; give it extra weeks indoors.' },
  { id: 'eggplant', name: 'Eggplant', method: 'indoor', indoorWeeksBeforeFrost: [8, 10], transplantWeeksOffset: [1, 2], note: 'Tender and slow — keep warm indoors and out.' },
  { id: 'broccoli', name: 'Broccoli', method: 'indoor', indoorWeeksBeforeFrost: [6, 8], transplantWeeksOffset: [-4, -2], note: 'Cold-hardy once hardened off — transplant before last frost.' },
  { id: 'cabbage', name: 'Cabbage', method: 'indoor', indoorWeeksBeforeFrost: [6, 8], transplantWeeksOffset: [-4, -2], note: 'Cold-hardy once hardened off — transplant before last frost.' },
  { id: 'cauliflower', name: 'Cauliflower', method: 'indoor', indoorWeeksBeforeFrost: [6, 8], transplantWeeksOffset: [-4, -2], note: 'Cold-hardy once hardened off — transplant before last frost.' },
  { id: 'lettuce-head', name: 'Lettuce (head)', method: 'indoor', indoorWeeksBeforeFrost: [4, 6], transplantWeeksOffset: [-3, -2], note: 'Bolts in heat — get it in early.' },
  { id: 'marigold', name: 'Marigold', method: 'indoor', indoorWeeksBeforeFrost: [6, 8], transplantWeeksOffset: [1, 2], note: 'Tender annual flower — treat like a warm-season crop.' },
  { id: 'zinnia', name: 'Zinnia', method: 'direct', directSowWeeksOffset: [1, 2], note: 'Resents root disturbance — direct sow rather than transplant.' },
  { id: 'cucumber', name: 'Cucumber', method: 'direct', directSowWeeksOffset: [1, 2], note: "Doesn't transplant well — direct sow, or start in individual pots only." },
  { id: 'summer-squash', name: 'Summer squash / zucchini', method: 'direct', directSowWeeksOffset: [1, 2], note: "Doesn't transplant well — direct sow after soil has warmed." },
  { id: 'beans', name: 'Beans (bush or pole)', method: 'direct', directSowWeeksOffset: [1, 2], note: 'Direct sow only — transplanting damages the roots.' },
  { id: 'peas', name: 'Peas', method: 'direct', directSowWeeksOffset: [-6, -4], note: 'Very cold-hardy — plant as soon as soil can be worked.' },
  { id: 'carrots', name: 'Carrots', method: 'direct', directSowWeeksOffset: [-4, -2], note: "Root crop — doesn't transplant. Direct sow into loose soil." },
  { id: 'radishes', name: 'Radishes', method: 'direct', directSowWeeksOffset: [-4, -2], note: 'Fast and cold-hardy — one of the earliest direct sows.' },
  { id: 'spinach', name: 'Spinach', method: 'direct', directSowWeeksOffset: [-6, -4], note: 'Very cold-hardy — among the earliest crops in the ground.' },
  { id: 'lettuce-leaf', name: 'Lettuce (leaf) / salad greens', method: 'direct', directSowWeeksOffset: [-4, -2], note: 'Direct sow is standard, though transplants work too.' },
];

export interface CalculatorResult {
  lastStart: Date;
  lastEnd: Date;
  lastFrostMid: Date;
  method: SowMethod;
  indoorStart?: Date;
  indoorEnd?: Date;
  transplantStart?: Date;
  transplantEnd?: Date;
  directSowStart?: Date;
  directSowEnd?: Date;
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
 * Reads mode/zip/zone/crop from the page's URL query string -- the "share
 * with results" feature, same as the pilot. The calculator's primary result
 * needs a location (either a ZIP or a zone, depending on mode) AND a crop,
 * so -- same as the soil type calculator's dual-mode guard -- this only
 * returns non-null when at least one of those three core params is present,
 * so a bare/bookmarked URL never silently overrides a returning visitor's
 * saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const coreParams = ['zip', 'zone', 'crop'];
  if (!coreParams.some((p) => params.has(p))) return null;

  const out: Partial<SavedState> = {};
  const mode = params.get('mode');
  const zip = params.get('zip');
  const zone = params.get('zone');
  const crop = params.get('crop');

  if (mode === 'zip' || mode === 'zone') out.inputMode = mode;
  if (zip && /^\d{0,5}$/.test(zip)) out.zip = zip;
  if (zone && ALL_ZONES.includes(zone)) out.zone = zone;
  if (crop && CROPS.some((c) => c.id === crop)) out.cropId = crop;

  return out;
}

export function useSeedStartingCalculatorState() {
  const hasLoaded = useRef(false);

  const [inputMode, setInputMode] = useState<InputMode>('zip');
  const [zip, setZip] = useState('60601');
  const [zone, setZone] = useState('6b');
  const [cropId, setCropId] = useState('tomato');

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.inputMode) setInputMode(s.inputMode);
    if (s.zip !== undefined) setZip(s.zip);
    if (s.zone) setZone(s.zone);
    if (s.cropId) setCropId(s.cropId);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ inputMode, zip, zone, cropId });
  }, [inputMode, zip, zone, cropId]);

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZip(sanitizeZip(e.target.value));
  };

  const zipLookup = useMemo(() => {
    if (inputMode !== 'zip') return null;
    return findZoneForZip(zip);
  }, [inputMode, zip]);

  const activeZone = useMemo(() => {
    if (inputMode === 'zip') return zipLookup?.zone ?? null;
    return zone;
  }, [inputMode, zip, zone, zipLookup]);

  const fullZoneNumber = useMemo(() => fullZoneNumberFromZone(activeZone), [activeZone]);

  const crop = useMemo(() => CROPS.find((c) => c.id === cropId) ?? CROPS[0], [cropId]);

  const result: CalculatorResult | null = useMemo(() => {
    if (!fullZoneNumber) return null;
    const data = ZONE_FROST_DATA[fullZoneNumber];
    if (!data || data.frostFree) return null;

    const lastStart = mkDate(data.lastFrostStart);
    const lastEnd = mkDate(data.lastFrostEnd);
    // Use the midpoint of the last-frost range as the single reference date
    // for the weeks-before/after arithmetic, then keep both the crop-timing
    // window AND the underlying frost range visible so the estimate's layered
    // uncertainty (zone range + crop-timing range) stays honest.
    const lastFrostMid = midpoint(lastStart, lastEnd);

    if (crop.method === 'indoor') {
      const [wLow, wHigh] = crop.indoorWeeksBeforeFrost!;
      const [tLow, tHigh] = crop.transplantWeeksOffset!;
      return {
        lastStart, lastEnd, lastFrostMid,
        indoorStart: shiftWeeks(lastFrostMid, -wHigh),
        indoorEnd: shiftWeeks(lastFrostMid, -wLow),
        transplantStart: shiftWeeks(lastFrostMid, tLow),
        transplantEnd: shiftWeeks(lastFrostMid, tHigh),
        method: 'indoor' as const,
      };
    }
    const [dLow, dHigh] = crop.directSowWeeksOffset!;
    return {
      lastStart, lastEnd, lastFrostMid,
      directSowStart: shiftWeeks(lastFrostMid, Math.min(dLow, dHigh)),
      directSowEnd: shiftWeeks(lastFrostMid, Math.max(dLow, dHigh)),
      method: 'direct' as const,
    };
  }, [fullZoneNumber, crop]);

  const zoneIsFrostFree = useMemo(() => {
    if (!fullZoneNumber) return false;
    return !!ZONE_FROST_DATA[fullZoneNumber]?.frostFree;
  }, [fullZoneNumber]);

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    if (!result || !activeZone) return;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Seed Starting Calendar', margin, y);
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
    doc.text(`Crop: ${crop.name}  |  Zone: ${activeZone}`, margin, y);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Estimated last spring frost: ${fmtDate(result.lastStart)} - ${fmtDate(result.lastEnd)}`, margin, y);
    y += 20;

    doc.setFont('helvetica', 'bold');
    doc.text('Calendar', margin, y);
    y += 20;
    doc.setFont('helvetica', 'normal');

    const lines: string[] = [];
    if (result.method === 'indoor') {
      lines.push(`Start seeds indoors: ${fmtDate(result.indoorStart!)} - ${fmtDate(result.indoorEnd!)}`);
      lines.push(`Transplant outdoors: ${fmtDate(result.transplantStart!)} - ${fmtDate(result.transplantEnd!)}`);
      lines.push('Harden off for about 2 weeks before transplanting.');
    } else {
      lines.push(`Direct sow outdoors: ${fmtDate(result.directSowStart!)} - ${fmtDate(result.directSowEnd!)}`);
    }
    lines.push('', crop.note);
    lines.forEach((line) => { doc.text(line, margin, y, { maxWidth: 500 }); y += 16; });

    y += 20;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Zone-based estimate, built on the same frost date logic as the Frost Date', margin, y); y += 12;
    doc.text('Calculator. Verify with your local extension office near a planting deadline.', margin, y);

    doc.save('seed-starting-calendar.pdf');
  };

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setInputMode('zip');
    setZip('60601');
    setZone('6b');
    setCropId('tomato');
  };

  return {
    inputMode,
    setInputMode,
    zip,
    zone,
    setZone,
    cropId,
    setCropId,
    handleZipChange,
    zipLookup,
    activeZone,
    crop,
    result,
    zoneIsFrostFree,
    exportPdf,
    reset,
  };
}

export type SeedStartingCalculatorState = ReturnType<typeof useSeedStartingCalculatorState>;
