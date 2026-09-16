import type { RaisedBedSoilCalculatorState } from './useRaisedBedSoilCalculatorState';

/**
 * The bag-count comparison and unit-conversion reference tables used to
 * live inside the sticky calculator card. That made the card taller than
 * most viewports, forcing it to scroll internally to stay sticky without
 * covering the footer. Moving them into the normal page flow (this
 * component, portaled into the article) let the sticky panel shrink down
 * to just the tool itself, so it now sticks without needing to scroll on
 * typical screen sizes.
 *
 * The bag-count table depends on the live result, so it's still React
 * (same calculator state, shared via the same portal target the rest of
 * this page's islands use); the unit-conversion table is fixed data and
 * doesn't need to be here at all, but lives in the same component so both
 * render together as one "reference" section.
 */
export default function RaisedBedSoilReferenceTables({ calc }: { calc: RaisedBedSoilCalculatorState }) {
  const { result, hasResult, bagSize } = calc;

  return (
    <div className="not-prose flex flex-col gap-6 rounded-2xl bg-white p-5 shadow-card ring-1 ring-moss-100/60 sm:p-6">
      {hasResult && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="mb-2 text-left text-xs font-medium uppercase tracking-wider text-bark-400">
              Bag count comparison
            </caption>
            <thead>
              <tr className="border-b border-moss-100 text-bark-500">
                <th scope="col" className="py-2 pr-4 font-medium">Bag size</th>
                <th scope="col" className="py-2 pr-4 font-medium">Bags needed</th>
                <th scope="col" className="py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="text-bark-700">
              <tr className="border-b border-moss-50">
                <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1.5 cu ft bag</th>
                <td className="py-2 pr-4">~{Math.ceil(result.cubicFeet / 1.5)}</td>
                <td className="py-2 text-bark-500">Common at hardware stores{bagSize === '1.5' ? ' (your current selection)' : ''}</td>
              </tr>
              <tr>
                <th scope="row" className="py-2 pr-4 font-medium text-bark-800">2 cu ft bag</th>
                <td className="py-2 pr-4">~{Math.ceil(result.cubicFeet / 2)}</td>
                <td className="py-2 text-bark-500">Fewer bags, heavier to carry{bagSize === '2' ? ' (your current selection)' : ''}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left text-xs font-medium uppercase tracking-wider text-bark-400">
            Soil volume unit conversions
          </caption>
          <thead>
            <tr className="border-b border-moss-100 text-bark-500">
              <th scope="col" className="py-2 pr-4 font-medium">1 unit</th>
              <th scope="col" className="py-2 pr-4 font-medium">Cubic feet</th>
              <th scope="col" className="py-2 pr-4 font-medium">Cubic yards</th>
              <th scope="col" className="py-2 font-medium">1.5 cu ft bags</th>
            </tr>
          </thead>
          <tbody className="text-bark-700">
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1 cubic yard</th>
              <td className="py-2 pr-4">27</td>
              <td className="py-2 pr-4">1</td>
              <td className="py-2">18</td>
            </tr>
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1.5 cu ft bag</th>
              <td className="py-2 pr-4">1.5</td>
              <td className="py-2 pr-4">0.056</td>
              <td className="py-2">1</td>
            </tr>
            <tr>
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">2 cu ft bag</th>
              <td className="py-2 pr-4">2</td>
              <td className="py-2 pr-4">0.074</td>
              <td className="py-2">1.33</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
