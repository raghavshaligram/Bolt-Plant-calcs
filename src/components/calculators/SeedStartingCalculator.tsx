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
import { loadGardenProject, saveGardenProject, upsertSelectedCrop, emptyGardenProject, fuzzyMatchCropName } from '../../lib/gardenProject';
import type { SeedStartingResultsSnapshot } from '../../lib/gardenProject';

type InputMode = 'zip' | 'zone';
type SowMethod = 'indoor' | 'direct';

const STORAGE_KEY = 'seed-starting-calculator-state-v1';

interface SavedState {
  inputMode: InputMode;
  zip: string;
  zone: string;
  cropId: string;
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

// ---------------------------------------------------------------------------
// Crop data: weeks-before/after-last-frost figures reflect commonly cited
// extension guidance (University of Missouri Extension's "Starting Plants
// Indoors From Seeds" and University of Maryland Extension's "Vegetable
// Planting Calendar" — see Sources below). Cold-hardy crops transplant BEFORE
// the last frost since they tolerate light frost once hardened off; tender
// crops transplant AFTER last frost with a 1-2 week safety buffer; crops that
// don't transplant well are sown directly in the ground.
// ---------------------------------------------------------------------------
interface CropData {
  id: string;
  name: string;
  method: SowMethod;
  indoorWeeksBeforeFrost?: [number, number];
  transplantWeeksOffset?: [number, number]; // negative = before last frost, positive = after
  directSowWeeksOffset?: [number, number]; // negative = before last frost, positive = after
  note: string;
}

const CROPS: CropData[] = [
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

export default function SeedStartingCalculator() {
  const hasLoaded = useRef(false);

  const [inputMode, setInputMode] = useState<InputMode>('zip');
  const [zip, setZip] = useState('60601');
  const [zone, setZone] = useState('6b');
  const [cropId, setCropId] = useState('tomato');
  const [projectSaved, setProjectSaved] = useState(false);

  useEffect(() => {
    const s = loadSavedState();
    const hadOwnSavedState = Object.keys(s).length > 0;
    if (s.inputMode) setInputMode(s.inputMode);
    if (s.zip !== undefined) setZip(s.zip);
    if (s.zone) setZone(s.zone);
    if (s.cropId) setCropId(s.cropId);

    // No saved state of its own yet -- pull the ZIP/zone from an active
    // Garden Project instead, so Stage 1 (Frost Date) flows straight into
    // Stage 2 without re-entry. A returning visitor's own saved inputs
    // always win over the project, so this never clobbers a real choice.
    if (!hadOwnSavedState) {
      const project = loadGardenProject();
      if (project?.zipCode) {
        setInputMode('zip');
        setZip(project.zipCode);
      } else if (project?.hardinessZone) {
        setInputMode('zone');
        setZone(project.hardinessZone);
      }
      const lastCrop = project?.selectedCrops?.[project.selectedCrops.length - 1];
      if (lastCrop) {
        const matchName = fuzzyMatchCropName(lastCrop.name, CROPS.map((c) => c.name));
        const matched = CROPS.find((c) => c.name === matchName);
        if (matched) setCropId(matched.id);
      }
    }
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

  const result = useMemo(() => {
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

  const addToGardenProject = () => {
    if (!result || !activeZone) return;
    const snapshot: SeedStartingResultsSnapshot =
      result.method === 'indoor'
        ? {
            cropName: crop.name,
            method: 'indoor',
            indoorStart: fmtDate(result.indoorStart!),
            indoorEnd: fmtDate(result.indoorEnd!),
            transplantStart: fmtDate(result.transplantStart!),
            transplantEnd: fmtDate(result.transplantEnd!),
            note: crop.note,
          }
        : {
            cropName: crop.name,
            method: 'direct',
            directSowStart: fmtDate(result.directSowStart!),
            directSowEnd: fmtDate(result.directSowEnd!),
            note: crop.note,
          };
    const project = loadGardenProject() ?? emptyGardenProject();
    const selectedCrops = upsertSelectedCrop(project, { name: crop.name, plantingMethod: crop.method });
    saveGardenProject({
      zipCode: inputMode === 'zip' ? zip : project.zipCode,
      hardinessZone: activeZone,
      selectedCrops,
      seedStartingResults: snapshot,
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

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">Seed Starting Calendar</h2>
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
              <label htmlFor="seed-zip" className="label-field">US ZIP code</label>
              <input
                id="seed-zip"
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
                  We couldn&rsquo;t match that ZIP to a zone. Try the Hardiness Zone tab instead, or check{' '}
                  <a href="https://planthardiness.ars.usda.gov/" rel="noopener" className="underline">planthardiness.ars.usda.gov</a>.
                </p>
              )}
              {zipLookup && (
                <p className="mt-2 text-xs text-bark-500">
                  Estimated from nearest reference point: <strong className="text-bark-700">{zipLookup.refCity}</strong> (Zone {zipLookup.zone}) — same estimate method as our <a href="/calculators/frost-date-calculator/" className="underline">Frost Date Calculator</a>.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label htmlFor="seed-zone" className="label-field">USDA Plant Hardiness Zone</label>
              <select id="seed-zone" value={zone} onChange={(e) => setZone(e.target.value)} className="input-field mt-1.5 max-w-[10rem]">
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

          <div>
            <label htmlFor="seed-crop" className="label-field">Crop</label>
            <select id="seed-crop" value={cropId} onChange={(e) => setCropId(e.target.value)} className="input-field mt-1.5">
              {CROPS.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-800 ring-1 ring-amber-200">
            This calendar is a zone-based estimate, not exact station data — it&rsquo;s built directly on the same frost date logic as our Frost Date Calculator. Actual timing can vary by 1&ndash;3 weeks depending on your microclimate. Verify with your local extension office near a real planting deadline.
          </div>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {zoneIsFrostFree ? (
              <div className="p-5">
                <p className="text-sm font-semibold text-moss-800">Zone {activeZone} rarely sees frost.</p>
                <p className="mt-1 text-sm text-bark-600">
                  Frost-based seed starting math doesn&rsquo;t apply here — plant on a temperature and rainfall-based calendar instead.
                </p>
              </div>
            ) : !result ? (
              <p className="p-5 text-sm text-bark-500">Enter a ZIP code or pick your hardiness zone to see your seed starting calendar.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 divide-y divide-moss-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                  {result.method === 'indoor' ? (
                    <>
                      <div className="p-4 sm:p-5">
                        <p className="text-xs text-bark-500">Start seeds indoors</p>
                        <p className="font-display text-xl font-bold text-moss-700 sm:text-2xl">{fmtDate(result.indoorStart!)}&ndash;{fmtDate(result.indoorEnd!)}</p>
                      </div>
                      <div className="bg-moss-700 p-4 sm:p-5">
                        <p className="text-xs text-moss-200">Transplant outdoors</p>
                        <p className="font-display text-xl font-bold text-white sm:text-2xl">{fmtDate(result.transplantStart!)}&ndash;{fmtDate(result.transplantEnd!)}</p>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 sm:p-5 sm:col-span-2">
                      <p className="text-xs text-bark-500">Direct sow outdoors</p>
                      <p className="font-display text-xl font-bold text-moss-700 sm:text-2xl">{fmtDate(result.directSowStart!)}&ndash;{fmtDate(result.directSowEnd!)}</p>
                      <p className="mt-1 text-xs text-bark-500">{crop.name} doesn&rsquo;t transplant well — sow it directly in the ground.</p>
                    </div>
                  )}
                </div>
                <div className="border-t border-moss-200 bg-white px-4 py-2.5 text-xs text-bark-600 sm:px-5">
                  <strong className="text-bark-700">Estimated last spring frost:</strong> {fmtDate(result.lastStart)}&ndash;{fmtDate(result.lastEnd)}. {crop.note}
                </div>
              </>
            )}
          </div>

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
              {projectSaved ? 'Added to Garden Project ✓' : 'Add to my Garden Project'}
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
              Export Seed Starting Calendar (PDF)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
