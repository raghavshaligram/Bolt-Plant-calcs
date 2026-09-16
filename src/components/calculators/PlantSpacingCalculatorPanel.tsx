import CalculatorPanel from './CalculatorPanel';
import PlantSpacingCalculatorCard from './PlantSpacingCalculatorCard';
import { usePlantSpacingCalculatorState } from './usePlantSpacingCalculatorState';

export interface PlantSpacingCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

export default function PlantSpacingCalculatorPanel(props: PlantSpacingCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={usePlantSpacingCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <PlantSpacingCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
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
        crop: calc.crop,
        length: calc.bedLength,
        width: calc.bedWidth,
        inRow: calc.inRow,
        betweenRow: calc.betweenRow,
        sqftPerPlant: calc.sqftPerPlant,
        treeType: calc.treeType,
        treeSpacing: calc.treeSpacing,
      })}
    />
  );
}
