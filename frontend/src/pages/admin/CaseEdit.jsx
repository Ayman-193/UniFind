import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { get, post } from '../../api.js';
import { ItemForm } from '../../components/ItemViews.jsx';
import { PageHeader } from '../../components/Layouts.jsx';
import { ErrorState, RemovedBadge, Spinner, StatusBadge, TypeBadge, formatDate, formatDateTime, reference, useToast } from '../../components/ui.jsx';
import { NotFound } from '../Auth.jsx';
import { RemoveDialog, StatusDialog, statusActions, useRestore } from './Cases.jsx';

const ACTION_LABEL = { found: 'Mark found', returned: 'Mark returned', closed: 'Close case', open: 'Reopen case' };

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
        toast.success(`Item saved as ${reference(result.data.id)}.`);
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
      <div className="admin-page page-narrow">
        <PageHeader title="Add found item" back={{ to: '/admin/cases', label: 'Cases' }} />
        <p className="page-intro">Register something that was handed in. Open found items appear on the student browse page straight away.</p>
        <div className="panel">
          <ItemForm mode="admin" submitLabel="Save item" onSubmit={save} onCancel={() => navigate('/admin/cases')} />
        </div>
      </div>
    );
  }

  if (error?.status === 404) return <NotFound />;
  if (error) return <div className="admin-page"><ErrorState error={error} onRetry={load} /></div>;
  if (!item) return <div className="page-loader"><Spinner label="Loading case" /></div>;

  const removed = Boolean(item.deleted_at);

  return (
    <div className="admin-page">
      <PageHeader title={`${reference(item.id)} ${item.title}`} back={{ to: '/admin/cases', label: 'Cases' }}>
        {!removed && statusActions(item).map((s, i) => (
          <button key={s} type="button" className={`btn ${i === 0 ? 'btn-primary' : 'btn-quiet'}`} onClick={() => setStatusTarget(s)}>{ACTION_LABEL[s]}</button>
        ))}
        {!removed && <button type="button" className="btn btn-danger-quiet" onClick={() => setRemoving(true)}>Remove</button>}
        {removed && <button type="button" className="btn btn-primary" onClick={() => restore(item)}>Restore item</button>}
      </PageHeader>

      {removed && (
        <div className="banner banner-warn" role="status">
          <strong>Removed {formatDateTime(item.deleted_at)}.</strong> Reason: {item.delete_reason}. Students cannot see it. Restore it to edit.
        </div>
      )}

      <div className="case-layout">
        <aside className="case-side">
          <section className="panel">
            <h2 className="panel-title">Case</h2>
            <div className="case-badges">
              <TypeBadge type={item.type} />
              {removed ? <RemovedBadge /> : <StatusBadge status={item.status} />}
            </div>
            <dl className="kv">
              <div><dt>Reported</dt><dd>{formatDateTime(item.created_at)}</dd></div>
              <div><dt>Last change</dt><dd>{formatDateTime(item.updated_at)}</dd></div>
              <div><dt>Date {item.type}</dt><dd>{formatDate(item.date_reported)}</dd></div>
              {item.admin_note && <div><dt>Office note</dt><dd>{item.admin_note}</dd></div>}
              {item.matched_item && (
                <div>
                  <dt>Linked item</dt>
                  <dd><Link to={`/admin/cases/${item.matched_item.id}`}>{reference(item.matched_item.id)} {item.matched_item.title}</Link></dd>
                </div>
              )}
            </dl>
          </section>
          <section className="panel">
            <h2 className="panel-title">Reported by</h2>
            {item.reporter ? (
              <dl className="kv">
                <div><dt>Name</dt><dd>{item.reporter.name}</dd></div>
                <div><dt>Email</dt><dd><a href={`mailto:${item.reporter.email}`}>{item.reporter.email}</a></dd></div>
                {item.reporter.student_id && <div><dt>Student ID</dt><dd>{item.reporter.student_id}</dd></div>}
                {item.reporter.phone && <div><dt>Phone</dt><dd>{item.reporter.phone}</dd></div>}
                <div><dt>Contact given</dt><dd>{item.contact_info || 'None'}</dd></div>
              </dl>
            ) : <p className="muted">Unknown</p>}
          </section>
        </aside>

        <section className="panel case-form">
          <h2 className="panel-title">Details</h2>
          {removed ? (
            <p className="muted">{item.description}</p>
          ) : (
            <ItemForm key={formKey} mode="admin" initial={item} submitLabel="Save changes" onSubmit={save} />
          )}
        </section>
      </div>

      <StatusDialog
        item={statusTarget ? item : null}
        status={statusTarget}
        onClose={() => setStatusTarget(null)}
        onDone={(updated) => { setStatusTarget(null); setItem(updated); }}
      />
      <RemoveDialog item={removing ? item : null} onClose={() => setRemoving(false)} onDone={() => { setRemoving(false); load(); }} />
    </div>
  );
}
