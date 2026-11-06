import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { usePaged } from '../../components/ItemViews.jsx';
import { ButtonLink, EmptyState, ErrorState, Loading, PageTitle, Pagination, Panel, StatusBadge, formatDate } from '../../components/ui.jsx';

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
    <>
      <PageTitle title="My requests" action={<ButtonLink to="/app/requests/new">Report a lost item</ButtonLink>} />

      <Panel>
        <label className="mb-5 block max-w-xs text-[0.92rem] font-bold">
          Status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All requests</option>
            <option value="open">Open</option>
            <option value="found">Matched</option>
            <option value="returned">Returned</option>
            <option value="closed">Closed</option>
          </select>
        </label>

        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !rows.length ? (
          <Loading label="Loading your requests" />
        ) : rows.length === 0 ? (
          <EmptyState title={status ? 'No requests with this status' : 'You have not reported anything yet'}>
            {status ? 'Choose another status.' : 'When you report a lost item, you can follow it here until it is back with you.'}
          </EmptyState>
        ) : (
          <>
            <ul className="space-y-[15px]">
              {rows.map((item) => (
                <li key={item.id} className="rounded-card border border-line bg-card p-[18px]">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg break-words">
                      <Link to={`/app/items/${item.id}`} className="text-ink hover:underline">{item.title}</Link>
                    </h2>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 flex flex-wrap gap-x-4 text-[0.9rem] text-muted">
                    <span className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden="true" />{item.location?.name}</span>
                    <span className="flex items-center gap-1.5"><Calendar className="size-4" aria-hidden="true" />Lost {formatDate(item.date_reported)}</span>
                  </p>

                  {item.status === 'found' ? (
                    <p className="mt-2"><strong>Ready to collect.</strong> {item.admin_note}</p>
                  ) : (
                    <>
                      <p className="mt-2 text-[0.95rem]">{STATUS_HELP[item.status]}</p>
                      {item.admin_note && <p className="mt-1 text-[0.95rem]"><strong>Note from the office:</strong> {item.admin_note}</p>}
                    </>
                  )}

                  <p className="mt-3 flex gap-4 text-sm font-bold">
                    <Link to={`/app/items/${item.id}`} className="text-teal-dark hover:underline">View details</Link>
                    {item.can_edit && <Link to={`/app/items/${item.id}?edit=1`} className="text-teal-dark hover:underline">Edit request</Link>}
                  </p>
                </li>
              ))}
            </ul>
            <Pagination meta={meta} onPage={setPage} />
          </>
        )}
      </Panel>
    </>
  );
}
