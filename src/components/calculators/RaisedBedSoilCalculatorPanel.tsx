import { useMemo, useState } from 'react';
import RaisedBedSoilCalculatorCard from './RaisedBedSoilCalculatorCard';
import CalculatorActionPanel, { type RelatedLink } from './CalculatorActionPanel';
import ShareEmbedCiteModal from './ShareEmbedCiteModal';
import { useRaisedBedSoilCalculatorState } from './useRaisedBedSoilCalculatorState';

export interface RaisedBedSoilCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  relatedLinks: RelatedLink[];
  googlePreferredSourcesUrl: string | null;
}

/**
 * Sticky-layout pilot (Raised Bed Soil Calculator only -- see the Build
 * Prompt this implements). This is the single component mounted into the
 * layout's sticky sidebar column: it owns the calculator's state via
 * useRaisedBedSoilCalculatorState() and hands that same state down to the
 * card, the action panel (Reset/Feedback/Related), and the Share/Embed/Cite
 * modal, so all three stay in sync without any cross-island messaging.
 */
export default function RaisedBedSoilCalculatorPanel({
  calculatorSlug,
  calculatorTitle,
  canonicalPath,
  origin,
  relatedLinks,
  googlePreferredSourcesUrl,
}: RaisedBedSoilCalculatorPanelProps) {
  const calc = useRaisedBedSoilCalculatorState();
  const [modalOpen, setModalOpen] = useState(false);

  const shareParams = useMemo(
    () => ({
      length: calc.length,
      width: calc.width,
      depth: calc.depth,
      bagSize: calc.bagSize,
      units: calc.unitSystem,
    }),
    [calc.length, calc.width, calc.depth, calc.bagSize, calc.unitSystem]
  );

  return (
    <>
      <RaisedBedSoilCalculatorCard calc={calc} />
      <CalculatorActionPanel
        calculatorSlug={calculatorSlug}
        hasResult={calc.hasResult}
        onReset={calc.reset}
        onOpenShare={() => setModalOpen(true)}
        relatedLinks={relatedLinks}
        googlePreferredSourcesUrl={googlePreferredSourcesUrl}
      />
      <ShareEmbedCiteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTab="share"
        calculatorSlug={calculatorSlug}
        calculatorTitle={calculatorTitle}
        canonicalPath={canonicalPath}
        origin={origin}
        shareParams={shareParams}
      />
    </>
  );
}
