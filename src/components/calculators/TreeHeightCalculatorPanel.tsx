import CalculatorPanel from './CalculatorPanel';
import TreeHeightCalculatorCard from './TreeHeightCalculatorCard';
import { useTreeHeightCalculatorState } from './useTreeHeightCalculatorState';

export interface TreeHeightCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

export default function TreeHeightCalculatorPanel(props: TreeHeightCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useTreeHeightCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <TreeHeightCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => ({
        units: calc.unitSystem,
        method: calc.method,
        angleDistance: calc.angleDistance,
        angleTop: calc.angleTop,
        eyeHeight: calc.eyeHeight,
        slopeMode: calc.slopeMode,
        angleBase: calc.angleBase,
        treeShadow: calc.treeShadow,
        refHeight: calc.refHeight,
        refShadow: calc.refShadow,
        stickLength: calc.stickLength,
        armDistance: calc.armDistance,
        stickDistance: calc.stickDistance,
      })}
    />
  );
}
