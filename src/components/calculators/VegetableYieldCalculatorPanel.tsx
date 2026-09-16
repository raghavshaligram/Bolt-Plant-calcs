import CalculatorPanel from './CalculatorPanel';
import VegetableYieldCalculatorCard from './VegetableYieldCalculatorCard';
import { useVegetableYieldCalculatorState } from './useVegetableYieldCalculatorState';

export interface VegetableYieldCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

export default function VegetableYieldCalculatorPanel(props: VegetableYieldCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useVegetableYieldCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <VegetableYieldCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => ({
        mode: calc.mode,
        units: calc.unitSystem,
        crop: calc.cropId,
        plants: calc.plants,
        area: calc.area,
      })}
    />
  );
}
