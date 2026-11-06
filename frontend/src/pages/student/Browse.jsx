import { useRef, useState } from 'react';
import { FilterBar, ItemGrid, ItemTable, ViewToggle, usePaged, useViewMode } from '../../components/ItemViews.jsx';
import { Button, ButtonLink, EmptyState, ErrorState, Hero, Loading, Pagination, Panel } from '../../components/ui.jsx';

export default function Browse() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [view, setView] = useViewMode('browse');
  const listRef = useRef(null);

  const { rows, meta, loading, error, reload } = usePaged('/api/items', { ...filters, scope: 'catalog', page, per_page: 12 });
  const linkFor = (item) => `/app/items/${item.id}`;
  const hasFilters = Object.values(filters).some(Boolean);

  // Smooth scrolling comes from index.css (and is off for reduced motion).
  function scrollToList() {
    listRef.current?.scrollIntoView({ block: 'start' });
    listRef.current?.focus({ preventScroll: true });
  }

  function changePage(next) {
    setPage(next);
    scrollToList();
  }

  return (
    <>
      <Hero
        title="Find what matters."
        text="Check what has been handed in to the Lost & Found Office, or report what you lost."
        action={<Button onClick={scrollToList}>Browse found items</Button>}
      />

      <Panel aria-labelledby="list-title" className="scroll-mt-4">
        <div ref={listRef} tabIndex={-1} className="mb-4 flex flex-wrap items-center justify-between gap-3 outline-none">
          <h2 id="list-title" className="text-2xl">Found items</h2>
          <div className="flex items-center gap-3">
            {meta && <span className="text-sm text-muted" aria-live="polite">{meta.total} {meta.total === 1 ? 'item' : 'items'}</span>}
            <ViewToggle value={view} onChange={setView} />
          </div>
        </div>

        <FilterBar value={filters} onChange={(next) => { setFilters(next); setPage(1); }} />

        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !rows.length ? (
          <Loading label="Loading found items" />
        ) : rows.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'Nothing matches these filters' : 'Nothing has been handed in yet'}
            action={<ButtonLink to="/app/requests/new">Report a lost item</ButtonLink>}
          >
            Report your item and the office will contact you when it turns up.
          </EmptyState>
        ) : (
          <div aria-busy={loading} className={loading ? 'opacity-60' : undefined}>
            {view === 'cards'
              ? <ItemGrid items={rows} linkFor={linkFor} />
              : <ItemTable items={rows} linkFor={linkFor} columns={['title', 'category', 'location', 'date']} caption="Found items" />}
            <Pagination meta={meta} onPage={changePage} />
          </div>
        )}
      </Panel>
    </>
  );
}
