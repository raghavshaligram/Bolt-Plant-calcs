import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { findZoneForZip, sanitizeZip as sharedSanitizeZip } from '../../lib/frostZones';
import { ZONE_TEMP_BANDS, formatTempRangeF, formatTempRangeC } from '../../lib/hardinessZoneTemps';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from HardinessZoneFinder.tsx (CALC_ROLLOUT_PATTERN.md) -- this
// hook is the single source of truth for the zip input/lookup/reset, so the
// card, the action panel, and the Share/Embed/Cite modal can all read/write
// the same state even though they render in different parts of the DOM.

const STORAGE_KEY = 'hardiness-zone-finder-state-v1';

const DEFAULT_ZIP = '60601';

export interface SavedState {
  zip: string;
}

export interface ZoneLookup {
  zone: string;
  refCity: string;
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
 * Reads zip from the page's URL query string -- the foundation of the
 * "share with results" feature. zip is this calculator's only field, so it
 * doubles as the "core" param: only returns non-null when it's present and
 * looks like a real 5-digit ZIP, so a plain bookmarked/shared-without-results
 * URL never accidentally overrides a returning visitor's saved state.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('zip')) return null;

  const zip = params.get('zip');
  if (!zip || !/^\d{5}$/.test(zip)) return null;

  return { zip };
}

export function useHardinessZoneCalculatorState() {
  const hasLoaded = useRef(false);
  const [zip, setZip] = useState(DEFAULT_ZIP);

  useEffect(() => {
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the calculator
    // here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

    if (s.zip !== undefined) setZip(s.zip);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ zip });
  }, [zip]);

  const handleZipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZip(sharedSanitizeZip(e.target.value));
  };

  const lookup: ZoneLookup | null = useMemo(() => {
    if (zip.length !== 5) return null;
    return findZoneForZip(zip);
  }, [zip]);

  const band = useMemo(() => {
    if (!lookup) return null;
    return ZONE_TEMP_BANDS[lookup.zone] ?? null;
  }, [lookup]);

  const hasResult = Boolean(lookup && band);

  const exportPdf = () => {
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
    if (!lookup || !band) return;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('USDA Hardiness Zone Result', margin, y);
    y += 28;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated ${dateStr} — HarvestMath.com`, margin, y);
    y += 28;

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`ZIP ${zip}: Zone ${lookup.zone}`, margin, y);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Average annual minimum winter temperature: ${formatTempRangeF(band)} (${formatTempRangeC(band)})`, margin, y, { maxWidth: 500 });
    y += 24;

    doc.setFontSize(11);
    doc.text(`Estimated from nearest reference point: ${lookup.refCity}.`, margin, y, { maxWidth: 500 });
    y += 28;

    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('ZIP-based regional estimate, not an exact address-level lookup. For an exact,', margin, y); y += 12;
    doc.text('address-level zone, check planthardiness.ars.usda.gov directly.', margin, y);

    doc.save('hardiness-zone-finder-results.pdf');
  };

  /** Restores the original default ZIP -- the action panel's Reset button. */
  const reset = () => {
    setZip(DEFAULT_ZIP);
  };

  return {
    zip,
    handleZipChange,
    lookup,
    band,
    hasResult,
    exportPdf,
    reset,
  };
}

export type HardinessZoneCalculatorState = ReturnType<typeof useHardinessZoneCalculatorState>;
