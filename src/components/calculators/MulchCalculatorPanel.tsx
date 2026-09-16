import CalculatorPanel from './CalculatorPanel';
import MulchCalculatorCard from './MulchCalculatorCard';
import MulchReferenceTables from './MulchReferenceTables';
import { useMulchCalculatorState } from './useMulchCalculatorState';

export interface MulchCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
  referenceTablesPortalId: string;
}

export default function MulchCalculatorPanel(props: MulchCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useMulchCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <MulchCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => ({
        mode: calc.mode,
        shape: calc.shape,
        units: calc.unitSystem,
        material: calc.material,
        length: calc.length,
        width: calc.width,
        radius: calc.radius,
        area: calc.area,
        depth: calc.depth,
        bagSize: calc.bagSize,
      })}
      extraPortals={[{ id: props.referenceTablesPortalId, render: (calc) => <MulchReferenceTables calc={calc} /> }]}
    />
  );
}
