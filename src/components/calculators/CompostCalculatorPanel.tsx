import CalculatorPanel from './CalculatorPanel';
import CompostCalculatorCard from './CompostCalculatorCard';
import { useCompostCalculatorState } from './useCompostCalculatorState';

export interface CompostCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

export default function CompostCalculatorPanel(props: CompostCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useCompostCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <CompostCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => ({
        mode: calc.mode,
        length: calc.length,
        width: calc.width,
        area: calc.area,
        depth: calc.depth,
        bagSize: calc.bagSize,
        units: calc.unitSystem,
      })}
    />
  );
}
