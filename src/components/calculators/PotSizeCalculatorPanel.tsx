import CalculatorPanel from './CalculatorPanel';
import PotSizeCalculatorCard from './PotSizeCalculatorCard';
import { usePotSizeCalculatorState } from './usePotSizeCalculatorState';

export interface PotSizeCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

export default function PotSizeCalculatorPanel(props: PotSizeCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={usePotSizeCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <PotSizeCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
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
        convertType: calc.convertType,
        standardSizeId: calc.standardSizeId,
        customType: calc.customType,
        customDiameter: calc.customDiameter,
        customHeight: calc.customHeight,
        customVolume: calc.customVolume,
        customVolUnit: calc.customVolUnit,
        sizeupCurrentId: calc.sizeupCurrentId,
        guidePlantId: calc.guidePlantId,
      })}
    />
  );
}
