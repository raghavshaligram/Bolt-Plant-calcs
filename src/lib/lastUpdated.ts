// getLastUpdated — derives a page's "last updated" date from git history
// instead of a hand-maintained constant.
//
// The old pattern (`const lastUpdated = '2026-07-17';` hardcoded per page)
// silently goes stale the moment someone edits a page's content and forgets
// to also bump that one unrelated-looking line a few lines away. It's
// happened repeatedly (Cubic Yard Calculator, Plant Spacing Calculator) and
// even a dedicated pre-commit check script couldn't fully solve it, since
// it relies on someone remembering to run it. This removes the hardcoded
// value entirely: the date is looked up from the last git commit that
// actually touched the file, so it can't drift from reality.
//
// Known limitation: this reflects the last commit that touched the file's
// *source*, not necessarily a reader-meaningful content change -- a purely
// mechanical refactor (like adopting this very function) will bump the
// date once, the same way a hand-maintained date would need a one-time
// correction. Going forward, though, the date only changes when the file
// is actually committed to, with no separate "remember to update this"
// step required ever again.
//
// Also assumes a non-shallow git clone (full commit history available).
// This project's deploy setup does a standard full clone, but if that ever
// changes, older untouched files would fall through to today's date --
// the fallback below is deliberately "today" rather than a blank/error
// value, since a wrong-but-plausible date is a smaller problem on a
// low-traffic content site than a broken build.

import { execSync } from 'node:child_process';

export function getLastUpdated(relativePath: string): string {
  try {
    const date = execSync(
      `git log -1 --format=%ad --date=format:%Y-%m-%d -- "${relativePath}"`,
      { cwd: process.cwd(), stdio: ['ignore', 'pipe', 'ignore'] }
    )
      .toString()
      .trim();
    if (date) return date;
  } catch {
    // Not a git repo, git unavailable, or no commit history for this path
    // (e.g. a brand-new uncommitted file) -- fall through to today.
  }
  return new Date().toISOString().slice(0, 10);
}
