// Garden Project — a single, persistent, client-side-only project object
// that chains the Frost Date, Seed Starting, Plant Spacing, and Vegetable
// Yield calculators together. No accounts, no database: everything lives in
// localStorage under GARDEN_PROJECT_STORAGE_KEY, on this browser, for this
// one project. Each calculator's "Add to my Garden Project" button writes
// its own slice; the /garden-project/ summary page reads the whole object.
//
// Same-tab reactivity: localStorage's native `storage` event only fires in
// OTHER tabs, not the tab that made the write. So after every save/clear we
// also dispatch a `harvestmath-garden-project-updated` CustomEvent on
// `window`, which GardenProjectBanner (and anything else that cares) can
// listen for to update immediately without a reload.

export const GARDEN_PROJECT_STORAGE_KEY = 'harvestmath_garden_project';
export const GARDEN_PROJECT_UPDATED_EVENT = 'harvestmath-garden-project-updated';

export interface GardenCrop {
  name: string;
  plantingMethod: string;
}

export interface FrostDateResultsSnapshot {
  zone: string;
  zip?: string;
  refCity?: string;
  frostFree: boolean;
  lastFrostStart?: string;
  lastFrostEnd?: string;
  firstFrostStart?: string;
  firstFrostEnd?: string;
  seasonLengthDays?: number;
}

export interface SeedStartingResultsSnapshot {
  cropName: string;
  method: 'indoor' | 'direct';
  indoorStart?: string;
  indoorEnd?: string;
  transplantStart?: string;
  transplantEnd?: string;
  directSowStart?: string;
  directSowEnd?: string;
  note: string;
}

export interface SpacingResultsSnapshot {
  crop: string;
  mode: 'row' | 'sqft';
  bedLength: string;
  bedWidth: string;
  lengthUnit: string;
  totalPlants: number;
  plantsPerRow?: number;
  numRows?: number;
  gridSpacingIn?: number;
  areaFt: number;
}

export interface YieldResultsSnapshot {
  crop: string;
  plantCount: number;
  totalLbs: number;
  totalKg: number;
  unitSystem: 'imperial' | 'metric';
}

export interface GardenProjectData {
  zipCode: string;
  hardinessZone: string;
  bedDimensions: { length: string; width: string; unit: string } | null;
  selectedCrops: GardenCrop[];
  frostDateResults: FrostDateResultsSnapshot | null;
  seedStartingResults: SeedStartingResultsSnapshot | null;
  spacingResults: SpacingResultsSnapshot | null;
  yieldResults: YieldResultsSnapshot | null;
  lastUpdated: number;
}

export function emptyGardenProject(): GardenProjectData {
  return {
    zipCode: '',
    hardinessZone: '',
    bedDimensions: null,
    selectedCrops: [],
    frostDateResults: null,
    seedStartingResults: null,
    spacingResults: null,
    yieldResults: null,
    lastUpdated: 0,
  };
}

export function loadGardenProject(): GardenProjectData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(GARDEN_PROJECT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    // Merge onto a fresh default object so older/partial saved shapes
    // (e.g. from before a field was added) don't crash consumers.
    return { ...emptyGardenProject(), ...parsed };
  } catch {
    return null;
  }
}

/** True once at least one calculator stage has actually been saved. */
export function hasActiveGardenProject(data: GardenProjectData | null): boolean {
  if (!data) return false;
  return !!(
    data.frostDateResults ||
    data.seedStartingResults ||
    data.spacingResults ||
    data.yieldResults
  );
}

export function countCompletedStages(data: GardenProjectData | null): number {
  if (!data) return 0;
  return [data.frostDateResults, data.seedStartingResults, data.spacingResults, data.yieldResults].filter(
    Boolean
  ).length;
}

function notifyUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(GARDEN_PROJECT_UPDATED_EVENT));
}

/** Shallow-merges `patch` onto the existing project (or a fresh one) and persists it. */
export function saveGardenProject(patch: Partial<GardenProjectData>): GardenProjectData {
  const current = loadGardenProject() ?? emptyGardenProject();
  const next: GardenProjectData = { ...current, ...patch, lastUpdated: Date.now() };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(GARDEN_PROJECT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage may be unavailable (private mode, quota) — fail silently,
      // same fallback behavior as every per-calculator saved state on this site.
    }
  }
  notifyUpdated();
  return next;
}

/** Adds or updates a crop in selectedCrops by name (case-insensitive), keeping the list de-duplicated. */
export function upsertSelectedCrop(data: GardenProjectData, crop: GardenCrop): GardenCrop[] {
  const rest = data.selectedCrops.filter((c) => c.name.toLowerCase() !== crop.name.toLowerCase());
  return [...rest, crop];
}

export function clearGardenProject(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GARDEN_PROJECT_STORAGE_KEY);
  } catch {
    // fail silently
  }
  notifyUpdated();
}

/**
 * Best-effort match between a crop name from one calculator's crop list and
 * a preset name from another calculator's (differently-shaped) crop list —
 * e.g. Seed Starting's "Tomato" vs. Plant Spacing's "Tomato (determinate)".
 * Matches if either name starts with the other's first word, case-insensitive.
 * Returns null if nothing reasonable is found, so callers can fall back to
 * their own default rather than guessing wrong.
 */
export function fuzzyMatchCropName(sourceName: string, candidateNames: string[]): string | null {
  const src = sourceName.trim().toLowerCase();
  const srcFirstWord = src.split(/[\s(]/)[0];
  if (!srcFirstWord) return null;

  // Exact match first.
  const exact = candidateNames.find((c) => c.toLowerCase() === src);
  if (exact) return exact;

  // Then a same-first-word match (e.g. "tomato" matches "Tomato (determinate)").
  const sameFirstWord = candidateNames.find((c) => c.toLowerCase().split(/[\s(]/)[0] === srcFirstWord);
  return sameFirstWord ?? null;
}
