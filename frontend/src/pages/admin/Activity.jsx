import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePaged } from '../../components/ItemViews.jsx';
import { PageHeader } from '../../components/Layouts.jsx';
import { EmptyState, ErrorState, Pagination, STATUS_LABELS, SkeletonRows, formatDateTime, reference } from '../../components/ui.jsx';

const ACTION_LABELS = {
  'auth.login': 'Signed in',
  'auth.login_failed': 'Failed sign-in',
  'auth.logout': 'Signed out',
  'item.created': 'Item created',
  'item.updated': 'Item edited',
  'item.status_changed': 'Status changed',
  'item.removed': 'Item removed',
  'item.restored': 'Item restored',
  'db.created': 'Database row added',
  'db.updated': 'Database row edited',
  'db.deleted': 'Database row deleted',
};

export const actionLabel = (action) => ACTION_LABELS[action] || action;

/** One readable sentence (without the actor) for an activity entry. */
export function describeActivity(entry) {
  const d = entry.details || {};
  const ref = entry.subject_type === 'Item' && entry.subject_id ? reference(entry.subject_id) : null;
  switch (entry.action) {
    case 'auth.login': return 'signed in.';
    case 'auth.logout': return 'signed out.';
    case 'auth.login_failed': return `failed to sign in as ${d.email || 'an unknown email'}${d.reason ? ` (${d.reason})` : ''}.`;
    case 'item.created': return `${d.type === 'found' ? 'registered found item' : 'reported lost item'} ${ref}${d.title ? `, “${d.title}”` : ''}.`;
    case 'item.updated': return `edited ${ref}${d.fields?.length ? ` (${d.fields.join(', ')})` : ''}.`;
    case 'item.status_changed': return `moved ${ref} from ${STATUS_LABELS[d.from] || d.from} to ${STATUS_LABELS[d.to] || d.to}${d.matched_item_id ? `, linked to ${reference(d.matched_item_id)}` : ''}.`;
    case 'item.removed': return `removed ${ref}: ${d.reason}.`;
    case 'item.restored': return `restored ${ref}.`;
    case 'db.created': return `added row ${entry.subject_id} to ${entry.subject_type}.`;
    case 'db.updated': return `edited row ${entry.subject_id} in ${entry.subject_type}${d.fields ? ` (${Object.keys(d.fields).join(', ')})` : ''}.`;
    case 'db.deleted': return `deleted row ${entry.subject_id} from ${entry.subject_type}.`;
    default: return entry.action;
  }
}

export default function Activity() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const { rows, meta, loading, error, reload, extra } = usePaged('/api/admin/activity', { action, page, per_page: 25 });
  const actions = extra?.actions || [];

  return (
    <div className="admin-page">
      <PageHeader title="Activity log" />
      <p className="page-intro">Every sign-in, case change and database edit, newest first. Entries cannot be edited or deleted.</p>

      <div className="filter-bar">
        <label className="filter">
          <span className="filter-label">Action</span>
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <option value="">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
          </select>
        </label>
      </div>

      {error ? <ErrorState error={error} onRetry={reload} />
        : loading && !rows.length ? <SkeletonRows rows={8} cols={4} />
          : rows.length === 0 ? <EmptyState title="No entries for this action" />
            : (
              <>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr><th scope="col">Time</th><th scope="col">Action</th><th scope="col">What happened</th><th scope="col">IP</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((entry) => (
                        <tr key={entry.id}>
                          <td data-label="Time" className="nowrap">{formatDateTime(entry.created_at)}</td>
                          <td data-label="Action"><span className={`action-pill action-${entry.action.split('.')[0]}${entry.action.includes('failed') || entry.action.includes('removed') || entry.action.includes('deleted') ? ' is-warn' : ''}`}>{actionLabel(entry.action)}</span></td>
                          <td data-label="What happened">
                            <strong>{entry.user?.name || 'Unknown user'}</strong> {describeActivity(entry)}
                            {entry.subject_type === 'Item' && entry.subject_id && <> <Link to={`/admin/cases/${entry.subject_id}`} className="inline-link">Open case</Link></>}
                          </td>
                          <td data-label="IP" className="muted nowrap">{entry.ip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination meta={meta} onPage={setPage} />
              </>
            )}
    </div>
  );
}
