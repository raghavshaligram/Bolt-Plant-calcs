import CalculatorPanel from './CalculatorPanel';
import GrassSeedCalculatorCard from './GrassSeedCalculatorCard';
import GrassSeedReferenceTables from './GrassSeedReferenceTables';
import { useGrassSeedCalculatorState } from './useGrassSeedCalculatorState';

export interface GrassSeedCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
  referenceTablesPortalId: string;
}

export default function GrassSeedCalculatorPanel(props: GrassSeedCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useGrassSeedCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <GrassSeedCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
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
        seedingMode: calc.seedingMode,
        grass: calc.grass,
        length: calc.length,
        width: calc.width,
        sqft: calc.sqft,
        acres: calc.acres,
      })}
      extraPortals={[{ id: props.referenceTablesPortalId, render: (calc) => <GrassSeedReferenceTables calc={calc} /> }]}
    />
  );
}
