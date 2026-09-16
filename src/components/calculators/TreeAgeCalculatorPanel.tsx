import CalculatorPanel from './CalculatorPanel';
import TreeAgeCalculatorCard from './TreeAgeCalculatorCard';
import { useTreeAgeCalculatorState } from './useTreeAgeCalculatorState';

export interface TreeAgeCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

export default function TreeAgeCalculatorPanel(props: TreeAgeCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useTreeAgeCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <TreeAgeCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => ({
        circumference: calc.circumference,
        species: calc.species,
        units: calc.unitSystem,
      })}
    />
  );
}
