import type { SoilVolumeCalculatorState } from './useSoilVolumeCalculatorState';

/**
 * The common pot-size and common raised-bed-size reference tables used to
 * live inside the sticky calculator card. That made the card taller than
 * most viewports, forcing it to scroll internally to stay sticky without
 * covering the footer. Moving them into the normal page flow (this
 * component, portaled into the article) lets the sticky panel shrink down
 * to just the tool itself, so it now sticks without needing to scroll on
 * typical screen sizes.
 *
 * Both tables are fixed reference data (they don't depend on the live
 * calculator state) -- the `calc` prop is accepted for consistency with the
 * shared CalculatorPanel extraPortals pattern and to leave room for a
 * future "matches your current input" highlight, same idea as the pilot's
 * bag-size highlight in RaisedBedSoilReferenceTables.tsx.
 */
export default function SoilVolumeReferenceTables({ calc }: { calc: SoilVolumeCalculatorState }) {
  void calc;

  return (
    <div className="not-prose flex flex-col gap-6 rounded-2xl bg-white p-5 shadow-card ring-1 ring-moss-100/60 sm:p-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left text-xs font-medium uppercase tracking-wider text-bark-400">
            Common pot sizes — approximate soil needed
          </caption>
          <thead>
            <tr className="border-b border-moss-100 text-bark-500">
              <th scope="col" className="py-2 pr-4 font-medium">Pot diameter</th>
              <th scope="col" className="py-2 pr-4 font-medium">Fill depth</th>
              <th scope="col" className="py-2 pr-4 font-medium">Cubic feet</th>
              <th scope="col" className="py-2 font-medium">Liters</th>
            </tr>
          </thead>
          <tbody className="text-bark-700">
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">6&Prime;</th>
              <td className="py-2 pr-4">5&Prime;</td>
              <td className="py-2 pr-4">0.08</td>
              <td className="py-2">2.3</td>
            </tr>
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">10&Prime;</th>
              <td className="py-2 pr-4">7&Prime;</td>
              <td className="py-2 pr-4">0.32</td>
              <td className="py-2">9.0</td>
            </tr>
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">12&Prime;</th>
              <td className="py-2 pr-4">8&Prime;</td>
              <td className="py-2 pr-4">0.52</td>
              <td className="py-2">14.8</td>
            </tr>
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">16&Prime;</th>
              <td className="py-2 pr-4">10&Prime;</td>
              <td className="py-2 pr-4">1.16</td>
              <td className="py-2">32.9</td>
            </tr>
            <tr>
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">20&Prime;</th>
              <td className="py-2 pr-4">12&Prime;</td>
              <td className="py-2 pr-4">2.18</td>
              <td className="py-2">61.8</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left text-xs font-medium uppercase tracking-wider text-bark-400">
            Common raised bed sizes — soil volume needed
          </caption>
          <thead>
            <tr className="border-b border-moss-100 text-bark-500">
              <th scope="col" className="py-2 pr-4 font-medium">Bed size</th>
              <th scope="col" className="py-2 pr-4 font-medium">Fill depth</th>
              <th scope="col" className="py-2 pr-4 font-medium">Cubic feet</th>
              <th scope="col" className="py-2 font-medium">Cubic yards</th>
            </tr>
          </thead>
          <tbody className="text-bark-700">
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">4 &times; 4 ft</th>
              <td className="py-2 pr-4">6&Prime;</td>
              <td className="py-2 pr-4">8.0</td>
              <td className="py-2">0.30</td>
            </tr>
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">4 &times; 8 ft</th>
              <td className="py-2 pr-4">6&Prime;</td>
              <td className="py-2 pr-4">16.0</td>
              <td className="py-2">0.59</td>
            </tr>
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">4 &times; 8 ft</th>
              <td className="py-2 pr-4">10&Prime;</td>
              <td className="py-2 pr-4">26.7</td>
              <td className="py-2">0.99</td>
            </tr>
            <tr className="border-b border-moss-50">
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">4 &times; 12 ft</th>
              <td className="py-2 pr-4">10&Prime;</td>
              <td className="py-2 pr-4">40.0</td>
              <td className="py-2">1.48</td>
            </tr>
            <tr>
              <th scope="row" className="py-2 pr-4 font-medium text-bark-800">8 &times; 8 ft</th>
              <td className="py-2 pr-4">8&Prime;</td>
              <td className="py-2 pr-4">42.7</td>
              <td className="py-2">1.58</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
