import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { get } from '../../api.js';
import { FilterBar, ItemGrid, ItemTable, ViewToggle, usePaged, useViewMode } from '../../components/ItemViews.jsx';
import { EmptyState, ErrorState, Pagination, SkeletonCards, SkeletonRows, formatDate, prefersReducedMotion, reference } from '../../components/ui.jsx';

export default function Browse() {
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [view, setView] = useViewMode('browse');
  const resultsRef = useRef(null);

  const { rows, meta, loading, error, reload } = usePaged('/api/items', { ...filters, scope: 'catalog', page, per_page: 12 });

  const [latest, setLatest] = useState([]);
  useEffect(() => {
    const controller = new AbortController();
    get('/api/items', { scope: 'catalog', per_page: 3 }, { signal: controller.signal })
      .then((d) => setLatest(d.data || []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const linkFor = (item) => `/app/items/${item.id}`;

  function scrollToResults() {
    resultsRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    resultsRef.current?.focus({ preventScroll: true });
  }

  function changePage(next) {
    setPage(next);
    scrollToResults();
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      <section className="hero">
        <div className="container hero-inner">
          <h1 className="hero-title">Find what matters.</h1>
          <p className="hero-lede">
            Everything handed in to the campus Lost &amp; Found Office, as it comes in.
            Lost something that is not here yet? Report it and the office will match it for you.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary btn-lg" onClick={scrollToResults}>Browse found items</button>
            <Link to="/app/requests/new" className="btn btn-quiet btn-lg">Report a lost item</Link>
          </div>
          {meta && <p className="hero-count"><strong>{meta.total}</strong> {meta.total === 1 ? 'item is' : 'items are'} waiting to be claimed{hasFilters ? ' with these filters' : ''}.</p>}
          {latest.length > 0 && (
            <aside className="hero-latest" aria-labelledby="latest-title">
              <h2 id="latest-title">Just handed in</h2>
              <ol>
                {latest.map((item) => (
                  <li key={item.id}>
                    <Link to={linkFor(item)}>
                      <span className="tag-hole" aria-hidden="true" />
                      <span className="latest-text">
                        <strong>{item.title}</strong>
                        <small>{item.location?.name}, {formatDate(item.date_reported)}</small>
                      </span>
                      <span className="tag-ref">{reference(item.id)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </aside>
          )}
        </div>
      </section>

      <section className="container results" aria-labelledby="results-title">
        <div className="results-head" ref={resultsRef} tabIndex={-1}>
          <h2 id="results-title">Found on campus</h2>
          <ViewToggle value={view} onChange={setView} />
        </div>

        <FilterBar value={filters} onChange={(next) => { setFilters(next); setPage(1); }} />

        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !rows.length ? (
          view === 'cards' ? <SkeletonCards /> : <SkeletonRows />
        ) : rows.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'Nothing matches these filters' : 'Nothing has been handed in yet'}
            action={<Link to="/app/requests/new" className="btn btn-primary">Report a lost item</Link>}
          >
            {hasFilters
              ? 'Try fewer filters, or report your item so the office can contact you when it turns up.'
              : 'Report your item and the office will contact you when it turns up.'}
          </EmptyState>
        ) : (
          <div className={loading ? 'is-refreshing' : ''} aria-busy={loading}>
            {view === 'cards'
              ? <ItemGrid items={rows} linkFor={linkFor} />
              : <ItemTable items={rows} linkFor={linkFor} columns={['ref', 'title', 'category', 'location', 'date']} caption="Found items" />}
            <Pagination meta={meta} onPage={changePage} />
          </div>
        )}
      </section>
    </>
  );
}
