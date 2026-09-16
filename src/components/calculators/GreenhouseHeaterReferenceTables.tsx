import { GLAZING_OPTIONS } from './useGreenhouseHeaterCalculatorState';
import type { GreenhouseHeaterCalculatorState, GlazingKey } from './useGreenhouseHeaterCalculatorState';

/**
 * The "U-factor by glazing type" table used to live inside the sticky
 * calculator card. That made the card taller than most viewports, forcing
 * it to scroll internally to stay sticky without covering the footer.
 * Moving it into the normal page flow (this component, portaled into the
 * article) lets the sticky panel shrink down to just the tool itself, so it
 * now sticks without needing to scroll on typical screen sizes. This is
 * fixed reference data -- it doesn't depend on the live calculator state --
 * matching the pilot's RaisedBedSoilReferenceTables pattern.
 */
export default function GreenhouseHeaterReferenceTables({ calc: _calc }: { calc: GreenhouseHeaterCalculatorState }) {
  return (
    <div className="not-prose rounded-2xl bg-white p-5 shadow-card ring-1 ring-moss-100/60 sm:p-6">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="mb-2 text-left text-xs font-medium uppercase tracking-wider text-bark-400">
            U-factor by glazing type
          </caption>
          <thead>
            <tr className="border-b border-moss-100 text-bark-500">
              <th scope="col" className="py-2 pr-4 font-medium">Glazing</th>
              <th scope="col" className="py-2 font-medium">U-factor (BTU/hr&middot;ft&sup2;&middot;&deg;F)</th>
            </tr>
          </thead>
          <tbody className="text-bark-700">
            {(Object.keys(GLAZING_OPTIONS) as GlazingKey[]).map((key, i, arr) => (
              <tr key={key} className={i < arr.length - 1 ? 'border-b border-moss-50' : ''}>
                <th scope="row" className="py-2 pr-4 font-medium text-bark-800">
                  {GLAZING_OPTIONS[key].label}
                </th>
                <td className="py-2">{GLAZING_OPTIONS[key].u}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
