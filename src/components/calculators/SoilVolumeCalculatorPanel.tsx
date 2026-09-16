import CalculatorPanel from './CalculatorPanel';
import SoilVolumeCalculatorCard from './SoilVolumeCalculatorCard';
import SoilVolumeReferenceTables from './SoilVolumeReferenceTables';
import { useSoilVolumeCalculatorState } from './useSoilVolumeCalculatorState';

export interface SoilVolumeCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
  referenceTablesPortalId?: string;
}

export default function SoilVolumeCalculatorPanel(props: SoilVolumeCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useSoilVolumeCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <SoilVolumeCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
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
        diameter: calc.diameter,
        depth: calc.depth,
      })}
      extraPortals={
        props.referenceTablesPortalId
          ? [{ id: props.referenceTablesPortalId, render: (calc) => <SoilVolumeReferenceTables calc={calc} /> }]
          : undefined
      }
    />
  );
}
