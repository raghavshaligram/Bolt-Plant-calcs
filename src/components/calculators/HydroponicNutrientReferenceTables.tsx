import type { HydroponicNutrientCalculatorState } from './useHydroponicNutrientCalculatorState';

/**
 * The "Which PPM scale does my meter use?" lookup table used to live inside
 * the EC/PPM Converter section of the sticky calculator card. It's fixed
 * reference data -- it doesn't depend on the live calculator state -- so
 * moving it into the normal page flow (this component, portaled into the
 * article) is what lets the sticky panel shrink down to just the tool
 * itself, matching the pilot's ReferenceTables pattern.
 */
export default function HydroponicNutrientReferenceTables({ calc: _calc }: { calc: HydroponicNutrientCalculatorState }) {
  return (
    <div className="not-prose overflow-x-auto rounded-2xl border border-moss-200 bg-white shadow-card">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Which PPM scale does my meter use?</caption>
        <thead className="bg-moss-50 text-xs uppercase tracking-wide text-bark-500">
          <tr>
            <th scope="col" className="px-4 py-2.5 font-semibold">Scale</th>
            <th scope="col" className="px-4 py-2.5 font-semibold">Common meter brands</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-moss-100">
          <tr>
            <td className="px-4 py-2.5 font-medium text-bark-800">500</td>
            <td className="px-4 py-2.5 text-bark-600">Hanna, Milwaukee, General Hydroponics, Oakton</td>
          </tr>
          <tr>
            <td className="px-4 py-2.5 font-medium text-bark-800">640</td>
            <td className="px-4 py-2.5 text-bark-600">Some European meters</td>
          </tr>
          <tr>
            <td className="px-4 py-2.5 font-medium text-bark-800">700</td>
            <td className="px-4 py-2.5 text-bark-600">Bluelab, Eutech, Truncheon</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
