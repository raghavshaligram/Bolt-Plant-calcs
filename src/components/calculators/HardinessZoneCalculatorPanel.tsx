import CalculatorPanel from './CalculatorPanel';
import HardinessZoneCalculatorCard from './HardinessZoneCalculatorCard';
import { useHardinessZoneCalculatorState } from './useHardinessZoneCalculatorState';
import type { HardinessZoneCalculatorState } from './useHardinessZoneCalculatorState';

export interface HardinessZoneCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

// Thin wrapper around the shared CalculatorPanel.tsx -- see
// CALC_ROLLOUT_PATTERN.md deliverable 3. No reference-tables portal here:
// the "Zone Reference Table" and "Zones by State" sections live in the
// page's own article body, not inside HardinessZoneFinder.tsx, so there's
// nothing to extract out of the card.
export default function HardinessZoneCalculatorPanel(props: HardinessZoneCalculatorPanelProps) {
  return (
    <CalculatorPanel<HardinessZoneCalculatorState>
      useCalculatorState={useHardinessZoneCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <HardinessZoneCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => ({
        zip: calc.zip,
      })}
    />
  );
}
