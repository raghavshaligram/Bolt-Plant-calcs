import CalculatorPanel from './CalculatorPanel';
import GrowLightCalculatorCard from './GrowLightCalculatorCard';
import { useGrowLightCalculatorState } from './useGrowLightCalculatorState';

export interface GrowLightCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

export default function GrowLightCalculatorPanel(props: GrowLightCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useGrowLightCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <GrowLightCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
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
        area: calc.area,
        lightNeed: calc.lightNeed,
        hoursPerDay: calc.hoursPerDay,
        electricityRate: calc.electricityRate,
        ppfd: calc.ppfd,
        photoperiod: calc.photoperiod,
        comparePlant: calc.comparePlant,
        lightType: calc.lightType,
        growthStage: calc.growthStage,
      })}
    />
  );
}
