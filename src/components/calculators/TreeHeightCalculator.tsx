import { useEffect, useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';

type UnitSystem = 'imperial' | 'metric';
type Method = 'angle' | 'shadow' | 'stick';
type SlopeMode = 'none' | 'below' | 'above';

const STORAGE_KEY = 'tree-height-calculator-state-v1';

const DEG_TO_RAD = Math.PI / 180;

function round(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Lengths (distance, height, shadow, stick) can be decimals but not
// negative or garbage -- strip anything that isn't a digit or a single
// decimal point. Angle inputs reuse this too; negative angles aren't
// meaningful for this calculator (elevation is always measured upward
// from eye level, never below it).
function sanitizeNumberInput(raw: string): string {
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

interface SavedState {
  unitSystem: UnitSystem;
  method: Method;
  // Angle method
  angleDistance: string;
  angleTop: string;
  eyeHeight: string;
  slopeMode: SlopeMode;
  angleBase: string;
  // Shadow method
  treeShadow: string;
  refHeight: string;
  refShadow: string;
  // Stick method
  stickLength: string;
  armDistance: string;
  stickDistance: string;
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

export default function TreeHeightCalculator() {
  const hasLoaded = useRef(false);

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial');
  const [method, setMethod] = useState<Method>('angle');

  // Angle method
  const [angleDistance, setAngleDistance] = useState('50');
  const [angleTop, setAngleTop] = useState('28');
  const [eyeHeight, setEyeHeight] = useState('5.5');
  const [slopeMode, setSlopeMode] = useState<SlopeMode>('none');
  const [angleBase, setAngleBase] = useState('8');

  // Shadow method
  const [treeShadow, setTreeShadow] = useState('54');
  const [refHeight, setRefHeight] = useState('6');
  const [refShadow, setRefShadow] = useState('9');

  // Stick method
  const [stickLength, setStickLength] = useState('1.5');
  const [armDistance, setArmDistance] = useState('2');
  const [stickDistance, setStickDistance] = useState('60');

  useEffect(() => {
    const s = loadSavedState();
    if (s.unitSystem) setUnitSystem(s.unitSystem);
    if (s.method) setMethod(s.method);
    if (s.angleDistance !== undefined) setAngleDistance(s.angleDistance);
    if (s.angleTop !== undefined) setAngleTop(s.angleTop);
    if (s.eyeHeight !== undefined) setEyeHeight(s.eyeHeight);
    if (s.slopeMode) setSlopeMode(s.slopeMode);
    if (s.angleBase !== undefined) setAngleBase(s.angleBase);
    if (s.treeShadow !== undefined) setTreeShadow(s.treeShadow);
    if (s.refHeight !== undefined) setRefHeight(s.refHeight);
    if (s.refShadow !== undefined) setRefShadow(s.refShadow);
    if (s.stickLength !== undefined) setStickLength(s.stickLength);
    if (s.armDistance !== undefined) setArmDistance(s.armDistance);
    if (s.stickDistance !== undefined) setStickDistance(s.stickDistance);
    hasLoaded.current = true;
  }, []);

  useEffect(() => {
    if (!hasLoaded.current) return;
    saveState({
      unitSystem, method,
      angleDistance, angleTop, eyeHeight, slopeMode, angleBase,
      treeShadow, refHeight, refShadow,
      stickLength, armDistance, stickDistance,
    });
  }, [
    unitSystem, method,
    angleDistance, angleTop, eyeHeight, slopeMode, angleBase,
    treeShadow, refHeight, refShadow,
    stickLength, armDistance, stickDistance,
  ]);

  const isMetric = unitSystem === 'metric';
  const lengthUnit = isMetric ? 'm' : 'ft';

  // ---- Angle method -------------------------------------------------
  const angleResult = useMemo(() => {
    const dist = parseFloat(angleDistance);
    const top = parseFloat(angleTop);
    const eye = parseFloat(eyeHeight);
    if (!Number.isFinite(dist) || !Number.isFinite(top) || dist <= 0) {
      return { valid: false, height: 0 };
    }
    const topRad = top * DEG_TO_RAD;
    if (slopeMode === 'none') {
      const e = Number.isFinite(eye) ? eye : 0;
      const height = dist * Math.tan(topRad) + e;
      return { valid: true, height, mode: 'none' as const, dist, top, eye: e };
    }
    const base = parseFloat(angleBase);
    if (!Number.isFinite(base)) return { valid: false, height: 0 };
    const baseRad = base * DEG_TO_RAD;
    const height =
      slopeMode === 'below'
        ? dist * (Math.tan(topRad) + Math.tan(baseRad))
        : dist * (Math.tan(topRad) - Math.tan(baseRad));
    return { valid: true, height, mode: slopeMode, dist, top, base };
  }, [angleDistance, angleTop, eyeHeight, slopeMode, angleBase]);

  // ---- Shadow method --------------------------------------------------
  const shadowResult = useMemo(() => {
    const ts = parseFloat(treeShadow);
    const rh = parseFloat(refHeight);
    const rs = parseFloat(refShadow);
    if (!Number.isFinite(ts) || !Number.isFinite(rh) || !Number.isFinite(rs) || rs <= 0) {
      return { valid: false, height: 0 };
    }
    const height = (ts / rs) * rh;
    return { valid: true, height, ts, rh, rs };
  }, [treeShadow, refHeight, refShadow]);

  // ---- Stick method -----------------------------------------------------
  const stickResult = useMemo(() => {
    const sl = parseFloat(stickLength);
    const ad = parseFloat(armDistance);
    const sd = parseFloat(stickDistance);
    if (!Number.isFinite(sl) || !Number.isFinite(ad) || !Number.isFinite(sd) || ad <= 0) {
      return { valid: false, height: 0 };
    }
    const height = (sl / ad) * sd;
    return { valid: true, height, sl, ad, sd };
  }, [stickLength, armDistance, stickDistance]);

  const activeResult =
    method === 'angle' ? angleResult : method === 'shadow' ? shadowResult : stickResult;

  const formulaLine = useMemo(() => {
    if (method === 'angle' && angleResult.valid) {
      if (angleResult.mode === 'none') {
        return `(${angleResult.dist} × tan(${angleResult.top}°)) + ${angleResult.eye} = ${round(angleResult.height)} ${lengthUnit}`;
      }
      const sign = angleResult.mode === 'below' ? '+' : '−';
      return `${angleResult.dist} × (tan(${angleResult.top}°) ${sign} tan(${angleResult.base}°)) = ${round(angleResult.height)} ${lengthUnit}`;
    }
    if (method === 'shadow' && shadowResult.valid) {
      return `(${shadowResult.ts} ÷ ${shadowResult.rs}) × ${shadowResult.rh} = ${round(shadowResult.height)} ${lengthUnit}`;
    }
    if (method === 'stick' && stickResult.valid) {
      return `(${stickResult.sl} ÷ ${stickResult.ad}) × ${stickResult.sd} = ${round(stickResult.height)} ${lengthUnit}`;
    }
    return '';
  }, [method, angleResult, shadowResult, stickResult, lengthUnit]);

  const tabButtonClass = (active: boolean) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition ${
      active ? 'bg-white text-moss-800 shadow-sm' : 'text-bark-600 hover:text-moss-800'
    }`;

  const methodLabel = method === 'angle' ? 'Angle Method' : method === 'shadow' ? 'Shadow Method' : 'Stick Method';

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 48;
    let y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Tree Height Calculator Results', margin, y);
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
    doc.text(`Method: ${methodLabel}`, margin, y);
    y += 24;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    if (!activeResult.valid) {
      doc.text('Enter measurements to see a result.', margin, y);
    } else {
      if (method === 'angle') {
        const lines = [
          `Horizontal distance: ${angleDistance} ${lengthUnit}`,
          `Angle to treetop: ${angleTop}°`,
          slopeMode === 'none'
            ? `Eye height: ${eyeHeight} ${lengthUnit}`
            : `Slope correction: ${slopeMode === 'below' ? 'base below eye level' : 'base above eye level'}, angle to base ${angleBase}°`,
        ];
        lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
      } else if (method === 'shadow') {
        const lines = [
          `Tree shadow length: ${treeShadow} ${lengthUnit}`,
          `Reference object height: ${refHeight} ${lengthUnit}`,
          `Reference object shadow length: ${refShadow} ${lengthUnit}`,
        ];
        lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
      } else {
        const lines = [
          `Stick length: ${stickLength} ${lengthUnit}`,
          `Arm distance (eye to stick): ${armDistance} ${lengthUnit}`,
          `Distance to tree: ${stickDistance} ${lengthUnit}`,
        ];
        lines.forEach((line) => { doc.text(line, margin, y); y += 16; });
      }

      y += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(`Estimated tree height: ${round(activeResult.height)} ${lengthUnit}`, margin, y);
      y += 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(formulaLine, margin, y);
    }

    y += 30;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Each method has its own accuracy limits — see harvestmath.com for details on this method.', margin, y);

    doc.save('tree-height-calculator-results.pdf');
  };

  return (
    <div className="not-prose">
      <div className="overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-moss-100/60">
        <div className="bg-moss-700 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-white">Tree Height Calculator</h2>
        </div>

        <div className="flex flex-col gap-5 p-6">
          {/* Units + method */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="label-field">Units</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Unit system">
                <button type="button" role="tab" aria-selected={!isMetric} onClick={() => setUnitSystem('imperial')} className={tabButtonClass(!isMetric)}>
                  Feet
                </button>
                <button type="button" role="tab" aria-selected={isMetric} onClick={() => setUnitSystem('metric')} className={tabButtonClass(isMetric)}>
                  Meters
                </button>
              </div>
            </div>

            <div>
              <span className="label-field">Method</span>
              <div className="mt-2 inline-flex rounded-lg bg-sand-100 p-1" role="tablist" aria-label="Measurement method">
                <button type="button" role="tab" aria-selected={method === 'angle'} onClick={() => setMethod('angle')} className={tabButtonClass(method === 'angle')}>
                  Angle
                </button>
                <button type="button" role="tab" aria-selected={method === 'shadow'} onClick={() => setMethod('shadow')} className={tabButtonClass(method === 'shadow')}>
                  Shadow
                </button>
                <button type="button" role="tab" aria-selected={method === 'stick'} onClick={() => setMethod('stick')} className={tabButtonClass(method === 'stick')}>
                  Stick
                </button>
              </div>
            </div>
          </div>

          {/* ANGLE METHOD */}
          {method === 'angle' && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="th-distance" className="label-field">Horizontal distance to tree ({lengthUnit})</label>
                  <input
                    id="th-distance"
                    type="text"
                    inputMode="decimal"
                    value={angleDistance}
                    onChange={(e) => setAngleDistance(sanitizeNumberInput(e.target.value))}
                    className="input-field mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="th-angle-top" className="label-field">Angle of elevation to treetop (°)</label>
                  <input
                    id="th-angle-top"
                    type="text"
                    inputMode="decimal"
                    value={angleTop}
                    onChange={(e) => setAngleTop(sanitizeNumberInput(e.target.value))}
                    className="input-field mt-1.5"
                  />
                </div>
              </div>

              <div className="rounded-lg bg-sand-50 p-3 ring-1 ring-moss-100">
                <p className="text-xs text-bark-500">
                  A smartphone&rsquo;s built-in level or compass app reads angle of elevation just like a clinometer &mdash; no separate tool to buy.
                </p>
              </div>

              <div>
                <span className="label-field">Ground between you and the tree</span>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => setSlopeMode('none')}
                    className={`rounded-lg px-3 py-2 text-left text-sm ring-1 transition ${
                      slopeMode === 'none' ? 'bg-moss-700 text-white ring-moss-700' : 'bg-sand-50 text-bark-700 ring-moss-100 hover:bg-moss-50'
                    }`}
                  >
                    <span className="block font-semibold">Level</span>
                    <span className={`block text-xs ${slopeMode === 'none' ? 'text-moss-100' : 'text-bark-500'}`}>Simple formula</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlopeMode('below')}
                    className={`rounded-lg px-3 py-2 text-left text-sm ring-1 transition ${
                      slopeMode === 'below' ? 'bg-moss-700 text-white ring-moss-700' : 'bg-sand-50 text-bark-700 ring-moss-100 hover:bg-moss-50'
                    }`}
                  >
                    <span className="block font-semibold">Base is below you</span>
                    <span className={`block text-xs ${slopeMode === 'below' ? 'text-moss-100' : 'text-bark-500'}`}>You&rsquo;re uphill</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSlopeMode('above')}
                    className={`rounded-lg px-3 py-2 text-left text-sm ring-1 transition ${
                      slopeMode === 'above' ? 'bg-moss-700 text-white ring-moss-700' : 'bg-sand-50 text-bark-700 ring-moss-100 hover:bg-moss-50'
                    }`}
                  >
                    <span className="block font-semibold">Base is above you</span>
                    <span className={`block text-xs ${slopeMode === 'above' ? 'text-moss-100' : 'text-bark-500'}`}>Tree is uphill</span>
                  </button>
                </div>
              </div>

              {slopeMode === 'none' ? (
                <div>
                  <label htmlFor="th-eye-height" className="label-field">Your eye height ({lengthUnit})</label>
                  <input
                    id="th-eye-height"
                    type="text"
                    inputMode="decimal"
                    value={eyeHeight}
                    onChange={(e) => setEyeHeight(sanitizeNumberInput(e.target.value))}
                    className="input-field mt-1.5 max-w-xs"
                  />
                </div>
              ) : (
                <div>
                  <label htmlFor="th-angle-base" className="label-field">
                    Angle {slopeMode === 'below' ? 'down' : 'up'} to the tree&rsquo;s base (°)
                  </label>
                  <input
                    id="th-angle-base"
                    type="text"
                    inputMode="decimal"
                    value={angleBase}
                    onChange={(e) => setAngleBase(sanitizeNumberInput(e.target.value))}
                    className="input-field mt-1.5 max-w-xs"
                  />
                  <p className="mt-1.5 text-xs text-bark-500">
                    On sloped ground the simple formula is wrong &mdash; this second angle corrects for it. See &ldquo;Measuring on a Slope&rdquo; below.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SHADOW METHOD */}
          {method === 'shadow' && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="th-tree-shadow" className="label-field">Tree&rsquo;s shadow length ({lengthUnit})</label>
                  <input
                    id="th-tree-shadow"
                    type="text"
                    inputMode="decimal"
                    value={treeShadow}
                    onChange={(e) => setTreeShadow(sanitizeNumberInput(e.target.value))}
                    className="input-field mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="th-ref-height" className="label-field">Reference object height ({lengthUnit})</label>
                  <input
                    id="th-ref-height"
                    type="text"
                    inputMode="decimal"
                    value={refHeight}
                    onChange={(e) => setRefHeight(sanitizeNumberInput(e.target.value))}
                    className="input-field mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="th-ref-shadow" className="label-field">Reference object&rsquo;s shadow ({lengthUnit})</label>
                  <input
                    id="th-ref-shadow"
                    type="text"
                    inputMode="decimal"
                    value={refShadow}
                    onChange={(e) => setRefShadow(sanitizeNumberInput(e.target.value))}
                    className="input-field mt-1.5"
                  />
                </div>
              </div>
              <p className="text-xs text-bark-500">
                Measure both shadows at the same time of day &mdash; the sun&rsquo;s angle changes fast enough that even 20-30 minutes apart can throw the ratio off. This method is unreliable on sloping ground, since the incline distorts shadow length.
              </p>
            </div>
          )}

          {/* STICK METHOD */}
          {method === 'stick' && (
            <div className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="th-stick-length" className="label-field">Stick length above your fist ({lengthUnit})</label>
                  <input
                    id="th-stick-length"
                    type="text"
                    inputMode="decimal"
                    value={stickLength}
                    onChange={(e) => setStickLength(sanitizeNumberInput(e.target.value))}
                    className="input-field mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="th-arm-distance" className="label-field">Arm distance, eye to stick ({lengthUnit})</label>
                  <input
                    id="th-arm-distance"
                    type="text"
                    inputMode="decimal"
                    value={armDistance}
                    onChange={(e) => setArmDistance(sanitizeNumberInput(e.target.value))}
                    className="input-field mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="th-stick-distance" className="label-field">Distance to tree ({lengthUnit})</label>
                  <input
                    id="th-stick-distance"
                    type="text"
                    inputMode="decimal"
                    value={stickDistance}
                    onChange={(e) => setStickDistance(sanitizeNumberInput(e.target.value))}
                    className="input-field mt-1.5"
                  />
                </div>
              </div>
              <p className="text-xs text-bark-500">
                Hold the stick perfectly vertical &mdash; tilting it is the main source of error. Accuracy improves the farther back you stand from the tree.
              </p>
            </div>
          )}

          {/* Formula display */}
          {formulaLine && (
            <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-bark-600 ring-1 ring-moss-100">
              <p className="font-medium text-bark-700">The math:</p>
              <p className="mt-1 font-mono text-xs text-bark-700 sm:text-sm">{formulaLine}</p>
            </div>
          )}

          {/* Results */}
          <div className="overflow-hidden rounded-xl border border-moss-200 bg-moss-50">
            {!activeResult.valid ? (
              <p className="p-5 text-sm text-bark-500">Enter your measurements above to see the estimated height.</p>
            ) : (
              <>
                <div className="p-5">
                  <p className="text-xs text-bark-500">Estimated tree height ({methodLabel})</p>
                  <p className="font-display text-3xl font-bold text-moss-700">
                    {round(activeResult.height)} <span className="text-lg font-medium text-bark-500">{lengthUnit}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-moss-200 bg-white px-4 py-2.5">
                  <p className="text-xs text-bark-500">
                    {method === 'angle' && slopeMode !== 'none' ? 'Slope-corrected' : 'Method'}: {methodLabel}
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
        </div>
      </div>
    </div>
  );
}
