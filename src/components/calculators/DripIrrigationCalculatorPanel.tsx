import CalculatorPanel from './CalculatorPanel';
import DripIrrigationCalculatorCard from './DripIrrigationCalculatorCard';
import { useDripIrrigationCalculatorState } from './useDripIrrigationCalculatorState';

export interface DripIrrigationCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

export default function DripIrrigationCalculatorPanel(props: DripIrrigationCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useDripIrrigationCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <DripIrrigationCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
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
        emitters: calc.emitterCount,
        flowPreset: calc.flowPreset,
        customFlow: calc.customFlowRate,
        perPlant: calc.perPlantAmount,
        area: calc.areaValue,
        depth: calc.depthValue,
        sessions: calc.sessionsPerWeek,
      })}
    />
  );
}
