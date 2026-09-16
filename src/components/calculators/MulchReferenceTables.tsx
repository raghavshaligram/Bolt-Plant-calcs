import type { MulchCalculatorState } from './useMulchCalculatorState';

/**
 * The "Quick unit conversions" and "Bag-size comparison" tables used to live
 * inside the sticky calculator card. That made the card taller than most
 * viewports, forcing it to scroll internally to stay sticky without covering
 * the footer. Moving them into the normal page flow (this component,
 * portaled into the article) lets the sticky panel shrink down to just the
 * tool itself, so it now sticks without needing to scroll on typical screen
 * sizes. Both tables are fixed reference data -- they don't depend on the
 * live calculator state -- but live in one component, portaled together,
 * matching the pilot's RaisedBedSoilReferenceTables pattern.
 */
export default function MulchReferenceTables({ calc: _calc }: { calc: MulchCalculatorState }) {
  return (
    <div className="not-prose flex flex-col gap-6 rounded-2xl bg-white p-5 shadow-card ring-1 ring-moss-100/60 sm:p-6">
      {/* Unit conversion table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left text-xs font-medium uppercase tracking-wider text-bark-400">
            Quick unit conversions
          </caption>
          <thead>
            <tr className="border-b border-moss-100 text-bark-500">
              <th scope="col" className="py-2 pr-4 font-medium">1 unit</th>
              <th scope="col" className="py-2 pr-4 font-medium">Cubic feet</th>
              <th scope="col" className="py-2 pr-4 font-medium">Cubic yards</th>
              <th scope="col" className="py-2 pr-4 font-medium">Cubic meters</th>
              <th scope="col" className="py-2 font-medium">2 cu ft bags</th>
            </tr>
          </thead>
          <tbody className="text-bark-700">
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1 cubic yard</th>
              <td className="py-2 pr-4">27</td>
              <td className="py-2 pr-4">1</td>
              <td className="py-2 pr-4">0.765</td>
              <td className="py-2">13.5</td>
            </tr>
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1 cubic meter</th>
              <td className="py-2 pr-4">35.3</td>
              <td className="py-2 pr-4">1.308</td>
              <td className="py-2 pr-4">1</td>
              <td className="py-2">17.7</td>
            </tr>
            <tr>
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1 cu ft bag</th>
              <td className="py-2 pr-4">2</td>
              <td className="py-2 pr-4">0.074</td>
              <td className="py-2 pr-4">0.057</td>
              <td className="py-2">1</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bag-size comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left text-xs font-medium uppercase tracking-wider text-bark-400">
            Bag-size comparison (per 100 sq ft at 3″ deep)
          </caption>
          <thead>
            <tr className="border-b border-moss-100 text-bark-500">
              <th scope="col" className="py-2 pr-4 font-medium">Bag size</th>
              <th scope="col" className="py-2 pr-4 font-medium">Cubic feet per bag</th>
              <th scope="col" className="py-2 pr-4 font-medium">Bags needed</th>
              <th scope="col" className="py-2 font-medium">Total cubic feet</th>
            </tr>
          </thead>
          <tbody className="text-bark-700">
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">Small</th>
              <td className="py-2 pr-4">1.0</td>
              <td className="py-2 pr-4">25</td>
              <td className="py-2">25</td>
            </tr>
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">Standard</th>
              <td className="py-2 pr-4">1.5</td>
              <td className="py-2 pr-4">17</td>
              <td className="py-2">25</td>
            </tr>
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">Standard</th>
              <td className="py-2 pr-4">2.0</td>
              <td className="py-2 pr-4">13</td>
              <td className="py-2">25</td>
            </tr>
            <tr>
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">Bulk bag</th>
              <td className="py-2 pr-4">3.0</td>
              <td className="py-2 pr-4">9</td>
              <td className="py-2">25</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
