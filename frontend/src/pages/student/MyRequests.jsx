import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ItemPhoto, usePaged } from '../../components/ItemViews.jsx';
import { PageHeader } from '../../components/Layouts.jsx';
import { EmptyState, ErrorState, Pagination, SkeletonRows, StatusBadge, formatDate, reference } from '../../components/ui.jsx';

const CHIPS = [
  { value: '', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'found', label: 'Matched' },
  { value: 'returned', label: 'Returned' },
  { value: 'closed', label: 'Closed' },
];

const STATUS_HELP = {
  open: 'The office is looking for it. You can still edit this request.',
  returned: 'This item has been handed back to you.',
  closed: 'This request is closed.',
};

export default function MyRequests() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const { rows, meta, loading, error, reload } = usePaged('/api/items', { scope: 'mine', status, page, per_page: 10 });

  return (
    <div className="container page">
      <PageHeader title="My requests">
        <Link to="/app/requests/new" className="btn btn-primary">Report a lost item</Link>
      </PageHeader>

      <div className="chips" role="group" aria-label="Filter by status">
        {CHIPS.map((chip) => (
          <button key={chip.value} type="button" className={`chip${status === chip.value ? ' is-on' : ''}`}
            aria-pressed={status === chip.value} onClick={() => { setStatus(chip.value); setPage(1); }}>
            {chip.label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !rows.length ? (
        <SkeletonRows rows={3} cols={3} />
      ) : rows.length === 0 ? (
        <EmptyState
          title={status ? 'No requests with this status' : 'You have not reported anything yet'}
          action={!status && <Link to="/app/requests/new" className="btn btn-primary">Report a lost item</Link>}
        >
          {status ? 'Choose another status above.' : 'When you report a lost item, you can follow it here until it is back with you.'}
        </EmptyState>
      ) : (
        <>
          <ol className="request-list">
            {rows.map((item) => (
              <li key={item.id} className={`request request-${item.status}`}>
                <ItemPhoto item={item} className="request-photo" />
                <div className="request-main">
                  <div className="request-head">
                    <h2><Link to={`/app/items/${item.id}`}>{item.title}</Link></h2>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="request-meta">
                    <span>{reference(item.id)}</span>
                    <span>{item.category?.name}</span>
                    <span>{item.location?.name}</span>
                    <span>Lost {formatDate(item.date_reported)}</span>
                  </p>

                  {item.status === 'found' ? (
                    <div className="collect-callout">
                      <h3>Ready to collect</h3>
                      {item.admin_note && <p>{item.admin_note}</p>}
                      {item.matched_item && (
                        <p className="collect-match">
                          Matched with found item {reference(item.matched_item.id)}, “{item.matched_item.title}”,
                          handed in at {item.matched_item.location} on {formatDate(item.matched_item.date_reported)}.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="request-help">{STATUS_HELP[item.status]}</p>
                      {item.admin_note && <p className="office-note"><strong>Note from the office:</strong> {item.admin_note}</p>}
                    </>
                  )}

                  <div className="request-actions">
                    <Link to={`/app/items/${item.id}`} className="btn btn-link">View details</Link>
                    {item.can_edit && <Link to={`/app/items/${item.id}?edit=1`} className="btn btn-link">Edit request</Link>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <Pagination meta={meta} onPage={setPage} />
        </>
      )}
    </div>
  );
}
