import { useEffect, useState } from 'react';
import {
  loadGardenProject,
  hasActiveGardenProject,
  countCompletedStages,
  GARDEN_PROJECT_UPDATED_EVENT,
} from '../lib/gardenProject';

// Small, non-intrusive sticky indicator shown site-wide once a Garden
// Project is in progress. Mounted once in Layout.astro (client:load), so it
// persists across every page navigation for anyone with an active project —
// for everyone else it renders nothing at all.
export default function GardenProjectBanner() {
  const [active, setActive] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [hidden, setHidden] = useState(false);
  const [onSummaryPage, setOnSummaryPage] = useState(false);

  useEffect(() => {
    const refresh = () => {
      const data = loadGardenProject();
      setActive(hasActiveGardenProject(data));
      setCompleted(countCompletedStages(data));
    };
    refresh();
    setOnSummaryPage(window.location.pathname.replace(/\/$/, '') === '/garden-project');

    window.addEventListener(GARDEN_PROJECT_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(GARDEN_PROJECT_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  if (!active || hidden || onSummaryPage) return null;

  return (
    <div className="not-prose fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5">
      <div className="flex items-center gap-2.5 rounded-full bg-moss-700 py-2 pl-3.5 pr-2 shadow-cardHover ring-1 ring-moss-900/10">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-white" aria-hidden="true">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
            <path d="M12 2c3 4 6 8 6 12a6 6 0 0 1-12 0c0-4 3-8 6-12Z" fill="currentColor" />
          </svg>
        </span>
        <a
          href="/garden-project/"
          className="font-sans text-xs font-semibold text-white sm:text-sm"
        >
          Garden Project in progress
          <span className="ml-1.5 hidden text-moss-200 sm:inline">({completed}/4 stages)</span>
        </a>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setHidden(true)}
          className="ml-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-moss-200 transition hover:bg-white/10 hover:text-white"
        >
          <svg className="h-3 w-3" viewBox="0 0 20 20" fill="none">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
