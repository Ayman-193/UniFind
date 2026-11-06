import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin } from 'lucide-react';
import { assetUrl, fieldError, get } from '../api.js';
import { cn } from '@/lib/utils.js';
import { Button, Field, RemovedBadge, StatusBadge, Table, TypeBadge, formatDate } from './ui.jsx';

/* ------------------------------------------------------------------ */
/* Data hooks                                                          */
/* ------------------------------------------------------------------ */

let metaCache = null;
export function useMeta() {
  const [meta, setMeta] = useState(metaCache);
  useEffect(() => {
    if (metaCache) return;
    get('/api/meta').then((data) => { metaCache = data; setMeta(data); }).catch(() => {});
  }, []);
  return meta || { categories: [], locations: [] };
}
export function resetMetaCache() {
  metaCache = null;
}

/**
 * Loads a paginated list. Refetches whenever `query` changes (compared by value).
 * Returns { rows, meta, loading, error, reload, extra }.
 */
export function usePaged(path, query) {
  const [state, setState] = useState({ rows: [], meta: null, loading: true, error: null, extra: null });
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(query);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    get(path, query, { signal: controller.signal })
      .then((data) => setState({ rows: data.data || [], meta: data.meta || null, loading: false, error: null, extra: data }))
      .catch((error) => { if (error.name !== 'AbortError') setState((s) => ({ ...s, loading: false, error })); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, key, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}

export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ------------------------------------------------------------------ */
/* Cards | Table                                                       */
/* ------------------------------------------------------------------ */

export function useViewMode(key) {
  const storageKey = `unifind.view.${key}`;
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem(storageKey) || 'cards'; } catch { return 'cards'; }
  });
  const update = (next) => {
    setMode(next);
    try { localStorage.setItem(storageKey, next); } catch { /* storage unavailable */ }
  };
  return [mode, update];
}

export function ViewToggle({ value, onChange }) {
  return (
    <div className="inline-flex overflow-hidden rounded-button border border-field" role="group" aria-label="Display as">
      {['cards', 'table'].map((mode) => (
        <button key={mode} type="button" aria-pressed={value === mode} onClick={() => onChange(mode)}
          className={cn('cursor-pointer px-3 py-1.5 text-sm font-bold', value === mode ? 'bg-teal text-white' : 'bg-white text-ink hover:bg-page')}>
          {mode === 'cards' ? 'Cards' : 'Table'}
        </button>
      ))}
    </div>
  );
}

/** The prototype's item card: badge, title, location, date, description. */
function ItemCard({ item, to }) {
  return (
    <article className="relative h-full rounded-card border border-line bg-card p-[18px] hover:border-teal">
      <div className="flex flex-wrap gap-1.5">
        {item.deleted_at ? <RemovedBadge /> : <TypeBadge type={item.type} />}
        {!item.deleted_at && item.status !== 'open' && <StatusBadge status={item.status} />}
      </div>
      <h3 className="mt-[9px] mb-2 text-lg break-words">
        <Link to={to} className="text-ink no-underline after:absolute after:inset-0 after:content-[''] hover:underline">{item.title}</Link>
      </h3>
      <p className="my-[7px] flex items-center gap-1.5"><MapPin className="size-4 shrink-0 text-teal" aria-hidden="true" />{item.location?.name}</p>
      <p className="my-[7px] flex items-center gap-1.5 text-[0.9rem] text-muted"><Calendar className="size-4 shrink-0" aria-hidden="true" />{formatDate(item.date_reported)}</p>
      <p className="my-[7px] line-clamp-3 break-words">{item.description}</p>
    </article>
  );
}

export function ItemGrid({ items, linkFor }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-[15px]">
      {items.map((item) => <li key={item.id}><ItemCard item={item} to={linkFor(item)} /></li>)}
    </ul>
  );
}

const COLUMNS = {
  type: { label: 'Type', render: (i) => (i.deleted_at ? <RemovedBadge /> : <TypeBadge type={i.type} />) },
  title: { label: 'Item', render: (i, linkFor) => <Link className="font-bold text-teal-dark hover:underline" to={linkFor(i)}>{i.title}</Link> },
  category: { label: 'Category', render: (i) => i.category?.name },
  location: { label: 'Location', render: (i) => i.location?.name },
  date: { label: 'Date', render: (i) => <span className="whitespace-nowrap">{formatDate(i.date_reported)}</span> },
  reporter: { label: 'Reported by', render: (i) => i.reporter?.name },
  status: { label: 'Status', render: (i) => (i.deleted_at ? '-' : <StatusBadge status={i.status} />) },
};

export function ItemTable({ items, linkFor, columns, renderActions, caption }) {
  return (
    <Table caption={caption}>
      <thead>
        <tr>
          {columns.map((c) => <th key={c} scope="col">{COLUMNS[c].label}</th>)}
          {renderActions && <th scope="col"><span className="sr-only">Actions</span></th>}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} className={item.deleted_at ? 'text-muted' : undefined}>
            {columns.map((c) => <td key={c}>{COLUMNS[c].render(item, linkFor)}</td>)}
            {renderActions && <td className="text-right whitespace-nowrap">{renderActions(item)}</td>}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/* ------------------------------------------------------------------ */
/* Filter row: search + type/status + category + location              */
/* ------------------------------------------------------------------ */

/**
 * Controlled filter row. `value` is the filter object, `onChange` receives a new one.
 * The search box is debounced; selects apply immediately. For the admin, "Removed" is one
 * of the status choices (it sets trashed=only).
 */
export function FilterBar({ value, onChange, admin = false }) {
  const meta = useMeta();
  const [search, setSearch] = useState(value.search || '');
  const debounced = useDebounced(search);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if ((value.search || '') !== debounced) onChange({ ...value, search: debounced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const set = (key) => (event) => onChange({ ...value, [key]: event.target.value });
  const status = value.trashed === 'only' ? 'removed' : value.status || '';
  const setStatus = (event) => {
    const next = event.target.value;
    onChange({ ...value, status: next === 'removed' ? '' : next, trashed: next === 'removed' ? 'only' : '' });
  };

  return (
    <div role="search" className={cn('mb-5 grid gap-[15px]', admin ? 'sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]' : 'sm:grid-cols-[2fr_1fr_1fr]')}>
      <label className="block text-[0.92rem] font-bold sm:col-span-full lg:col-span-1">
        Search
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or description..." />
      </label>
      {admin && (
        <>
          <label className="block text-[0.92rem] font-bold">
            Type
            <select value={value.type || ''} onChange={set('type')}>
              <option value="">All types</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
            </select>
          </label>
          <label className="block text-[0.92rem] font-bold">
            Status
            <select value={status} onChange={setStatus}>
              <option value="">Any status</option>
              <option value="open">Open</option>
              <option value="found">Matched</option>
              <option value="returned">Returned</option>
              <option value="closed">Closed</option>
              <option value="removed">Removed</option>
            </select>
          </label>
        </>
      )}
      <label className="block text-[0.92rem] font-bold">
        Category
        <select value={value.category_id || ''} onChange={set('category_id')}>
          <option value="">All categories</option>
          {meta.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="block text-[0.92rem] font-bold">
        Location
        <select value={value.location_id || ''} onChange={set('location_id')}>
          <option value="">Any location</option>
          {meta.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Photo                                                               */
/* ------------------------------------------------------------------ */

export function ItemPhoto({ item }) {
  const [failed, setFailed] = useState(false);
  const src = assetUrl(item.image_url);
  if (!src || failed) return null;
  return <img className="mb-4 max-h-80 w-full rounded-card border border-line object-contain" src={src} alt={`Photo of ${item.title}`} onError={() => setFailed(true)} />;
}

/* ------------------------------------------------------------------ */
/* Item form (create and edit): the prototype's two-column form        */
/* ------------------------------------------------------------------ */

// The local calendar date (toISOString would give the UTC date, a day behind after midnight in Saudi Arabia).
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const MAX_PHOTO = 3 * 1024 * 1024;

/**
 * mode: 'student' (lost requests) or 'admin' (type selectable).
 * onSubmit(formData) must return a promise; rejected ApiErrors show field errors.
 */
export function ItemForm({ initial, mode = 'student', submitLabel, onSubmit, onCancel }) {
  const meta = useMeta();
  const [values, setValues] = useState(() => ({
    type: initial?.type || (mode === 'admin' ? 'found' : 'lost'),
    title: initial?.title || '',
    description: initial?.description || '',
    category_id: initial?.category_id ? String(initial.category_id) : '',
    location_id: initial?.location_id ? String(initial.location_id) : '',
    date_reported: initial?.date_reported || today(),
    contact_info: initial?.contact_info || '',
  }));
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!photo) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const set = (key) => (event) => {
    setValues((v) => ({ ...v, [key]: event.target.value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: null }));
  };

  function pickPhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrors((e) => ({ ...e, photo: 'Choose a JPG, PNG or WebP image.' }));
      event.target.value = '';
      return;
    }
    if (file.size > MAX_PHOTO) {
      setErrors((e) => ({ ...e, photo: 'The photo must be 3 MB or smaller.' }));
      event.target.value = '';
      return;
    }
    setErrors((e) => ({ ...e, photo: null }));
    setPhoto(file);
    setRemoveImage(false);
  }

  function clearPhoto() {
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = '';
    if (initial?.image_url) setRemoveImage(true);
  }

  function validate() {
    const e = {};
    if (values.title.trim().length < 3) e.title = 'Give the item a name of at least 3 characters.';
    if (values.description.trim().length < 10) e.description = 'Describe the item in at least 10 characters so it can be recognised.';
    if (!values.category_id) e.category_id = 'Choose a category.';
    if (!values.location_id) e.location_id = 'Choose where it was lost or found.';
    if (!values.date_reported) e.date_reported = 'Choose a date.';
    else if (values.date_reported > today()) e.date_reported = 'The date cannot be in the future.';
    return e;
  }

  async function submit(event) {
    event.preventDefault();
    const local = validate();
    if (Object.values(local).some(Boolean)) {
      setErrors(local);
      event.currentTarget.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    const data = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (k === 'type' && mode !== 'admin') return;
      data.append(k, v);
    });
    if (photo) data.append('photo', photo);
    if (removeImage && !photo) data.append('remove_image', '1');

    setBusy(true);
    try {
      await onSubmit(data);
    } catch (error) {
      if (error.errors && Object.keys(error.errors).length) {
        const mapped = {};
        Object.keys(error.errors).forEach((k) => { mapped[k] = fieldError(error.errors, k); });
        setErrors(mapped);
      }
    } finally {
      setBusy(false);
    }
  }

  const existing = initial?.image_url && !removeImage ? assetUrl(initial.image_url) : null;
  const shown = preview || existing;
  const isLost = values.type === 'lost';

  return (
    <form onSubmit={submit} noValidate>
      <div className="mb-[15px] grid gap-[15px] sm:grid-cols-2">
        {mode === 'admin' && (
          <Field label="Report type" required error={errors.type}>
            {(p) => (
              <select {...p} value={values.type} onChange={set('type')}>
                <option value="found">Found item</option>
                <option value="lost">Lost request</option>
              </select>
            )}
          </Field>
        )}

        <Field label="Item name" required error={errors.title}>
          {(p) => <input {...p} value={values.title} onChange={set('title')} maxLength={80} placeholder={isLost ? 'e.g. Black wallet' : 'e.g. Grey hoodie'} />}
        </Field>

        <Field label="Category" required error={errors.category_id}>
          {(p) => (
            <select {...p} value={values.category_id} onChange={set('category_id')}>
              <option value="">Choose a category</option>
              {meta.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </Field>

        <Field label="Campus location" required error={errors.location_id}>
          {(p) => (
            <select {...p} value={values.location_id} onChange={set('location_id')}>
              <option value="">Choose a location</option>
              {meta.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
        </Field>

        <Field label={isLost ? 'Date lost' : 'Date found'} required error={errors.date_reported}>
          {(p) => <input {...p} type="date" max={today()} value={values.date_reported} onChange={set('date_reported')} />}
        </Field>

        <Field label="Contact" error={errors.contact_info} hint={isLost ? 'Phone or email. Only you and the office can see it.' : 'Optional. Who handed it in, if known.'}>
          {(p) => <input {...p} value={values.contact_info} onChange={set('contact_info')} maxLength={120} placeholder="050 000 0000" />}
        </Field>
      </div>

      <Field label="Description" required error={errors.description} className="mb-[15px]"
        hint={isLost ? 'Colour, brand, marks, what was inside. Leave out card numbers and passwords.' : 'Keep one detail back to check the owner\'s claim.'}>
        {(p) => <textarea {...p} rows={4} value={values.description} onChange={set('description')} maxLength={2000} placeholder="Describe the item (avoid sensitive information)" />}
      </Field>

      <div className="mb-5">
        <p className="text-[0.92rem] font-bold" id="photo-label">Photo <span className="font-normal text-muted">(optional, JPG, PNG or WebP, up to 3 MB)</span></p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          {shown && <img src={shown} alt="Selected item" className="size-20 rounded-input border border-line object-cover" />}
          <label className="cursor-pointer rounded-button border border-field bg-white px-3 py-1.5 text-sm font-bold hover:bg-page has-focus-visible:outline-2 has-focus-visible:outline-teal">
            {shown ? 'Replace photo' : 'Add a photo'}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} aria-labelledby="photo-label" className="sr-only" />
          </label>
          {shown && <Button variant="link" size="sm" onClick={clearPhoto}>Remove photo</Button>}
        </div>
        {errors.photo && <p className="mt-1 text-sm font-bold text-danger">{errors.photo}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" busy={busy} disabled={busy}>{submitLabel}</Button>
        {onCancel && <Button variant="link" onClick={onCancel} disabled={busy}>Cancel</Button>}
      </div>
    </form>
  );
}
