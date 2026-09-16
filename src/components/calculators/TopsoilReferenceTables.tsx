import type { TopsoilCalculatorState } from './useTopsoilCalculatorState';

/**
 * The unit-conversion and depth-guideline reference tables used to live
 * inside the sticky calculator card. That made the card taller than most
 * viewports, forcing it to scroll internally to stay sticky without
 * covering the footer. Moving them into the normal page flow (this
 * component, portaled into the article) lets the sticky panel shrink down
 * to just the tool itself, so it now sticks without needing to scroll on
 * typical screen sizes.
 *
 * Both tables are fixed reference data -- they don't depend on the live
 * calculator result -- but this still takes `calc` (same pattern as
 * RaisedBedSoilReferenceTables) so it can grow to reference the live state
 * later without changing its call site.
 */
export default function TopsoilReferenceTables({ calc: _calc }: { calc: TopsoilCalculatorState }) {
  return (
    <div className="not-prose flex flex-col gap-6 rounded-2xl bg-white p-5 shadow-card ring-1 ring-moss-100/60 sm:p-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left text-xs font-medium uppercase tracking-wider text-bark-400">
            Quick topsoil unit conversions
          </caption>
          <thead>
            <tr className="border-b border-moss-100 text-bark-500">
              <th scope="col" className="py-2 pr-4 font-medium">1 unit</th>
              <th scope="col" className="py-2 pr-4 font-medium">Cubic feet</th>
              <th scope="col" className="py-2 pr-4 font-medium">Cubic yards</th>
              <th scope="col" className="py-2 pr-4 font-medium">Cubic meters</th>
              <th scope="col" className="py-2 font-medium">Est. tons</th>
            </tr>
          </thead>
          <tbody className="text-bark-700">
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1 cubic yard</th>
              <td className="py-2 pr-4">27</td>
              <td className="py-2 pr-4">1</td>
              <td className="py-2 pr-4">0.765</td>
              <td className="py-2">~1.2</td>
            </tr>
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1 cubic meter</th>
              <td className="py-2 pr-4">35.3</td>
              <td className="py-2 pr-4">1.308</td>
              <td className="py-2 pr-4">1</td>
              <td className="py-2">~1.57</td>
            </tr>
            <tr>
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">1 ton (approx.)</th>
              <td className="py-2 pr-4">22.5</td>
              <td className="py-2 pr-4">0.83</td>
              <td className="py-2 pr-4">0.64</td>
              <td className="py-2">1</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left text-xs font-medium uppercase tracking-wider text-bark-400">
            Topsoil depth guidelines by project
          </caption>
          <thead>
            <tr className="border-b border-moss-100 text-bark-500">
              <th scope="col" className="py-2 pr-4 font-medium">Project</th>
              <th scope="col" className="py-2 pr-4 font-medium">Typical depth</th>
              <th scope="col" className="py-2 font-medium">Notes</th>
            </tr>
          </thead>
          <tbody className="text-bark-700">
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">New raised bed</th>
              <td className="py-2 pr-4">8–12″</td>
              <td className="py-2">Fill to within 1–2″ of the rim.</td>
            </tr>
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">New lawn (from scratch)</th>
              <td className="py-2 pr-4">4–6″</td>
              <td className="py-2">Spread before seeding or sodding.</td>
            </tr>
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">Topdress existing lawn</th>
              <td className="py-2 pr-4">0.25–0.5″</td>
              <td className="py-2">Thin layer, raked level. Don&rsquo;t smother grass.</td>
            </tr>
            <tr>
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">Level low spots</th>
              <td className="py-2 pr-4">0.5–2″</td>
              <td className="py-2">Build up gradually; let grass grow through.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
