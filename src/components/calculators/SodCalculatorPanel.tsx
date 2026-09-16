import CalculatorPanel from './CalculatorPanel';
import SodCalculatorCard from './SodCalculatorCard';
import { useSodCalculatorState } from './useSodCalculatorState';

export interface SodCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

export default function SodCalculatorPanel(props: SodCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useSodCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <SodCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => ({
        shape: calc.shape,
        units: calc.unitSystem,
        length: calc.length,
        width: calc.width,
        radius: calc.radius,
        triBase: calc.triBase,
        triHeight: calc.triHeight,
        grassType: calc.grassType,
        customCoverage: calc.customCoverage,
        wasteFactor: calc.wasteFactor,
      })}
    />
  );
}
