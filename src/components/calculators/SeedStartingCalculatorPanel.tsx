import CalculatorPanel from './CalculatorPanel';
import SeedStartingCalculatorCard from './SeedStartingCalculatorCard';
import { useSeedStartingCalculatorState } from './useSeedStartingCalculatorState';
import type { SeedStartingCalculatorState } from './useSeedStartingCalculatorState';

export interface SeedStartingCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

// Thin wrapper around the shared CalculatorPanel.tsx -- see
// CALC_ROLLOUT_PATTERN.md deliverable 3. No reference-tables portal here:
// the "Seed Starting Timeline by Crop" table already lived in the page's
// own article body, outside the original calculator component, so there
// was nothing inside the card to extract (see
// SeedStartingCalculatorCard.tsx's top comment).
export default function SeedStartingCalculatorPanel(props: SeedStartingCalculatorPanelProps) {
  return (
    <CalculatorPanel<SeedStartingCalculatorState>
      useCalculatorState={useSeedStartingCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <SeedStartingCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
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
        crop: calc.cropId,
      })}
    />
  );
}
