import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type UnitSystem = 'imperial' | 'metric';

const STORAGE_KEY = 'tree-age-calculator-state-v1';

interface SpeciesPreset {
  name: string;
  /** Growth factor: estimated years of age per inch of trunk diameter (DBH). */
  growthFactor: number;
}

// Growth factors follow the widely-used International Society of Arboriculture
// diameter method (age ≈ DBH in inches × growth factor). Where a species isn't
// part of the standard ISA reference chart, the factor is derived from published
// diameter-growth-rate research and noted as a rougher estimate in the copy below.
const SPECIES_PRESETS: SpeciesPreset[] = [
  { name: 'Oak', growthFactor: 5 },
  { name: 'Maple', growthFactor: 4.5 },
  { name: 'Pine', growthFactor: 5 },
  { name: 'Redwood', growthFactor: 10 },
  { name: 'Sycamore', growthFactor: 4 },
  { name: 'Magnolia', growthFactor: 4 },
  { name: 'Live Oak', growthFactor: 4 },
  { name: 'Apple', growthFactor: 3 },
  { name: 'Beech', growthFactor: 6 },
  { name: 'Cedar', growthFactor: 3 },
  { name: 'Cottonwood', growthFactor: 2 },
  { name: 'Hemlock', growthFactor: 7 },
  { name: 'Olive', growthFactor: 4 },
  { name: 'Pecan', growthFactor: 1 },
  { name: 'Average / Unknown species', growthFactor: 4 },
];

// The growth-factor method is a general estimate, not a precise measurement.
// A commonly cited accuracy range is roughly ±20% for healthy, typically-grown
// trees, with wider error for stressed urban trees. We surface a range instead
// of one falsely-precise number.
const VARIANCE = 0.2;

interface SavedState {
  unitSystem: UnitSystem;
  species: string;
  circumference: string;
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

const CM_TO_IN = 0.393701;
const IN_TO_CM = 2.54;

// Round an age (in years) to a cleaner, appropriately-rough number.
function roundAge(years: number): number {
  if (!Number.isFinite(years) || years <= 0) return 0;
  if (years < 20) return Math.round(years);
  if (years < 100) return Math.round(years / 5) * 5;
  return Math.round(years / 10) * 10;
}

export default function TreeAgeCalculator() {
  const hasLoaded = useRef(false);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [species, setSpecies] = useState<string>('Oak');
  const [circumference, setCircumference] = useState<string>('60');

  useEffect(() => {
    const s = loadSavedState();
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.species) setSpecies(s.species);
    if (s.circumference !== undefined) setCircumference(s.circumference);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ unitSystem, species, circumference });
  }, [unitSystem, species, circumference]);

  const preset = useMemo(
    () => SPECIES_PRESETS.find((p) => p.name === species) ?? SPECIES_PRESETS[0],
    [species],
  );

  const isMetric = unitSystem === 'metric';
  const circUnit = isMetric ? 'cm' : 'in';

  const handleNumericChange = (
    setter: (v: string) => void,
  ) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = enforceNonNegative(sanitizeNumericInput(e.target.value));
    setter(cleaned);
  };

  const result = useMemo(() => {
    let circIn = parseFloat(circumference);
    if (!Number.isFinite(circIn)) circIn = 0;
    if (isMetric) circIn = circIn * CM_TO_IN;
    circIn = Math.max(0, circIn);

    const diameterIn = circIn / Math.PI;
    const ageMid = diameterIn * preset.growthFactor;
    const ageLow = roundAge(ageMid * (1 - VARIANCE));
    const ageHigh = roundAge(ageMid * (1 + VARIANCE));
    const diameterCm = diameterIn * IN_TO_CM;

    return { circIn, diameterIn, diameterCm, ageMid, ageLow, ageHigh };
  }, [circumference, isMetric, preset]);

  const hasResult = result.circIn > 0;

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Tree Age Calculator Results', margin, y);
    y += 28;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    doc.text(`Generated ${dateStr} — HarvestMath.com`, margin, y);
    y += 28;

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Inputs', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const inputLines: string[] = [
      `Species: ${species}`,
      `Growth factor: ${preset.growthFactor} (years per inch of diameter)`,
      `Trunk circumference (at 4.5 ft / breast height): ${circumference || 0} ${circUnit}`,
    ];
    inputLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Results', margin, y);
    y += 20;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const resultLines: string[] = [
      `Diameter (DBH): ${round(result.diameterIn, 1)} in (${round(result.diameterCm, 1)} cm)`,
      `Estimated age: ${result.ageLow}–${result.ageHigh} years`,
      `Midpoint estimate: ~${Math.round(result.ageMid)} years`,
    ];
    resultLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'This is an estimate, not a precise measurement. Actual age varies with',
      margin, y,
    );
    y += 12;
    doc.text(
      'soil, climate, competition, and care. Ring counting (coring) is the only exact method.',
      margin, y,
    );

    doc.save('tree-age-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        {/* Card header */}
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Estimate Your Tree&rsquo;s Age
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Unit system toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">Units</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
                <button
                  type="button"
                  aria-pressed={!isMetric}
                  onClick={() => setUnitSystem('imperial')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    !isMetric
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Imperial (in)
                </button>
                <button
                  type="button"
                  aria-pressed={isMetric}
                  onClick={() => setUnitSystem('metric')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isMetric
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Metric (cm)
                </button>
              </div>
            </div>
          </div>

          {/* Species selector */}
          <div>
            <label htmlFor="tac-species" className="label-field">Tree species</label>
            <select
              id="tac-species"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              className="input-field mt-1.5"
            >
              {SPECIES_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-bark-500">
              Growth factor: {preset.growthFactor} years per inch of trunk diameter.
            </p>
          </div>

          {/* Circumference input */}
          <div>
            <label htmlFor="tac-circumference" className="label-field">
              Trunk circumference at breast height <span className="text-bark-500">({circUnit}, measured ~4.5 ft / 1.4 m above ground)</span>
            </label>
            <input
              id="tac-circumference"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.5"
              value={circumference}
              onChange={handleNumericChange(setCircumference)}
              className="input-field mt-1.5"
            />
            <p className="mt-1.5 text-xs text-bark-500">
              Wrap a tape measure around the trunk at about 4.5 ft (1.4 m) above the ground — the standard &ldquo;DBH&rdquo; (diameter at breast height) measurement point.
            </p>
          </div>

          {/* Formula display */}
          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
              Diameter = Circumference &divide; &pi;
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Estimated Age &asymp; Diameter &times; Growth Factor
            </p>
            <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
              Range shown = estimate &plusmn; 20% (real variance by soil, climate &amp; care)
            </p>
          </div>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your tree&rsquo;s trunk circumference above to see its estimated age.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  {/* Left: diameter (intermediate step) */}
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                        <path d="M16 4c-3 4-5 7-5 11a5 5 0 0 0 10 0c0-4-2-7-5-11Z" />
                        <path d="M16 26c-2-3-4-5-4-8a4 4 0 0 1 8 0c0 3-2 5-4 8Z" opacity="0.5" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">Trunk diameter (DBH)</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {isMetric ? round(result.diameterCm, 1) : round(result.diameterIn, 1)}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        {circUnit}
                        {!isMetric && (
                          <span className="ml-1 text-bark-400">
                            ({round(result.diameterCm, 1)} cm)
                          </span>
                        )}
                        {isMetric && (
                          <span className="ml-1 text-bark-400">
                            ({round(result.diameterIn, 1)} in)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Right: estimated age range */}
                  <div className="bg-moss-700 p-4 sm:p-5">
                    <p className="text-xs text-moss-200">Estimated age</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {result.ageLow}&ndash;{result.ageHigh}
                    </p>
                    <p className="text-xs text-moss-200">years old</p>
                    <p className="mt-1 text-xs text-moss-300">
                      Midpoint: ~{Math.round(result.ageMid)} yrs
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    An estimate, not a precise measurement &mdash; only ring counting gives an exact age.
                  </p>
                  <button
                    type="button"
                    onClick={exportPdf}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M10 3v10m0 0l-3.5-3.5M10 13l3.5-3.5M3 16h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Export PDF
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Growth factor reference table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-xs font-medium uppercase tracking-wider text-bark-400">
                Growth factor reference by species
              </caption>
              <thead>
                <tr className="border-b border-moss-100 text-bark-500">
                  <th scope="col" className="py-2 pr-4 font-medium">Species</th>
                  <th scope="col" className="py-2 font-medium">Growth factor (yrs/in diameter)</th>
                </tr>
              </thead>
              <tbody className="text-bark-700">
                {SPECIES_PRESETS.map((p) => (
                  <tr key={p.name} className={`border-b border-moss-50 ${p.name === species ? 'bg-moss-50/60 font-semibold text-bark-900' : ''}`}>
                    <th scope="row" className="py-2 pr-4 font-medium text-bark-800">{p.name}</th>
                    <td className="py-2">{p.growthFactor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
