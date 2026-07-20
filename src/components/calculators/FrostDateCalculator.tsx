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
import { saveGardenProject } from '../../lib/gardenProject';
import type { FrostDateResultsSnapshot } from '../../lib/gardenProject';


type InputMode = 'zip' | 'zone';

const STORAGE_KEY = 'frost-date-calculator-state-v1';

interface SavedState {
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

export default function FrostDateCalculator() {
  const hasLoaded = useRef(false);

  const [inputMode, setInputMode] = useState<InputMode>('zip');
  const [zip, setZip] = useState('60601');
  const [zone, setZone] = useState('6b');
  const [projectSaved, setProjectSaved] = useState(false);

  useEffect(() => {
    const s = loadSavedState();
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

  const addToGardenProject = () => {
    if (!result || !activeZone) return;
    const snapshot: FrostDateResultsSnapshot = result.data.frostFree
      ? { zone: activeZone, zip: inputMode === 'zip' ? zip : undefined, refCity: zipLookup?.refCity, frostFree: true }
      : {
          zone: activeZone,
          zip: inputMode === 'zip' ? zip : undefined,
          refCity: zipLookup?.refCity,
          frostFree: false,
          lastFrostStart: fmtDate(result.lastStart),
          lastFrostEnd: fmtDate(result.lastEnd),
          firstFrostStart: fmtDate(result.firstStart),
          firstFrostEnd: fmtDate(result.firstEnd),
          seasonLengthDays: result.seasonLength,
        };
    saveGardenProject({
      zipCode: inputMode === 'zip' ? zip : '',
      hardinessZone: activeZone,
      frostDateResults: snapshot,
    });
    setProjectSaved(true);
    window.setTimeout(() => setProjectSaved(false), 2600);
  };

  const exportPdf = () => {
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

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">Frost Date Calculator</h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div>
            <span className="label-field">Find your zone by</span>
            <div className="mt-2 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist">
              {([
                { id: 'zip', label: 'ZIP Code' },
                { id: 'zone', label: 'Hardiness Zone' },
              ] as { id: InputMode; label: string }[]).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={inputMode === m.id}
                  onClick={() => setInputMode(m.id)}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    inputMode === m.id ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {inputMode === 'zip' ? (
            <div>
              <label htmlFor="frost-zip" className="label-field">US ZIP code</label>
              <input
                id="frost-zip"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                value={zip}
                onChange={handleZipChange}
                placeholder="e.g. 60601"
                className="input-field mt-1.5 max-w-[10rem]"
              />
              {zip.length === 5 && !zipLookup && (
                <p className="mt-2 text-sm text-amber-700">
                  We couldn&rsquo;t match that ZIP to a zone. Try the Hardiness Zone tab instead, or check your zone at{' '}
                  <a href="https://planthardiness.ars.usda.gov/" rel="noopener" className="underline">planthardiness.ars.usda.gov</a>.
                </p>
              )}
              {zipLookup && (
                <p className="mt-2 text-xs text-bark-500">
                  Estimated from nearest reference point: <strong className="text-bark-700">{zipLookup.refCity}</strong> (Zone {zipLookup.zone}). This is a rough regional match, not a precise lookup for your exact ZIP.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="frost-zone" className="label-field">USDA Plant Hardiness Zone</label>
              <select id="frost-zone" value={zone} onChange={(e) => setZone(e.target.value)} className="input-field mt-1.5 max-w-[10rem]">
                {ALL_ZONES.map((z) => (
                  <option key={z} value={z}>Zone {z}</option>
                ))}
              </select>
              <p className="mt-2 text-xs text-bark-500">
                Don&rsquo;t know your zone? Look it up at{' '}
                <a href="https://planthardiness.ars.usda.gov/" rel="noopener" className="underline">planthardiness.ars.usda.gov</a>.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-200">
            These are zone-based estimates, not exact station data for your address. Actual frost timing can vary by 1&ndash;3 weeks depending on elevation, nearby water, and urban vs. open ground. Verify with your local extension office before a planting deadline that matters.
          </div>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!result ? (
              <p className="p-5 text-sm text-bark-500">Enter a ZIP code or pick your hardiness zone to see estimated frost dates.</p>
            ) : result.data.frostFree ? (
              <div className="p-5">
                <p className="text-sm font-semibold text-moss-800">Zone {activeZone} rarely sees frost.</p>
                <p className="mt-1 text-sm text-bark-600">
                  Plant on a temperature and rainfall-based calendar rather than a frost-based one — check regional planting guides for your area&rsquo;s wet/dry or hot/cool seasons instead.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 divide-x divide-moss-200">
                  <div className="p-4 sm:p-5">
                    <p className="text-xs text-bark-500">Last spring frost</p>
                    <p className="font-display text-lg font-bold text-moss-700 sm:text-xl">{fmtDate(result.lastStart)}&ndash;{fmtDate(result.lastEnd)}</p>
                  </div>
                  <div className="p-4 sm:p-5">
                    <p className="text-xs text-bark-500">First fall frost</p>
                    <p className="font-display text-lg font-bold text-moss-700 sm:text-xl">{fmtDate(result.firstStart)}&ndash;{fmtDate(result.firstEnd)}</p>
                  </div>
                  <div className="bg-moss-700 p-4 sm:p-5">
                    <p className="text-xs text-moss-200">Growing season</p>
                    <p className="font-display text-lg font-bold text-white sm:text-xl">~{result.seasonLength} days</p>
                  </div>
                </div>
                <div className="border-t border-moss-200 bg-white px-4 py-3 sm:px-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-bark-500">Planting timeline</p>
                  <ul className="mt-2 space-y-1.5 text-sm text-bark-700">
                    <li><strong className="text-bark-900">{fmtDate(result.timeline!.coldHardySeedsStart)}&ndash;{fmtDate(result.timeline!.coldHardySeedsEnd)}:</strong> start cold-hardy seeds indoors</li>
                    <li><strong className="text-bark-900">{fmtDate(result.timeline!.warmSeedsStart)}&ndash;{fmtDate(result.timeline!.warmSeedsEnd)}:</strong> start warm-season seeds indoors (tomatoes, peppers)</li>
                    <li><strong className="text-bark-900">{fmtDate(result.timeline!.coldHardyTransplantStart)}&ndash;{fmtDate(result.timeline!.coldHardyTransplantEnd)}:</strong> transplant cold-hardy seedlings outdoors</li>
                    <li><strong className="text-bark-900">After {fmtDate(result.timeline!.tenderSafeDate)}:</strong> safe to transplant tender crops outdoors</li>
                    <li><strong className="text-bark-900">{fmtDate(result.timeline!.fallSeedsStart)}&ndash;{fmtDate(result.timeline!.fallSeedsEnd)}:</strong> start fall crop seeds</li>
                    <li><strong className="text-bark-900">By {fmtDate(result.timeline!.lastTenderDate)}:</strong> protect or harvest tender crops</li>
                  </ul>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <p className="max-w-xs text-right text-xs text-bark-500">
              Save these results and we&rsquo;ll carry your ZIP code and dates into the next 3 calculators automatically &mdash; no re-entering info, and you can export everything as one PDF at the end.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={addToGardenProject}
              disabled={!result}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#E8A94A]/20 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-[#E8A94A]/50 transition hover:bg-[#E8A94A]/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2c3 4 6 8 6 12a6 6 0 0 1-12 0c0-4 3-8 6-12Z" fill="currentColor" />
              </svg>
              {projectSaved ? 'Added to Garden Project ✓' : 'Start a Garden Project'}
            </button>
            <button
              type="button"
              onClick={exportPdf}
              disabled={!result}
              className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Export Planting Calendar (PDF)
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
