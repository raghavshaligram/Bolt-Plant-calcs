import CalculatorPanel from './CalculatorPanel';
import SoilTypeCalculatorCard from './SoilTypeCalculatorCard';
import { useSoilTypeCalculatorState } from './useSoilTypeCalculatorState';
import type { SoilTypeCalculatorState } from './useSoilTypeCalculatorState';

export interface SoilTypeCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

// Thin wrapper around the shared CalculatorPanel.tsx -- see
// CALC_ROLLOUT_PATTERN.md deliverable 3. No reference-tables portal here:
// this diagnostic classification tool has no static lookup table separate
// from the card's own result explanation (see
// useSoilTypeCalculatorState.ts's TEXTURE_INFO comment).
export default function SoilTypeCalculatorPanel(props: SoilTypeCalculatorPanelProps) {
  return (
    <CalculatorPanel<SoilTypeCalculatorState>
      useCalculatorState={useSoilTypeCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <SoilTypeCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => ({
        mode: calc.mode,
        sand: calc.sand,
        silt: calc.silt,
        clay: calc.clay,
        jarSand: calc.jarSand,
        jarSilt: calc.jarSilt,
        jarClay: calc.jarClay,
      })}
    />
  );
}
