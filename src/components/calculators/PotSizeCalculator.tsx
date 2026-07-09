import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type Mode = 'convert' | 'sizeup' | 'guide';
type UnitSystem = 'imperial' | 'metric';
type ConvertType = 'standard' | 'custom';
type CustomType = 'dims' | 'volume';

const STORAGE_KEY = 'pot-size-calculator-state-v1';

const GAL_TO_L = 3.78541;
const GAL_TO_QT = 4;
const IN_TO_CM = 2.54;
const IN3_TO_GAL = 1 / 231; // 1 US gallon = 231 cubic inches

interface SavedState {
  mode: Mode;
  unitSystem: UnitSystem;
  convertType: ConvertType;
  standardSizeId: string;
  customType: CustomType;
  customDiameter: string;
  customHeight: string;
  customVolume: string;
  customVolUnit: 'gal' | 'qt' | 'L';
  sizeupCurrentId: string;
  guidePlantId: string;
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

// Standard nursery pot sizes, sorted by ascending diameter.
// Trade-gallon dimensions (1 qt through 15 gal) reflect real, commonly published
// nursery container dimensions; the industry has no single enforced standard and
// exact sizes vary slightly by manufacturer. The 2/3/4 in rows are geometric
// estimates (assumes a round pot roughly as tall as it is wide) since small
// starter pots are conventionally sold by diameter only, not by rated volume.
interface StandardSize {
  id: string;
  label: string;
  diameterIn: number;
  volGal: number;
  estimated: boolean;
}

const STANDARD_SIZES: StandardSize[] = [
  { id: '2in', label: '2 in pot', diameterIn: 2, volGal: 0.03, estimated: true },
  { id: '3in', label: '3 in pot', diameterIn: 3, volGal: 0.09, estimated: true },
  { id: '4in', label: '4 in pot', diameterIn: 4, volGal: 0.22, estimated: true },
  { id: '1qt', label: '1 quart', diameterIn: 4.25, volGal: 0.25, estimated: false },
  { id: '6in-1gal', label: '6 in / 1 gallon (#1)', diameterIn: 6, volGal: 0.76, estimated: false },
  { id: '8in-2gal', label: '8 in / 2 gallon (#2)', diameterIn: 8.5, volGal: 1.6, estimated: false },
  { id: '3gal', label: '3 gallon (#3)', diameterIn: 10.5, volGal: 2.5, estimated: false },
  { id: '5gal', label: '5 gallon (#5)', diameterIn: 10.5, volGal: 3.6, estimated: false },
  { id: '7gal', label: '7 gallon (#7)', diameterIn: 12, volGal: 6.5, estimated: false },
  { id: '10gal', label: '10 gallon (#10)', diameterIn: 14.75, volGal: 8, estimated: false },
  { id: '15gal', label: '15 gallon (#15)', diameterIn: 17.5, volGal: 12, estimated: false },
];

type PlantCategory =
  | 'large' | 'medium' | 'small' | 'succulent'
  | 'houseSmall' | 'houseMed' | 'houseLarge'
  | 'potato' | 'strawberry' | 'fruitTree' | 'shrub';

interface CategoryInfo {
  minGal?: string;
  diamIn?: string;
  depthIn?: string;
  note: string;
}

const CATEGORY_INFO: Record<PlantCategory, CategoryInfo> = {
  large: { minGal: '8–10', depthIn: '12–16', note: 'One plant per container.' },
  medium: { minGal: '4–6', depthIn: '8–12', note: '' },
  small: { minGal: '1–3', depthIn: '4–6', note: '' },
  succulent: { diamIn: '2–4', note: 'Sized by diameter — succulents and cacti generally prefer a snug pot, not a large one.' },
  houseSmall: { diamIn: '4–6', note: 'General nursery sizing guidance, not tied to a single species.' },
  houseMed: { diamIn: '6–10 (roughly 2–3 gal)', note: 'General nursery sizing guidance, not tied to a single species.' },
  houseLarge: { diamIn: '10–14+ (roughly 5–15 gal)', note: 'General nursery sizing guidance, not tied to a single species.' },
  potato: { minGal: '30', note: 'Deep container; soil is mounded up around the vines as they grow ("hilling").' },
  strawberry: { depthIn: '8', note: 'Width matters less than depth — a wide, shallow container works well.' },
  fruitTree: { minGal: '25–30', note: '' },
  shrub: { minGal: '25', note: '' },
};

interface PlantEntry {
  id: string;
  name: string;
  cat: PlantCategory;
}

const PLANT_GUIDE: PlantEntry[] = [
  { id: 'tomato-full', name: 'Tomato (full-size)', cat: 'large' },
  { id: 'pepper-full', name: 'Pepper (full-size)', cat: 'large' },
  { id: 'eggplant', name: 'Eggplant', cat: 'large' },
  { id: 'cucumber', name: 'Cucumber', cat: 'large' },
  { id: 'winter-squash', name: 'Winter squash', cat: 'large' },
  { id: 'tomato-dwarf', name: 'Tomato (dwarf / patio variety)', cat: 'medium' },
  { id: 'pepper-dwarf', name: 'Pepper (dwarf variety)', cat: 'medium' },
  { id: 'summer-squash', name: 'Summer squash / zucchini', cat: 'medium' },
  { id: 'cole-crops', name: 'Broccoli / cabbage / kale', cat: 'medium' },
  { id: 'beans', name: 'Beans (pole or bush)', cat: 'medium' },
  { id: 'root-veg', name: 'Beets / carrots', cat: 'medium' },
  { id: 'chard', name: 'Swiss chard', cat: 'medium' },
  { id: 'large-herbs', name: 'Rosemary / lavender / fennel', cat: 'medium' },
  { id: 'basil-etc', name: 'Basil / cilantro / parsley', cat: 'small' },
  { id: 'thyme-etc', name: 'Thyme / mint / marjoram', cat: 'small' },
  { id: 'lettuce', name: 'Lettuce / salad greens', cat: 'small' },
  { id: 'radish-scallion', name: 'Radish / scallions', cat: 'small' },
  { id: 'spinach-etc', name: 'Spinach / Asian greens', cat: 'small' },
  { id: 'peas', name: 'Peas', cat: 'small' },
  { id: 'succulent', name: 'Succulent / cactus', cat: 'succulent' },
  { id: 'house-small', name: 'Small houseplant (pothos, small fern)', cat: 'houseSmall' },
  { id: 'house-med', name: 'Medium houseplant (peace lily, snake plant)', cat: 'houseMed' },
  { id: 'house-large', name: 'Large houseplant (fiddle leaf fig, floor palm)', cat: 'houseLarge' },
  { id: 'potato', name: 'Potatoes', cat: 'potato' },
  { id: 'strawberry', name: 'Strawberries', cat: 'strawberry' },
  { id: 'fruit-tree', name: 'Dwarf fruit tree', cat: 'fruitTree' },
  { id: 'shrub', name: 'Shrub (container-grown)', cat: 'shrub' },
];

export default function PotSizeCalculator() {
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<Mode>('convert');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');

  // Convert state
  const [convertType, setConvertType] = useState<ConvertType>('standard');
  const [standardSizeId, setStandardSizeId] = useState('6in-1gal');
  const [customType, setCustomType] = useState<CustomType>('dims');
  const [customDiameter, setCustomDiameter] = useState('8');
  const [customHeight, setCustomHeight] = useState('8');
  const [customVolume, setCustomVolume] = useState('2');
  const [customVolUnit, setCustomVolUnit] = useState<'gal' | 'qt' | 'L'>('gal');

  // Size-up state
  const [sizeupCurrentId, setSizeupCurrentId] = useState('4in');

  // Guide state
  const [guidePlantId, setGuidePlantId] = useState('tomato-full');

  useEffect(() => {
    const s = loadSavedState();
    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.convertType) setConvertType(s.convertType);
    if (s.standardSizeId) setStandardSizeId(s.standardSizeId);
    if (s.customType) setCustomType(s.customType);
    if (s.customDiameter !== undefined) setCustomDiameter(s.customDiameter);
    if (s.customHeight !== undefined) setCustomHeight(s.customHeight);
    if (s.customVolume !== undefined) setCustomVolume(s.customVolume);
    if (s.customVolUnit) setCustomVolUnit(s.customVolUnit);
    if (s.sizeupCurrentId) setSizeupCurrentId(s.sizeupCurrentId);
    if (s.guidePlantId) setGuidePlantId(s.guidePlantId);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({
      mode, unitSystem, convertType, standardSizeId, customType,
      customDiameter, customHeight, customVolume, customVolUnit,
      sizeupCurrentId, guidePlantId,
    });
  }, [mode, unitSystem, convertType, standardSizeId, customType, customDiameter,
      customHeight, customVolume, customVolUnit, sizeupCurrentId, guidePlantId]);

  const isMetric = unitSystem === 'metric';

  const handleNumericChange = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
    };

  // ---------------- Mode 1: Unit Converter ----------------
  const convertResult = useMemo(() => {
    if (convertType === 'standard') {
      const size = STANDARD_SIZES.find((s) => s.id === standardSizeId);
      if (!size) return null;
      return {
        diameterIn: size.diameterIn,
        volGal: size.volGal,
        estimated: size.estimated,
      };
    }
    // custom
    if (customType === 'dims') {
      const dIn = parseFloat(isMetric ? String(parseFloat(customDiameter || '0') / IN_TO_CM) : customDiameter);
      const hIn = parseFloat(isMetric ? String(parseFloat(customHeight || '0') / IN_TO_CM) : customHeight);
      if (!Number.isFinite(dIn) || !Number.isFinite(hIn) || dIn <= 0 || hIn <= 0) return null;
      const volIn3 = Math.PI * (dIn / 2) ** 2 * hIn;
      const volGal = volIn3 * IN3_TO_GAL;
      return { diameterIn: dIn, heightIn: hIn, volGal, estimated: true, isCylinderEstimate: true };
    }
    // volume -> estimated diameter (assumes height = diameter)
    const rawVol = parseFloat(customVolume || '0');
    if (!Number.isFinite(rawVol) || rawVol <= 0) return null;
    let volGal = rawVol;
    if (customVolUnit === 'qt') volGal = rawVol / GAL_TO_QT;
    if (customVolUnit === 'L') volGal = rawVol / GAL_TO_L;
    const volIn3 = volGal / IN3_TO_GAL;
    // V = pi * (d/2)^2 * d = pi*d^3/4  =>  d = cuberoot(4V/pi)
    const dIn = Math.cbrt((4 * volIn3) / Math.PI);
    return { diameterIn: dIn, heightIn: dIn, volGal, estimated: true, isVolumeEstimate: true };
  }, [convertType, standardSizeId, customType, customDiameter, customHeight, customVolume, customVolUnit, isMetric]);

  // ---------------- Mode 2: Repotting Size-Up ----------------
  const sizeupResult = useMemo(() => {
    const idx = STANDARD_SIZES.findIndex((s) => s.id === sizeupCurrentId);
    if (idx === -1) return null;
    const current = STANDARD_SIZES[idx];
    const next = idx < STANDARD_SIZES.length - 1 ? STANDARD_SIZES[idx + 1] : null;
    return {
      current,
      next,
      diameterIncreaseIn: next ? round(next.diameterIn - current.diameterIn, 2) : null,
      isLast: next === null,
    };
  }, [sizeupCurrentId]);

  // ---------------- Mode 3: Plant/Vegetable Container Guide ----------------
  const guideResult = useMemo(() => {
    const plant = PLANT_GUIDE.find((p) => p.id === guidePlantId);
    if (!plant) return null;
    return { plant, info: CATEGORY_INFO[plant.cat] };
  }, [guidePlantId]);

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Pot Size Calculator Results', margin, y);
    y += 28;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(`Generated ${dateStr} — SoilMath.com`, margin, y);
    y += 28;

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`Mode: ${mode === 'convert' ? 'Unit Converter' : mode === 'sizeup' ? 'Repotting Size-Up' : 'Plant/Vegetable Container Guide'}`, margin, y);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    if (mode === 'convert' && convertResult) {
      const lines = [
        `Diameter: ${round(convertResult.diameterIn, 2)} in (${round(convertResult.diameterIn * IN_TO_CM, 1)} cm)`,
        `Volume: ${round(convertResult.volGal, 2)} gal / ${round(convertResult.volGal * GAL_TO_QT, 2)} qt / ${round(convertResult.volGal * GAL_TO_L, 2)} L`,
        convertResult.estimated ? '(Estimated — see note on the calculator page.)' : '(Standard nursery container dimensions.)',
      ];
      lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    } else if (mode === 'sizeup' && sizeupResult) {
      doc.text(`Current size: ${sizeupResult.current.label}`, margin, y); y += 16;
      if (sizeupResult.next) {
        doc.text(`Recommended next size: ${sizeupResult.next.label}`, margin, y); y += 16;
        doc.text(`Diameter increase: ~${sizeupResult.diameterIncreaseIn} in`, margin, y); y += 16;
      } else {
        doc.text('Already at the largest common nursery size — go up 1-2 sizes at a time from here.', margin, y, { maxWidth: 500 }); y += 32;
      }
    } else if (mode === 'guide' && guideResult) {
      doc.text(`Plant: ${guideResult.plant.name}`, margin, y); y += 16;
      if (guideResult.info.minGal) { doc.text(`Minimum container size: ${guideResult.info.minGal} gal`, margin, y); y += 16; }
      if (guideResult.info.diamIn) { doc.text(`Minimum pot diameter: ${guideResult.info.diamIn} in`, margin, y); y += 16; }
      if (guideResult.info.depthIn) { doc.text(`Minimum soil depth: ${guideResult.info.depthIn} in`, margin, y); y += 16; }
      if (guideResult.info.note) { doc.text(guideResult.info.note, margin, y, { maxWidth: 500 }); y += 32; }
    }

    y += 20;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Nursery container sizes vary by manufacturer; treat all figures here as general guidance', margin, y); y += 12;
    doc.text('and adjust based on your specific pot and plant.', margin, y);

    doc.save('pot-size-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">Pot Size Calculator</h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Mode + unit toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">Calculation type</span>
              <div className="mt-2 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist">
                {([
                  { id: 'convert', label: 'Unit Converter' },
                  { id: 'sizeup', label: 'Repotting Size-Up' },
                  { id: 'guide', label: 'Plant Guide' },
                ] as { id: Mode; label: string }[]).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    role="tab"
                    aria-selected={mode === m.id}
                    onClick={() => setMode(m.id)}
                    className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                      mode === m.id ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
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
                  Imperial
                </button>
                <button
                  type="button"
                  aria-pressed={isMetric}
                  onClick={() => setUnitSystem('metric')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isMetric ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Metric
                </button>
              </div>
            </div>
          </div>

          {/* ---------------- CONVERT ---------------- */}
          {mode === 'convert' && (
            <>
              <div className="inline-flex rounded-lg bg-sand-100 p-1 self-start" role="group" aria-label="Converter input type">
                <button type="button" aria-pressed={convertType === 'standard'} onClick={() => setConvertType('standard')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${convertType === 'standard' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                  Standard nursery size
                </button>
                <button type="button" aria-pressed={convertType === 'custom'} onClick={() => setConvertType('custom')}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${convertType === 'custom' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                  Custom pot
                </button>
              </div>

              {convertType === 'standard' && (
                <div>
                  <label htmlFor="pot-standard-size" className="label-field">Pot size</label>
                  <select id="pot-standard-size" value={standardSizeId} onChange={(e) => setStandardSizeId(e.target.value)}
                    className="input-field mt-1.5">
                    {STANDARD_SIZES.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {convertType === 'custom' && (
                <>
                  <div className="inline-flex rounded-lg bg-sand-100 p-1 self-start" role="group" aria-label="Custom input type">
                    <button type="button" aria-pressed={customType === 'dims'} onClick={() => setCustomType('dims')}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${customType === 'dims' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                      I know diameter &amp; height
                    </button>
                    <button type="button" aria-pressed={customType === 'volume'} onClick={() => setCustomType('volume')}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${customType === 'volume' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                      I know target volume
                    </button>
                  </div>

                  {customType === 'dims' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="pot-custom-diameter" className="label-field">
                          Diameter <span className="text-bark-500">({isMetric ? 'cm' : 'in'})</span>
                        </label>
                        <input id="pot-custom-diameter" type="number" inputMode="decimal" min="0" step="0.1"
                          value={customDiameter} onChange={handleNumericChange(setCustomDiameter)} className="input-field mt-1.5" />
                      </div>
                      <div>
                        <label htmlFor="pot-custom-height" className="label-field">
                          Height <span className="text-bark-500">({isMetric ? 'cm' : 'in'})</span>
                        </label>
                        <input id="pot-custom-height" type="number" inputMode="decimal" min="0" step="0.1"
                          value={customHeight} onChange={handleNumericChange(setCustomHeight)} className="input-field mt-1.5" />
                      </div>
                    </div>
                  )}

                  {customType === 'volume' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label htmlFor="pot-custom-volume" className="label-field">Target volume</label>
                        <input id="pot-custom-volume" type="number" inputMode="decimal" min="0" step="0.1"
                          value={customVolume} onChange={handleNumericChange(setCustomVolume)} className="input-field mt-1.5" />
                      </div>
                      <div>
                        <label htmlFor="pot-custom-volunit" className="label-field">Unit</label>
                        <select id="pot-custom-volunit" value={customVolUnit} onChange={(e) => setCustomVolUnit(e.target.value as 'gal' | 'qt' | 'L')}
                          className="input-field mt-1.5">
                          <option value="gal">Gallons</option>
                          <option value="qt">Quarts</option>
                          <option value="L">Liters</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
                    <p className="font-medium text-bark-700">The math:</p>
                    {customType === 'dims' ? (
                      <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                        Volume = &pi; &times; (diameter &divide; 2)&sup2; &times; height <span className="text-bark-400">(assumes a straight-sided cylinder)</span>
                      </p>
                    ) : (
                      <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                        Diameter &asymp; cube root of (4 &times; volume &divide; &pi;) <span className="text-bark-400">(assumes height &asymp; diameter)</span>
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!convertResult ? (
                  <p className="p-5 text-sm text-bark-500">Choose a standard size, or enter custom dimensions, to see the converted values.</p>
                ) : (
                  <div className="grid grid-cols-2 divide-x divide-moss-200">
                    <div className="p-4 sm:p-5">
                      <p className="text-xs text-bark-500">Diameter</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">
                        {isMetric ? round(convertResult.diameterIn * IN_TO_CM, 1) : round(convertResult.diameterIn, 2)}
                      </p>
                      <p className="text-xs font-medium text-bark-600">{isMetric ? 'cm' : 'in'}</p>
                    </div>
                    <div className="bg-moss-700 p-4 sm:p-5">
                      <p className="text-xs text-moss-200">Volume</p>
                      <p className="font-display text-2xl font-bold text-white sm:text-3xl">
                        {isMetric ? round(convertResult.volGal * GAL_TO_L, 2) : round(convertResult.volGal, 2)}
                      </p>
                      <p className="text-xs text-moss-200">
                        {isMetric ? 'L' : 'gal'} &middot; {round(convertResult.volGal * GAL_TO_QT, 2)} qt &middot; {round(convertResult.volGal * GAL_TO_L, 2)} L
                      </p>
                    </div>
                  </div>
                )}
                {convertResult?.estimated && (
                  <div className="border-t border-moss-200 bg-white px-4 py-2.5 text-xs text-bark-500 sm:px-5">
                    Estimated figure — small pots and custom dimensions aren&rsquo;t part of any fixed manufacturer standard.
                  </div>
                )}
              </div>
            </>
          )}

          {/* ---------------- SIZE-UP ---------------- */}
          {mode === 'sizeup' && (
            <>
              <div>
                <label htmlFor="pot-sizeup-current" className="label-field">Current pot size</label>
                <select id="pot-sizeup-current" value={sizeupCurrentId} onChange={(e) => setSizeupCurrentId(e.target.value)}
                  className="input-field mt-1.5">
                  {STANDARD_SIZES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
                <p className="font-medium text-bark-700">The guideline:</p>
                <p className="mt-1">
                  Size up by roughly 2 in of diameter at a time (more for containers already 10 in+). Bigger jumps surround the roots with more soil than they can use, which is a common cause of root rot.
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!sizeupResult ? (
                  <p className="p-5 text-sm text-bark-500">Pick your current pot size to see the recommended next size up.</p>
                ) : sizeupResult.isLast ? (
                  <p className="p-5 text-sm text-bark-600">
                    {sizeupResult.current.label} is the largest size in this ladder. For anything larger, keep moving up one nursery size (or ~2-4 in of diameter) at a time.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 divide-x divide-moss-200">
                    <div className="p-4 sm:p-5">
                      <p className="text-xs text-bark-500">Current size</p>
                      <p className="font-display text-xl font-bold text-moss-700 sm:text-2xl">{sizeupResult.current.label}</p>
                      <p className="text-xs font-medium text-bark-600">
                        {isMetric ? round(sizeupResult.current.diameterIn * IN_TO_CM, 1) + ' cm' : sizeupResult.current.diameterIn + ' in'} diameter
                      </p>
                    </div>
                    <div className="bg-moss-700 p-4 sm:p-5">
                      <p className="text-xs text-moss-200">Recommended next size</p>
                      <p className="font-display text-xl font-bold text-white sm:text-2xl">{sizeupResult.next!.label}</p>
                      <p className="text-xs text-moss-200">
                        +{isMetric ? round((sizeupResult.diameterIncreaseIn ?? 0) * IN_TO_CM, 1) + ' cm' : sizeupResult.diameterIncreaseIn + ' in'} diameter
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ---------------- GUIDE ---------------- */}
          {mode === 'guide' && (
            <>
              <div>
                <label htmlFor="pot-guide-plant" className="label-field">Plant / vegetable</label>
                <select id="pot-guide-plant" value={guidePlantId} onChange={(e) => setGuidePlantId(e.target.value)}
                  className="input-field mt-1.5">
                  {PLANT_GUIDE.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!guideResult ? (
                  <p className="p-5 text-sm text-bark-500">Pick a plant to see its minimum recommended container size.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 divide-x divide-moss-200">
                      <div className="p-4 sm:p-5">
                        <p className="text-xs text-bark-500">Minimum container size</p>
                        <p className="font-display text-xl font-bold text-moss-700 sm:text-2xl">
                          {guideResult.info.minGal ?? guideResult.info.diamIn}
                        </p>
                        <p className="text-xs font-medium text-bark-600">
                          {guideResult.info.minGal ? 'gallons' : 'inches diameter'}
                        </p>
                      </div>
                      <div className="bg-moss-700 p-4 sm:p-5">
                        <p className="text-xs text-moss-200">Minimum soil depth</p>
                        <p className="font-display text-xl font-bold text-white sm:text-2xl">
                          {guideResult.info.depthIn ?? '—'}
                        </p>
                        <p className="text-xs text-moss-200">{guideResult.info.depthIn ? 'inches' : 'not depth-limited'}</p>
                      </div>
                    </div>
                    {guideResult.info.note && (
                      <div className="border-t border-moss-200 bg-white px-4 py-2.5 text-xs text-bark-600 sm:px-5">
                        {guideResult.info.note}
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end">
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
        </div>
      </div>
    </div>
  );
}
