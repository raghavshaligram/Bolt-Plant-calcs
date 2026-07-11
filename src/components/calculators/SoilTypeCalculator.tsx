import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type InputMode = 'percent' | 'jar-test';

const STORAGE_KEY = 'soil-type-calculator-state-v1';

// Plain-language gardening context per USDA texture class. Not a source of
// classification logic (that lives entirely in classifyTexture below) --
// just descriptive copy about drainage, retention, and workability.
const TEXTURE_INFO: Record<string, string> = {
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

interface SavedState {
  mode: InputMode;
  sand: string;
  silt: string;
  clay: string;
  jarSand: string;
  jarSilt: string;
  jarClay: string;
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

export default function SoilTypeCalculator() {
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<InputMode>('percent');
  const [sand, setSand] = useState<string>('40');
  const [silt, setSilt] = useState<string>('40');
  const [clay, setClay] = useState<string>('20');
  const [jarSand, setJarSand] = useState<string>('2.5');
  const [jarSilt, setJarSilt] = useState<string>('1.5');
  const [jarClay, setJarClay] = useState<string>('1');

  useEffect(() => {
    const s = loadSavedState();
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

  const result = useMemo(() => {
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

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">Classify Your Soil Texture</h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div>
            <span className="label-field">Input method</span>
            <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'percent'}
                onClick={() => setMode('percent')}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                  mode === 'percent' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                Enter percentages
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'jar-test'}
                onClick={() => setMode('jar-test')}
                className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                  mode === 'jar-test' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                }`}
              >
                Jar test measurements
              </button>
            </div>
          </div>

          {mode === 'percent' ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="st-sand" className="label-field">
                  Sand <span className="text-bark-500">(%)</span>
                </label>
                <input
                  id="st-sand"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={sand}
                  onChange={handleNumericChange(setSand)}
                  className="input-field mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="st-silt" className="label-field">
                  Silt <span className="text-bark-500">(%)</span>
                </label>
                <input
                  id="st-silt"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={silt}
                  onChange={handleNumericChange(setSilt)}
                  className="input-field mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="st-clay" className="label-field">
                  Clay <span className="text-bark-500">(%)</span>
                </label>
                <input
                  id="st-clay"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={clay}
                  onChange={handleNumericChange(setClay)}
                  className="input-field mt-1.5"
                />
              </div>
              {result.normalized && (
                <p className="sm:col-span-3 text-xs text-sand-700">
                  Your percentages summed to {round(parseFloat(sand) + parseFloat(silt) + parseFloat(clay))}%, not
                  100% — normalized proportionally before classifying.
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="st-jar-sand" className="label-field">
                  Sand layer height
                </label>
                <input
                  id="st-jar-sand"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={jarSand}
                  onChange={handleNumericChange(setJarSand)}
                  className="input-field mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="st-jar-silt" className="label-field">
                  Silt layer height
                </label>
                <input
                  id="st-jar-silt"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={jarSilt}
                  onChange={handleNumericChange(setJarSilt)}
                  className="input-field mt-1.5"
                />
              </div>
              <div>
                <label htmlFor="st-jar-clay" className="label-field">
                  Clay layer height
                </label>
                <input
                  id="st-jar-clay"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.1"
                  value={jarClay}
                  onChange={handleNumericChange(setJarClay)}
                  className="input-field mt-1.5"
                />
              </div>
              <p className="sm:col-span-3 text-xs text-bark-500">
                Use any consistent unit (inches, cm, mm) — only the ratio between layers matters.
              </p>
            </div>
          )}

          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
              % of each = layer (or amount) &divide; total &times; 100, then classified against the USDA soil
              texture triangle boundaries
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!result.hasInput ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your sand, silt, and clay values above to classify your soil texture.
              </p>
            ) : (
              <>
                <div className="p-5">
                  <p className="text-xs text-bark-500">Your soil texture class is</p>
                  <p className="font-display text-3xl font-bold capitalize text-moss-700">{result.textureClass}</p>
                  <p className="mt-1 text-xs text-bark-500">
                    Sand {round(result.sandPct)}% &middot; Silt {round(result.siltPct)}% &middot; Clay{' '}
                    {round(result.clayPct)}%
                  </p>
                </div>
                <div className="border-t border-moss-200 bg-white px-5 py-4">
                  <p className="text-sm leading-relaxed text-bark-600">{TEXTURE_INFO[result.textureClass]}</p>
                </div>
                <div className="flex justify-end border-t border-moss-200 bg-white px-4 py-2.5">
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path
                        d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M3 16h14"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Export PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
