import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { del, fieldError, get, post, put } from '../../api.js';
import { resetMetaCache, useDebounced, usePaged } from '../../components/ItemViews.jsx';
import {
  Button, ConfirmDialog, EmptyState, ErrorState, Field, Loading, Modal, PageTitle, Pagination, Panel, Table, formatDateTime, useToast,
} from '../../components/ui.jsx';
import { cn } from '@/lib/utils.js';

/* ------------------------------------------------------------------ */
/* Cell rendering                                                      */
/* ------------------------------------------------------------------ */

function Cell({ column, row }) {
  const value = row[column.name];
  if (value === null || value === undefined || value === '') return <span className="text-muted">-</span>;
  switch (column.type) {
    case 'bool': return <span className={value ? 'font-bold text-found' : 'font-bold text-danger'}>{value ? 'Yes' : 'No'}</span>;
    case 'fk': return <span>{row._labels?.[column.name] || `#${value}`}</span>;
    case 'datetime': return <span className="whitespace-nowrap">{formatDateTime(String(value).replace(' ', 'T'))}</span>;
    case 'text': return <span className="line-clamp-2 max-w-xs" title={String(value)}>{String(value)}</span>;
    default: return <span>{String(value)}</span>;
  }
}

/* ------------------------------------------------------------------ */
/* Generated form                                                      */
/* ------------------------------------------------------------------ */

function initialValues(columns, row) {
  const values = {};
  columns.forEach((c) => {
    if (!c.editable) return;
    let v = row ? row[c.name] : undefined;
    if (c.type === 'password') v = '';
    else if (c.type === 'bool') v = row ? Boolean(v) : true;
    else if (c.type === 'datetime' && v) v = String(v).replace(' ', 'T').slice(0, 16);
    else if (c.type === 'date' && v) v = String(v).slice(0, 10);
    else if (v === null || v === undefined) v = c.type === 'enum' && !c.nullable && !row ? c.options[0] : '';
    values[c.name] = v;
  });
  return values;
}

function RowForm({ table, columns, row, onClose, onSaved }) {
  const toast = useToast();
  const editable = columns.filter((c) => c.editable);
  const [values, setValues] = useState(() => initialValues(columns, row));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const isEdit = Boolean(row);

  const set = (name, v) => { setValues((s) => ({ ...s, [name]: v })); setErrors((e) => ({ ...e, [name]: null })); };

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    const body = {};
    editable.forEach((c) => {
      let v = values[c.name];
      if (c.type === 'password' && isEdit && !v) return;
      if (v === '') v = null;
      if ((c.type === 'int' || c.type === 'fk') && v !== null) v = Number(v);
      body[c.name] = v;
    });
    try {
      if (isEdit) await put(`/api/admin/db/${table.name}/${row.id}`, body);
      else await post(`/api/admin/db/${table.name}`, body);
      toast.success(isEdit ? `Row ${row.id} saved.` : 'Row added.');
      if (['categories', 'locations'].includes(table.name)) resetMetaCache();
      onSaved();
    } catch (error) {
      const mapped = {};
      Object.keys(error.errors || {}).forEach((k) => { mapped[k] = fieldError(error.errors, k); });
      setErrors(mapped);
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  }

  function control(c, p) {
    const v = values[c.name];
    switch (c.type) {
      case 'text': return <textarea {...p} rows={3} value={v} maxLength={c.max} onChange={(e) => set(c.name, e.target.value)} />;
      case 'enum': return (
        <select {...p} value={v} onChange={(e) => set(c.name, e.target.value)}>
          {c.nullable && <option value="">None</option>}
          {c.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      case 'fk': return (
        <select {...p} value={v ?? ''} onChange={(e) => set(c.name, e.target.value)}>
          <option value="">{c.nullable ? 'None' : 'Choose…'}</option>
          {(c.choices || []).map((o) => <option key={o.id} value={o.id}>{o.label} (#{o.id})</option>)}
        </select>
      );
      case 'bool': return (
        <span className="mt-2 flex items-center gap-2">
          <input type="checkbox" id={p.id} className="size-4 accent-teal" checked={Boolean(v)} onChange={(e) => set(c.name, e.target.checked)} />
          <span>{v ? 'Yes' : 'No'}</span>
        </span>
      );
      case 'password': return <input {...p} type="password" autoComplete="new-password" value={v} onChange={(e) => set(c.name, e.target.value)} placeholder={isEdit ? 'Leave blank to keep the current password' : ''} required={!isEdit} />;
      case 'email': return <input {...p} type="email" value={v} maxLength={c.max} onChange={(e) => set(c.name, e.target.value)} />;
      case 'int': return <input {...p} type="number" value={v} onChange={(e) => set(c.name, e.target.value)} />;
      case 'date': return <input {...p} type="date" value={v} onChange={(e) => set(c.name, e.target.value)} />;
      case 'datetime': return <input {...p} type="datetime-local" value={v} onChange={(e) => set(c.name, e.target.value)} />;
      default: return <input {...p} value={v} maxLength={c.max} onChange={(e) => set(c.name, e.target.value)} />;
    }
  }

  return (
    <Modal
      open
      wide
      busy={busy}
      title={isEdit ? `Edit ${table.label.toLowerCase()} row ${row.id}` : `Add a row to ${table.label.toLowerCase()}`}
      onClose={onClose}
      footer={(
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" form="row-form" disabled={busy} busy={busy}>{isEdit ? 'Save row' : 'Add row'}</Button>
        </>
      )}
    >
      <form id="row-form" className="grid gap-[15px] sm:grid-cols-2" onSubmit={save} noValidate>
        {editable.map((c) => (
          <Field key={c.name} label={c.label} required={c.required && !(isEdit && c.type === 'password')} error={errors[c.name]}
            className={c.type === 'text' ? 'sm:col-span-2' : undefined}
            hint={c.type === 'password' ? (isEdit ? 'Passwords are stored hashed and never shown.' : 'At least 8 characters. Stored hashed.') : undefined}>
            {(p) => control(c, p)}
          </Field>
        ))}
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Table view                                                          */
/* ------------------------------------------------------------------ */

function TableView({ name, onCountsChanged }) {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const [sort, setSort] = useState({ col: 'id', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // 'new' | row
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setSearch(''); setSort({ col: 'id', dir: 'desc' }); setPage(1); }, [name]);

  const { rows, meta, loading, error, reload, extra } = usePaged(`/api/admin/db/${name}`, { search: debounced, sort: sort.col, dir: sort.dir, page, per_page: 15 });
  const table = extra?.table?.name === name ? extra.table : null;
  const columns = table ? extra.columns : [];
  const listed = columns.filter((c) => c.list && c.type !== 'password');

  function toggleSort(col) {
    setSort((s) => ({ col, dir: s.col === col && s.dir === 'asc' ? 'desc' : 'asc' }));
    setPage(1);
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      await del(`/api/admin/db/${name}/${deleting.id}`);
      toast.success(`Row ${deleting.id} deleted.`);
      if (['categories', 'locations'].includes(name)) resetMetaCache();
      setDeleting(null);
      reload();
      onCountsChanged();
    } catch (e) {
      toast.error(e.message);
      if (e.status === 409 || e.status === 422) setDeleting(null);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <section aria-labelledby="db-table-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-[15px]">
        <h2 id="db-table-title" className="text-section">
          {table?.label || name}
          {table?.readonly && <span className="ml-2 align-middle text-sm font-normal text-muted">(read-only)</span>}
        </h2>
        <div className="flex w-full flex-wrap items-end gap-[15px] sm:w-auto">
          <label className="block min-w-0 flex-1 text-sm font-bold sm:w-64">
            Search
            <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search this table" />
          </label>
          {table && !table.readonly && <Button onClick={() => setEditing('new')}>Add row</Button>}
        </div>
      </div>

      {!table || (loading && !rows.length) ? (
        <Loading label="Loading rows" />
      ) : rows.length === 0 ? (
        <EmptyState title={search ? 'No rows match this search' : 'This table is empty'} />
      ) : (
        <div aria-busy={loading} className={loading ? 'opacity-60' : undefined}>
          <Table caption={table.label}>
            <thead>
              <tr>
                {listed.map((c) => (
                  <th key={c.name} scope="col" aria-sort={sort.col === c.name ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" className="cursor-pointer font-bold hover:text-ink" onClick={() => toggleSort(c.name)}>
                      {c.label}
                      <span aria-hidden="true">{sort.col === c.name ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                    </button>
                  </th>
                ))}
                {!table.readonly && <th scope="col"><span className="sr-only">Actions</span></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {listed.map((c) => <td key={c.name}><Cell column={c} row={row} /></td>)}
                  {!table.readonly && (
                    <td className="text-right whitespace-nowrap">
                      <Button variant="secondary" size="sm" onClick={() => setEditing(row)}>Edit<span className="sr-only"> row {row.id}</span></Button>
                      <Button variant="danger" size="sm" className="ml-2" onClick={() => setDeleting(row)}>Delete<span className="sr-only"> row {row.id}</span></Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination meta={meta} onPage={setPage} />
        </div>
      )}

      {editing && table && (
        <RowForm
          table={table}
          columns={columns}
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); reload(); onCountsChanged(); }}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete row ${deleting?.id}?`}
        message={`This permanently deletes “${deleting?.[table?.title_column] ?? deleting?.id}” from ${table?.label.toLowerCase()}. It cannot be undone. Rows that other records depend on cannot be deleted.`}
        confirmLabel="Delete row"
        danger
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </section>
  );
}

export default function Database() {
  const [params, setParams] = useSearchParams();
  const [tables, setTables] = useState(null);
  const [error, setError] = useState(null);
  const current = params.get('table');

  function loadTables() {
    get('/api/admin/db').then((d) => setTables(d.data)).catch(setError);
  }
  useEffect(loadTables, []);

  const active = tables?.find((t) => t.name === current) ? current : tables?.[0]?.name;

  return (
    <>
      <PageTitle title="Database" />
      <Panel>
        <p className="-mt-1 mb-4 text-sm text-muted">Edit the tables UniFind uses. Passwords are never shown, and every change is written to the activity log.</p>
        {error ? <ErrorState error={error} onRetry={loadTables} /> : !tables ? <Loading label="Loading tables" /> : (
          <>
            <nav aria-label="Tables" className="mb-6 flex flex-wrap gap-2">
              {tables.map((t) => (
                <button key={t.name} type="button" aria-current={t.name === active ? 'true' : undefined} onClick={() => setParams({ table: t.name })}
                  className={cn('cursor-pointer rounded-full border px-3 py-1 text-sm font-bold',
                    t.name === active ? 'border-teal bg-teal text-white' : 'border-field bg-white text-ink hover:bg-page')}>
                  {t.label} <span className={t.name === active ? 'text-white/80' : 'text-muted'}>({t.rows})</span>
                </button>
              ))}
            </nav>
            {active && <TableView key={active} name={active} onCountsChanged={loadTables} />}
          </>
        )}
      </Panel>
    </>
  );
}
