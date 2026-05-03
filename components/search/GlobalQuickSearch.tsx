import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

type SearchHit = {
  type: 'logbook_entry';
  id: string;
  title: string;
  subtitle: string;
  date?: string;
};

export default function GlobalQuickSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchHit[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const canUsePalette = useMemo(() => {
    const blocked = ['/', '/contact', '/privacy', '/terms', '/maintenance'];
    return !blocked.includes(router.pathname);
  }, [router.pathname]);
  const showFloatingLauncher = router.pathname !== '/reports';

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!canUsePalette) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [canUsePalette]);

  useEffect(() => {
    const handleExternalOpen = (event: Event) => {
      const custom = event as CustomEvent<{ query?: string }>;
      if (custom.detail?.query) {
        setQuery(custom.detail.query);
      }
      setOpen(true);
    };
    window.addEventListener('pesttrace:open-quick-search', handleExternalOpen as EventListener);
    return () => {
      window.removeEventListener('pesttrace:open-quick-search', handleExternalOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const run = window.setTimeout(async () => {
      const term = query.trim();
      if (!term) {
        setResults([]);
        setHighlightedIndex(0);
        return;
      }
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setResults([]);
        setLoading(false);
        return;
      }
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const payload = await res.json().catch(() => []);
      setResults(Array.isArray(payload) ? payload : []);
      setHighlightedIndex(0);
      setLoading(false);
    }, 220);
    return () => window.clearTimeout(run);
  }, [query, open]);

  const navigateToHit = async (hit: SearchHit) => {
    setOpen(false);
    await router.push({
      pathname: '/reports',
      query: {
        search: hit.title,
      },
    });
  };

  if (!canUsePalette) return null;

  return (
    <>
      {showFloatingLauncher ? (
        <button
          type="button"
          aria-label="Open quick search"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-[75] rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-md hover:bg-slate-50"
        >
          Search
        </button>
      ) : null}
      {open ? (
        <div className="fixed inset-0 z-[95] bg-black/35 p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-search-title"
            className="mx-auto mt-16 w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-200 px-4 py-3">
              <p id="global-search-title" className="text-sm font-semibold text-slate-800">Quick Search (Ctrl/Cmd + K)</p>
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setHighlightedIndex((idx) => Math.min(results.length - 1, idx + 1));
                  } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setHighlightedIndex((idx) => Math.max(0, idx - 1));
                  } else if (event.key === 'Enter' && results[highlightedIndex]) {
                    event.preventDefault();
                    void navigateToHit(results[highlightedIndex]);
                  }
                }}
                placeholder="Search client, address, treatment..."
                className="form-input mt-2"
              />
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {loading ? (
                <p className="px-3 py-2 text-sm text-slate-500">Searching...</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">Type to search logbook records.</p>
              ) : (
                results.map((hit, index) => (
                  <button
                    key={hit.id}
                    type="button"
                    onClick={() => void navigateToHit(hit)}
                    className={`w-full rounded-lg px-3 py-2 text-left ${
                      index === highlightedIndex ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-slate-900">{hit.title}</p>
                    <p className="text-xs text-slate-500">{hit.subtitle}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
