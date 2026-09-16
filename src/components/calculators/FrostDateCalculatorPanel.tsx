import CalculatorPanel from './CalculatorPanel';
import FrostDateCalculatorCard from './FrostDateCalculatorCard';
import { useFrostDateCalculatorState } from './useFrostDateCalculatorState';
import type { FrostDateCalculatorState } from './useFrostDateCalculatorState';

export interface FrostDateCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

// Thin wrapper around the shared CalculatorPanel.tsx -- see
// CALC_ROLLOUT_PATTERN.md deliverable 3. No reference-tables portal here:
// the original component's only "table" is the live planting timeline,
// which is derived from the current result (not a static/browsable lookup
// table), so it stays inside the card, same as the diagnostic-tool
// calculators (e.g. Soil Type) that had no separate reference table to
// extract.
export default function FrostDateCalculatorPanel(props: FrostDateCalculatorPanelProps) {
  return (
    <CalculatorPanel<FrostDateCalculatorState>
      useCalculatorState={useFrostDateCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <FrostDateCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => ({
        mode: calc.inputMode,
        zip: calc.zip,
        zone: calc.zone,
      })}
    />
  );
}
