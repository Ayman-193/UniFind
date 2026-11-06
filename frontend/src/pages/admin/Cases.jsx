import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { del, fieldError, get, patch, post } from '../../api.js';
import { FilterBar, ItemGrid, ItemTable, ViewToggle, useDebounced, usePaged, useViewMode } from '../../components/ItemViews.jsx';
import {
  Button, ButtonLink, ConfirmDialog, EmptyState, ErrorState, Field, Loading, Modal, PageTitle, Pagination, Panel, Spinner,
  formatDate, useToast,
} from '../../components/ui.jsx';
import { cn } from '@/lib/utils.js';

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

export const ACTION_LABEL = { found: 'Mark found', returned: 'Mark returned', closed: 'Close case', open: 'Reopen case' };

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

  const option = (checked) => cn('flex cursor-pointer items-start gap-2 rounded-input border p-2.5 text-sm', checked ? 'border-teal bg-teal-soft' : 'border-line');

  return (
    <fieldset>
      <legend className="text-sm font-bold">Matching found item</legend>
      <p className="mt-1 text-sm text-muted">Link the found item that belongs to this student. It is then reserved and leaves the public list.</p>
      <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search found items" aria-label="Search found items" />
      <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto" role="radiogroup" aria-label="Found items">
        <label className={option(!value)}>
          <input type="radio" name="match" checked={!value} onChange={() => onChange(null)} className="mt-1" />
          <span>No link</span>
        </label>
        {options === null && <p className="flex items-center gap-2 text-sm text-muted"><Spinner /> Loading found items</p>}
        {options?.length === 0 && <p className="text-sm text-muted">No open found items match.</p>}
        {options?.map((o) => (
          <label key={o.id} className={option(value === o.id)}>
            <input type="radio" name="match" checked={value === o.id} onChange={() => onChange(o.id)} className="mt-1" />
            <span><strong>{o.title}</strong><br /><span className="text-muted">{o.location?.name}, {formatDate(o.date_reported)}</span></span>
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-sm font-bold text-danger">{error}</p>}
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
      wide={showPicker}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy} busy={busy}>{copy.button}</Button>
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
      title={`Remove “${item?.title || ''}”?`}
      message="The item disappears for students. It stays in the database and you can restore it later."
      confirmLabel="Remove item"
      danger
      busy={busy}
      onConfirm={confirm}
      onCancel={onClose}
    >
      <Field label="Reason" required error={error}>
        {(p) => <input {...p} value={reason} onChange={(e) => { setReason(e.target.value); setError(null); }} maxLength={255} placeholder="e.g. Duplicate request" data-autofocus />}
      </Field>
    </ConfirmDialog>
  );
}

export function useRestore(onDone) {
  const toast = useToast();
  return async (item) => {
    try {
      const result = await post(`/api/admin/items/${item.id}/restore`);
      toast.success(`Restored “${item.title}”.`);
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

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const FILTER_KEYS = ['search', 'type', 'status', 'category_id', 'location_id', 'trashed'];

export default function Cases() {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useViewMode('cases');
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) || '']));
  const page = Number(params.get('page') || 1);

  const { rows, meta, loading, error, reload } = usePaged('/api/items', { ...filters, page, per_page: 15 });
  const [statusTarget, setStatusTarget] = useState(null);
  const restore = useRestore(() => reload());

  function setFilters(next) {
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)));
  }
  const setPage = (p) => setParams({ ...Object.fromEntries(params), page: String(p) });

  const linkFor = (item) => `/admin/cases/${item.id}`;
  const actions = (item) => {
    if (item.deleted_at) return <Button variant="secondary" size="sm" onClick={() => restore(item)}>Restore</Button>;
    const [primary] = statusActions(item);
    return primary ? <Button variant="secondary" size="sm" onClick={() => setStatusTarget({ item, status: primary })}>{ACTION_LABEL[primary]}</Button> : null;
  };

  return (
    <>
      <PageTitle title="Cases" action={<ButtonLink to="/admin/cases/new">Add found item</ButtonLink>} />

      <Panel aria-labelledby="cases-title">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="cases-title" className="text-section">All cases</h2>
          <div className="flex items-center gap-3">
            {meta && <span className="text-sm text-muted" aria-live="polite">{meta.total} {meta.total === 1 ? 'case' : 'cases'}</span>}
            <ViewToggle value={view} onChange={setView} />
          </div>
        </div>

        <FilterBar value={filters} onChange={setFilters} admin />

        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !rows.length ? (
          <Loading label="Loading cases" />
        ) : rows.length === 0 ? (
          <EmptyState title="No cases match these filters" action={<Button variant="secondary" onClick={() => setFilters({})}>Clear filters</Button>}>
            Change the filters, or add a found item that was just handed in.
          </EmptyState>
        ) : (
          <div aria-busy={loading} className={loading ? 'opacity-60' : undefined}>
            {view === 'cards'
              ? <ItemGrid items={rows} linkFor={linkFor} />
              : <ItemTable items={rows} linkFor={linkFor} columns={['type', 'title', 'location', 'date', 'reporter', 'status']} renderActions={actions} caption="Cases" />}
            <Pagination meta={meta} onPage={setPage} />
          </div>
        )}
      </Panel>

      <StatusDialog
        item={statusTarget?.item}
        status={statusTarget?.status}
        onClose={() => setStatusTarget(null)}
        onDone={() => { setStatusTarget(null); reload(); }}
      />
    </>
  );
}
