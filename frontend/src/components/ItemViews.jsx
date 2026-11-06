import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { assetUrl, fieldError, get } from '../api.js';
import { Field, RemovedBadge, Spinner, StatusBadge, TypeBadge, formatDate, reference } from './ui.jsx';

/* ------------------------------------------------------------------ */
/* Shared lookups                                                      */
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
 * Returns { rows, meta, loading, error, reload }.
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

function readPref(key, fallback) {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function writePref(key, value) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/* Cards | Table                                                       */
/* ------------------------------------------------------------------ */

export function ViewToggle({ value, onChange }) {
  return (
    <div className="segmented" role="group" aria-label="Display as">
      {['cards', 'table'].map((mode) => (
        <button key={mode} type="button" className={value === mode ? 'is-on' : ''} aria-pressed={value === mode} onClick={() => onChange(mode)}>
          {mode === 'cards' ? 'Cards' : 'Table'}
        </button>
      ))}
    </div>
  );
}

export function useViewMode(key) {
  const [mode, setMode] = useState(() => readPref(`unifind.view.${key}`, 'cards'));
  const update = (next) => { setMode(next); writePref(`unifind.view.${key}`, next); };
  return [mode, update];
}

const CATEGORY_GLYPHS = {
  Electronics: 'M8 14h32v20H8zM4 38h40',
  'Wallets & Cards': 'M6 14h36v22H6zM6 20h36M32 27h5',
  Keys: 'M16 24a7 7 0 1 1 0 .1M23 24h19M36 24v6M41 24v4',
  'Books & Notes': 'M10 8h22a6 6 0 0 1 6 6v26H16a6 6 0 0 1-6-6zM10 34a6 6 0 0 1 6-6h22',
  Bags: 'M10 18h28l-2 22H12zM18 18v-4a6 6 0 0 1 12 0v4',
  Clothing: 'M16 8l-9 6 4 8 5-3v21h16V19l5 3 4-8-9-6c-1 4-4 6-8 6s-7-2-8-6z',
  'ID & Documents': 'M8 10h32v28H8zM14 20a4 4 0 1 0 8 0 4 4 0 1 0-8 0M13 31c1-4 9-4 10 0M27 18h8M27 24h8',
};
function CategoryGlyph({ name }) {
  const d = CATEGORY_GLYPHS[name] || 'M24 8a16 16 0 1 0 .1 0M19 19a5 5 0 1 1 7 5c-1.5.8-2 1.7-2 3.5M24 33v.5';
  return (
    <svg viewBox="0 0 48 48" className="glyph" aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ItemPhoto({ item, className = '' }) {
  const [failed, setFailed] = useState(false);
  const src = assetUrl(item.image_url);
  if (src && !failed) {
    return <img className={`item-photo ${className}`} src={src} alt="" loading="lazy" onError={() => setFailed(true)} />;
  }
  return (
    <div className={`item-photo item-photo-empty ${className}`}>
      <CategoryGlyph name={item.category?.name} />
    </div>
  );
}

/** One item as a claim tag: reference number, photo, facts. */
export function ItemCard({ item, to }) {
  return (
    <article className={`tag tag-${item.type}`}>
      <Link to={to} className="tag-link">
        <div className="tag-top">
          <span className="tag-hole" aria-hidden="true" />
          <span className="tag-ref">{reference(item.id)}</span>
          <TypeBadge type={item.type} />
        </div>
        <ItemPhoto item={item} />
        <div className="tag-body">
          <h3 className="tag-title">{item.title}</h3>
          <dl className="tag-facts">
            <div><dt>Where</dt><dd>{item.location?.name}</dd></div>
            <div><dt>When</dt><dd>{formatDate(item.date_reported)}</dd></div>
            <div><dt>What</dt><dd>{item.category?.name}</dd></div>
          </dl>
          {item.status !== 'open' && <StatusBadge status={item.status} />}
        </div>
      </Link>
    </article>
  );
}

export function ItemGrid({ items, linkFor }) {
  return (
    <ul className="tag-grid" role="list">
      {items.map((item) => <li key={item.id}><ItemCard item={item} to={linkFor(item)} /></li>)}
    </ul>
  );
}

/**
 * columns: array of keys from COLUMN_DEFS, plus optional renderActions(item).
 */
const COLUMN_DEFS = {
  ref: { label: 'Ref', render: (i) => <span className="mono-ref">{reference(i.id)}</span> },
  type: { label: 'Type', render: (i) => <TypeBadge type={i.type} /> },
  title: { label: 'Item', render: (i, linkFor) => <Link className="cell-title" to={linkFor(i)}>{i.title}</Link> },
  category: { label: 'Category', render: (i) => i.category?.name },
  location: { label: 'Location', render: (i) => i.location?.name },
  date: { label: 'Date', render: (i) => <span className="nowrap">{formatDate(i.date_reported)}</span> },
  reporter: { label: 'Reported by', render: (i) => i.reporter?.name },
  status: { label: 'Status', render: (i) => (i.deleted_at ? <RemovedBadge /> : <StatusBadge status={i.status} />) },
};

export function ItemTable({ items, linkFor, columns = ['ref', 'type', 'title', 'category', 'location', 'date', 'status'], renderActions, caption }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => <th key={c} scope="col">{COLUMN_DEFS[c].label}</th>)}
            {renderActions && <th scope="col"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className={item.deleted_at ? 'is-removed' : ''}>
              {columns.map((c) => <td key={c} data-label={COLUMN_DEFS[c].label}>{COLUMN_DEFS[c].render(item, linkFor)}</td>)}
              {renderActions && <td className="cell-actions">{renderActions(item)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Filter bar                                                          */
/* ------------------------------------------------------------------ */

export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Controlled filter bar. `value` is the filter object, `onChange` receives a new one.
 * The search box is debounced; selects apply immediately.
 */
export function FilterBar({ value, onChange, fields = ['search', 'category', 'location', 'dates'], searchPlaceholder = 'Search by name or description' }) {
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
  const active = Object.entries(value).some(([k, v]) => k !== 'trashed' && v);

  return (
    <div className="filter-bar" role="search">
      {fields.includes('search') && (
        <label className="filter filter-search">
          <span className="sr-only">Search</span>
          <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="M13 13l4 4" /></svg>
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={searchPlaceholder} />
        </label>
      )}
      {fields.includes('type') && (
        <label className="filter">
          <span className="filter-label">Type</span>
          <select value={value.type || ''} onChange={set('type')}>
            <option value="">Lost and found</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
        </label>
      )}
      {fields.includes('status') && (
        <label className="filter">
          <span className="filter-label">Status</span>
          <select value={value.status || ''} onChange={set('status')}>
            <option value="">Any status</option>
            <option value="open">Open</option>
            <option value="found">Matched</option>
            <option value="returned">Returned</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      )}
      {fields.includes('category') && (
        <label className="filter">
          <span className="filter-label">Category</span>
          <select value={value.category_id || ''} onChange={set('category_id')}>
            <option value="">All categories</option>
            {meta.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}
      {fields.includes('location') && (
        <label className="filter">
          <span className="filter-label">Location</span>
          <select value={value.location_id || ''} onChange={set('location_id')}>
            <option value="">Any location</option>
            {meta.locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
      )}
      {fields.includes('dates') && (
        <>
          <label className="filter">
            <span className="filter-label">From</span>
            <input type="date" value={value.date_from || ''} max={value.date_to || undefined} onChange={set('date_from')} />
          </label>
          <label className="filter">
            <span className="filter-label">To</span>
            <input type="date" value={value.date_to || ''} min={value.date_from || undefined} onChange={set('date_to')} />
          </label>
        </>
      )}
      {fields.includes('trashed') && (
        <label className="filter">
          <span className="filter-label">Removed</span>
          <select value={value.trashed || ''} onChange={set('trashed')}>
            <option value="">Hide removed</option>
            <option value="with">Include removed</option>
            <option value="only">Only removed</option>
          </select>
        </label>
      )}
      {active && (
        <button type="button" className="btn btn-link filter-clear" onClick={() => { setSearch(''); onChange({ trashed: value.trashed || '' }); }}>
          Clear filters
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Item form (create and edit)                                         */
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
    <form className="item-form" onSubmit={submit} noValidate>
      {mode === 'admin' && (
        <fieldset className="field type-choice">
          <legend>Type</legend>
          <div className="segmented segmented-lg">
            {['found', 'lost'].map((t) => (
              <label key={t} className={values.type === t ? 'is-on' : ''}>
                <input type="radio" name="type" value={t} checked={values.type === t} onChange={set('type')} />
                {t === 'found' ? 'Found item' : 'Lost request'}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="form-grid">
        <Field label="Item name" required error={errors.title} className="span-2">
          {(p) => <input {...p} value={values.title} onChange={set('title')} maxLength={80} placeholder={isLost ? 'For example: black leather wallet' : 'For example: grey hoodie, size M'} />}
        </Field>

        <Field label="Description" required error={errors.description} className="span-2"
          hint={isLost ? 'Colour, brand, marks, what was inside. Leave out card numbers and passwords.' : 'Describe it so the owner can recognise it, but keep one detail back to check their claim.'}>
          {(p) => <textarea {...p} rows={4} value={values.description} onChange={set('description')} maxLength={2000} />}
        </Field>

        <Field label="Category" required error={errors.category_id}>
          {(p) => (
            <select {...p} value={values.category_id} onChange={set('category_id')}>
              <option value="">Choose a category</option>
              {meta.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </Field>

        <Field label={isLost ? 'Where you lost it' : 'Where it was found'} required error={errors.location_id}>
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

        <Field label="How to reach you" error={errors.contact_info} hint={isLost ? 'Phone or email. Only you and the office can see it.' : 'Optional. Who handed it in, if known.'}>
          {(p) => <input {...p} value={values.contact_info} onChange={set('contact_info')} maxLength={120} placeholder="050 000 0000" />}
        </Field>

        <div className={`field span-2 photo-field${errors.photo ? ' has-error' : ''}`}>
          <span className="field-label-text" id="photo-label">Photo</span>
          <div className="photo-picker">
            {shown ? (
              <img src={shown} alt="Selected item" className="photo-preview" />
            ) : (
              <div className="photo-preview photo-preview-empty" aria-hidden="true">No photo</div>
            )}
            <div className="photo-actions">
              <label className="btn btn-quiet file-btn">
                {shown ? 'Replace photo' : 'Add a photo'}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={pickPhoto} aria-labelledby="photo-label" className="sr-only" />
              </label>
              {shown && <button type="button" className="btn btn-link" onClick={clearPhoto}>Remove photo</button>}
              <p className="field-hint">JPG, PNG or WebP, up to 3 MB.</p>
              {errors.photo && <p className="field-error">{errors.photo}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <Spinner />}{submitLabel}</button>
        {onCancel && <button type="button" className="btn btn-quiet" onClick={onCancel} disabled={busy}>Cancel</button>}
      </div>
    </form>
  );
}
