import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { del, fieldError, get, patch, post } from '../../api.js';
import { FilterBar, ItemGrid, ItemTable, ViewToggle, useDebounced, usePaged, useViewMode } from '../../components/ItemViews.jsx';
import { PageHeader } from '../../components/Layouts.jsx';
import {
  ConfirmDialog, EmptyState, ErrorState, Field, Modal, Pagination, SkeletonCards, SkeletonRows, Spinner,
  formatDate, reference, useToast,
} from '../../components/ui.jsx';

const COLLECT_NOTE = 'Collect it from Student Affairs, room 12, Sunday to Thursday 8:00 to 14:00. Bring your student card.';

/* ------------------------------------------------------------------ */
/* Status change dialog (shared with CaseEdit)                         */
/* ------------------------------------------------------------------ */

const STATUS_COPY = {
  found: { title: 'Mark as found', button: 'Mark found', toast: 'Marked found. The student can now see your note.' },
  returned: { title: 'Mark as returned', button: 'Mark returned', toast: 'Marked returned.' },
  closed: { title: 'Close case', button: 'Close case', toast: 'Case closed.' },
  open: { title: 'Reopen case', button: 'Reopen case', toast: 'Case reopened.' },
};

function MatchPicker({ value, onChange, error }) {
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [options, setOptions] = useState(null);

  useEffect(() => {
    let live = true;
    get('/api/items', { type: 'found', status: 'open', search: debounced, per_page: 20 })
      .then((d) => { if (live) setOptions(d.data); })
      .catch(() => { if (live) setOptions([]); });
    return () => { live = false; };
  }, [debounced]);

  return (
    <fieldset className={`field match-picker${error ? ' has-error' : ''}`}>
      <legend>Matching found item</legend>
      <p className="field-hint">Link the found item that belongs to this student. It is then reserved and leaves the public list.</p>
      <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search found items" aria-label="Search found items" />
      <div className="match-options" role="radiogroup" aria-label="Found items">
        <label className={`match-option${!value ? ' is-on' : ''}`}>
          <input type="radio" name="match" checked={!value} onChange={() => onChange(null)} />
          <span><strong>No link</strong><small>Mark found without linking an item</small></span>
        </label>
        {options === null && <p className="muted"><Spinner /> Loading found items</p>}
        {options?.length === 0 && <p className="muted">No open found items match.</p>}
        {options?.map((o) => (
          <label key={o.id} className={`match-option${value === o.id ? ' is-on' : ''}`}>
            <input type="radio" name="match" checked={value === o.id} onChange={() => onChange(o.id)} />
            <span>
              <strong>{reference(o.id)} {o.title}</strong>
              <small>{o.category?.name}, {o.location?.name}, {formatDate(o.date_reported)}</small>
            </span>
          </label>
        ))}
      </div>
      {error && <p className="field-error">{error}</p>}
    </fieldset>
  );
}

export function StatusDialog({ item, status, onClose, onDone }) {
  const toast = useToast();
  const copy = STATUS_COPY[status] || STATUS_COPY.open;
  const [note, setNote] = useState('');
  const [match, setMatch] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!item) return;
    setErrors({});
    setMatch(item.matched_item_id || null);
    setNote(item.admin_note || (status === 'found' && item.type === 'lost' ? COLLECT_NOTE : ''));
  }, [item, status]);

  const showPicker = item?.type === 'lost' && status === 'found';

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      const body = { status, admin_note: note.trim() || null };
      if (showPicker) body.matched_item_id = match;
      const result = await patch(`/api/admin/items/${item.id}/status`, body);
      toast.success(copy.toast);
      onDone(result.data);
    } catch (error) {
      setErrors({ admin_note: fieldError(error.errors, 'admin_note'), matched_item_id: fieldError(error.errors, 'matched_item_id') });
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(item)}
      title={`${copy.title}: ${item?.title || ''}`}
      onClose={onClose}
      busy={busy}
      size={showPicker ? 'lg' : 'md'}
      footer={(
        <>
          <button type="button" className="btn btn-quiet" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy && <Spinner />}{copy.button}</button>
        </>
      )}
    >
      {showPicker && <MatchPicker value={match} onChange={setMatch} error={errors.matched_item_id} />}
      <Field label={item?.type === 'lost' ? 'Note for the student' : 'Internal note'} error={errors.admin_note}
        hint={item?.type === 'lost' ? 'The student sees this on their request.' : 'Only the office sees this.'}>
        {(p) => <textarea {...p} rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} data-autofocus={showPicker ? undefined : true} />}
      </Field>
    </Modal>
  );
}

export function RemoveDialog({ item, onClose, onDone }) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setReason(''); setError(null); }, [item]);

  async function confirm() {
    if (reason.trim().length < 3) {
      setError('Give a reason of at least 3 characters. It is kept in the activity log.');
      return;
    }
    setBusy(true);
    try {
      await del(`/api/admin/items/${item.id}`, { reason: reason.trim() });
      toast.success('Item removed. You can restore it from the removed list.');
      onDone();
    } catch (e) {
      setError(fieldError(e.errors, 'reason') || null);
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmDialog
      open={Boolean(item)}
      title={`Remove ${item ? reference(item.id) : ''}?`}
      message="The item disappears for students. It stays in the database and you can restore it later."
      confirmLabel="Remove item"
      danger
      busy={busy}
      onConfirm={confirm}
      onCancel={onClose}
    >
      <Field label="Reason" required error={error}>
        {(p) => <input {...p} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} maxLength={255} placeholder="For example: duplicate request" data-autofocus />}
      </Field>
    </ConfirmDialog>
  );
}

export function useRestore(onDone) {
  const toast = useToast();
  return async (item) => {
    try {
      const result = await post(`/api/admin/items/${item.id}/restore`);
      toast.success(`Restored ${reference(item.id)}.`);
      onDone(result.data);
    } catch (e) {
      toast.error(e.message);
    }
  };
}

/** The status moves available for an item, in the order they should be offered. */
export function statusActions(item) {
  if (item.deleted_at) return [];
  if (item.status === 'open') return item.type === 'lost' ? ['found', 'closed'] : ['returned', 'closed'];
  if (item.status === 'found') return ['returned', 'open', 'closed'];
  return ['open'];
}

const ACTION_LABEL = { found: 'Mark found', returned: 'Mark returned', closed: 'Close', open: 'Reopen' };

/* ------------------------------------------------------------------ */
/* Row menu                                                            */
/* ------------------------------------------------------------------ */

function RowMenu({ item, onStatus, onRemove, onRestore }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key); };
  }, [open]);

  if (item.deleted_at) {
    return <button type="button" className="btn btn-quiet btn-sm" onClick={() => onRestore(item)}>Restore</button>;
  }

  const [primary, ...rest] = statusActions(item);
  const run = (fn) => () => { setOpen(false); fn(); };

  return (
    <div className="row-actions" ref={ref}>
      {primary && <button type="button" className="btn btn-quiet btn-sm" onClick={() => onStatus(item, primary)}>{ACTION_LABEL[primary]}</button>}
      <button type="button" className="icon-button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="sr-only">More actions for {item.title}</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
      </button>
      {open && (
        <div className="menu" role="menu">
          {rest.map((s) => <button key={s} type="button" role="menuitem" onClick={run(() => onStatus(item, s))}>{ACTION_LABEL[s]}</button>)}
          <button type="button" role="menuitem" onClick={run(() => navigate(`/admin/cases/${item.id}`))}>Edit</button>
          <button type="button" role="menuitem" className="menu-danger" onClick={run(() => onRemove(item))}>Remove</button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const FILTER_KEYS = ['search', 'type', 'status', 'category_id', 'location_id', 'date_from', 'date_to', 'trashed'];

export default function Cases() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useViewMode('cases');
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || '']));
  const page = Number(params.get('page') || 1);

  const { rows, meta, loading, error, reload } = usePaged('/api/items', { ...filters, page, per_page: 15 });
  const [statusTarget, setStatusTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const restore = useRestore(() => reload());

  function setFilters(next) {
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v));
    setParams(clean);
  }
  const setPage = (p) => setParams({ ...Object.fromEntries(params), page: String(p) });

  const linkFor = (item) => `/admin/cases/${item.id}`;
  const actions = (item) => (
    <RowMenu item={item} onStatus={(i, s) => setStatusTarget({ item: i, status: s })} onRemove={setRemoveTarget} onRestore={restore} />
  );

  return (
    <div className="admin-page">
      <PageHeader title="Cases">
        <ViewToggle value={view} onChange={setView} />
        <Link to="/admin/cases/new" className="btn btn-primary">Add found item</Link>
      </PageHeader>

      <FilterBar value={filters} onChange={setFilters} fields={['search', 'type', 'status', 'category', 'location', 'dates', 'trashed']} />

      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !rows.length ? (
        view === 'cards' ? <SkeletonCards /> : <SkeletonRows rows={8} cols={8} />
      ) : rows.length === 0 ? (
        <EmptyState title="No cases match these filters" action={<button type="button" className="btn btn-quiet" onClick={() => setFilters({})}>Clear filters</button>}>
          Change the filters, or add a found item that was just handed in.
        </EmptyState>
      ) : (
        <div className={loading ? 'is-refreshing' : ''} aria-busy={loading}>
          {view === 'cards'
            ? <ItemGrid items={rows} linkFor={linkFor} />
            : <ItemTable items={rows} linkFor={linkFor} columns={['ref', 'type', 'title', 'category', 'location', 'date', 'reporter', 'status']} renderActions={actions} caption="Cases" />}
          <Pagination meta={meta} onPage={setPage} />
        </div>
      )}

      <StatusDialog
        item={statusTarget?.item}
        status={statusTarget?.status}
        onClose={() => setStatusTarget(null)}
        onDone={() => { setStatusTarget(null); reload(); }}
      />
      <RemoveDialog item={removeTarget} onClose={() => setRemoveTarget(null)} onDone={() => { setRemoveTarget(null); reload(); }} />
    </div>
  );
}
