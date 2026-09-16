import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  findZoneForZip,
  ZONE_FROST_DATA,
  ALL_ZONES,
  mkDate,
  shiftWeeks,
  fmtDate,
  daysBetween,
  midpoint,
  sanitizeZip as sharedSanitizeZip,
  fullZoneNumberFromZone,
} from '../../lib/frostZones';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from FrostDateCalculator.tsx (Build Prompt: Calculator Page
// Redesign -- Roll Out to All Remaining Calculators) so the same state --
// input mode, ZIP/zone entry, and the derived frost date + planting timeline
// result -- is reachable from the action panel and the Share/Embed/Cite
// modal, which live outside the calculator's own component tree in the
// sticky sidebar. This hook is the single source of truth;
// FrostDateCalculatorCard.tsx is now a pure presentational component driven
// entirely by its return value, and FrostDateCalculatorPanel.tsx is the one
// place that calls it.
//
// All zone/frost-date lookup logic itself lives in src/lib/frostZones.ts
// (shared with the Seed Starting Calculator) and is imported here exactly as
// the original component imported it -- not modified.

export type InputMode = 'zip' | 'zone';

const STORAGE_KEY = 'frost-date-calculator-state-v1';

const DEFAULT_ZIP = '60601';
const DEFAULT_ZONE = '6b';

export interface SavedState {
  inputMode: InputMode;
  zip: string;
  zone: string;
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
 * Reads mode/zip/zone from the page's URL query string -- the "share with
 * results" feature, same as the pilot. Only returns a non-null object when
 * at least one of zip/zone (the two params that actually drive a lookup) is
 * present, so a plain bookmarked/shared-without-results URL never silently
 * overrides a returning visitor's saved state with blanks.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('zip') && !params.has('zone')) return null;

  const out: Partial<SavedState> = {};
  const mode = params.get('mode');
  const zip = params.get('zip');
  const zone = params.get('zone');

  if (mode === 'zip' || mode === 'zone') out.inputMode = mode;
  if (zip && /^\d{1,5}$/.test(zip)) out.zip = sharedSanitizeZip(zip);
  if (zone && (ALL_ZONES as readonly string[]).includes(zone)) out.zone = zone;

  return out;
}

export function useFrostDateCalculatorState() {
  const hasLoaded = useRef(false);

  const [inputMode, setInputMode] = useState<InputMode>('zip');
  const [zip, setZip] = useState(DEFAULT_ZIP);
  const [zone, setZone] = useState(DEFAULT_ZONE);

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
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ inputMode, zip, zone });
  }, [inputMode, zip, zone]);

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZip(sharedSanitizeZip(e.target.value));
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

  const result = useMemo(() => {
    if (!fullZoneNumber) return null;
    const data = ZONE_FROST_DATA[fullZoneNumber];
    if (!data) return null;

    const lastStart = mkDate(data.lastFrostStart);
    const lastEnd = mkDate(data.lastFrostEnd);
    const firstStart = mkDate(data.firstFrostStart);
    const firstEnd = mkDate(data.firstFrostEnd);

    const seasonLength = daysBetween(midpoint(lastStart, lastEnd), midpoint(firstStart, firstEnd));

    const timeline = data.frostFree
      ? null
      : {
          coldHardySeedsStart: shiftWeeks(lastStart, -8),
          coldHardySeedsEnd: shiftWeeks(lastStart, -6),
          coldHardyTransplantStart: shiftWeeks(lastEnd, -4),
          coldHardyTransplantEnd: shiftWeeks(lastEnd, -2),
          warmSeedsStart: shiftWeeks(lastStart, -8),
          warmSeedsEnd: shiftWeeks(lastStart, -6),
          tenderSafeDate: lastEnd,
          fallSeedsStart: shiftWeeks(firstStart, -12),
          fallSeedsEnd: shiftWeeks(firstStart, -10),
          lastTenderDate: firstStart,
        };

    return { data, lastStart, lastEnd, firstStart, firstEnd, seasonLength, timeline };
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
    doc.text('Frost Date & Planting Timeline', margin, y);
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
    doc.text(`Hardiness zone: ${activeZone}${inputMode === 'zip' && zipLookup ? ` (estimated from ZIP ${zip}, nearest reference: ${zipLookup.refCity})` : ''}`, margin, y, { maxWidth: 500 });
    y += 32;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    if (result.data.frostFree) {
      doc.text('This zone rarely sees frost. Plant on a temperature/rainfall-based calendar', margin, y); y += 16;
      doc.text('rather than a frost-based one.', margin, y); y += 24;
    } else {
      const lines = [
        `Estimated last spring frost: ${fmtDate(result.lastStart)} - ${fmtDate(result.lastEnd)}`,
        `Estimated first fall frost: ${fmtDate(result.firstStart)} - ${fmtDate(result.firstEnd)}`,
        `Approx. growing season length: ${result.seasonLength} days`,
        '',
        'Planting timeline:',
        `- Start cold-hardy seeds indoors: ${fmtDate(result.timeline!.coldHardySeedsStart)} - ${fmtDate(result.timeline!.coldHardySeedsEnd)}`,
        `- Start warm-season seeds indoors (tomatoes, peppers): ${fmtDate(result.timeline!.warmSeedsStart)} - ${fmtDate(result.timeline!.warmSeedsEnd)}`,
        `- Transplant cold-hardy seedlings outdoors: ${fmtDate(result.timeline!.coldHardyTransplantStart)} - ${fmtDate(result.timeline!.coldHardyTransplantEnd)}`,
        `- Safe to transplant tender crops outdoors: after ${fmtDate(result.timeline!.tenderSafeDate)}`,
        `- Start fall crop seeds: ${fmtDate(result.timeline!.fallSeedsStart)} - ${fmtDate(result.timeline!.fallSeedsEnd)}`,
        `- Protect or harvest tender crops by: ${fmtDate(result.timeline!.lastTenderDate)}`,
      ];
      lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    }

    y += 12;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Zone-based estimate, not exact station data. Verify with your local extension office,', margin, y); y += 12;
    doc.text('especially near a planting deadline.', margin, y);

    doc.save('frost-date-calculator-results.pdf');
  };

  /** Restores the original defaults -- the action panel's Reset button. */
  const reset = () => {
    setInputMode('zip');
    setZip(DEFAULT_ZIP);
    setZone(DEFAULT_ZONE);
  };

  return {
    inputMode,
    setInputMode,
    zip,
    zone,
    setZone,
    handleZipChange,
    zipLookup,
    activeZone,
    result,
    exportPdf,
    reset,
  };
}

export type FrostDateCalculatorState = ReturnType<typeof useFrostDateCalculatorState>;
