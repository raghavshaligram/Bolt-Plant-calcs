import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import CalculatorActionsBlock from './CalculatorActionsBlock';
import ShareEmbedCiteModal from './ShareEmbedCiteModal';
import { useCalculatorFeedback } from './useCalculatorFeedback';
import type { Sentiment } from './useCalculatorFeedback';

type ModalTab = 'share' | 'embed' | 'cite';

/**
 * Build Prompt: Calculator Page Redesign -- Roll Out to All Remaining
 * Calculators.
 *
 * Generic version of the pilot's bespoke RaisedBedSoilCalculatorPanel.tsx.
 * The pilot wrote one Panel component per calculator; rolling the same
 * pattern out to 24 more calculators the same way would mean 24 nearly-
 * identical copies of this exact wiring (mount at slot="actions" in the
 * left column, portal the calculator card into the sticky right column,
 * share one feedback/vote state between the action row and the card, feed
 * the Share/Embed/Cite modal from the card's own live inputs). Instead,
 * this ONE component takes the calculator-specific pieces as props --
 * the state hook, a card renderer, and a share-params builder -- so every
 * calculator page's own `<X>CalculatorPanel.tsx` is a thin ~20-line
 * wrapper around this, not a full copy of the portal/modal/feedback
 * plumbing. RaisedBedSoilCalculatorPanel.tsx itself is left as-is (it
 * already works and ships live) rather than retrofitted to use this.
 */
export interface CalculatorPanelProps<TState> {
  /** The calculator's own state hook, e.g. useMulchCalculatorState. */
  useCalculatorState: () => TState;
  /** Renders the calculator card given the live state + shared feedback vote. */
  renderCard: (calc: TState, sentiment: Sentiment | null, onVote: (value: Sentiment) => void) => ReactNode;
  calculatorSlug: string;
  calculatorTitle: string;
  /** Root-relative canonical path, e.g. '/calculators/mulch-calculator/'. */
  canonicalPath: string;
  origin: string;
  googlePreferredSourcesUrl: string | null;
  /** id of the empty placeholder <div> in the sticky right column the card portals into. */
  calculatorPortalId: string;
  /** Builds the "share with results" query params from the calculator's live state. */
  buildShareParams: (calc: TState) => Record<string, string>;
  /**
   * Optional additional placeholder <div> targets elsewhere in the page's
   * normal content flow -- e.g. static reference/comparison tables that
   * used to live inside the calculator card itself. Moving them out (same
   * as the pilot's RaisedBedSoilReferenceTables) is what keeps the sticky
   * panel short enough to avoid an internal scrollbar on calculators that
   * shipped with a lot of inline reference material.
   */
  extraPortals?: { id: string; render: (calc: TState) => ReactNode }[];
}

export default function CalculatorPanel<TState>({
  useCalculatorState,
  renderCard,
  calculatorSlug,
  calculatorTitle,
  canonicalPath,
  origin,
  googlePreferredSourcesUrl,
  calculatorPortalId,
  buildShareParams,
  extraPortals = [],
}: CalculatorPanelProps<TState>) {
  const calc = useCalculatorState();
  const feedback = useCalculatorFeedback(calculatorSlug);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>('share');
  const [portalTarget, setPortalTarget] = useState<Element | null>(null);
  const [extraTargets, setExtraTargets] = useState<Record<string, Element | null>>({});

  // The placeholder divs are server-rendered markup elsewhere in the page,
  // so they already exist by the time this island hydrates -- but we still
  // look them up on mount rather than assuming, in case that ever changes.
  useEffect(() => {
    setPortalTarget(document.getElementById(calculatorPortalId));
    if (extraPortals.length) {
      const found: Record<string, Element | null> = {};
      extraPortals.forEach((p) => {
        found[p.id] = document.getElementById(p.id);
      });
      setExtraTargets(found);
    }
    // extraPortals is a fresh array/functions each render from the caller;
    // only the portal ids (captured once here) matter for the lookup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculatorPortalId]);

  const openModal = (tab: ModalTab) => {
    setModalTab(tab);
    setModalOpen(true);
  };

  const shareParams = useMemo(() => buildShareParams(calc), [calc, buildShareParams]);

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

      {portalTarget && createPortal(renderCard(calc, feedback.sentiment, feedback.submitFeedback), portalTarget)}

      {extraPortals.map((p) => {
        const target = extraTargets[p.id];
        return target ? <Fragment key={p.id}>{createPortal(p.render(calc), target)}</Fragment> : null;
      })}

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
