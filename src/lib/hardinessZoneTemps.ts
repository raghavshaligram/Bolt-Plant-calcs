// USDA Plant Hardiness Zone -> average annual minimum winter temperature band.
//
// These are the official bands defined by the USDA Plant Hardiness Zone Map
// (each full zone spans 10°F, split into two 5°F half-zones, "a" being the
// colder half). This is the same zone system referenced by ZONE_FROST_DATA
// in frostZones.ts and by ALL_ZONES — kept as its own module since it's a
// distinct fact (temperature band) from frost timing, used specifically by
// the Hardiness Zone Finder rather than duplicated inline.

export interface ZoneTempBand {
  minF: number;
  maxF: number;
}

export const ZONE_TEMP_BANDS: Record<string, ZoneTempBand> = {
  '1a': { minF: -60, maxF: -55 },
  '1b': { minF: -55, maxF: -50 },
  '2a': { minF: -50, maxF: -45 },
  '2b': { minF: -45, maxF: -40 },
  '3a': { minF: -40, maxF: -35 },
  '3b': { minF: -35, maxF: -30 },
  '4a': { minF: -30, maxF: -25 },
  '4b': { minF: -25, maxF: -20 },
  '5a': { minF: -20, maxF: -15 },
  '5b': { minF: -15, maxF: -10 },
  '6a': { minF: -10, maxF: -5 },
  '6b': { minF: -5, maxF: 0 },
  '7a': { minF: 0, maxF: 5 },
  '7b': { minF: 5, maxF: 10 },
  '8a': { minF: 10, maxF: 15 },
  '8b': { minF: 15, maxF: 20 },
  '9a': { minF: 20, maxF: 25 },
  '9b': { minF: 25, maxF: 30 },
  '10a': { minF: 30, maxF: 35 },
  '10b': { minF: 35, maxF: 40 },
  '11a': { minF: 40, maxF: 45 },
  '11b': { minF: 45, maxF: 50 },
  '12a': { minF: 50, maxF: 55 },
  '12b': { minF: 55, maxF: 60 },
  '13a': { minF: 60, maxF: 65 },
  '13b': { minF: 65, maxF: 70 },
};

export function fToC(f: number): number {
  return ((f - 32) * 5) / 9;
}

export function formatTempRangeF(band: ZoneTempBand): string {
  return `${band.minF}°F to ${band.maxF}°F`;
}

export function formatTempRangeC(band: ZoneTempBand): string {
  const minC = Math.round(fToC(band.minF));
  const maxC = Math.round(fToC(band.maxF));
  return `${minC}°C to ${maxC}°C`;
}
