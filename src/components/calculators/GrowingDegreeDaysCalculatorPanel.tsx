import CalculatorPanel from './CalculatorPanel';
import GrowingDegreeDaysCalculatorCard from './GrowingDegreeDaysCalculatorCard';
import { useGrowingDegreeDaysCalculatorState } from './useGrowingDegreeDaysCalculatorState';

export interface GrowingDegreeDaysCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

export default function GrowingDegreeDaysCalculatorPanel(props: GrowingDegreeDaysCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useGrowingDegreeDaysCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <GrowingDegreeDaysCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => ({
        // Single-day quick-check inputs only -- the accumulation tracker's
        // daily log isn't encoded (see readStateFromUrl's doc comment in
        // useGrowingDegreeDaysCalculatorState.ts for why).
        units: calc.unitSystem,
        preset: calc.preset,
        customBase: calc.customBase,
        cap: calc.capEnabled ? '1' : '0',
        tmax: calc.singleTmax,
        tmin: calc.singleTmin,
      })}
    />
  );
}
