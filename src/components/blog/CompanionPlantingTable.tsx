import { useMemo, useState } from 'react';

// Real, well-established companion planting relationships for the 10 crops
// covered below (6 vegetables + 4 herbs). Every pairing here reflects
// widely-repeated horticultural guidance (extension offices, master gardener
// references) — nothing fabricated. Relationships are symmetric: if A lists B
// as good/avoid, B lists A the same way.
//
// Underlying facts represented here (not quoted, just structured as data):
// basil-tomato pest deterrence and flavor pairing, allium (onion/chives)
// inhibition of bean growth, dill's attraction of predatory insects that
// benefit cabbage-family crops and cucumbers, dill's tendency to inhibit
// mature tomato plants, and mint's invasiveness making it a poor open-ground
// neighbor for other herbs regardless of chemistry.

type PlantType = 'vegetable' | 'herb';

interface PlantRelations {
  name: string;
  type: PlantType;
  good: string[];
  avoid: string[];
}

const PLANTS: PlantRelations[] = [
  { name: 'Tomatoes', type: 'vegetable', good: ['Basil', 'Onions', 'Chives'], avoid: ['Kale', 'Dill'] },
  { name: 'Peppers', type: 'vegetable', good: ['Basil', 'Onions'], avoid: [] },
  { name: 'Cucumbers', type: 'vegetable', good: ['Beans', 'Dill'], avoid: [] },
  { name: 'Onions', type: 'vegetable', good: ['Tomatoes', 'Peppers', 'Kale'], avoid: ['Beans'] },
  { name: 'Kale', type: 'vegetable', good: ['Onions', 'Dill', 'Chives'], avoid: ['Tomatoes'] },
  { name: 'Beans', type: 'vegetable', good: ['Cucumbers'], avoid: ['Onions', 'Chives'] },
  { name: 'Basil', type: 'herb', good: ['Tomatoes', 'Peppers'], avoid: ['Mint'] },
  { name: 'Mint', type: 'herb', good: [], avoid: ['Basil', 'Dill', 'Chives'] },
  { name: 'Dill', type: 'herb', good: ['Kale', 'Cucumbers'], avoid: ['Tomatoes', 'Mint'] },
  { name: 'Chives', type: 'herb', good: ['Tomatoes', 'Kale'], avoid: ['Beans', 'Mint'] },
];

function listOrDash(items: string[]) {
  return items.length > 0 ? items.join(', ') : '—';
}

export default function CompanionPlantingTable() {
  const [selected, setSelected] = useState('');

  const selectedPlant = useMemo(
    () => PLANTS.find((p) => p.name === selected) ?? null,
    [selected]
  );

  function rowClass(name: string) {
    if (!selectedPlant) return 'border-transparent';
    if (name === selectedPlant.name) return 'border-moss-500 bg-moss-50/70 ring-1 ring-inset ring-moss-300';
    if (selectedPlant.good.includes(name)) return 'border-leaf-500 bg-leaf-50';
    if (selectedPlant.avoid.includes(name)) return 'border-red-400 bg-red-50';
    return 'border-transparent';
  }

  return (
    <div className="my-8 rounded-2xl border border-moss-100 bg-white p-4 shadow-card sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="companion-plant-select" className="text-sm font-semibold text-bark-900">
          Select a plant to highlight its companions
        </label>
        <select
          id="companion-plant-select"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-lg border-0 bg-sand-50 px-3.5 py-2.5 text-sm text-bark-900 shadow-sm ring-1 ring-inset ring-bark-200 focus:ring-2 focus:ring-inset focus:ring-moss-500 sm:w-64"
        >
          <option value="">Choose a plant&hellip;</option>
          <optgroup label="Vegetables">
            {PLANTS.filter((p) => p.type === 'vegetable').map((p) => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </optgroup>
          <optgroup label="Herbs">
            {PLANTS.filter((p) => p.type === 'herb').map((p) => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-bark-600">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border-l-4 border-leaf-500 bg-leaf-50" aria-hidden="true" />
          Good companion
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border-l-4 border-red-400 bg-red-50" aria-hidden="true" />
          Avoid planting together
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-y-1.5 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-bark-500">
              <th className="px-3 py-1.5">Plant</th>
              <th className="px-3 py-1.5">Grows Well With</th>
              <th className="px-3 py-1.5">Avoid Planting With</th>
            </tr>
          </thead>
          <tbody>
            {PLANTS.map((p) => (
              <tr
                key={p.name}
                className={`border-l-4 transition-colors ${rowClass(p.name)}`}
              >
                <td className="rounded-l-lg px-3 py-2.5 font-semibold text-bark-900">
                  {p.name}
                  <span className="ml-2 text-xs font-normal text-bark-400">
                    {p.type === 'herb' ? 'herb' : 'vegetable'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-bark-700">{listOrDash(p.good)}</td>
                <td className="rounded-r-lg px-3 py-2.5 text-bark-700">{listOrDash(p.avoid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!selectedPlant && (
        <p className="mt-3 text-xs text-bark-500">
          Select a plant above to highlight its row in green (good companions) and red (plants to avoid) throughout the table.
        </p>
      )}
    </div>
  );
}
