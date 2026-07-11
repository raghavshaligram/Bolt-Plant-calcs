import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type GrassKey = 'kentucky-bluegrass' | 'tall-fescue' | 'perennial-ryegrass' | 'bermuda-winter' | 'fine-fescue';
type Condition = 'thin' | 'patchy' | 'very-thin';
type TopdressMaterial = 'topsoil' | 'compost' | 'peat-moss';
type UnitSystem = 'imperial' | 'metric';

const STORAGE_KEY = 'overseeding-calculator-state-v1';

// Overseeding rates (lb per 1,000 sq ft) by grass type and lawn condition.
// Roughly half of new-lawn seeding rates for the same species, since
// existing turf already covers most of the ground -- per Ask Extension's
// published seeding-rate guidance (see Sources on this page).
const GRASS_RATES: Record<GrassKey, { label: string; thin: number; patchy: number; veryThin: number }> = {
  'kentucky-bluegrass': { label: 'Kentucky bluegrass', thin: 1, patchy: 1.5, veryThin: 2 },
  'tall-fescue': { label: 'Tall fescue', thin: 3, patchy: 4, veryThin: 5 },
  'perennial-ryegrass': { label: 'Perennial ryegrass', thin: 4, patchy: 5, veryThin: 6 },
  'bermuda-winter': { label: 'Bermuda (winter overseed)', thin: 5, patchy: 7, veryThin: 10 },
  'fine-fescue': { label: 'Fine fescue', thin: 3, patchy: 3.5, veryThin: 4 },
};

const CONDITION_LABELS: Record<Condition, string> = {
  thin: 'Thin but mostly green',
  patchy: 'Patchy',
  'very-thin': 'Very thin with bare spots',
};

const TOPDRESS_OPTIONS: Record<TopdressMaterial, string> = {
  topsoil: 'Topsoil',
  compost: 'Compost',
  'peat-moss': 'Peat moss',
};

interface SavedState {
  area: string;
  grass: GrassKey;
  condition: Condition;
  unitSystem: UnitSystem;
  useTopdressing: boolean;
  topdressMaterial: TopdressMaterial;
  depth: string;
}

function round(value: number, decimals = 2): number {
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

const SQM_TO_SQFT = 10.7639;
const CM_TO_IN = 0.393701;

function getRate(grass: GrassKey, condition: Condition): number {
  const r = GRASS_RATES[grass];
  if (condition === 'thin') return r.thin;
  if (condition === 'patchy') return r.patchy;
  return r.veryThin;
}

export default function OverseedingCalculator() {
  const hasLoaded = useRef(false);

  const [area, setArea] = useState<string>('5000');
  const [grass, setGrass] = useState<GrassKey>('tall-fescue');
  const [condition, setCondition] = useState<Condition>('patchy');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [useTopdressing, setUseTopdressing] = useState<boolean>(true);
  const [topdressMaterial, setTopdressMaterial] = useState<TopdressMaterial>('compost');
  const [depth, setDepth] = useState<string>('0.25');

  useEffect(() => {
    const s = loadSavedState();
    if (s.area !== undefined) setArea(s.area);
    if (s.grass) setGrass(s.grass);
    if (s.condition) setCondition(s.condition);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.useTopdressing !== undefined) setUseTopdressing(s.useTopdressing);
    if (s.topdressMaterial) setTopdressMaterial(s.topdressMaterial);
    if (s.depth !== undefined) setDepth(s.depth);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ area, grass, condition, unitSystem, useTopdressing, topdressMaterial, depth });
  }, [area, grass, condition, unitSystem, useTopdressing, topdressMaterial, depth]);

  const isMetric = unitSystem === 'metric';
  const areaUnit = isMetric ? 'm²' : 'sq ft';
  const depthUnit = isMetric ? 'cm' : 'in';

  const result = useMemo(() => {
    let a = parseFloat(area);
    a = Number.isFinite(a) ? a : 0;
    const sqft = isMetric ? a * SQM_TO_SQFT : a;

    const rate = getRate(grass, condition);
    const seedLbs = (sqft / 1000) * rate;
    const bags50lb = Math.ceil(seedLbs / 50);

    let depthIn = parseFloat(depth);
    depthIn = Number.isFinite(depthIn) ? depthIn : 0;
    if (isMetric) depthIn *= CM_TO_IN;
    const depthFt = depthIn / 12;
    const topdressCubicFt = useTopdressing ? Math.max(0, sqft * depthFt) : 0;
    const topdressCubicYd = topdressCubicFt / 27;
    const topdressCubicM = topdressCubicFt * 0.0283168;

    return { sqft, rate, seedLbs, bags50lb, topdressCubicFt, topdressCubicYd, topdressCubicM, depthIn };
  }, [area, grass, condition, isMetric, useTopdressing, depth]);

  const hasResult = result.sqft > 0;

  const handleNumericChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Overseeding Calculator Results', margin, y);
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
    const inputLines = [
      `Lawn area: ${area || 0} ${areaUnit}`,
      `Grass type: ${GRASS_RATES[grass].label}`,
      `Lawn condition: ${CONDITION_LABELS[condition]}`,
      `Rate used: ${result.rate} lb per 1,000 sq ft`,
    ];
    if (useTopdressing) {
      inputLines.push(`Topdressing: ${TOPDRESS_OPTIONS[topdressMaterial]} at ${depth || 0} ${depthUnit} deep`);
    }
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
    const resultLines = [
      `Seed needed: ${round(result.seedLbs, 1).toLocaleString()} lb`,
      `50 lb bags: ${result.bags50lb.toLocaleString()}`,
    ];
    if (useTopdressing) {
      resultLines.push(`Topdressing: ${round(result.topdressCubicFt, 1).toLocaleString()} cu ft (${round(result.topdressCubicYd, 2)} cu yd)`);
    }
    resultLines.forEach((line) => {
      doc.text(line, margin, y);
      y += 16;
    });

    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Overseeding rates run roughly half of new-lawn seeding rates for the same grass type.', margin, y);

    doc.save('overseeding-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Calculate Your Overseeding Needs
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">Units</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="group" aria-label="Unit system">
                <button
                  type="button"
                  aria-pressed={!isMetric}
                  onClick={() => setUnitSystem('imperial')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    !isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Imperial (ft, in)
                </button>
                <button
                  type="button"
                  aria-pressed={isMetric}
                  onClick={() => setUnitSystem('metric')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Metric (m, cm)
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="overseed-area" className="label-field">
                Lawn area <span className="text-bark-500">({areaUnit})</span>
              </label>
              <input
                id="overseed-area"
                type="number"
                inputMode="decimal"
                min="0"
                step="1"
                value={area}
                onChange={handleNumericChange(setArea)}
                className="input-field mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="overseed-grass" className="label-field">
                Grass type
              </label>
              <select
                id="overseed-grass"
                value={grass}
                onChange={(e) => setGrass(e.target.value as GrassKey)}
                className="input-field mt-1.5"
              >
                {(Object.keys(GRASS_RATES) as GrassKey[]).map((key) => (
                  <option key={key} value={key}>
                    {GRASS_RATES[key].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="overseed-condition" className="label-field">
              Lawn condition
            </label>
            <select
              id="overseed-condition"
              value={condition}
              onChange={(e) => setCondition(e.target.value as Condition)}
              className="input-field mt-1.5"
            >
              <option value="thin">Thin but mostly green</option>
              <option value="patchy">Patchy</option>
              <option value="very-thin">Very thin with bare spots</option>
            </select>
            <p className="mt-1.5 text-xs text-bark-500">
              Condition selects the low, mid, or high end of your grass type&rsquo;s rate range.
            </p>
          </div>

          <div className="rounded-lg bg-sand-50 p-4 ring-1 ring-moss-100">
            <label className="flex items-center gap-2.5 text-sm font-medium text-bark-800">
              <input
                type="checkbox"
                checked={useTopdressing}
                onChange={(e) => setUseTopdressing(e.target.checked)}
                className="h-4 w-4 rounded border-bark-300 text-moss-700 focus:ring-2 focus:ring-moss-500"
              />
              Also calculate topdressing
            </label>

            {useTopdressing && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="overseed-topdress-material" className="label-field">
                    Topdressing material
                  </label>
                  <select
                    id="overseed-topdress-material"
                    value={topdressMaterial}
                    onChange={(e) => setTopdressMaterial(e.target.value as TopdressMaterial)}
                    className="input-field mt-1.5"
                  >
                    {(Object.keys(TOPDRESS_OPTIONS) as TopdressMaterial[]).map((key) => (
                      <option key={key} value={key}>
                        {TOPDRESS_OPTIONS[key]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="overseed-depth" className="label-field">
                    Depth <span className="text-bark-500">({depthUnit})</span>
                  </label>
                  <input
                    id="overseed-depth"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.125"
                    value={depth}
                    onChange={handleNumericChange(setDepth)}
                    className="input-field mt-1.5"
                  />
                  <p className="mt-1.5 text-xs text-bark-500">&frac14;&Prime; is a typical overseeding topdressing depth.</p>
                </div>
              </div>
            )}
          </div>

          {/* Formula display */}
          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
              Seed (lb) = (Area &divide; 1,000) &times; rate for grass type &amp; condition
            </p>
            {useTopdressing && (
              <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                Topdressing (cu ft) = Area &times; (Depth &divide; 12) &nbsp;&middot;&nbsp; Cu yd = Cu ft &divide; 27
              </p>
            )}
          </div>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!hasResult ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your lawn area, grass type, and condition above to see how much seed you need.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
                        <path d="M16 4c-3 4-5 7-5 11a5 5 0 0 0 10 0c0-4-2-7-5-11Z" />
                        <path d="M16 26c-2-3-4-5-4-8a4 4 0 0 1 8 0c0 3-2 5-4 8Z" opacity="0.5" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">You need approximately</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {round(result.seedLbs, 1).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">lb of grass seed</p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-4 sm:p-5">
                    <p className="text-xs text-moss-200">That&rsquo;s about</p>
                    <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                      {result.bags50lb.toLocaleString()}
                    </p>
                    <p className="text-xs text-moss-200">50 lb {result.bags50lb === 1 ? 'bag' : 'bags'}</p>
                    <p className="mt-1 text-xs text-moss-300">
                      at {result.rate} lb / 1,000 sq ft
                    </p>
                  </div>
                </div>

                {useTopdressing && (
                  <div className="flex items-center gap-3 border-t border-moss-200 px-4 py-3 sm:px-5">
                    <div>
                      <p className="text-xs text-bark-500">Plus topdressing</p>
                      <p className="font-display text-2xl font-bold text-moss-700">
                        {round(result.topdressCubicFt, 1).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        cu ft of {TOPDRESS_OPTIONS[topdressMaterial].toLowerCase()}{' '}
                        <span className="font-normal text-bark-400">
                          ({round(result.topdressCubicYd, 2)} cu yd{isMetric ? `, ${round(result.topdressCubicM, 2)} m³` : ''})
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    For {round(result.sqft, 0).toLocaleString()} sq ft, {CONDITION_LABELS[condition].toLowerCase()}.
                  </p>
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

          {/* Rate reference table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="mb-2 text-xs font-medium uppercase tracking-wider text-bark-400">
                Overseeding rates by grass type (lb per 1,000 sq ft)
              </caption>
              <thead>
                <tr className="border-b border-moss-100 text-bark-500">
                  <th scope="col" className="py-2 pr-4 font-medium">Grass type</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Thin but mostly green</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Patchy</th>
                  <th scope="col" className="py-2 font-medium">Very thin / bare spots</th>
                </tr>
              </thead>
              <tbody className="text-bark-700">
                {(Object.keys(GRASS_RATES) as GrassKey[]).map((key, i, arr) => (
                  <tr key={key} className={i < arr.length - 1 ? 'border-b border-moss-50' : ''}>
                    <th scope="row" className="py-2 pr-4 font-medium text-bark-800">{GRASS_RATES[key].label}</th>
                    <td className="py-2 pr-4">{GRASS_RATES[key].thin}</td>
                    <td className="py-2 pr-4">{GRASS_RATES[key].patchy}</td>
                    <td className="py-2">{GRASS_RATES[key].veryThin}</td>
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
