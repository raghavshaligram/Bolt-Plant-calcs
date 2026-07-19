import { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import {
  loadGardenProject,
  clearGardenProject,
  hasActiveGardenProject,
  countCompletedStages,
  GARDEN_PROJECT_UPDATED_EVENT,
} from '../lib/gardenProject';
import type { GardenProjectData } from '../lib/gardenProject';
import { GARDEN_PROJECT_LIST_ID } from '../data/calculators';

function round(value: number, decimals = 1): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

interface StageMeta {
  key: 'frostDateResults' | 'seedStartingResults' | 'spacingResults' | 'yieldResults';
  step: number;
  title: string;
  blurb: string;
  href: string;
  ctaLabel: string;
}

const STAGES: StageMeta[] = [
  {
    key: 'frostDateResults',
    step: 1,
    title: 'Frost Dates',
    blurb: 'Your zone and estimated last/first frost window.',
    href: '/calculators/frost-date-calculator/',
    ctaLabel: 'Find your frost dates',
  },
  {
    key: 'seedStartingResults',
    step: 2,
    title: 'Seed Starting Calendar',
    blurb: 'When to start seeds and when to transplant.',
    href: '/calculators/seed-starting-calculator/',
    ctaLabel: 'Build your seed calendar',
  },
  {
    key: 'spacingResults',
    step: 3,
    title: 'Plant Spacing Plan',
    blurb: 'How many plants fit your bed, and how they lay out.',
    href: '/calculators/plant-spacing-calculator/',
    ctaLabel: 'Plan your spacing',
  },
  {
    key: 'yieldResults',
    step: 4,
    title: 'Yield Estimate',
    blurb: 'About how much you can expect to harvest.',
    href: '/calculators/vegetable-yield-calculator/',
    ctaLabel: 'Estimate your harvest',
  },
];

const PLACEHOLDER_RECOMMENDATIONS = [
  { name: 'Seed Starting Trays', category: 'Seed starting' },
  { name: 'Drip Irrigation Kit', category: 'Watering' },
  { name: 'Weatherproof Plant Markers', category: 'Bed setup' },
];

function buildGardenProjectPdf(project: GardenProjectData): void {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 48;
  const pageBottom = 792 - margin;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageBottom) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Your Garden Project', margin, y);
  y += 30;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(90, 90, 90);
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Generated ${dateStr} — HarvestMath.com`, margin, y);
  y += 26;
  doc.setTextColor(40, 40, 40);

  const sectionHeading = (text: string) => {
    ensureSpace(40);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(text, margin, y);
    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
  };
  const line = (text: string, opts?: { maxWidth?: number }) => {
    ensureSpace(16);
    doc.text(text, margin, y, opts);
    y += 16;
  };

  if (project.frostDateResults) {
    const r = project.frostDateResults;
    sectionHeading('Stage 1: Frost Dates');
    line(`Zone: ${r.zone}${r.zip ? ` (ZIP ${r.zip})` : ''}`);
    if (r.frostFree) {
      line('This zone rarely sees frost — plant on a temperature/rainfall calendar instead.', { maxWidth: 500 });
    } else {
      line(`Last spring frost: ${r.lastFrostStart} - ${r.lastFrostEnd}`);
      line(`First fall frost: ${r.firstFrostStart} - ${r.firstFrostEnd}`);
      line(`Growing season: ~${r.seasonLengthDays} days`);
    }
    y += 14;
  }

  if (project.seedStartingResults) {
    const r = project.seedStartingResults;
    sectionHeading('Stage 2: Seed Starting Calendar');
    line(`Crop: ${r.cropName}`);
    if (r.method === 'indoor') {
      line(`Start seeds indoors: ${r.indoorStart} - ${r.indoorEnd}`);
      line(`Transplant outdoors: ${r.transplantStart} - ${r.transplantEnd}`);
    } else {
      line(`Direct sow outdoors: ${r.directSowStart} - ${r.directSowEnd}`);
    }
    line(r.note, { maxWidth: 500 });
    y += 14;
  }

  if (project.spacingResults) {
    const r = project.spacingResults;
    sectionHeading('Stage 3: Plant Spacing Plan');
    line(`Crop: ${r.crop}`);
    line(`Bed: ${r.bedLength} × ${r.bedWidth} ${r.lengthUnit}`);
    line(`Total plants: ${r.totalPlants.toLocaleString()}`);
    if (r.mode === 'row' && r.plantsPerRow !== undefined && r.numRows !== undefined) {
      line(`Layout: ${r.plantsPerRow} per row × ${r.numRows} rows`);
    } else if (r.gridSpacingIn !== undefined) {
      line(`Grid spacing: ${r.gridSpacingIn}″ apart`);
    }
    y += 14;
  }

  if (project.yieldResults) {
    const r = project.yieldResults;
    sectionHeading('Stage 4: Yield Estimate');
    line(`Crop: ${r.crop}`);
    line(`Plants: ${r.plantCount.toLocaleString()}`);
    const weight = r.unitSystem === 'metric' ? `${round(r.totalKg, 1)} kg` : `${round(r.totalLbs, 1)} lbs`;
    line(`Estimated total yield: ${weight}`);
    y += 14;
  }

  ensureSpace(36);
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Estimates only, built from zone-based frost data and typical spacing/yield figures.', margin, y);
  y += 12;
  doc.text('Verify with your local extension office before a planting deadline that matters.', margin, y);

  doc.save('your-garden-project.pdf');
}

export default function GardenProjectSummary() {
  const [project, setProject] = useState<GardenProjectData | null>(null);
  const [email, setEmail] = useState('');
  const [gateStatus, setGateStatus] = useState<'idle' | 'loading' | 'unlocked' | 'error'>('idle');
  const [gateError, setGateError] = useState('');

  useEffect(() => {
    const refresh = () => setProject(loadGardenProject());
    refresh();
    window.addEventListener(GARDEN_PROJECT_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(GARDEN_PROJECT_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const completed = countCompletedStages(project);
  const active = hasActiveGardenProject(project);

  async function handleUnlock(event: React.FormEvent) {
    event.preventDefault();
    setGateStatus('loading');
    setGateError('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, listId: GARDEN_PROJECT_LIST_ID }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setGateStatus('unlocked');
        if (project) buildGardenProjectPdf(project);
        return;
      }
      setGateError(data.error || 'Something went wrong. Please try again.');
      setGateStatus('error');
    } catch {
      setGateError('Could not reach the server. Check your connection and try again.');
      setGateStatus('error');
    }
  }

  function handleClearProject() {
    if (typeof window === 'undefined') return;
    if (!window.confirm('Clear this Garden Project? This removes everything saved on this browser.')) return;
    clearGardenProject();
    setProject(null);
  }

  if (!active) {
    return (
      <div className="not-prose mx-auto max-w-2xl rounded-2xl bg-white p-8 text-center shadow-card ring-1 ring-moss-100/60 sm:p-12">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-moss-700/10 text-moss-700">
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2c3 4 6 8 6 12a6 6 0 0 1-12 0c0-4 3-8 6-12Z" fill="currentColor" />
          </svg>
        </span>
        <h2 className="mt-4 font-display text-2xl font-semibold text-bark-900">No Garden Project yet</h2>
        <p className="mt-2 text-sm leading-relaxed text-bark-600">
          Start with your frost dates and this page will fill in as you go — seed starting calendar, spacing plan,
          and yield estimate all in one place, saved right in this browser.
        </p>
        <a
          href="/calculators/frost-date-calculator/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-moss-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-moss-800"
        >
          Start a Garden Project
        </a>
      </div>
    );
  }

  return (
    <div className="not-prose mx-auto max-w-3xl">
      {/* Progress */}
      <div className="rounded-2xl bg-white p-5 shadow-card ring-1 ring-moss-100/60 sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-bark-700">
            {completed} of 4 stages complete
          </p>
          <p className="text-xs text-bark-500">
            {completed === 4 ? "You've got the full picture!" : 'Keep going — every stage adds to your plan.'}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sand-100">
          <div
            className="h-full rounded-full bg-moss-600 transition-all duration-500"
            style={{ width: `${(completed / 4) * 100}%` }}
          />
        </div>
      </div>

      {/* Stage cards */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {STAGES.map((stage) => {
          const done = project?.[stage.key];
          return (
            <div
              key={stage.key}
              className={`overflow-hidden rounded-2xl p-5 shadow-card ring-1 sm:p-6 ${
                done ? 'bg-white ring-moss-100/60' : 'border-2 border-dashed border-sand-200 bg-sand-50/50 ring-0'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-bark-500">Stage {stage.step}</p>
                  <h3 className="mt-0.5 font-display text-lg font-semibold text-bark-900">{stage.title}</h3>
                </div>
                {done ? (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-moss-700 text-white">
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M4 10.5l3.5 3.5L16 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                ) : null}
              </div>

              {!done ? (
                <>
                  <p className="mt-2 text-sm text-bark-500">{stage.blurb}</p>
                  <a
                    href={stage.href}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-moss-700 underline underline-offset-2 hover:text-moss-900"
                  >
                    {stage.ctaLabel} →
                  </a>
                </>
              ) : (
                <StageDetails stage={stage} project={project!} />
              )}
            </div>
          );
        })}
      </div>

      {/* Recommended for this project — placeholder, no real product links yet */}
      <div className="mt-8 rounded-2xl bg-sand-50 p-5 ring-1 ring-moss-100 sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-bark-900">Recommended for this project</h3>
          <span className="rounded-full bg-bark-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bark-500">
            Coming soon
          </span>
        </div>
        <p className="mt-1.5 text-sm text-bark-500">
          We're putting together a short list of gear that pairs well with your project. Nothing to buy here yet —
          this is a placeholder for product recommendations we'll add once we've actually tried the products
          ourselves.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PLACEHOLDER_RECOMMENDATIONS.map((item) => (
            <div key={item.name} className="rounded-xl border border-dashed border-bark-200 bg-white p-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-bark-400">{item.category}</p>
              <p className="mt-1 text-sm font-medium text-bark-600">{item.name}</p>
              <span className="mt-3 inline-block rounded-md bg-bark-50 px-3 py-1 text-xs font-medium text-bark-400">
                Placeholder
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Email-gated combined PDF export */}
      <div className="mt-8 w-full rounded-2xl bg-gradient-to-br from-[#E8A94A]/20 via-[#F5F1E8] to-[#4A7C59]/10 p-6 shadow-card ring-1 ring-[#5C4433]/15 sm:p-8">
        {completed === 0 ? (
          <p className="text-sm text-[#5C4433]">Complete at least one stage above to unlock your Garden Project PDF.</p>
        ) : gateStatus === 'unlocked' ? (
          <div className="rounded-xl bg-[#3D6647] p-6">
            <p className="text-lg font-semibold text-[#F5F1E8]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Your Garden Project PDF is downloading!
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#F5F1E8]">
              If the download didn't start automatically, use the button below to grab it again.
            </p>
            <button
              type="button"
              onClick={() => project && buildGardenProjectPdf(project)}
              className="mt-4 inline-flex items-center rounded-md bg-[#F5F1E8] px-4 py-2 text-sm font-semibold text-[#3D6647] transition hover:bg-white"
            >
              Download PDF again
            </button>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-semibold text-[#3D6647]" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
              Get your whole Garden Project as one PDF
            </h3>
            <p className="mt-2 mb-5 text-sm leading-relaxed text-[#5C4433]">
              Frost dates, seed calendar, spacing plan, and yield estimate — whichever stages you've completed so
              far, compiled into a single printable PDF, emailed once.
            </p>
            <form onSubmit={handleUnlock}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex-1">
                  <label htmlFor="garden-project-email" className="sr-only">Email address</label>
                  <input
                    id="garden-project-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={gateStatus === 'loading'}
                    className="w-full rounded-md border border-[#5C4433] bg-[#F5F1E8] px-4 py-2.5 text-sm text-[#5C4433] placeholder:text-[#5C4433]/50 shadow-sm transition focus:border-[#3D6647] focus:outline-none focus:ring-2 focus:ring-[#E8A94A] disabled:opacity-60"
                  />
                  {gateStatus === 'error' && <p className="mt-1.5 text-sm text-red-600">{gateError}</p>}
                </div>
                <button
                  type="submit"
                  disabled={gateStatus === 'loading'}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-[#3D6647] px-5 py-2.5 text-sm font-semibold text-[#F5F1E8] shadow-sm transition-colors hover:bg-[#4A7C59] disabled:cursor-not-allowed disabled:bg-[#3D6647]/70"
                >
                  {gateStatus === 'loading' ? 'Unlocking…' : 'Email Me the PDF'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={handleClearProject}
          className="text-xs text-bark-400 underline underline-offset-2 hover:text-bark-600"
        >
          Clear this Garden Project
        </button>
      </div>
    </div>
  );
}

function StageDetails({ stage, project }: { stage: StageMeta; project: GardenProjectData }) {
  if (stage.key === 'frostDateResults' && project.frostDateResults) {
    const r = project.frostDateResults;
    return (
      <div className="mt-2">
        <p className="text-xs text-bark-500">Zone {r.zone}{r.zip ? ` · ZIP ${r.zip}` : ''}</p>
        {r.frostFree ? (
          <p className="mt-1 text-sm text-bark-700">Rarely sees frost — plant on a seasonal calendar.</p>
        ) : (
          <>
            <p className="mt-1 text-sm text-bark-700">
              <strong className="text-bark-900">Last frost:</strong> {r.lastFrostStart}–{r.lastFrostEnd}
            </p>
            <p className="text-sm text-bark-700">
              <strong className="text-bark-900">First frost:</strong> {r.firstFrostStart}–{r.firstFrostEnd}
            </p>
          </>
        )}
        <StageLink href={stage.href} />
      </div>
    );
  }
  if (stage.key === 'seedStartingResults' && project.seedStartingResults) {
    const r = project.seedStartingResults;
    return (
      <div className="mt-2">
        <p className="text-xs text-bark-500">{r.cropName}</p>
        {r.method === 'indoor' ? (
          <p className="mt-1 text-sm text-bark-700">
            <strong className="text-bark-900">Start indoors:</strong> {r.indoorStart}–{r.indoorEnd}
          </p>
        ) : (
          <p className="mt-1 text-sm text-bark-700">
            <strong className="text-bark-900">Direct sow:</strong> {r.directSowStart}–{r.directSowEnd}
          </p>
        )}
        <StageLink href={stage.href} />
      </div>
    );
  }
  if (stage.key === 'spacingResults' && project.spacingResults) {
    const r = project.spacingResults;
    return (
      <div className="mt-2">
        <p className="text-xs text-bark-500">{r.crop} · {r.bedLength} × {r.bedWidth} {r.lengthUnit} bed</p>
        <p className="mt-1 text-sm text-bark-700">
          <strong className="text-bark-900">{r.totalPlants.toLocaleString()}</strong> plants fit
        </p>
        <StageLink href={stage.href} />
      </div>
    );
  }
  if (stage.key === 'yieldResults' && project.yieldResults) {
    const r = project.yieldResults;
    const weight = r.unitSystem === 'metric' ? `${round(r.totalKg, 1)} kg` : `${round(r.totalLbs, 1)} lbs`;
    return (
      <div className="mt-2">
        <p className="text-xs text-bark-500">{r.crop} · {r.plantCount.toLocaleString()} plants</p>
        <p className="mt-1 text-sm text-bark-700">
          <strong className="text-bark-900">~{weight}</strong> estimated
        </p>
        <StageLink href={stage.href} />
      </div>
    );
  }
  return null;
}

function StageLink({ href }: { href: string }) {
  return (
    <a href={href} className="mt-3 inline-block text-xs font-semibold text-moss-700 underline underline-offset-2 hover:text-moss-900">
      Update this stage
    </a>
  );
}
