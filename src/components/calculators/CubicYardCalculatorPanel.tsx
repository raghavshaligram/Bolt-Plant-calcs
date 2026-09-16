import CalculatorPanel from './CalculatorPanel';
import CubicYardCalculatorCard from './CubicYardCalculatorCard';
import { useCubicYardCalculatorState } from './useCubicYardCalculatorState';

export interface CubicYardCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

export default function CubicYardCalculatorPanel(props: CubicYardCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useCubicYardCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <CubicYardCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => ({
        material: calc.material,
        mode: calc.mode,
        units: calc.unitSystem,
        length: calc.dimLength,
        width: calc.dimWidth,
        depth: calc.dimDepth,
        direction: calc.weightDirection,
        weightValue: calc.weightValue,
        volumeValue: calc.volumeValue,
        area: calc.areaValue,
        areaDepth: calc.areaDepth,
      })}
    />
  );
}
