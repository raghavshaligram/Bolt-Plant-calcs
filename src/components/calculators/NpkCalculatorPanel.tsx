import CalculatorPanel from './CalculatorPanel';
import NpkCalculatorCard from './NpkCalculatorCard';
import { useNpkCalculatorState } from './useNpkCalculatorState';

export interface NpkCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  calculatorPortalId: string;
}

export default function NpkCalculatorPanel(props: NpkCalculatorPanelProps) {
  return (
    <CalculatorPanel
      useCalculatorState={useNpkCalculatorState}
      renderCard={(calc, sentiment, onVote) => (
        <NpkCalculatorCard calc={calc} sentiment={sentiment} onVote={onVote} />
      )}
      calculatorSlug={props.calculatorSlug}
      calculatorTitle={props.calculatorTitle}
      canonicalPath={props.canonicalPath}
      origin={props.origin}
      googlePreferredSourcesUrl={props.googlePreferredSourcesUrl}
      calculatorPortalId={props.calculatorPortalId}
      buildShareParams={(calc) => {
        const p1 = calc.blendProducts[0] ?? { name: '', n: '', p: '', k: '' };
        const p2 = calc.blendProducts[1] ?? { name: '', n: '', p: '', k: '' };
        const p3 = calc.blendProducts[2] ?? { name: '', n: '', p: '', k: '' };
        return {
          mode: calc.mode,
          units: calc.unitSystem,
          // granular
          granN: calc.granN,
          granP: calc.granP,
          granK: calc.granK,
          granRate: calc.granRate,
          granArea: calc.granArea,
          // liquid
          liqN: calc.liqN,
          liqP: calc.liqP,
          liqK: calc.liqK,
          liqInputMode: calc.liqInputMode,
          liqTargetPpm: calc.liqTargetPpm,
          liqRatioAmt: calc.liqRatioAmt,
          liqRatioVol: calc.liqRatioVol,
          liqContainer: calc.liqContainer,
          // blend -- bounded to exactly 2 or 3 products (never open-ended),
          // so unlike Growing Degree Days' accumulation log this fits a
          // fixed set of query params cleanly. See readStateFromUrl's doc
          // comment in useNpkCalculatorState.ts for the full reasoning.
          blendCount: String(calc.blendCount),
          blendTargetN: calc.blendTargetN,
          blendTargetP: calc.blendTargetP,
          blendTargetK: calc.blendTargetK,
          blendRate: calc.blendRate,
          blendArea: calc.blendArea,
          b1name: p1.name, b1n: p1.n, b1p: p1.p, b1k: p1.k,
          b2name: p2.name, b2n: p2.n, b2p: p2.p, b2k: p2.k,
          ...(calc.blendCount === 3 ? { b3name: p3.name, b3n: p3.n, b3p: p3.p, b3k: p3.k } : {}),
        };
      }}
    />
  );
}
