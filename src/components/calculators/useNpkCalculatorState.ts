import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import { trackEvent, getCalculatorName } from '../../lib/analytics';

// Extracted from NpkCalculator.tsx (Calculator Page Redesign rollout -- see
// CALC_ROLLOUT_PATTERN.md). This hook is the single source of truth for all
// three of this calculator's modes -- granular application rate, liquid
// dilution/PPM, and multi-product blending -- so the sticky panel's action
// row and the Share/Embed/Cite modal can read/reset the same state as the
// card even though they render outside the card's own component tree.

export type Mode = 'granular' | 'liquid' | 'blend';
export type UnitSystem = 'imperial' | 'metric';
export type LiquidInputMode = 'ppm' | 'ratio';

const STORAGE_KEY = 'npk-calculator-state-v1';

// Unit conversion constants
const OZ_TO_G = 28.3495;
const GAL_TO_L = 3.78541;
// ppm = (oz fertilizer per gallon) x %N x IMPERIAL_PPM_CONST
const IMPERIAL_PPM_CONST = (OZ_TO_G * 1000) / (100 * GAL_TO_L); // ~74.9
// ppm = (grams fertilizer per liter) x %N x METRIC_PPM_CONST
const METRIC_PPM_CONST = 1000 / 100; // = 10

export interface BlendProduct {
  name: string;
  n: string;
  p: string;
  k: string;
}

export interface SavedState {
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

export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function sanitizeNumericInput(raw: string): string {
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

// Free-text product names (blend mode) -- stripped of HTML the same way the
// numeric sanitizer is, and length-capped so a stray/adversarial query
// param can't bloat the saved state or the shared URL.
function sanitizeTextInput(raw: string): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/<[^>]*>/g, '').replace(/[<>]/g, '').slice(0, 60);
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

export const DEFAULT_BLEND_2: BlendProduct[] = [
  { name: 'Urea', n: '46', p: '0', k: '0' },
  { name: '10-10-10', n: '10', p: '10', k: '10' },
];

export const DEFAULT_BLEND_3: BlendProduct[] = [
  { name: 'Urea', n: '46', p: '0', k: '0' },
  { name: 'Triple Superphosphate', n: '0', p: '46', k: '0' },
  { name: 'Muriate of Potash', n: '0', p: '0', k: '60' },
];

// Non-negative decimal, matching what sanitizeNumericInput() ever produces --
// used to validate every numeric query param the same defensive way the
// pilot validates its own.
const NUM_RE = /^\d*\.?\d*$/;

/**
 * Reads this calculator's inputs from the page's URL query string -- the
 * foundation of the "share with results" feature. Unlike the single-mode
 * pilot calculators, this one has three mutually exclusive modes with
 * different field sets, so the URL always carries an explicit `mode` param
 * plus that mode's own fields -- there's no reliable way to infer which
 * mode a bare set of params belongs to, so a URL without a recognized
 * `mode` value is treated as not a "shared result" link at all (falls
 * through to the visitor's own saved state instead).
 *
 * Within the recognized mode, this still only returns a non-null object
 * when at least one of that mode's 2-3 primary-result fields is present
 * (granRate/granArea/granN for granular; liqContainer/liqTargetPpm/
 * liqRatioAmt for liquid; blendTargetN/b1n for blend) -- mirroring the
 * pilot's guard so a plain bookmarked/`?mode=granular` URL never silently
 * overrides a returning visitor's saved state with blanks.
 *
 * Blend mode's product list IS included here, unlike the accumulation log
 * on the Growing Degree Days calculator: that log is an open-ended,
 * user-grown list with no fixed shape, which doesn't serialize into a
 * short URL. Blend mode's list is capped at exactly 2 or 3 products by the
 * UI itself (never more, never user-appendable), so it's a fixed, bounded
 * set of fields (b1..b3, each name/n/p/k) -- the same kind of "small,
 * fixed field count" the rest of this calculator's state already is, so it
 * serializes cleanly rather than needing to be treated as unshareable.
 */
export function readStateFromUrl(): Partial<SavedState> | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);

  const modeParam = params.get('mode');
  const mode: Mode | null =
    modeParam === 'granular' || modeParam === 'liquid' || modeParam === 'blend' ? modeParam : null;
  if (!mode) return null;

  if (mode === 'granular' && !params.has('granRate') && !params.has('granArea') && !params.has('granN')) return null;
  if (mode === 'liquid' && !params.has('liqContainer') && !params.has('liqTargetPpm') && !params.has('liqRatioAmt')) return null;
  if (mode === 'blend' && !params.has('blendTargetN') && !params.has('b1n')) return null;

  const out: Partial<SavedState> = { mode };

  const units = params.get('units');
  if (units === 'imperial' || units === 'metric') out.unitSystem = units;

  if (mode === 'granular') {
    const granN = params.get('granN');
    const granP = params.get('granP');
    const granK = params.get('granK');
    const granRate = params.get('granRate');
    const granArea = params.get('granArea');
    if (granN && NUM_RE.test(granN)) out.granN = granN;
    if (granP && NUM_RE.test(granP)) out.granP = granP;
    if (granK && NUM_RE.test(granK)) out.granK = granK;
    if (granRate && NUM_RE.test(granRate)) out.granRate = granRate;
    if (granArea && NUM_RE.test(granArea)) out.granArea = granArea;
  }

  if (mode === 'liquid') {
    const liqN = params.get('liqN');
    const liqP = params.get('liqP');
    const liqK = params.get('liqK');
    const liqInputMode = params.get('liqInputMode');
    const liqTargetPpm = params.get('liqTargetPpm');
    const liqRatioAmt = params.get('liqRatioAmt');
    const liqRatioVol = params.get('liqRatioVol');
    const liqContainer = params.get('liqContainer');
    if (liqN && NUM_RE.test(liqN)) out.liqN = liqN;
    if (liqP && NUM_RE.test(liqP)) out.liqP = liqP;
    if (liqK && NUM_RE.test(liqK)) out.liqK = liqK;
    if (liqInputMode === 'ppm' || liqInputMode === 'ratio') out.liqInputMode = liqInputMode;
    if (liqTargetPpm && NUM_RE.test(liqTargetPpm)) out.liqTargetPpm = liqTargetPpm;
    if (liqRatioAmt && NUM_RE.test(liqRatioAmt)) out.liqRatioAmt = liqRatioAmt;
    if (liqRatioVol && NUM_RE.test(liqRatioVol)) out.liqRatioVol = liqRatioVol;
    if (liqContainer && NUM_RE.test(liqContainer)) out.liqContainer = liqContainer;
  }

  if (mode === 'blend') {
    const blendCountParam = params.get('blendCount');
    const hasThird = params.has('b3n') || params.has('b3p') || params.has('b3k') || params.has('b3name');
    const blendCount: 2 | 3 = blendCountParam === '3' ? 3 : blendCountParam === '2' ? 2 : hasThird ? 3 : 2;
    out.blendCount = blendCount;

    const base = blendCount === 2 ? DEFAULT_BLEND_2 : DEFAULT_BLEND_3;
    const products: BlendProduct[] = [];
    for (let i = 0; i < blendCount; i += 1) {
      const idx = i + 1;
      const nameRaw = params.get(`b${idx}name`);
      const nRaw = params.get(`b${idx}n`);
      const pRaw = params.get(`b${idx}p`);
      const kRaw = params.get(`b${idx}k`);
      products.push({
        name: nameRaw !== null ? sanitizeTextInput(nameRaw) : base[i].name,
        n: nRaw && NUM_RE.test(nRaw) ? nRaw : base[i].n,
        p: pRaw && NUM_RE.test(pRaw) ? pRaw : base[i].p,
        k: kRaw && NUM_RE.test(kRaw) ? kRaw : base[i].k,
      });
    }
    out.blendProducts = products;

    const blendTargetN = params.get('blendTargetN');
    const blendTargetP = params.get('blendTargetP');
    const blendTargetK = params.get('blendTargetK');
    const blendRate = params.get('blendRate');
    const blendArea = params.get('blendArea');
    if (blendTargetN && NUM_RE.test(blendTargetN)) out.blendTargetN = blendTargetN;
    if (blendTargetP && NUM_RE.test(blendTargetP)) out.blendTargetP = blendTargetP;
    if (blendTargetK && NUM_RE.test(blendTargetK)) out.blendTargetK = blendTargetK;
    if (blendRate && NUM_RE.test(blendRate)) out.blendRate = blendRate;
    if (blendArea && NUM_RE.test(blendArea)) out.blendArea = blendArea;
  }

  return out;
}

export interface GranularResult {
  totalN: number;
  product: number;
  unit: string;
}

export interface LiquidResult {
  ratePerVol: number;
  resultingPpm: number;
  totalConcentrate: number;
  unit: string;
  volUnit: string;
}

export interface BlendResult {
  feasible: boolean;
  exact: boolean;
  reason: string | null;
  weights: number[] | null;
  resultingP: number | null;
  resultingK: number | null;
  targetPAmt: number;
  targetKAmt: number;
  unit: string;
  products: { name: string; n: number; p: number; k: number }[];
}

export function useNpkCalculatorState() {
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
    // A shared link's query params take priority over this browser's own
    // saved state -- someone opening a shared result should see THAT
    // result, not their own last visit, even if they've used the
    // calculator here before.
    const fromUrl = readStateFromUrl();
    const s = fromUrl ?? loadSavedState();

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
  const granResult: GranularResult | null = useMemo(() => {
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
  const liqResult: LiquidResult | null = useMemo(() => {
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
  const blendResult: BlendResult | null = useMemo(() => {
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
    // Fires on the export click itself, before jsPDF runs, so a slow or
    // failed PDF render still records the user's intent to export.
    trackEvent('pdf_export_click', { calculator_name: getCalculatorName() });
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
    doc.text(`Generated ${dateStr} — HarvestMath.com`, margin, y);
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

  /** Restores the calculator's original defaults -- the action panel's Reset button. */
  const reset = () => {
    setMode('granular');
    setUnitSystem('imperial');
    setGranN('10');
    setGranP('10');
    setGranK('10');
    setGranRate('1');
    setGranArea('5000');
    setLiqN('20');
    setLiqP('20');
    setLiqK('20');
    setLiqInputMode('ppm');
    setLiqTargetPpm('200');
    setLiqRatioAmt('1');
    setLiqRatioVol('5');
    setLiqContainer('25');
    setBlendCount(2);
    setBlendProducts(DEFAULT_BLEND_2);
    setBlendTargetN('3');
    setBlendTargetP('1');
    setBlendTargetK('2');
    setBlendRate('1');
    setBlendArea('5000');
  };

  return {
    mode,
    setMode,
    unitSystem,
    setUnitSystem,
    isMetric,
    granN, setGranN,
    granP, setGranP,
    granK, setGranK,
    granRate, setGranRate,
    granArea, setGranArea,
    liqN, setLiqN,
    liqP, setLiqP,
    liqK, setLiqK,
    liqInputMode, setLiqInputMode,
    liqTargetPpm, setLiqTargetPpm,
    liqRatioAmt, setLiqRatioAmt,
    liqRatioVol, setLiqRatioVol,
    liqContainer, setLiqContainer,
    blendCount,
    blendProducts,
    blendTargetN, setBlendTargetN,
    blendTargetP, setBlendTargetP,
    blendTargetK, setBlendTargetK,
    blendRate, setBlendRate,
    blendArea, setBlendArea,
    handleNumericChange,
    handleBlendProductChange,
    setBlendSize,
    granResult,
    liqResult,
    blendResult,
    exportPdf,
    reset,
  };
}

export type NpkCalculatorState = ReturnType<typeof useNpkCalculatorState>;
