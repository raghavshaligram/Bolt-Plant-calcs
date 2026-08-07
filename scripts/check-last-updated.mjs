#!/usr/bin/env node
// check-last-updated.mjs
//
// Every content page on this site declares its own "Last updated" date as a
// hardcoded string (`const lastUpdated = 'YYYY-MM-DD'` in .astro frontmatter,
// or `lastUpdated: 'YYYY-MM-DD'` in .mdx frontmatter). That date drives the
// visible "Last updated" byline AND the dateModified field in Article/HowTo
// JSON-LD schema — so a stale value is both a user-facing and an SEO issue.
//
// It's easy to edit a page's content (a keyword fix, a reciprocal link, a
// fact correction) without remembering to also bump this unrelated-looking
// constant a few lines away. This script has two modes for catching that:
//
//   node scripts/check-last-updated.mjs
//     PRE-COMMIT CHECK (default). Looks at pages with uncommitted changes
//     (staged or unstaged) and flags any whose declared lastUpdated isn't
//     today's date. Run this right before committing a content edit — it's
//     the check that actually prevents the mistake, since it looks at the
//     edit you're about to commit, not at git history.
//
//   node scripts/check-last-updated.mjs --audit
//     HISTORICAL AUDIT. Compares every page's declared date against the
//     date of the last commit that actually touched it, across the whole
//     repo. Useful for a one-off cleanup pass or a periodic sanity check —
//     NOT a pre-commit gate, since git log only reflects already-committed
//     history, not an in-progress edit.
//
// Add --fix to either mode to rewrite the mismatched dates in place instead
// of just reporting them.
//
// Suggested workflow: run the default (pre-commit) check before every
// `git commit` that touches src/pages/. Run --audit occasionally (or after
// a big multi-file change) to catch anything that slipped through.
//
// One known edge case with --audit: if you ever commit a pure date
// correction (fixing a stale date to match its true last-content-change
// date, with no other edits in that commit), that correction commit itself
// becomes the file's new "last touched" commit in git history — so running
// --audit again right after may flag it as freshly "stale" even though the
// declared date is now accurate. That's expected; --audit is most useful
// right after a commit that contains a real content change, not right
// after a metadata-only cleanup commit. When in doubt, trust the default
// pre-commit mode for day-to-day use.

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const auditMode = args.includes('--audit');
const shouldFix = args.includes('--fix');

const DATE_PATTERN = /(lastUpdated:?\s*=?\s*)'(\d{4}-\d{2}-\d{2})'/;

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function readDeclared(file) {
  const content = readFileSync(file, 'utf8');
  const m = content.match(DATE_PATTERN);
  return m ? { content, date: m[2] } : null;
}

function writeFixed(file, content, newDate) {
  const fixed = content.replace(DATE_PATTERN, (_, prefix) => `${prefix}'${newDate}'`);
  writeFileSync(file, fixed);
}

function printMismatches(mismatches, label, fixedLabel) {
  console.log(`${shouldFix ? fixedLabel : label} ${mismatches.length} page(s):\n`);
  for (const { file, declared, target } of mismatches) {
    console.log(`  ${file}`);
    console.log(`    declared: ${declared}    should be: ${target}${shouldFix ? '  -> fixed' : ''}`);
  }
}

if (auditMode) {
  const files = sh(
    `grep -rlE "lastUpdated" src/pages/ --include="*.astro" --include="*.mdx" || true`
  )
    .split('\n')
    .filter(Boolean);

  const mismatches = [];
  for (const file of files) {
    const found = readDeclared(file);
    if (!found) continue;
    const gitDate = sh(`git log -1 --format=%ad --date=format:%Y-%m-%d -- "${file}"`);
    if (!gitDate || gitDate === found.date) continue;
    mismatches.push({ file, declared: found.date, target: gitDate });
    if (shouldFix) writeFixed(file, found.content, gitDate);
  }

  if (mismatches.length === 0) {
    console.log(`✓ Audit: all ${files.length} pages' lastUpdated dates match their last commit.`);
    process.exit(0);
  }

  printMismatches(mismatches, 'Audit found', 'Audit fixed');
  if (!shouldFix) {
    console.log(`\nRun with --fix to update them to their actual last-commit date.`);
    process.exit(1);
  }
  process.exit(0);
} else {
  // Note: don't trim() the raw output here — porcelain lines start with a
  // status column that's often a leading space (" M path"), and a global
  // trim would eat that space off the first line only, throwing off the
  // fixed-width slice below for just that one line.
  const rawStatus = execSync('git status --porcelain -- src/pages/', { encoding: 'utf8' });
  const changed = rawStatus
    .replace(/\n$/, '')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      // Porcelain format is "XY path" or "XY old -> new" for renames.
      const rest = line.slice(3);
      return rest.includes(' -> ') ? rest.split(' -> ')[1] : rest;
    })
    .map((p) => p.trim())
    .filter((f) => f.endsWith('.astro') || f.endsWith('.mdx'));

  if (changed.length === 0) {
    console.log('No uncommitted changes under src/pages/ — nothing to check.');
    process.exit(0);
  }

  const t = today();
  const stale = [];
  for (const file of changed) {
    const found = readDeclared(file);
    if (!found) continue; // this page doesn't track a lastUpdated date
    if (found.date === t) continue;
    stale.push({ file, declared: found.date, target: t });
    if (shouldFix) writeFixed(file, found.content, t);
  }

  if (stale.length === 0) {
    console.log(`✓ Pre-commit check: all modified pages' lastUpdated dates are set to today (${t}).`);
    process.exit(0);
  }

  printMismatches(stale, 'You edited but did not bump lastUpdated on', 'Bumped lastUpdated to today on');
  if (!shouldFix) {
    console.log(`\nRun with --fix to set them to today's date (${t}) automatically.`);
    process.exit(1);
  }
  process.exit(0);
}
