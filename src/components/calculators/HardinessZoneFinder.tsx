import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { findZoneForZip, sanitizeZip as sharedSanitizeZip } from '../../lib/frostZones';
import { ZONE_TEMP_BANDS, formatTempRangeF, formatTempRangeC } from '../../lib/hardinessZoneTemps';

const STORAGE_KEY = 'hardiness-zone-finder-state-v1';

interface SavedState {
  zip: string;
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

export default function HardinessZoneFinder() {
  const hasLoaded = useRef(false);
  const [zip, setZip] = useState('60601');

  useEffect(() => {
    const s = loadSavedState();
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

  const lookup = useMemo(() => {
    if (zip.length !== 5) return null;
    return findZoneForZip(zip);
  }, [zip]);

  const band = useMemo(() => {
    if (!lookup) return null;
    return ZONE_TEMP_BANDS[lookup.zone] ?? null;
  }, [lookup]);

  const exportPdf = () => {
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

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">Hardiness Zone Finder</h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div>
            <label htmlFor="hzf-zip" className="label-field">US ZIP code</label>
            <input
              id="hzf-zip"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              value={zip}
              onChange={handleZipChange}
              placeholder="e.g. 60601"
              className="input-field mt-1.5 max-w-[10rem]"
            />
            {zip.length === 5 && !lookup && (
              <p className="mt-2 text-sm text-amber-700">
                We couldn&rsquo;t match that ZIP to a zone. Check your zone directly at{' '}
                <a href="https://planthardiness.ars.usda.gov/" rel="noopener" className="underline">planthardiness.ars.usda.gov</a>.
              </p>
            )}
          </div>

          <div className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-200">
            This is a ZIP-based regional estimate, matched to the nearest of a set of real reference cities within your state &mdash; not a precise address-level lookup. For an exact zone at your specific address, check the official{' '}
            <a href="https://planthardiness.ars.usda.gov/" rel="noopener" className="underline">USDA Plant Hardiness Zone Map</a>.
          </div>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!lookup || !band ? (
              <p className="p-5 text-sm text-bark-500">Enter a 5-digit ZIP code to find your USDA hardiness zone.</p>
            ) : (
              <>
                <div className="bg-moss-700 p-5 text-center sm:p-6">
                  <p className="text-xs uppercase tracking-wider text-moss-200">Your USDA hardiness zone</p>
                  <p className="mt-1 font-display text-4xl font-bold text-white sm:text-5xl">Zone {lookup.zone}</p>
                </div>
                <div className="grid grid-cols-1 divide-y divide-moss-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  <div className="p-4 sm:p-5">
                    <p className="text-xs text-bark-500">Avg. annual minimum (&deg;F)</p>
                    <p className="font-display text-lg font-bold text-moss-700 sm:text-xl">{formatTempRangeF(band)}</p>
                  </div>
                  <div className="p-4 sm:p-5">
                    <p className="text-xs text-bark-500">Avg. annual minimum (&deg;C)</p>
                    <p className="font-display text-lg font-bold text-moss-700 sm:text-xl">{formatTempRangeC(band)}</p>
                  </div>
                </div>
                <div className="border-t border-moss-200 bg-white px-4 py-3 sm:px-5">
                  <p className="text-xs text-bark-500">
                    Estimated from nearest reference point: <strong className="text-bark-700">{lookup.refCity}</strong>. This is a rough regional match, not a precise lookup for your exact ZIP.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={exportPdf}
              disabled={!lookup || !band}
              className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export Zone Result (PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
