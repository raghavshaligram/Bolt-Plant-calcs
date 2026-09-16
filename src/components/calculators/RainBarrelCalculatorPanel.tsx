import CalculatorPanel from './CalculatorPanel';
import RainBarrelCalculatorCard from './RainBarrelCalculatorCard';
import { useRainBarrelCalculatorState } from './useRainBarrelCalculatorState';

export interface RainBarrelCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

export default function RainBarrelCalculatorPanel(props: RainBarrelCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useRainBarrelCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <RainBarrelCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => ({
        units: calc.unitSystem,
        roofArea: calc.roofArea,
        rainfall: calc.rainfall,
        efficiency: calc.efficiency,
        height: calc.height,
      })}
    />
  );
}
