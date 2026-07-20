import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { loadGardenProject, saveGardenProject, fuzzyMatchCropName } from '../../lib/gardenProject';
import type { SpacingResultsSnapshot } from '../../lib/gardenProject';

type GardenMode = 'row' | 'sqft';
type UnitSystem = 'imperial' | 'metric';

const STORAGE_KEY = 'plant-spacing-calculator-state-v1';

interface CropPreset {
  name: string;
  inRowIn: number;   // in-row spacing, inches
  betweenRowIn: number; // between-row spacing, inches
  sqftPerPlant: number; // square foot gardening: sq ft per plant
}

const CROP_PRESETS: CropPreset[] = [
  { name: 'Custom', inRowIn: 12, betweenRowIn: 18, sqftPerPlant: 1 },
  { name: 'Basil', inRowIn: 12, betweenRowIn: 18, sqftPerPlant: 1 },
  { name: 'Bean (bush)', inRowIn: 4, betweenRowIn: 18, sqftPerPlant: 0.25 },
  { name: 'Bean (pole)', inRowIn: 6, betweenRowIn: 24, sqftPerPlant: 0.25 },
  { name: 'Beet', inRowIn: 4, betweenRowIn: 12, sqftPerPlant: 0.25 },
  { name: 'Broccoli', inRowIn: 18, betweenRowIn: 24, sqftPerPlant: 1 },
  { name: 'Carrot', inRowIn: 3, betweenRowIn: 12, sqftPerPlant: 0.0625 },
  { name: 'Cilantro', inRowIn: 6, betweenRowIn: 12, sqftPerPlant: 0.25 },
  { name: 'Corn', inRowIn: 12, betweenRowIn: 30, sqftPerPlant: 1 },
  { name: 'Cucumber', inRowIn: 12, betweenRowIn: 36, sqftPerPlant: 1 },
  { name: 'Garlic', inRowIn: 6, betweenRowIn: 12, sqftPerPlant: 0.25 },
  { name: 'Kale', inRowIn: 12, betweenRowIn: 18, sqftPerPlant: 1 },
  { name: 'Lettuce (head)', inRowIn: 12, betweenRowIn: 12, sqftPerPlant: 1 },
  { name: 'Lettuce (leaf)', inRowIn: 6, betweenRowIn: 12, sqftPerPlant: 0.25 },
  { name: 'Marigold', inRowIn: 12, betweenRowIn: 18, sqftPerPlant: 1 },
  { name: 'Onion', inRowIn: 4, betweenRowIn: 12, sqftPerPlant: 0.25 },
  { name: 'Parsley', inRowIn: 8, betweenRowIn: 12, sqftPerPlant: 0.25 },
  { name: 'Pepper', inRowIn: 18, betweenRowIn: 24, sqftPerPlant: 1 },
  { name: 'Radish', inRowIn: 2, betweenRowIn: 12, sqftPerPlant: 0.0625 },
  { name: 'Spinach', inRowIn: 6, betweenRowIn: 12, sqftPerPlant: 0.25 },
  { name: 'Squash (summer)', inRowIn: 24, betweenRowIn: 36, sqftPerPlant: 4 },
  { name: 'Squash (winter)', inRowIn: 36, betweenRowIn: 48, sqftPerPlant: 9 },
  { name: 'Swiss Chard', inRowIn: 6, betweenRowIn: 18, sqftPerPlant: 0.25 },
  { name: 'Tomato (determinate)', inRowIn: 24, betweenRowIn: 36, sqftPerPlant: 4 },
  { name: 'Tomato (indeterminate)', inRowIn: 24, betweenRowIn: 48, sqftPerPlant: 4 },
  { name: 'Zucchini', inRowIn: 24, betweenRowIn: 36, sqftPerPlant: 4 },
];

interface SavedState {
  mode: GardenMode;
  unitSystem: UnitSystem;
  crop: string;
  bedLength: string;
  bedWidth: string;
  inRow: string;
  betweenRow: string;
  sqftPerPlant: string;
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
    // fail silently
  }
}

const CM_TO_IN = 0.393701;
const M_TO_FT = 3.28084;

export default function PlantSpacingCalculator() {
  const saved = useRef<Partial<SavedState>>({});
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<GardenMode>('row');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [crop, setCrop] = useState<string>('Tomato (determinate)');
  const [bedLength, setBedLength] = useState<string>('8');
  const [bedWidth, setBedWidth] = useState<string>('4');
  const [inRow, setInRow] = useState<string>('24');
  const [betweenRow, setBetweenRow] = useState<string>('36');
  const [sqftPerPlant, setSqftPerPlant] = useState<string>('4');
  const [projectSaved, setProjectSaved] = useState(false);

  useEffect(() => {
    const s = loadSavedState();
    saved.current = s;
    const hadOwnSavedState = Object.keys(s).length > 0;
    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.crop) setCrop(s.crop);
    if (s.bedLength !== undefined) setBedLength(s.bedLength);
    if (s.bedWidth !== undefined) setBedWidth(s.bedWidth);
    if (s.inRow !== undefined) setInRow(s.inRow);
    if (s.betweenRow !== undefined) setBetweenRow(s.betweenRow);
    if (s.sqftPerPlant !== undefined) setSqftPerPlant(s.sqftPerPlant);

    // No saved state of its own yet -- pull bed dimensions and, if a crop
    // was chosen upstream (Seed Starting), a best-effort matching preset
    // from an active Garden Project. A returning visitor's own saved
    // inputs always take precedence over the project.
    if (!hadOwnSavedState) {
      const project = loadGardenProject();
      if (project?.bedDimensions) {
        setBedLength(project.bedDimensions.length);
        setBedWidth(project.bedDimensions.width);
      }
      const lastCrop = project?.selectedCrops?.[project.selectedCrops.length - 1];
      if (lastCrop) {
        const matchName = fuzzyMatchCropName(lastCrop.name, CROP_PRESETS.map((p) => p.name));
        const preset = CROP_PRESETS.find((p) => p.name === matchName);
        if (preset) {
          setCrop(preset.name);
          setInRow(String(preset.inRowIn));
          setBetweenRow(String(preset.betweenRowIn));
          setSqftPerPlant(String(preset.sqftPerPlant));
        }
      }
    }
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({ mode, unitSystem, crop, bedLength, bedWidth, inRow, betweenRow, sqftPerPlant });
  }, [mode, unitSystem, crop, bedLength, bedWidth, inRow, betweenRow, sqftPerPlant]);

  const handleCropChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const name = e.target.value;
    setCrop(name);
    const preset = CROP_PRESETS.find((p) => p.name === name);
    if (preset) {
      if (unitSystem === 'imperial') {
        setInRow(String(preset.inRowIn));
        setBetweenRow(String(preset.betweenRowIn));
      } else {
        setInRow(round(preset.inRowIn * 2.54, 1).toString());
        setBetweenRow(round(preset.betweenRowIn * 2.54, 1).toString());
      }
      setSqftPerPlant(String(preset.sqftPerPlant));
    }
  };

  const handleNumericChange =
    (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(sanitizeNumericInput(e.target.value));
    };

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';
  const spacingUnit = isMetric ? 'cm' : 'in';

  const result = useMemo(() => {
    let lengthFt = parseFloat(bedLength);
    let widthFt = parseFloat(bedWidth);
    if (isMetric) {
      lengthFt = Number.isFinite(lengthFt) ? lengthFt * M_TO_FT : 0;
      widthFt = Number.isFinite(widthFt) ? widthFt * M_TO_FT : 0;
    }
    if (!Number.isFinite(lengthFt) || lengthFt <= 0) return null;
    if (!Number.isFinite(widthFt) || widthFt <= 0) return null;

    const areaFt = lengthFt * widthFt;

    if (mode === 'row') {
      let inRowRaw = parseFloat(inRow);
      let betweenRowRaw = parseFloat(betweenRow);
      if (isMetric) {
        inRowRaw = Number.isFinite(inRowRaw) ? inRowRaw * CM_TO_IN : 0;
        betweenRowRaw = Number.isFinite(betweenRowRaw) ? betweenRowRaw * CM_TO_IN : 0;
      }
      if (!Number.isFinite(inRowRaw) || inRowRaw <= 0) return null;
      if (!Number.isFinite(betweenRowRaw) || betweenRowRaw <= 0) return null;

      const inRowFt = inRowRaw / 12;
      const betweenRowFt = betweenRowRaw / 12;

      const plantsPerRow = Math.floor(lengthFt / inRowFt);
      const numRows = Math.floor(widthFt / betweenRowFt);
      const totalPlants = plantsPerRow * numRows;
      const sqftPerPlantVal = (inRowFt * betweenRowFt);
      const perAcre = sqftPerPlantVal > 0 ? Math.round(43560 / sqftPerPlantVal) : 0;
      const perHectare = sqftPerPlantVal > 0 ? Math.round(107639 / sqftPerPlantVal) : 0;

      return { totalPlants, plantsPerRow, numRows, areaFt, perAcre, perHectare, mode: 'row' as const };
    } else {
      const sqftVal = parseFloat(sqftPerPlant);
      if (!Number.isFinite(sqftVal) || sqftVal <= 0) return null;
      const totalPlants = Math.floor(areaFt / sqftVal);
      const gridSpacingIn = round(Math.sqrt(sqftVal) * 12, 1);
      const perAcre = Math.round(43560 / sqftVal);
      const perHectare = Math.round(107639 / sqftVal);

      return { totalPlants, gridSpacingIn, areaFt, perAcre, perHectare, mode: 'sqft' as const };
    }
  }, [mode, unitSystem, bedLength, bedWidth, inRow, betweenRow, sqftPerPlant, isMetric]);

  const addToGardenProject = () => {
    if (!result) return;
    const snapshot: SpacingResultsSnapshot = {
      crop,
      mode: result.mode,
      bedLength,
      bedWidth,
      lengthUnit,
      totalPlants: result.totalPlants,
      plantsPerRow: result.mode === 'row' ? result.plantsPerRow : undefined,
      numRows: result.mode === 'row' ? result.numRows : undefined,
      gridSpacingIn: result.mode === 'sqft' ? result.gridSpacingIn : undefined,
      areaFt: result.areaFt,
    };
    saveGardenProject({
      bedDimensions: { length: bedLength, width: bedWidth, unit: lengthUnit },
      spacingResults: snapshot,
    });
    setProjectSaved(true);
    window.setTimeout(() => setProjectSaved(false), 2600);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Plant Spacing Calculator Results', margin, y);
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
    const lines: string[] = [
      `Crop: ${crop}`,
      `Bed: ${bedLength} × ${bedWidth} ${lengthUnit}`,
      `Mode: ${mode === 'row' ? 'Row Garden' : 'Square Foot Gardening'}`,
    ];
    if (mode === 'row') {
      lines.push(`In-row spacing: ${inRow} ${spacingUnit}`);
      lines.push(`Between-row spacing: ${betweenRow} ${spacingUnit}`);
    } else {
      lines.push(`Sq ft per plant: ${sqftPerPlant}`);
    }
    lines.forEach((line) => { doc.text(line, margin, y); y += 16; });

    if (result) {
      y += 12;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('Results', margin, y);
      y += 20;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      const resultLines: string[] = [
        `Total plants: ${result.totalPlants.toLocaleString()}`,
        `Bed area: ${round(result.areaFt, 1)} sq ft`,
        `Plants per acre: ${result.perAcre.toLocaleString()}`,
        `Plants per hectare: ${result.perHectare.toLocaleString()}`,
      ];
      if (result.mode === 'row') {
        resultLines.splice(1, 0, `Plants per row: ${result.plantsPerRow}`);
        resultLines.splice(2, 0, `Number of rows: ${result.numRows}`);
      }
      resultLines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    }

    doc.save('plant-spacing-calculator-results.pdf');
  };

  const selectedPreset = CROP_PRESETS.find((p) => p.name === crop);

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Plant Spacing Calculator
          </h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Mode + unit toggles */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className="label-field">Garden style</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'row'}
                  onClick={() => setMode('row')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'row'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Row Garden
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'sqft'}
                  onClick={() => setMode('sqft')}
                  className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${
                    mode === 'sqft'
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Square Foot Gardening
                </button>
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
                    !isMetric
                      ? 'bg-white text-moss-800 shadow-sm'
                      : 'text-bark-600 hover:text-moss-800'
                  }`}
                >
                  Imperial
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
                  Metric
                </button>
              </div>
            </div>
          </div>

          {/* Crop selector */}
          <div>
            <label htmlFor="psc-crop" className="label-field">Crop</label>
            <select
              id="psc-crop"
              value={crop}
              onChange={handleCropChange}
              className="input-field mt-1.5"
            >
              {CROP_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
            {crop !== 'Custom' && selectedPreset && (
              <p className="mt-1.5 text-xs text-bark-500">
                Recommended: {selectedPreset.inRowIn}&Prime; in-row &times; {selectedPreset.betweenRowIn}&Prime; between rows
                {mode === 'sqft' && ` (${selectedPreset.sqftPerPlant} sq ft per plant in SFG)`}
              </p>
            )}
          </div>

          {/* Bed dimensions */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="psc-length" className="label-field">
                Bed length <span className="text-bark-500">({lengthUnit})</span>
              </label>
              <input
                id="psc-length"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={bedLength}
                onChange={handleNumericChange(setBedLength)}
                className="input-field mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="psc-width" className="label-field">
                Bed width <span className="text-bark-500">({lengthUnit})</span>
              </label>
              <input
                id="psc-width"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.5"
                value={bedWidth}
                onChange={handleNumericChange(setBedWidth)}
                className="input-field mt-1.5"
              />
            </div>
          </div>

          {/* Spacing inputs */}
          {mode === 'row' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="psc-in-row" className="label-field">
                  In-row spacing <span className="text-bark-500">({spacingUnit})</span>
                </label>
                <input
                  id="psc-in-row"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={inRow}
                  onChange={handleNumericChange(setInRow)}
                  className="input-field mt-1.5"
                />
                <p className="mt-1.5 text-xs text-bark-500">
                  Space between plants along the row.
                </p>
              </div>
              <div>
                <label htmlFor="psc-between-row" className="label-field">
                  Between-row spacing <span className="text-bark-500">({spacingUnit})</span>
                </label>
                <input
                  id="psc-between-row"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="1"
                  value={betweenRow}
                  onChange={handleNumericChange(setBetweenRow)}
                  className="input-field mt-1.5"
                />
                <p className="mt-1.5 text-xs text-bark-500">
                  Space between rows (aisle / path width).
                </p>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="psc-sqft" className="label-field">
                Square feet per plant
              </label>
              <input
                id="psc-sqft"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.25"
                value={sqftPerPlant}
                onChange={handleNumericChange(setSqftPerPlant)}
                className="input-field mt-1.5"
              />
              <p className="mt-1.5 text-xs text-bark-500">
                Each plant gets this much space in a square-foot grid.
              </p>
            </div>
          )}

          {/* Formula */}
          <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
            <p className="font-medium text-bark-700">The math:</p>
            {mode === 'row' ? (
              <>
                <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                  Plants per row = floor(Bed Length &divide; In-row Spacing)
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  Rows = floor(Bed Width &divide; Between-row Spacing) &nbsp;&middot;&nbsp; Total = Plants per row &times; Rows
                </p>
              </>
            ) : (
              <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                Total plants = floor(Bed Area &divide; Sq ft per plant)
              </p>
            )}
          </div>

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!result ? (
              <p className="p-5 text-sm text-bark-500">
                Enter your bed dimensions and spacing above to see how many plants fit.
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 divide-x divide-moss-200">
                  <div className="flex items-center gap-3 p-4 sm:p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-moss-700/10">
                      <svg className="h-5 w-5 text-moss-700" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <circle cx="5" cy="5" r="2" />
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="19" cy="5" r="2" />
                        <circle cx="5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="19" cy="12" r="2" />
                        <circle cx="5" cy="19" r="2" />
                        <circle cx="12" cy="19" r="2" />
                        <circle cx="19" cy="19" r="2" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs text-bark-500">Total plants that fit</p>
                      <p className="font-display text-3xl font-bold text-moss-700">
                        {result.totalPlants.toLocaleString()}
                      </p>
                      <p className="text-xs font-medium text-bark-600">
                        {crop !== 'Custom' ? crop : 'plants'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-moss-700 p-4 sm:p-5">
                    {result.mode === 'row' ? (
                      <>
                        <p className="text-xs text-moss-200">Layout</p>
                        <p className="font-display text-xl font-bold text-white">
                          {result.plantsPerRow} &times; {result.numRows}
                        </p>
                        <p className="mt-1 text-xs text-moss-200">plants per row &times; rows</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-moss-200">Grid spacing</p>
                        <p className="font-display text-xl font-bold text-white">
                          {result.gridSpacingIn}&Prime; apart
                        </p>
                        <p className="mt-1 text-xs text-moss-200">in a square grid</p>
                      </>
                    )}
                    <p className="mt-2 text-xs text-moss-300">
                      {round(result.areaFt, 1)} sq ft bed
                    </p>
                  </div>
                </div>

                <div className="border-t border-moss-100 bg-moss-50/60 px-4 py-2 text-xs text-bark-500">
                  Scaled up: ~{result.perAcre.toLocaleString()} plants/acre &middot; ~{result.perHectare.toLocaleString()} plants/hectare
                </div>

                <div className="flex flex-wrap items-start justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    Results assume a full rectangular bed with no paths or borders.
                  </p>
                  <div className="flex flex-col items-end gap-1.5">
                  <p className="max-w-xs text-right text-xs text-bark-500">
                    Save this to your Garden Project &mdash; carries your saved ZIP code and crops forward from your other results.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={addToGardenProject}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#E8A94A]/20 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-[#E8A94A]/50 transition hover:bg-[#E8A94A]/30"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 2c3 4 6 8 6 12a6 6 0 0 1-12 0c0-4 3-8 6-12Z" fill="currentColor" />
                      </svg>
                      {projectSaved ? 'Added to Garden Project ✓' : 'Add to my Garden Project'}
                    </button>
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
