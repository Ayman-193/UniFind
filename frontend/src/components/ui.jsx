import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

const ToastContext = createContext(null);
let toastSeq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback((kind, message) => {
    const id = ++toastSeq;
    setToasts((list) => [...list.slice(-3), { id, kind, message }]);
    setTimeout(() => dismiss(id), kind === 'error' ? 7000 : 4000);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (message) => push('success', message),
    error: (message) => push('error', message),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <span className="toast-icon" aria-hidden="true">{t.kind === 'error' ? '!' : '✓'}</span>
            <p>{t.message}</p>
            <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

/* ------------------------------------------------------------------ */
/* Modal and confirm dialog                                            */
/* ------------------------------------------------------------------ */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, title, onClose, children, footer, size = 'md', busy = false }) {
  const panelRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const panel = panelRef.current;
    const first = panel?.querySelector('[data-autofocus]') || panel?.querySelector(FOCUSABLE);
    first?.focus();
    document.body.classList.add('modal-open');

    function onKey(event) {
      if (event.key === 'Escape' && !busy) {
        event.stopPropagation();
        onClose();
      }
      if (event.key === 'Tab' && panel) {
        const nodes = [...panel.querySelectorAll(FOCUSABLE)];
        if (!nodes.length) return;
        const [head, tail] = [nodes[0], nodes[nodes.length - 1]];
        if (event.shiftKey && document.activeElement === head) { event.preventDefault(); tail.focus(); }
        else if (!event.shiftKey && document.activeElement === tail) { event.preventDefault(); head.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('modal-open');
      previous?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef}>
        <header className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label="Close dialog">×</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger = false, busy = false, onConfirm, onCancel, children }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      busy={busy}
      size="sm"
      footer={(
        <>
          <button type="button" className="btn btn-quiet" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy} data-autofocus={children ? undefined : true}>
            {busy ? <Spinner /> : null}{confirmLabel}
          </button>
        </>
      )}
    >
      {message && <p className="modal-message">{message}</p>}
      {children}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export const STATUS_LABELS = {
  open: 'Open',
  found: 'Matched',
  returned: 'Returned',
  closed: 'Closed',
};

export function StatusBadge({ status }) {
  return (
    <span className={`status status-${status}`}>
      <span className="status-dot" aria-hidden="true" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function TypeBadge({ type }) {
  return <span className={`type-badge type-${type}`}>{type === 'lost' ? 'Lost' : 'Found'}</span>;
}

export function RemovedBadge() {
  return <span className="type-badge type-removed">Removed</span>;
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export function Pagination({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) return null;
  const { current_page: page, last_page: last, total } = meta;

  const pages = [];
  for (let p = 1; p <= last; p += 1) {
    if (p === 1 || p === last || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  return (
    <nav className="pagination" aria-label="Pagination">
      <span className="pagination-total">{total} results</span>
      <div className="pagination-pages">
        <button type="button" className="page-btn" onClick={() => onPage(page - 1)} disabled={page <= 1}>Previous</button>
        {pages.map((p, i) => (p === '…'
          ? <span key={`gap-${i}`} className="page-gap" aria-hidden="true">…</span>
          : (
            <button key={p} type="button" className={`page-btn page-num${p === page ? ' is-current' : ''}`} aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)} aria-label={`Page ${p}`}>
              {p}
            </button>
          )))}
        <button type="button" className="page-btn" onClick={() => onPage(page + 1)} disabled={page >= last}>Next</button>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Loading, empty state                                                */
/* ------------------------------------------------------------------ */

export function Spinner({ label }) {
  return <span className="spinner" role={label ? 'status' : undefined} aria-label={label} />;
}

export function SkeletonCards({ count = 6 }) {
  return (
    <div className="tag-grid" aria-busy="true" aria-label="Loading items">
      {Array.from({ length: count }, (_, i) => (
        <div className="tag tag-skeleton" key={i}>
          <div className="skeleton skeleton-photo" />
          <div className="tag-body">
            <div className="skeleton skeleton-line w-40" />
            <div className="skeleton skeleton-line w-80" />
            <div className="skeleton skeleton-line w-60" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ rows = 6, cols = 5 }) {
  return (
    <div className="table-wrap" aria-busy="true" aria-label="Loading">
      <table className="data-table">
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => (
                <td key={c}><div className={`skeleton skeleton-line ${c === 1 ? 'w-80' : 'w-60'}`} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="empty-state">
      <svg className="empty-art" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M14 10h26l12 12v32H14z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <circle cx="29" cy="34" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M35 40l7 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <p>{error?.message || 'Something went wrong while loading this page.'}</p>
      {onRetry && <button type="button" className="btn btn-quiet" onClick={onRetry}>Try again</button>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Form field                                                          */
/* ------------------------------------------------------------------ */

/**
 * Wraps one input with its label, hint and error.
 * children is a render function receiving the props to spread on the control.
 */
export function Field({ label, error, hint, required, children, className = '' }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={`field${error ? ' has-error' : ''} ${className}`}>
      <label htmlFor={id}>
        {label}
        {required && <span className="required" aria-hidden="true"> *</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, required })}
      {hint && <p className="field-hint" id={hintId}>{hint}</p>}
      {error && <p className="field-error" id={errorId}>{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function formatDate(value) {
  if (!value) return '';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function reference(id) {
  return `UF-${String(id).padStart(4, '0')}`;
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}
