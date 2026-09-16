import CalculatorPanel from './CalculatorPanel';
import TopsoilCalculatorCard from './TopsoilCalculatorCard';
import TopsoilReferenceTables from './TopsoilReferenceTables';
import { useTopsoilCalculatorState } from './useTopsoilCalculatorState';

export interface TopsoilCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
  referenceTablesPortalId?: string;
}

export default function TopsoilCalculatorPanel(props: TopsoilCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useTopsoilCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <TopsoilCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
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
        useCase: calc.useCase,
        length: calc.length,
        width: calc.width,
        area: calc.area,
        depth: calc.depth,
      })}
      extraPortals={
        props.referenceTablesPortalId
          ? [{ id: props.referenceTablesPortalId, render: (calc) => <TopsoilReferenceTables calc={calc} /> }]
          : undefined
      }
    />
  );
}
