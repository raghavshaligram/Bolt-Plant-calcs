import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type Mode = 'granular' | 'liquid' | 'blend';
type UnitSystem = 'imperial' | 'metric';
type LiquidInputMode = 'ppm' | 'ratio';

const STORAGE_KEY = 'npk-calculator-state-v1';

// Unit conversion constants
const OZ_TO_G = 28.3495;
const GAL_TO_L = 3.78541;
const LB_TO_KG = 0.453592;
const SQFT_TO_M2 = 0.092903;
// ppm = (oz fertilizer per gallon) x %N x IMPERIAL_PPM_CONST
const IMPERIAL_PPM_CONST = (OZ_TO_G * 1000) / (100 * GAL_TO_L); // ~74.9
// ppm = (grams fertilizer per liter) x %N x METRIC_PPM_CONST
const METRIC_PPM_CONST = 1000 / 100; // = 10

interface BlendProduct {
  name: string;
  n: string;
  p: string;
  k: string;
}

interface SavedState {
  mode: Mode;
  unitSystem: UnitSystem;
  // granular
  granN: string;
  granP: string;
  granK: string;
  granRate: string;
  granArea: string;
  // liquid
  liqN: string;
  liqP: string;
  liqK: string;
  liqInputMode: LiquidInputMode;
  liqTargetPpm: string;
  liqRatioAmt: string;
  liqRatioVol: string;
  liqContainer: string;
  // blend
  blendCount: number;
  blendProducts: BlendProduct[];
  blendTargetN: string;
  blendTargetP: string;
  blendTargetK: string;
  blendRate: string;
  blendArea: string;
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

const DEFAULT_BLEND_2: BlendProduct[] = [
  { name: 'Urea', n: '46', p: '0', k: '0' },
  { name: '10-10-10', n: '10', p: '10', k: '10' },
];

const DEFAULT_BLEND_3: BlendProduct[] = [
  { name: 'Urea', n: '46', p: '0', k: '0' },
  { name: 'Triple Superphosphate', n: '0', p: '46', k: '0' },
  { name: 'Muriate of Potash', n: '0', p: '0', k: '60' },
];

export default function NpkCalculator() {
  const hasLoaded = useRef(false);

  const [mode, setMode] = useState<Mode>('granular');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');

  // Granular state
  const [granN, setGranN] = useState('10');
  const [granP, setGranP] = useState('10');
  const [granK, setGranK] = useState('10');
  const [granRate, setGranRate] = useState('1');
  const [granArea, setGranArea] = useState('5000');

  // Liquid state
  const [liqN, setLiqN] = useState('20');
  const [liqP, setLiqP] = useState('20');
  const [liqK, setLiqK] = useState('20');
  const [liqInputMode, setLiqInputMode] = useState<LiquidInputMode>('ppm');
  const [liqTargetPpm, setLiqTargetPpm] = useState('200');
  const [liqRatioAmt, setLiqRatioAmt] = useState('1');
  const [liqRatioVol, setLiqRatioVol] = useState('5');
  const [liqContainer, setLiqContainer] = useState('25');

  // Blend state
  const [blendCount, setBlendCount] = useState<2 | 3>(2);
  const [blendProducts, setBlendProducts] = useState<BlendProduct[]>(DEFAULT_BLEND_2);
  const [blendTargetN, setBlendTargetN] = useState('3');
  const [blendTargetP, setBlendTargetP] = useState('1');
  const [blendTargetK, setBlendTargetK] = useState('2');
  const [blendRate, setBlendRate] = useState('1');
  const [blendArea, setBlendArea] = useState('5000');

  useEffect(() => {
    const s = loadSavedState();
    if (s.mode) setMode(s.mode);
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.granN !== undefined) setGranN(s.granN);
    if (s.granP !== undefined) setGranP(s.granP);
    if (s.granK !== undefined) setGranK(s.granK);
    if (s.granRate !== undefined) setGranRate(s.granRate);
    if (s.granArea !== undefined) setGranArea(s.granArea);
    if (s.liqN !== undefined) setLiqN(s.liqN);
    if (s.liqP !== undefined) setLiqP(s.liqP);
    if (s.liqK !== undefined) setLiqK(s.liqK);
    if (s.liqInputMode) setLiqInputMode(s.liqInputMode);
    if (s.liqTargetPpm !== undefined) setLiqTargetPpm(s.liqTargetPpm);
    if (s.liqRatioAmt !== undefined) setLiqRatioAmt(s.liqRatioAmt);
    if (s.liqRatioVol !== undefined) setLiqRatioVol(s.liqRatioVol);
    if (s.liqContainer !== undefined) setLiqContainer(s.liqContainer);
    if (s.blendCount) setBlendCount(s.blendCount as 2 | 3);
    if (s.blendProducts && Array.isArray(s.blendProducts) && s.blendProducts.length >= 2) {
      setBlendProducts(s.blendProducts);
    }
    if (s.blendTargetN !== undefined) setBlendTargetN(s.blendTargetN);
    if (s.blendTargetP !== undefined) setBlendTargetP(s.blendTargetP);
    if (s.blendTargetK !== undefined) setBlendTargetK(s.blendTargetK);
    if (s.blendRate !== undefined) setBlendRate(s.blendRate);
    if (s.blendArea !== undefined) setBlendArea(s.blendArea);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({
      mode, unitSystem,
      granN, granP, granK, granRate, granArea,
      liqN, liqP, liqK, liqInputMode, liqTargetPpm, liqRatioAmt, liqRatioVol, liqContainer,
      blendCount, blendProducts, blendTargetN, blendTargetP, blendTargetK, blendRate, blendArea,
    });
  }, [mode, unitSystem, granN, granP, granK, granRate, granArea, liqN, liqP, liqK, liqInputMode,
      liqTargetPpm, liqRatioAmt, liqRatioVol, liqContainer, blendCount, blendProducts,
      blendTargetN, blendTargetP, blendTargetK, blendRate, blendArea]);

  const isMetric = unitSystem === 'metric';

  const handleNumericChange = (setter: (v: string) => void) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(enforceNonNegative(sanitizeNumericInput(e.target.value)));
    };

  const handleBlendProductChange = (index: number, field: keyof BlendProduct) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === 'name' ? e.target.value : enforceNonNegative(sanitizeNumericInput(e.target.value));
      setBlendProducts((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    };

  const setBlendSize = (count: 2 | 3) => {
    setBlendCount(count);
    setBlendProducts(count === 2 ? DEFAULT_BLEND_2 : DEFAULT_BLEND_3);
  };

  // ---------- GRANULAR ----------
  const granResult = useMemo(() => {
    const nPct = parseFloat(granN) || 0;
    const rate = parseFloat(granRate) || 0;
    const area = parseFloat(granArea) || 0;
    if (nPct <= 0 || rate <= 0 || area <= 0) return null;

    if (isMetric) {
      // rate is g N / m², area in m²
      const totalNGrams = rate * area;
      const productGrams = totalNGrams / (nPct / 100);
      return { totalN: totalNGrams / 1000, product: productGrams / 1000, unit: 'kg' };
    }
    const totalNLbs = (rate * area) / 1000;
    const productLbs = totalNLbs / (nPct / 100);
    return { totalN: totalNLbs, product: productLbs, unit: 'lb' };
  }, [granN, granRate, granArea, isMetric]);

  // ---------- LIQUID ----------
  const liqResult = useMemo(() => {
    const nPct = parseFloat(liqN) || 0;
    const container = parseFloat(liqContainer) || 0;
    if (nPct <= 0 || container <= 0) return null;

    const constFactor = isMetric ? METRIC_PPM_CONST : IMPERIAL_PPM_CONST;

    let ratePerVol = 0; // oz/gal or g/L
    let resultingPpm = 0;

    if (liqInputMode === 'ppm') {
      const targetPpm = parseFloat(liqTargetPpm) || 0;
      if (targetPpm <= 0) return null;
      ratePerVol = targetPpm / (nPct * constFactor);
      resultingPpm = targetPpm;
    } else {
      const amt = parseFloat(liqRatioAmt) || 0;
      const vol = parseFloat(liqRatioVol) || 0;
      if (amt <= 0 || vol <= 0) return null;
      ratePerVol = amt / vol;
      resultingPpm = ratePerVol * nPct * constFactor;
    }

    const totalConcentrate = ratePerVol * container;
    return {
      ratePerVol,
      resultingPpm,
      totalConcentrate,
      unit: isMetric ? 'g' : 'oz',
      volUnit: isMetric ? 'L' : 'gal',
    };
  }, [liqN, liqInputMode, liqTargetPpm, liqRatioAmt, liqRatioVol, liqContainer, isMetric]);

  // ---------- BLEND ----------
  const blendResult = useMemo(() => {
    const rate = parseFloat(blendRate) || 0;
    const area = parseFloat(blendArea) || 0;
    const tN = parseFloat(blendTargetN) || 0;
    const tP = parseFloat(blendTargetP) || 0;
    const tK = parseFloat(blendTargetK) || 0;

    if (rate <= 0 || area <= 0 || tN <= 0) return null;

    const totalNTarget = isMetric ? rate * area / 1000 : (rate * area) / 1000; // kg or lb, same shape
    const targetPAmt = totalNTarget * (tP / tN);
    const targetKAmt = totalNTarget * (tK / tN);

    const products = blendProducts.slice(0, blendCount).map((p) => ({
      name: p.name || 'Fertilizer',
      n: (parseFloat(p.n) || 0) / 100,
      p: (parseFloat(p.p) || 0) / 100,
      k: (parseFloat(p.k) || 0) / 100,
    }));

    const EPS = 1e-6;
    const unit = isMetric ? 'kg' : 'lb';

    if (blendCount === 2) {
      const [f1, f2] = products;
      const det = f1.n * f2.p - f2.n * f1.p;
      if (Math.abs(det) < EPS) {
        return {
          feasible: false,
          exact: false,
          reason: 'These two products have the same N:P ratio as each other, so the system can’t be solved independently — pick two products with different N:P proportions.',
          weights: null,
          resultingP: null,
          resultingK: null,
          targetPAmt, targetKAmt, unit, products,
        };
      }
      const w1 = (totalNTarget * f2.p - targetPAmt * f2.n) / det;
      const w2 = (f1.n * targetPAmt - f1.p * totalNTarget) / det;
      const resultingK = w1 * f1.k + w2 * f2.k;
      const feasible = w1 >= -EPS && w2 >= -EPS;
      const kDiff = Math.abs(resultingK - targetKAmt);
      const exact = feasible && kDiff <= Math.max(0.02 * targetKAmt, 0.01);

      return {
        feasible,
        exact,
        reason: feasible
          ? null
          : 'Hitting your target N and P exactly would require a negative amount of one product — not achievable with these two fertilizers. Try a different pair, or add a third product.',
        weights: feasible ? [w1, w2] : [Math.max(w1, 0), Math.max(w2, 0)],
        resultingP: targetPAmt,
        resultingK,
        targetPAmt, targetKAmt, unit, products,
      };
    }

    // 3-product case: solve 3x3 system via Cramer's rule
    const [f1, f2, f3] = products;
    const M = [
      [f1.n, f2.n, f3.n],
      [f1.p, f2.p, f3.p],
      [f1.k, f2.k, f3.k],
    ];
    const T = [totalNTarget, targetPAmt, targetKAmt];

    const det3 = (m: number[][]) =>
      m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
      m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
      m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);

    const detM = det3(M);

    if (Math.abs(detM) < EPS) {
      return {
        feasible: false,
        exact: false,
        reason: 'These three products don’t provide enough independent N-P-K combinations to solve for an exact blend (two of them may be proportional). Try a more different third product.',
        weights: null,
        resultingP: null,
        resultingK: null,
        targetPAmt, targetKAmt, unit, products,
      };
    }

    const replaceCol = (m: number[][], col: number, vec: number[]) =>
      m.map((row, i) => row.map((v, j) => (j === col ? vec[i] : v)));

    const w1 = det3(replaceCol(M, 0, T)) / detM;
    const w2 = det3(replaceCol(M, 1, T)) / detM;
    const w3 = det3(replaceCol(M, 2, T)) / detM;

    const feasible = w1 >= -EPS && w2 >= -EPS && w3 >= -EPS;

    return {
      feasible,
      exact: feasible,
      reason: feasible
        ? null
        : 'An exact match would require a negative amount of at least one product — not achievable with these three fertilizers as chosen. Try different products or a different target ratio.',
      weights: feasible ? [w1, w2, w3] : [Math.max(w1, 0), Math.max(w2, 0), Math.max(w3, 0)],
      resultingP: targetPAmt,
      resultingK: targetKAmt,
      targetPAmt, targetKAmt, unit, products,
    };
  }, [blendProducts, blendCount, blendTargetN, blendTargetP, blendTargetK, blendRate, blendArea, isMetric]);

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('NPK Calculator Results', margin, y);
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
    doc.text(`Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`, margin, y);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    if (mode === 'granular' && granResult) {
      const lines = [
        `Fertilizer: ${granN}-${granP}-${granK}`,
        `Target rate: ${granRate} ${isMetric ? 'g N/m²' : 'lb N/1,000 sq ft'}`,
        `Area: ${granArea} ${isMetric ? 'm²' : 'sq ft'}`,
        '',
        `Total N needed: ${round(granResult.totalN, 2)} ${granResult.unit}`,
        `Fertilizer product needed: ${round(granResult.product, 2)} ${granResult.unit}`,
      ];
      lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    } else if (mode === 'liquid' && liqResult) {
      const lines = [
        `Fertilizer: ${liqN}-${liqP}-${liqK}`,
        `Container size: ${liqContainer} ${liqResult.volUnit}`,
        '',
        `Rate: ${round(liqResult.ratePerVol, 3)} ${liqResult.unit}/${liqResult.volUnit}`,
        `Resulting PPM (N): ${round(liqResult.resultingPpm, 1)}`,
        `Total concentrate for container: ${round(liqResult.totalConcentrate, 2)} ${liqResult.unit}`,
      ];
      lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
    } else if (mode === 'blend' && blendResult) {
      doc.text(`Target ratio: ${blendTargetN}-${blendTargetP}-${blendTargetK}`, margin, y); y += 16;
      doc.text(`Feasible exact match: ${blendResult.exact ? 'Yes' : 'No'}`, margin, y); y += 16;
      if (blendResult.reason) { doc.text(blendResult.reason, margin, y, { maxWidth: 500 }); y += 32; }
      if (blendResult.weights) {
        blendResult.products.forEach((p, i) => {
          doc.text(`${p.name}: ${round(blendResult.weights![i], 2)} ${blendResult.unit}`, margin, y);
          y += 16;
        });
      }
    }

    y += 20;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Application rates are general guidance. Always follow product label instructions', margin, y); y += 12;
    doc.text('and, where possible, a current soil test.', margin, y);

    doc.save('npk-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">NPK Calculator</h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Mode + unit toggles */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">Calculation type</span>
              <div className="mt-2 inline-flex flex-wrap gap-1 rounded-lg bg-sand-100 p-1" role="tablist">
                {(['granular', 'liquid', 'blend'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => setMode(m)}
                    className={`rounded-md px-3.5 py-1.5 text-sm font-medium capitalize transition ${
                      mode === m ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
                    }`}
                  >
                    {m}
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

          {/* ---------------- GRANULAR ---------------- */}
          {mode === 'granular' && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="npk-gran-n" className="label-field">N %</label>
                  <input id="npk-gran-n" type="number" inputMode="decimal" min="0" max="100" step="1"
                    value={granN} onChange={handleNumericChange(setGranN)} className="input-field mt-1.5" />
                </div>
                <div>
                  <label htmlFor="npk-gran-p" className="label-field">P %</label>
                  <input id="npk-gran-p" type="number" inputMode="decimal" min="0" max="100" step="1"
                    value={granP} onChange={handleNumericChange(setGranP)} className="input-field mt-1.5" />
                </div>
                <div>
                  <label htmlFor="npk-gran-k" className="label-field">K %</label>
                  <input id="npk-gran-k" type="number" inputMode="decimal" min="0" max="100" step="1"
                    value={granK} onChange={handleNumericChange(setGranK)} className="input-field mt-1.5" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="npk-gran-rate" className="label-field">
                    Target rate <span className="text-bark-500">({isMetric ? 'g N/m²' : 'lb N per 1,000 sq ft'})</span>
                  </label>
                  <input id="npk-gran-rate" type="number" inputMode="decimal" min="0" step="0.1"
                    value={granRate} onChange={handleNumericChange(setGranRate)} className="input-field mt-1.5" />
                </div>
                <div>
                  <label htmlFor="npk-gran-area" className="label-field">
                    Area <span className="text-bark-500">({isMetric ? 'm²' : 'sq ft'})</span>
                  </label>
                  <input id="npk-gran-area" type="number" inputMode="decimal" min="0" step="1"
                    value={granArea} onChange={handleNumericChange(setGranArea)} className="input-field mt-1.5" />
                </div>
              </div>

              <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
                <p className="font-medium text-bark-700">The math:</p>
                <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                  Total N = Rate &times; (Area &divide; {isMetric ? '1' : '1,000'})
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  Fertilizer Needed = Total N &divide; (N% &divide; 100)
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!granResult ? (
                  <p className="p-5 text-sm text-bark-500">Enter your fertilizer&rsquo;s N%, target rate, and area to see how much product you need.</p>
                ) : (
                  <div className="grid grid-cols-2 divide-x divide-moss-200">
                    <div className="p-4 sm:p-5">
                      <p className="text-xs text-bark-500">Total actual N needed</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">{round(granResult.totalN, 2)}</p>
                      <p className="text-xs font-medium text-bark-600">{granResult.unit}</p>
                    </div>
                    <div className="bg-moss-700 p-4 sm:p-5">
                      <p className="text-xs text-moss-200">Fertilizer product needed</p>
                      <p className="font-display text-2xl font-bold text-white sm:text-3xl">{round(granResult.product, 2)}</p>
                      <p className="text-xs text-moss-200">{granResult.unit} of {granN}-{granP}-{granK}</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ---------------- LIQUID ---------------- */}
          {mode === 'liquid' && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="npk-liq-n" className="label-field">N %</label>
                  <input id="npk-liq-n" type="number" inputMode="decimal" min="0" max="100" step="1"
                    value={liqN} onChange={handleNumericChange(setLiqN)} className="input-field mt-1.5" />
                </div>
                <div>
                  <label htmlFor="npk-liq-p" className="label-field">P %</label>
                  <input id="npk-liq-p" type="number" inputMode="decimal" min="0" max="100" step="1"
                    value={liqP} onChange={handleNumericChange(setLiqP)} className="input-field mt-1.5" />
                </div>
                <div>
                  <label htmlFor="npk-liq-k" className="label-field">K %</label>
                  <input id="npk-liq-k" type="number" inputMode="decimal" min="0" max="100" step="1"
                    value={liqK} onChange={handleNumericChange(setLiqK)} className="input-field mt-1.5" />
                </div>
              </div>

              <div>
                <span className="label-field">How do you want to set strength?</span>
                <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                  <button type="button" role="tab" aria-selected={liqInputMode === 'ppm'}
                    onClick={() => setLiqInputMode('ppm')}
                    className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${liqInputMode === 'ppm' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                    Target PPM
                  </button>
                  <button type="button" role="tab" aria-selected={liqInputMode === 'ratio'}
                    onClick={() => setLiqInputMode('ratio')}
                    className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${liqInputMode === 'ratio' ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                    Dilution Ratio
                  </button>
                </div>
              </div>

              {liqInputMode === 'ppm' ? (
                <div>
                  <label htmlFor="npk-liq-ppm" className="label-field">Target PPM (N)</label>
                  <input id="npk-liq-ppm" type="number" inputMode="decimal" min="0" step="1"
                    value={liqTargetPpm} onChange={handleNumericChange(setLiqTargetPpm)} className="input-field mt-1.5" />
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="npk-liq-ratio-amt" className="label-field">
                      Fertilizer amount <span className="text-bark-500">({isMetric ? 'g' : 'oz'})</span>
                    </label>
                    <input id="npk-liq-ratio-amt" type="number" inputMode="decimal" min="0" step="0.1"
                      value={liqRatioAmt} onChange={handleNumericChange(setLiqRatioAmt)} className="input-field mt-1.5" />
                  </div>
                  <div>
                    <label htmlFor="npk-liq-ratio-vol" className="label-field">
                      Per water volume <span className="text-bark-500">({isMetric ? 'L' : 'gal'})</span>
                    </label>
                    <input id="npk-liq-ratio-vol" type="number" inputMode="decimal" min="0" step="0.1"
                      value={liqRatioVol} onChange={handleNumericChange(setLiqRatioVol)} className="input-field mt-1.5" />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="npk-liq-container" className="label-field">
                  Container size <span className="text-bark-500">({isMetric ? 'L' : 'gal'})</span>
                </label>
                <input id="npk-liq-container" type="number" inputMode="decimal" min="0" step="1"
                  value={liqContainer} onChange={handleNumericChange(setLiqContainer)} className="input-field mt-1.5" />
              </div>

              <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
                <p className="font-medium text-bark-700">The math:</p>
                <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                  {isMetric ? 'PPM = (g fertilizer ÷ L water) × N% × 10' : 'PPM = (oz fertilizer ÷ gal water) × N% × 74.9'}
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  Concentrate for container = Rate per {isMetric ? 'liter' : 'gallon'} &times; Container size
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!liqResult ? (
                  <p className="p-5 text-sm text-bark-500">Enter your fertilizer&rsquo;s N%, desired strength, and container size to see how much concentrate to add.</p>
                ) : (
                  <div className="grid grid-cols-2 divide-x divide-moss-200">
                    <div className="p-4 sm:p-5">
                      <p className="text-xs text-bark-500">Concentrate for container</p>
                      <p className="font-display text-2xl font-bold text-moss-700 sm:text-3xl">{round(liqResult.totalConcentrate, 2)}</p>
                      <p className="text-xs font-medium text-bark-600">{liqResult.unit} ({round(liqResult.ratePerVol, 3)} {liqResult.unit}/{liqResult.volUnit})</p>
                    </div>
                    <div className="bg-moss-700 p-4 sm:p-5">
                      <p className="text-xs text-moss-200">Resulting strength</p>
                      <p className="font-display text-2xl font-bold text-white sm:text-3xl">{round(liqResult.resultingPpm, 1)}</p>
                      <p className="text-xs text-moss-200">PPM (N)</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* ---------------- BLEND ---------------- */}
          {mode === 'blend' && (
            <>
              <div>
                <span className="label-field">Number of fertilizers to blend</span>
                <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist">
                  <button type="button" role="tab" aria-selected={blendCount === 2}
                    onClick={() => setBlendSize(2)}
                    className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${blendCount === 2 ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                    2 products
                  </button>
                  <button type="button" role="tab" aria-selected={blendCount === 3}
                    onClick={() => setBlendSize(3)}
                    className={`rounded-md px-3.5 py-1.5 text-sm font-medium transition ${blendCount === 3 ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'}`}>
                    3 products
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {blendProducts.slice(0, blendCount).map((p, i) => (
                  <div key={i} className="rounded-lg border border-moss-100 p-3">
                    <label htmlFor={`npk-blend-name-${i}`} className="label-field">Fertilizer {i + 1} name</label>
                    <input id={`npk-blend-name-${i}`} type="text" value={p.name}
                      onChange={handleBlendProductChange(i, 'name')} className="input-field mt-1.5" />
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <div>
                        <label htmlFor={`npk-blend-n-${i}`} className="label-field">N%</label>
                        <input id={`npk-blend-n-${i}`} type="number" inputMode="decimal" min="0" max="100" step="1"
                          value={p.n} onChange={handleBlendProductChange(i, 'n')} className="input-field mt-1" />
                      </div>
                      <div>
                        <label htmlFor={`npk-blend-p-${i}`} className="label-field">P%</label>
                        <input id={`npk-blend-p-${i}`} type="number" inputMode="decimal" min="0" max="100" step="1"
                          value={p.p} onChange={handleBlendProductChange(i, 'p')} className="input-field mt-1" />
                      </div>
                      <div>
                        <label htmlFor={`npk-blend-k-${i}`} className="label-field">K%</label>
                        <input id={`npk-blend-k-${i}`} type="number" inputMode="decimal" min="0" max="100" step="1"
                          value={p.k} onChange={handleBlendProductChange(i, 'k')} className="input-field mt-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="npk-blend-tn" className="label-field">Target N</label>
                  <input id="npk-blend-tn" type="number" inputMode="decimal" min="0" step="1"
                    value={blendTargetN} onChange={handleNumericChange(setBlendTargetN)} className="input-field mt-1.5" />
                </div>
                <div>
                  <label htmlFor="npk-blend-tp" className="label-field">Target P</label>
                  <input id="npk-blend-tp" type="number" inputMode="decimal" min="0" step="1"
                    value={blendTargetP} onChange={handleNumericChange(setBlendTargetP)} className="input-field mt-1.5" />
                </div>
                <div>
                  <label htmlFor="npk-blend-tk" className="label-field">Target K</label>
                  <input id="npk-blend-tk" type="number" inputMode="decimal" min="0" step="1"
                    value={blendTargetK} onChange={handleNumericChange(setBlendTargetK)} className="input-field mt-1.5" />
                </div>
              </div>
              <p className="text-xs text-bark-500">
                Target ratio is proportional (e.g. 3-1-2 or 10-10-10) &mdash; only the ratio between these three numbers matters, not their absolute size.
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="npk-blend-rate" className="label-field">
                    Target N rate <span className="text-bark-500">({isMetric ? 'g N/m²' : 'lb N per 1,000 sq ft'})</span>
                  </label>
                  <input id="npk-blend-rate" type="number" inputMode="decimal" min="0" step="0.1"
                    value={blendRate} onChange={handleNumericChange(setBlendRate)} className="input-field mt-1.5" />
                </div>
                <div>
                  <label htmlFor="npk-blend-area" className="label-field">
                    Area <span className="text-bark-500">({isMetric ? 'm²' : 'sq ft'})</span>
                  </label>
                  <input id="npk-blend-area" type="number" inputMode="decimal" min="0" step="1"
                    value={blendArea} onChange={handleNumericChange(setBlendArea)} className="input-field mt-1.5" />
                </div>
              </div>

              <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
                <p className="font-medium text-bark-700">The math:</p>
                <p className="mt-1 font-mono text-xs text-bark-600 sm:text-sm">
                  Solve w&#8321;&hellip;w&#8345; so that &Sigma;(w&#8305; &times; N%&#8305;) = Target N, and so on for P and K
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  2 products &rarr; solved exactly for N &amp; P; K checked against target
                </p>
                <p className="mt-1 font-mono text-xs text-bark-500 sm:text-sm">
                  3 products &rarr; solved exactly for N, P &amp; K simultaneously
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
                {!blendResult ? (
                  <p className="p-5 text-sm text-bark-500">Fill in each fertilizer&rsquo;s N-P-K, your target ratio, rate, and area to see the blend.</p>
                ) : !blendResult.weights ? (
                  <div className="p-5">
                    <p className="text-sm font-semibold text-sand-700">Can&rsquo;t solve this blend</p>
                    <p className="mt-1 text-sm text-bark-600">{blendResult.reason}</p>
                  </div>
                ) : (
                  <>
                    <div className={`px-4 py-3 sm:px-5 ${blendResult.exact ? 'bg-moss-700' : 'bg-sand-600'}`}>
                      <p className="text-sm font-semibold text-white">
                        {blendResult.exact
                          ? 'Exact target ratio achievable ✓'
                          : 'Exact target ratio NOT achievable with these products'}
                      </p>
                      {!blendResult.exact && (
                        <p className="mt-1 text-xs text-white/90">{blendResult.reason ?? 'Showing the closest match: N and P hit exactly, K falls short of or exceeds target (see below).'}</p>
                      )}
                    </div>
                    <div className="divide-y divide-moss-200">
                      {blendResult.products.map((p, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-2.5 sm:px-5">
                          <span className="text-sm text-bark-700">{p.name}</span>
                          <span className="font-display text-lg font-bold text-moss-700">
                            {round(blendResult.weights![i], 2)} {blendResult.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                    {!blendResult.exact && blendResult.resultingK !== null && (
                      <div className="border-t border-moss-200 bg-white px-4 py-2.5 text-xs text-bark-600 sm:px-5">
                        Resulting K: {round(blendResult.resultingK, 2)} {blendResult.unit} vs. target {round(blendResult.targetKAmt, 2)} {blendResult.unit}
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
