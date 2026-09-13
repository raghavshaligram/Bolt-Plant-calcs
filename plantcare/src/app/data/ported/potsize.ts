/*
 * GENERATED — do not edit.
 *
 * Written by scripts/port-data.mjs from the HarvestMath site source:
 *   src/components/calculators/PotSizeCalculator.tsx
 *
 * Edit it there and re-run `npm run port`. scripts/verify-data.mjs reads both
 * sides and fails if they have drifted, so a hand edit here does not survive
 * the next verification pass.
 */

type PlantCategory =
  | 'large' | 'medium' | 'small' | 'succulent'
  | 'houseSmall' | 'houseMed' | 'houseLarge'
  | 'potato' | 'strawberry' | 'fruitTree' | 'shrub';

interface StandardSize {
  id: string;
  label: string;
  diameterIn: number;
  volGal: number;
  estimated: boolean;
}

export const STANDARD_SIZES: StandardSize[] = [
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
]

export interface CategoryInfo {
  minGal?: string;
  diamIn?: string;
  depthIn?: string;
  note: string;
}

export const CATEGORY_INFO: Record<PlantCategory, CategoryInfo> = {
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

export interface PotPlantEntry {
  id: string
  name: string
  cat: PlantCategory
}

export const POT_PLANT_GUIDE: PotPlantEntry[] = [
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
]
