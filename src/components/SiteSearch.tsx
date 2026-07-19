import { useEffect, useRef, useState } from 'react';

// Site-wide search powered by Pagefind (https://pagefind.app) -- a static
// search index generated as a postbuild step (see package.json's "build"
// script: `astro build && pagefind --site dist`), so it only exists in a
// real production build, never in `astro dev`. The runtime is fetched with
// a plain dynamic import at search time (not a static import, which Vite
// can't resolve since /pagefind/pagefind.js doesn't exist in source, only
// in the built dist/ output) so this component fails gracefully -- an
// empty "no results" state, not a crash -- if the index isn't there yet.

interface PagefindResultData {
  url: string;
  meta: { title: string };
  excerpt: string;
}

interface PagefindModule {
  options: (opts: Record<string, unknown>) => Promise<void>;
  search: (query: string) => Promise<{ results: { data: () => Promise<PagefindResultData> }[] }>;
}

interface ResultItem {
  url: string;
  title: string;
  excerpt: string;
}

let pagefindPromise: Promise<PagefindModule | null> | null = null;

function loadPagefind(): Promise<PagefindModule | null> {
  if (!pagefindPromise) {
    // @ts-expect-error -- generated as a postbuild step straight into
    // dist/pagefind/pagefind.js, so it never exists in source for TS to resolve.
    pagefindPromise = import(/* @vite-ignore */ '/pagefind/pagefind.js')
      .then(async (mod: PagefindModule) => {
        await mod.options({ excerptLength: 18 });
        return mod;
      })
      .catch(() => null);
  }
  return pagefindPromise;
}

function SearchIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
      <path d="M17 17l-3.8-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

export default function SiteSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ResultItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [indexUnavailable, setIndexUnavailable] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | undefined>(undefined);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAndReset();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(raf);
    };
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const thisRequestId = ++requestIdRef.current;
    debounceRef.current = window.setTimeout(async () => {
      const pf = await loadPagefind();
      if (thisRequestId !== requestIdRef.current) return; // a newer keystroke superseded this search
      if (!pf) {
        setIndexUnavailable(true);
        setResults([]);
        setLoading(false);
        return;
      }
      try {
        const search = await pf.search(q);
        if (thisRequestId !== requestIdRef.current) return;
        const top = search.results.slice(0, 8);
        const data = await Promise.all(top.map((r) => r.data()));
        setResults(data.map((d) => ({ url: d.url, title: d.meta.title, excerpt: d.excerpt })));
      } catch {
        setResults([]);
      } finally {
        if (thisRequestId === requestIdRef.current) setLoading(false);
      }
    }, 150);
  }, [query]);

  function closeAndReset() {
    setOpen(false);
    setQuery('');
    setResults(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search the site"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-bark-600 transition hover:bg-moss-100 hover:text-moss-800"
      >
        <SearchIcon className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-bark-900/40 backdrop-blur-sm"
            onClick={closeAndReset}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Site search"
            className="relative mx-auto flex h-full w-full flex-col bg-[#F5F1E8] sm:mt-20 sm:h-auto sm:max-h-[70vh] sm:max-w-lg sm:rounded-2xl sm:shadow-cardHover sm:ring-1 sm:ring-[#5C4433]/15"
          >
            <div className="flex items-center gap-2.5 border-b border-[#5C4433]/15 px-4 py-3.5 sm:py-3">
              <SearchIcon className="h-4 w-4 shrink-0 text-bark-400" />
              <input
                ref={inputRef}
                type="text"
                inputMode="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search calculators, guides, and more…"
                className="min-w-0 flex-1 bg-transparent text-base text-bark-900 placeholder:text-bark-400 focus:outline-none sm:text-sm"
              />
              <button
                type="button"
                onClick={closeAndReset}
                aria-label="Close search"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-bark-400 transition hover:bg-bark-50 hover:text-bark-700"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-2 sm:p-2.5">
              {!query.trim() ? (
                <p className="px-3 py-8 text-center text-sm text-bark-400">
                  Start typing to search calculators, guides, and more.
                </p>
              ) : loading ? (
                <p className="px-3 py-8 text-center text-sm text-bark-400">Searching…</p>
              ) : indexUnavailable ? (
                <p className="px-3 py-8 text-center text-sm text-bark-400">
                  Search isn&rsquo;t available right now &mdash; try again in a moment.
                </p>
              ) : results && results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-bark-400">
                  No results for &ldquo;{query}&rdquo;.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {results?.map((r) => (
                    <li key={r.url}>
                      <a
                        href={r.url}
                        onClick={closeAndReset}
                        className="block rounded-xl px-3 py-2.5 transition hover:bg-moss-50"
                      >
                        <p className="text-sm font-semibold text-bark-900">{r.title}</p>
                        <p
                          className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-bark-500 [&_mark]:bg-[#E8A94A]/40 [&_mark]:text-bark-900 [&_mark]:font-medium"
                          dangerouslySetInnerHTML={{ __html: r.excerpt }}
                        />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
