import { GRASS_PRESETS } from './useGrassSeedCalculatorState';
import type { GrassSeedCalculatorState } from './useGrassSeedCalculatorState';

/**
 * The "Seeding rate reference by type" table used to live inside the sticky
 * calculator card. Moving it into the normal page flow (this component,
 * portaled into the article) keeps the sticky panel short enough to stick
 * without needing its own internal scrollbar, matching the pilot's
 * RaisedBedSoilReferenceTables pattern. Unlike that fixed reference data,
 * this table does depend on the live `grass` selection -- the matching row
 * is highlighted -- so it takes `calc` and re-renders as the user picks a
 * different grass type in the card above.
 */
export default function GrassSeedReferenceTables({ calc }: { calc: GrassSeedCalculatorState }) {
  return (
    <div className="not-prose rounded-2xl bg-white p-5 shadow-card ring-1 ring-moss-100/60 sm:p-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left text-xs font-medium uppercase tracking-wider text-bark-400">
            Grass seed rate reference by type
          </caption>
          <thead>
            <tr className="border-b border-moss-100 text-bark-500">
              <th scope="col" className="py-2 pr-4 font-medium">Grass type</th>
              <th scope="col" className="py-2 pr-4 font-medium">New lawn (lb/1,000 sq ft)</th>
              <th scope="col" className="py-2 font-medium">Overseeding (lb/1,000 sq ft)</th>
            </tr>
          </thead>
          <tbody className="text-bark-700">
            {GRASS_PRESETS.map((p) => (
              <tr key={p.name} className={`border-b border-moss-50 ${p.name === calc.grass ? 'bg-moss-50/60 font-semibold text-bark-900' : ''}`}>
                <th scope="row" className="py-2 pr-4 font-medium text-bark-800">{p.name}</th>
                <td className="py-2 pr-4">{p.newLawnRate}</td>
                <td className="py-2">{p.overseedRate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
