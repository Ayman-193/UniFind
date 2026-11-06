import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, post } from '../../api.js';
import { ItemForm } from '../../components/ItemViews.jsx';
import { Button, ErrorState, Loading, PageTitle, Panel, RemovedBadge, StatusBadge, TypeBadge, formatDate, formatDateTime, useToast } from '../../components/ui.jsx';
import { NotFound } from '../Auth.jsx';
import { ACTION_LABEL, RemoveDialog, StatusDialog, statusActions, useRestore } from './Cases.jsx';

const back = { to: '/admin/cases', label: 'Cases' };

function Facts({ rows }) {
  return (
    <dl className="grid gap-x-6 gap-y-1 text-[0.95rem] sm:grid-cols-[max-content_1fr] sm:gap-y-2">
      {rows.filter(Boolean).map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="font-bold">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function CaseEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const restore = useRestore((restored) => setItem(restored));

  function load() {
    if (isNew) return;
    setError(null);
    get(`/api/items/${id}`).then((d) => setItem(d.data)).catch(setError);
  }
  useEffect(load, [id]);

  async function save(data) {
    try {
      if (isNew) {
        const result = await post('/api/items', data);
        toast.success('Item saved.');
        navigate(`/admin/cases/${result.data.id}`, { replace: true });
      } else {
        data.append('_method', 'PUT');
        const result = await post(`/api/items/${id}`, data);
        setItem(result.data);
        setFormKey((k) => k + 1);
        toast.success('Changes saved.');
      }
    } catch (e) {
      toast.error(e.status === 422 ? 'Check the highlighted fields.' : e.message);
      throw e;
    }
  }

  if (isNew) {
    return (
      <>
        <PageTitle title="Add found item" back={back} />
        <Panel>
          <p className="-mt-1 mb-[22px] text-[0.9rem] text-muted">Register something that was handed in. Open found items appear on the student page straight away.</p>
          <ItemForm mode="admin" submitLabel="Save item" onSubmit={save} onCancel={() => navigate('/admin/cases')} />
        </Panel>
      </>
    );
  }

  if (error?.status === 404) return <NotFound />;
  if (error) return <div className="pt-8"><ErrorState error={error} onRetry={load} /></div>;
  if (!item) return <Loading label="Loading case" />;

  const removed = Boolean(item.deleted_at);
  const [primary, ...others] = statusActions(item);

  return (
    <>
      <PageTitle
        title={item.title}
        back={back}
        action={removed
          ? <Button onClick={() => restore(item)}>Restore item</Button>
          : primary && <Button onClick={() => setStatusTarget(primary)}>{ACTION_LABEL[primary]}</Button>}
      />

      {removed && (
        <p className="mb-[26px] rounded-card border border-danger-line bg-danger-bg p-4 text-danger" role="status">
          <strong>Removed {formatDateTime(item.deleted_at)}.</strong> Reason: {item.delete_reason}. Students cannot see it. Restore it to edit.
        </p>
      )}

      <Panel aria-labelledby="case-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="case-title" className="text-xl">Case</h2>
          <div className="flex flex-wrap gap-1.5">
            <TypeBadge type={item.type} />
            {removed ? <RemovedBadge /> : <StatusBadge status={item.status} />}
          </div>
        </div>
        <Facts rows={[
          ['Reported', formatDateTime(item.created_at)],
          ['Last change', formatDateTime(item.updated_at)],
          [item.type === 'lost' ? 'Date lost' : 'Date found', formatDate(item.date_reported)],
          item.admin_note && ['Office note', item.admin_note],
          item.matched_item && ['Linked item', <Link key="m" to={`/admin/cases/${item.matched_item.id}`} className="font-bold text-teal-dark hover:underline">{item.matched_item.title}</Link>],
          ['Reported by', item.reporter ? item.reporter.name : 'Unknown'],
          item.reporter && ['Email', <a key="e" href={`mailto:${item.reporter.email}`} className="text-teal-dark hover:underline">{item.reporter.email}</a>],
          item.reporter?.student_id && ['Student ID', item.reporter.student_id],
          item.reporter?.phone && ['Phone', item.reporter.phone],
          ['Contact given', item.contact_info || 'None'],
        ]} />

        {!removed && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            {others.map((s) => <Button key={s} variant="secondary" size="sm" onClick={() => setStatusTarget(s)}>{ACTION_LABEL[s]}</Button>)}
            <Button variant="danger" size="sm" onClick={() => setRemoving(true)}>Remove item</Button>
          </div>
        )}
      </Panel>

      <Panel aria-labelledby="details-title">
        <h2 id="details-title" className="mb-4 text-xl">Details</h2>
        {removed ? (
          <p className="text-muted">{item.description}</p>
        ) : (
          <ItemForm key={formKey} mode="admin" initial={item} submitLabel="Save changes" onSubmit={save} />
        )}
      </Panel>

      <StatusDialog
        item={statusTarget ? item : null}
        status={statusTarget}
        onClose={() => setStatusTarget(null)}
        onDone={(updated) => { setStatusTarget(null); setItem(updated); }}
      />
      <RemoveDialog item={removing ? item : null} onClose={() => setRemoving(false)} onDone={() => { setRemoving(false); load(); }} />
    </>
  );
}
