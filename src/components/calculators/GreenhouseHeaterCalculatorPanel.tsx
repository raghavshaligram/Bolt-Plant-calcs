import CalculatorPanel from './CalculatorPanel';
import GreenhouseHeaterCalculatorCard from './GreenhouseHeaterCalculatorCard';
import GreenhouseHeaterReferenceTables from './GreenhouseHeaterReferenceTables';
import { useGreenhouseHeaterCalculatorState } from './useGreenhouseHeaterCalculatorState';

export interface GreenhouseHeaterCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
  referenceTablesPortalId: string;
}

export default function GreenhouseHeaterCalculatorPanel(props: GreenhouseHeaterCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useGreenhouseHeaterCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <GreenhouseHeaterCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
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
        height: calc.height,
        glazing: calc.glazing,
        insideTemp: calc.insideTemp,
        outsideTemp: calc.outsideTemp,
        fuel: calc.fuel,
      })}
      extraPortals={[{ id: props.referenceTablesPortalId, render: (calc) => <GreenhouseHeaterReferenceTables calc={calc} /> }]}
    />
  );
}
