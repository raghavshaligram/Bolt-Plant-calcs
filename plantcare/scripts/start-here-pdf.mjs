#!/usr/bin/env node
/**
 * start-here-pdf.mjs — START-HERE.md, typeset, as dist/START-HERE.pdf.
 *
 *   node scripts/start-here-pdf.mjs
 *
 * The guide is written and reviewed as Markdown; this turns that one source into
 * the PDF the buyer receives. Two sources would drift within one release, and
 * the version that drifts is always the one nobody re-reads — the PDF.
 *
 * ── WHY THE MARKDOWN IS CONVERTED BY HAND ───────────────────────────────────
 *
 * A Markdown library would be a dependency added to a build whose whole claim is
 * that it has almost none, in order to parse a document this repository writes
 * itself, in a subset it already knows: headings, paragraphs, ordered and
 * unordered lists, bold, and inline code. `assertSubset()` below refuses to run
 * if the guide ever uses anything outside that subset, so this stays honest —
 * it will fail loudly rather than silently dropping a table or a link.
 *
 * Chromium does the typesetting, via the Playwright already present for the
 * screenshot and verification scripts. Nothing new is installed.
 */
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { chromium } from 'playwright';

/**
 * This container keeps Chromium somewhere Playwright does not look by default;
 * on a normal machine the list finds nothing and Playwright's own resolution is
 * used, which is what happens on yours. Same approach as scripts/shots.mjs.
 */
const EXECUTABLE = ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome', '/opt/pw-browsers/chromium/chrome-linux/chrome'].find(
  (p) => existsSync(p)
);

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'START-HERE.md');
const OUT = join(ROOT, 'dist', 'START-HERE.pdf');

/* ------------------------------------------------------------ the subset --- */

/**
 * Refuse anything this converter cannot render.
 *
 * Silently ignoring an unsupported construct is the failure mode that matters:
 * a table dropped from a printed guide is not visible to anybody who has only
 * ever read the Markdown.
 */
function assertSubset(md) {
  const bad = [];
  md.split('\n').forEach((line, i) => {
    const n = i + 1;
    if (/^\s*\|/.test(line)) bad.push(`${n}: table`);
    if (/^\s*>/.test(line)) bad.push(`${n}: blockquote`);
    if (/^\s*```/.test(line)) bad.push(`${n}: fenced code block`);
    if (/!\[/.test(line)) bad.push(`${n}: image`);
    if (/\[[^\]]+\]\([^)]+\)/.test(line)) bad.push(`${n}: link`);
    if (/^#{4,}\s/.test(line)) bad.push(`${n}: heading deeper than h3`);
    if (/^\s*[*+]\s/.test(line)) bad.push(`${n}: list marker other than "-"`);
  });
  if (bad.length) {
    console.error('START-HERE.md uses Markdown this converter does not render:\n  ' + bad.join('\n  '));
    console.error('\nEither simplify the guide or teach scripts/start-here-pdf.mjs the construct.');
    process.exit(1);
  }
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Inline: bold, then code. Escaped first, so the guide can contain angle brackets. */
const inline = (s) =>
  escape(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

/**
 * Block-level. Lines inside a paragraph or a list item are joined with a space,
 * because the source is hard-wrapped at 80 columns and those breaks are not
 * meaningful.
 */
function toHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let para = [];
  let list = null; // 'ul' | 'ol'
  let itemLines = [];

  const flushItem = () => {
    if (itemLines.length) out.push(`<li>${inline(itemLines.join(' '))}</li>`);
    itemLines = [];
  };
  const closeList = () => {
    if (!list) return;
    flushItem();
    out.push(`</${list}>`);
    list = null;
  };
  const flushPara = () => {
    if (para.length) {
      const text = para.join(' ');
      // A paragraph that is bold from end to end is the guide's way of saying
      // "if you read one sentence, read this one". It gets a panel, so that it
      // survives being skimmed — which is how a printed guide is actually read.
      const whole = /^\*\*[^*]+\*\*$/.test(text);
      out.push(whole ? `<p class="lead">${inline(text)}</p>` : `<p>${inline(text)}</p>`);
    }
    para = [];
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');

    if (!line.trim()) {
      flushPara();
      flushItem();
      continue;
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      flushPara();
      closeList();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      continue;
    }

    const ol = /^(\d+)\.\s+(.*)$/.exec(line);
    const ul = /^-\s+(.*)$/.exec(line);
    if (ol || ul) {
      flushPara();
      const want = ol ? 'ol' : 'ul';
      if (list !== want) {
        closeList();
        list = want;
        out.push(`<${want}>`);
      } else {
        flushItem();
      }
      itemLines = [(ol ? ol[2] : ul[1])];
      continue;
    }

    // A continuation line: of the open list item if there is one, else the paragraph.
    if (list && itemLines.length && /^\s{2,}\S/.test(raw)) {
      itemLines.push(line.trim());
      continue;
    }

    closeList();
    para.push(line.trim());
  }
  flushPara();
  closeList();
  return out.join('\n');
}

/* ---------------------------------------------------------------- layout --- */

/**
 * The site's palette, so the printed guide and the app are recognisably one
 * thing. Print styling rather than screen styling: a serif for the body at a
 * size that is comfortable on paper, and headings that cannot be orphaned at the
 * foot of a page.
 */
const page = (body) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>HarvestMath Plant Care — start here</title>
<style>
  @page { size: A4; margin: 20mm 18mm 18mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font: 10.5pt/1.62 Georgia, "Times New Roman", serif;
    color: #2b2b26;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1 {
    font-family: "Trebuchet MS", "Segoe UI", sans-serif;
    font-size: 22pt; line-height: 1.2; color: #385030;
    margin: 0 0 4mm; padding-bottom: 3mm;
    border-bottom: 2px solid #c8d8bd;
  }
  h2 {
    font-family: "Trebuchet MS", "Segoe UI", sans-serif;
    font-size: 13pt; color: #385030;
    margin: 9mm 0 2mm;
    break-after: avoid; page-break-after: avoid;
  }
  h1 + p { font-size: 11pt; color: #4b4b42; }
  h3 { font-size: 11pt; margin: 6mm 0 1.5mm; break-after: avoid; }
  p { margin: 0 0 3mm; orphans: 2; widows: 2; }
  ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
  li { margin: 0 0 1.6mm; orphans: 2; widows: 2; }
  strong { color: #1f2b1a; }
  code {
    font-family: "Consolas", "SFMono-Regular", monospace;
    font-size: 9.2pt;
    background: #f1f3ec; border: 1px solid #e0e4d6; border-radius: 2px;
    padding: 0 1mm;
  }
  p.lead {
    font-size: 11.5pt; line-height: 1.5;
    background: #f2f6ec; border-left: 3px solid #7d9a6a;
    padding: 3mm 4mm; margin: 0 0 4mm;
    break-inside: avoid; page-break-inside: avoid;
  }
  p.lead strong { font-weight: 700; }
  .sig {
    margin-top: 10mm; padding-top: 3mm;
    border-top: 1px solid #dfe3d6;
    font-family: "Trebuchet MS", "Segoe UI", sans-serif;
    font-size: 8.5pt; color: #6b6b5e;
  }
</style></head><body>
${body}
<p class="sig">HarvestMath Plant Care · harvestmath.com/plant-care/updates/ — new versions and your download live there. Updates are free forever, and no part of this app stops working if you never visit it again.</p>
</body></html>`;

/* ------------------------------------------------------------------ build -- */

const md = readFileSync(SRC, 'utf8');
assertSubset(md);
const html = page(toHtml(md));

mkdirSync(join(ROOT, 'dist'), { recursive: true });

const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
const ctx = await browser.newContext();
const p = await ctx.newPage();
await p.setContent(html, { waitUntil: 'load' });
await p.pdf({
  path: OUT,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate:
    '<div style="width:100%;font:8pt Georgia,serif;color:#8a8a7c;padding:0 18mm;">' +
    '<span style="float:left">HarvestMath Plant Care</span>' +
    '<span style="float:right">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>' +
    '</div>',
  margin: { top: '20mm', bottom: '18mm', left: '18mm', right: '18mm' },
});
await browser.close();

console.log(`START-HERE.pdf written to ${OUT}`);
