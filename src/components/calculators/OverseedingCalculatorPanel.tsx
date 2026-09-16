import CalculatorPanel from './CalculatorPanel';
import OverseedingCalculatorCard from './OverseedingCalculatorCard';
import { useOverseedingCalculatorState } from './useOverseedingCalculatorState';

export interface OverseedingCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

export default function OverseedingCalculatorPanel(props: OverseedingCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useOverseedingCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <OverseedingCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => ({
        area: calc.area,
        grass: calc.grass,
        condition: calc.condition,
        units: calc.unitSystem,
        topdressing: calc.useTopdressing ? '1' : '0',
        material: calc.topdressMaterial,
        depth: calc.depth,
      })}
    />
  );
}
