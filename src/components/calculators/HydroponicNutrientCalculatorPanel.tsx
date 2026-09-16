import CalculatorPanel from './CalculatorPanel';
import HydroponicNutrientCalculatorCard from './HydroponicNutrientCalculatorCard';
import HydroponicNutrientReferenceTables from './HydroponicNutrientReferenceTables';
import { useHydroponicNutrientCalculatorState } from './useHydroponicNutrientCalculatorState';

export interface HydroponicNutrientCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
  referenceTablesPortalId: string;
}

export default function HydroponicNutrientCalculatorPanel(props: HydroponicNutrientCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useHydroponicNutrientCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <HydroponicNutrientCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => ({
        reservoirVolume: calc.reservoirVolume,
        reservoirUnit: calc.reservoirUnit,
        perUnitVolume: calc.perUnitVolume,
        doseAmount: calc.doseAmount,
        doseUnit: calc.doseUnit,
        growthStage: calc.growthStage,
        ecValue: calc.ecValue,
      })}
      extraPortals={[{ id: props.referenceTablesPortalId, render: (calc) => <HydroponicNutrientReferenceTables calc={calc} /> }]}
    />
  );
}
