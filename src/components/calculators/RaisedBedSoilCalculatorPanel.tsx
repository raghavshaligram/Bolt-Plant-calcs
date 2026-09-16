import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import RaisedBedSoilCalculatorCard from './RaisedBedSoilCalculatorCard';
import RaisedBedSoilReferenceTables from './RaisedBedSoilReferenceTables';
import CalculatorActionsBlock from './CalculatorActionsBlock';
import ShareEmbedCiteModal from './ShareEmbedCiteModal';
import { useRaisedBedSoilCalculatorState } from './useRaisedBedSoilCalculatorState';
import { useCalculatorFeedback } from './useCalculatorFeedback';

type ModalTab = 'share' | 'embed' | 'cite';

export interface RaisedBedSoilCalculatorPanelProps {
  calculatorSlug: string;
  calculatorTitle: string;
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  /**
   * id of the empty placeholder <div> the layout puts in the sticky right
   * column (see CalculatorLayout.astro's stickyCalculator grid). This
   * component mounts in the LEFT column (at slot="actions") and portals
   * the calculator card into that placeholder, so the card, the action
   * row, and the modal all still share one piece of state -- despite now
   * rendering in two different columns -- without any cross-island
   * messaging.
   */
  calculatorPortalId: string;
  /**
   * id of a second empty placeholder <div>, this one in the normal (non-
   * sticky) article flow. The bag-count comparison and unit-conversion
   * tables portal here instead of living in the sticky card -- that's what
   * lets the sticky panel be short enough to stick without an internal
   * scrollbar on typical screens.
   */
  referenceTablesPortalId: string;
}

/**
 * Correction Prompt: Calculator Page Pilot -- Fix Layout Placement.
 *
 * Previously this component rendered the card + action panel + modal all
 * together in the sticky right column. That buried the share/feedback/
 * related-calculator actions below the calculator's inputs and results,
 * forcing users to scroll inside the sticky panel to reach them.
 *
 * This mounts instead at slot="actions" in the LEFT column (normal
 * scrolling flow) and portals ONLY the calculator card into a plain
 * placeholder div living in the sticky RIGHT column. One hook call each
 * for the calculator state and the feedback vote/count still means the
 * action row, the card's "Was this helpful?" prompt, and the Share/Embed/
 * Cite modal all read and write the exact same state.
 */
export default function RaisedBedSoilCalculatorPanel({
  calculatorSlug,
  calculatorTitle,
  canonicalPath,
  origin,
  googlePreferredSourcesUrl,
  calculatorPortalId,
  referenceTablesPortalId,
}: RaisedBedSoilCalculatorPanelProps) {
  const calc = useRaisedBedSoilCalculatorState();
  const feedback = useCalculatorFeedback(calculatorSlug);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>('share');
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const [referenceTarget, setReferenceTarget] = useState<Element | null>(null);

  // The placeholder divs are server-rendered markup elsewhere in the page,
  // so they already exist by the time this island hydrates -- but we still
  // look them up on mount rather than assuming, in case that ever changes.
  useEffect(() => {
    setPortalTarget(document.getElementById(calculatorPortalId));
    setReferenceTarget(document.getElementById(referenceTablesPortalId));
  }, [calculatorPortalId, referenceTablesPortalId]);

  const openModal = (tab: ModalTab) => {
    setModalTab(tab);
    setModalOpen(true);
  };

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
      <CalculatorActionsBlock
        sentiment={feedback.sentiment}
        helpfulCount={feedback.helpfulCount}
        showCount={feedback.showCount}
        onVote={feedback.submitFeedback}
        onOpenModal={openModal}
        googlePreferredSourcesUrl={googlePreferredSourcesUrl}
      />

      {portalTarget &&
        createPortal(
          <RaisedBedSoilCalculatorCard calc={calc} sentiment={feedback.sentiment} onVote={feedback.submitFeedback} />,
          portalTarget
        )}

      {referenceTarget && createPortal(<RaisedBedSoilReferenceTables calc={calc} />, referenceTarget)}

      <ShareEmbedCiteModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTab={modalTab}
        calculatorSlug={calculatorSlug}
        calculatorTitle={calculatorTitle}
        canonicalPath={canonicalPath}
        origin={origin}
        shareParams={shareParams}
      />
    </>
  );
}
