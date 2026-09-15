import { useEffect, useMemo, useRef, useState } from 'react';
import { trackEvent } from '../../lib/analytics';

type Tab = 'share' | 'embed' | 'cite';
type CiteFormat = 'text' | 'html' | 'bibtex';

export interface ShareEmbedCiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab: Tab;
  /** e.g. 'raised-bed-soil-calculator' -- used for GA4 calculator_name and the embed URL. */
  calculatorSlug: string;
  /** e.g. 'Raised Bed Soil Calculator'. */
  calculatorTitle: string;
  /** Root-relative canonical path, e.g. '/calculators/raised-bed-soil-calculator/'. */
  canonicalPath: string;
  /** Site origin, e.g. 'https://harvestmath.com' -- passed from Astro.site so nothing here is hardcoded. */
  origin: string;
  /** Current calculator inputs, serialized into the shareable URL's query string when "share with results" is checked. */
  shareParams: Record<string, string>;
}

/**
 * Part 3 of the sticky-calculator pilot: one modal, three tabs, replacing
 * both the old standalone embed section and the plain ShareButtons row for
 * this page. Lives inside RaisedBedSoilCalculatorPanel.tsx, which is also
 * where the calculator's live input state comes from (shareParams), so
 * "share with results" always reflects exactly what's on screen right now.
 */
export default function ShareEmbedCiteModal({
  isOpen,
  onClose,
  initialTab,
  calculatorSlug,
  calculatorTitle,
  canonicalPath,
  origin,
  shareParams,
}: ShareEmbedCiteModalProps) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [withResults, setWithResults] = useState(false);
  const [citeFormat, setCiteFormat] = useState<CiteFormat>('text');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) setTab(initialTab);
  }, [isOpen, initialTab]);

  // Esc to close, and focus the dialog so screen readers land inside it.
  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const canonicalUrl = `${origin}${canonicalPath}`;
  const embedUrl = `${origin}/embed/${calculatorSlug}/`;
  const iframeId = `hm-embed-${calculatorSlug}`;

  const shareUrl = useMemo(() => {
    if (!withResults) return canonicalUrl;
    const qs = new URLSearchParams(shareParams).toString();
    return qs ? `${canonicalUrl}?${qs}` : canonicalUrl;
  }, [withResults, shareParams, canonicalUrl]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copy this:', text);
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 2000);
  };

  const shareChannel = (channel: 'facebook' | 'x' | 'pinterest') => {
    trackEvent('calculator_shared', {
      calculator_name: calculatorSlug,
      with_results: withResults,
      channel,
    });
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(calculatorTitle);
    const urls: Record<typeof channel, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      x: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`,
    };
    window.open(urls[channel], '_blank', 'noopener,noreferrer,width=600,height=500');
  };

  const copyShareUrl = () => {
    trackEvent('calculator_shared', {
      calculator_name: calculatorSlug,
      with_results: withResults,
      channel: 'copy_link',
    });
    copy(shareUrl, 'share-url');
  };

  const iframeSnippet = `<iframe id="${iframeId}" src="${embedUrl}"
  width="100%" height="600" style="border:0;max-width:680px"
  title="${calculatorTitle} by HarvestMath"></iframe>
<p style="font-size:12px;color:#64748b;margin:6px 0 0;max-width:680px;">Powered by <a href="${canonicalUrl}" style="color:#3f6b4a;text-decoration:none;font-weight:600;">HarvestMath</a></p>`;

  const resizeScript = `<script>
(function () {
  window.addEventListener('message', function (e) {
    if (!e || !e.data || !e.data.calculator || e.data.calculator !== '${calculatorSlug}') return;
    if (e.data.type === 'hm-embed-resize') {
      var iframe = document.getElementById('${iframeId}');
      if (iframe && e.data.height) iframe.style.height = e.data.height + 'px';
    }
    if (e.source && typeof e.source.postMessage === 'function') {
      e.source.postMessage({ type: 'hm-embed-pong', calculator: '${calculatorSlug}' }, '*');
    }
  });
})();
</script>`;

  const copyEmbed = (snippet: string, snippetType: 'iframe' | 'resize_script') => {
    trackEvent('embed_code_copied', { calculator_name: calculatorSlug, snippet_type: snippetType });
    copy(snippet, snippetType);
  };

  const accessDate = useMemo(
    () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    []
  );
  const accessDateIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const bibtexKey = `harvestmath_${calculatorSlug.replace(/-/g, '_')}`;

  const citeText: Record<CiteFormat, string> = {
    text: `HarvestMath Editors. ${calculatorTitle}. Available at: ${canonicalUrl}. Accessed: ${accessDate}.`,
    html: `<a href="${canonicalUrl}">HarvestMath Editors. ${calculatorTitle}</a>. Accessed: ${accessDate}.`,
    bibtex: `@misc{${bibtexKey},\n  author = {HarvestMath Editors},\n  title = {${calculatorTitle}},\n  url = {${canonicalUrl}},\n  note = {Accessed: ${accessDateIso}}\n}`,
  };

  const copyCite = () => {
    trackEvent('calculator_cited', { calculator_name: calculatorSlug, format: citeFormat });
    copy(citeText[citeFormat], `cite-${citeFormat}`);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-bark-900/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Share, embed, or cite the ${calculatorTitle}`}
        tabIndex={-1}
        className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-cardHover ring-1 ring-moss-100/60 sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-moss-100 px-5 py-4">
          <h2 className="font-display text-base font-semibold text-bark-900">Share, embed, or cite this calculator</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-bark-400 transition hover:bg-moss-50 hover:text-bark-700"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-moss-100 px-2">
          {(['share', 'embed', 'cite'] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-selected={tab === t}
              role="tab"
              className={`relative px-3.5 py-3 text-sm font-medium capitalize transition ${
                tab === t ? 'text-moss-800' : 'text-bark-500 hover:text-bark-700'
              }`}
            >
              {t}
              {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-moss-700" />}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-5">
          {tab === 'share' && (
            <div className="flex flex-col gap-4">
              <label className="flex items-start gap-2.5 text-sm text-bark-700">
                <input
                  type="checkbox"
                  checked={withResults}
                  onChange={(e) => setWithResults(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-moss-300 text-moss-700 focus:ring-moss-500"
                />
                <span>
                  Share calculator with results
                  <span className="block text-xs text-bark-500">
                    Includes your current dimensions and settings in the link, so whoever opens it sees this exact result.
                  </span>
                </span>
              </label>

              <div>
                <label htmlFor="rb-share-url" className="label-field">
                  Link
                </label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    id="rb-share-url"
                    type="text"
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.currentTarget.select()}
                    className="input-field flex-1 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={copyShareUrl}
                    className="shrink-0 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
                  >
                    {copiedKey === 'share-url' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <span className="label-field">Share to</span>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shareChannel('pinterest')}
                    aria-label="Share to Pinterest"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#E60023]/5 text-[#E60023] transition hover:bg-[#E60023]/10"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.237 2.636 7.855 6.356 9.312-.088-.791-.167-2.005.035-2.872.182-.78 1.172-4.971 1.172-4.971s-.299-.598-.299-1.482c0-1.388.806-2.425 1.808-2.425.853 0 1.265.641 1.265 1.41 0 .858-.546 2.14-.828 3.331-.236.995.499 1.807 1.481 1.807 1.777 0 3.144-1.874 3.144-4.58 0-2.393-1.72-4.067-4.177-4.067-2.845 0-4.515 2.135-4.515 4.34 0 .859.331 1.781.745 2.281a.3.3 0 0 1 .069.283c-.073.305-.233.959-.265 1.093-.042.175-.14.217-.322.13-1.197-.557-1.945-2.307-1.945-3.713 0-3.022 2.196-5.797 6.335-5.797 3.326 0 5.913 2.371 5.913 5.541 0 3.302-2.083 5.962-4.974 5.962-.971 0-1.884-.504-2.197-1.101l-.598 2.282c-.216.832-.801 1.873-1.194 2.51A10.034 10.034 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => shareChannel('facebook')}
                    aria-label="Share to Facebook"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-bark-500 transition hover:bg-moss-50 hover:text-moss-800"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => shareChannel('x')}
                    aria-label="Share to X"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-bark-500 transition hover:bg-moss-50 hover:text-moss-800"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'embed' && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-bark-600">
                Free to use on your own site — just keep the visible attribution link included below the widget.
              </p>

              <div>
                <label htmlFor="rb-embed-iframe" className="label-field">
                  Embed code
                </label>
                <div className="relative mt-1.5">
                  <textarea
                    id="rb-embed-iframe"
                    readOnly
                    rows={5}
                    value={iframeSnippet}
                    onFocus={(e) => e.currentTarget.select()}
                    className="input-field w-full resize-none pr-16 font-mono text-xs leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={() => copyEmbed(iframeSnippet, 'iframe')}
                    className="absolute right-2 top-2 rounded-md border border-moss-200 bg-white px-2.5 py-1 text-xs font-medium text-moss-800 shadow-sm transition hover:bg-moss-50"
                  >
                    {copiedKey === 'iframe' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <details className="text-sm text-bark-600">
                <summary className="cursor-pointer select-none font-medium text-bark-700">
                  Optional: auto-resize script (recommended)
                </summary>
                <p className="mt-2">
                  Add this once anywhere on the page and the widget resizes itself to fit its content, instead of scrolling inside a fixed 600px box:
                </p>
                <div className="relative mt-2">
                  <textarea
                    readOnly
                    rows={7}
                    value={resizeScript}
                    onFocus={(e) => e.currentTarget.select()}
                    className="input-field w-full resize-none pr-16 font-mono text-xs leading-relaxed"
                  />
                  <button
                    type="button"
                    onClick={() => copyEmbed(resizeScript, 'resize_script')}
                    className="absolute right-2 top-2 rounded-md border border-moss-200 bg-white px-2.5 py-1 text-xs font-medium text-moss-800 shadow-sm transition hover:bg-moss-50"
                  >
                    {copiedKey === 'resize_script' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </details>

              <p className="text-sm">
                <a href={embedUrl} target="_blank" rel="noopener" className="font-medium text-moss-700 hover:text-moss-900">
                  Preview the embed version →
                </a>
                <span className="text-bark-400"> · </span>
                <a href="/embed/" className="font-medium text-moss-700 hover:text-moss-900">
                  See all embeddable calculators
                </a>
              </p>
            </div>
          )}

          {tab === 'cite' && (
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex shrink-0 gap-1.5 sm:flex-col">
                {(['text', 'html', 'bibtex'] as CiteFormat[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setCiteFormat(f)}
                    className={`rounded-lg px-3 py-1.5 text-left text-sm font-medium ring-1 ring-inset transition ${
                      citeFormat === f
                        ? 'bg-moss-700 text-white ring-moss-700'
                        : 'bg-white text-bark-700 ring-moss-200 hover:bg-moss-50'
                    }`}
                  >
                    {f === 'html' ? 'HTML' : f === 'bibtex' ? 'BibTeX' : 'Text'}
                  </button>
                ))}
              </div>

              <div className="flex-1">
                <textarea
                  readOnly
                  rows={6}
                  value={citeText[citeFormat]}
                  onFocus={(e) => e.currentTarget.select()}
                  className="input-field w-full resize-none font-mono text-xs leading-relaxed"
                />
                <button
                  type="button"
                  onClick={copyCite}
                  className="mt-2 rounded-lg bg-moss-50 px-3 py-1.5 text-xs font-semibold text-moss-800 ring-1 ring-inset ring-moss-200 transition hover:bg-moss-100"
                >
                  {copiedKey === `cite-${citeFormat}` ? 'Copied!' : 'Copy citation'}
                </button>
                <p className="mt-2 text-xs text-bark-500">Author: HarvestMath Editors. Accessed: {accessDate}.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
