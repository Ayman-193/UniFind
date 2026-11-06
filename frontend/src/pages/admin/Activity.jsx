import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePaged } from '../../components/ItemViews.jsx';
import { EmptyState, ErrorState, Loading, PageTitle, Pagination, Panel, STATUS_LABELS, Table, formatDateTime } from '../../components/ui.jsx';

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

const actionLabel = (action) => ACTION_LABELS[action] || action;

/** One readable sentence (without the actor) for an activity entry. */
export function describeActivity(entry) {
  const d = entry.details || {};
  const ref = `item #${entry.subject_id}`;
  switch (entry.action) {
    case 'auth.login': return 'signed in.';
    case 'auth.logout': return 'signed out.';
    case 'auth.login_failed': return `failed to sign in as ${d.email || 'an unknown email'}${d.reason ? ` (${d.reason})` : ''}.`;
    case 'item.created': return `${d.type === 'found' ? 'registered found' : 'reported lost'} ${ref}${d.title ? `, “${d.title}”` : ''}.`;
    case 'item.updated': return `edited ${ref}${d.fields?.length ? ` (${d.fields.join(', ')})` : ''}.`;
    case 'item.status_changed': return `moved ${ref} from ${STATUS_LABELS[d.from] || d.from} to ${STATUS_LABELS[d.to] || d.to}${d.matched_item_id ? `, linked to item #${d.matched_item_id}` : ''}.`;
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
    <>
      <PageTitle title="Activity log" />
      <Panel>
        <p className="-mt-1 mb-4 text-sm text-muted">Every sign-in, case change and database edit, newest first. Entries cannot be edited or deleted.</p>
        <label className="mb-5 block max-w-xs text-sm font-bold">
          Action
          <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}>
            <option value="">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{actionLabel(a)}</option>)}
          </select>
        </label>

        {error ? <ErrorState error={error} onRetry={reload} />
          : loading && !rows.length ? <Loading label="Loading the activity log" />
            : rows.length === 0 ? <EmptyState title="No entries for this action" />
              : (
                <>
                  <Table caption="Activity log">
                    <thead>
                      <tr><th scope="col">Time</th><th scope="col">Action</th><th scope="col">What happened</th><th scope="col">IP</th></tr>
                    </thead>
                    <tbody>
                      {rows.map((entry) => (
                        <tr key={entry.id}>
                          <td className="whitespace-nowrap">{formatDateTime(entry.created_at)}</td>
                          <td className="whitespace-nowrap font-bold">{actionLabel(entry.action)}</td>
                          <td className="min-w-64">
                            <strong>{entry.user?.name || 'Unknown user'}</strong> {describeActivity(entry)}
                            {entry.subject_type === 'Item' && entry.subject_id && <> <Link to={`/admin/cases/${entry.subject_id}`} className="font-bold text-teal-dark hover:underline">Open case</Link></>}
                          </td>
                          <td className="whitespace-nowrap text-muted">{entry.ip}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                  <Pagination meta={meta} onPage={setPage} />
                </>
              )}
      </Panel>
    </>
  );
}
