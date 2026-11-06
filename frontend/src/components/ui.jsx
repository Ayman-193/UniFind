import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { cva } from 'class-variance-authority';
import { Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils.js';

/* ------------------------------------------------------------------ */
/* Buttons (the prototype's teal .button, plus quieter variants)       */
/* ------------------------------------------------------------------ */

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-button border font-bold no-underline cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'border-transparent bg-teal text-white hover:bg-teal-dark',
        secondary: 'border-field bg-white text-ink hover:bg-page',
        danger: 'border-danger-line bg-transparent text-danger hover:bg-danger-bg',
        link: 'border-transparent bg-transparent px-0! text-teal-dark underline-offset-2 hover:underline',
      },
      size: {
        default: 'min-h-11 px-[19px] text-base',
        sm: 'min-h-9 px-3 text-sm',
      },
    },
    defaultVariants: { variant: 'primary', size: 'default' },
  },
);

export function Button({ variant, size, className, busy = false, children, type = 'button', ...props }) {
  return (
    <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {busy && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({ variant, size, className, ...props }) {
  return <Link className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

/* ------------------------------------------------------------------ */
/* Layout pieces                                                       */
/* ------------------------------------------------------------------ */

export function Panel({ className, children, ...props }) {
  return (
    <section className={cn('mb-[26px] rounded-panel border border-line bg-white p-[17px] shadow-panel sm:p-[25px]', className)} {...props}>
      {children}
    </section>
  );
}

/** A small boxed note inside a panel (office note, "ready to collect"...). */
export function Note({ title, children }) {
  return (
    <div className="mt-5 rounded-card border border-line bg-page p-4">
      {title && <h2 className="mb-1 text-base">{title}</h2>}
      {children}
    </div>
  );
}

/** The prototype's hero: a big title, one line of text and at most one teal button. */
export function Hero({ title, text, action, eyebrow }) {
  return (
    <section className="pt-[52px] pb-10">
      {eyebrow && <p className="mb-1 text-lg font-bold text-teal-dark">{eyebrow}</p>}
      <h1 className="mb-2 text-[clamp(2rem,5vw,3rem)] break-words">{title}</h1>
      <p className={cn('text-muted-strong', action ? 'mb-[23px]' : '')}>{text}</p>
      {action}
    </section>
  );
}

/** One page title with an optional back link and one main action. */
export function PageTitle({ title, back, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pt-8 pb-6">
      <div className="min-w-0">
        {back && <Link to={back.to} className="text-sm font-bold text-teal-dark hover:underline">&larr; {back.label}</Link>}
        <h1 className="mt-1 text-[clamp(1.6rem,4vw,2.2rem)] break-words">{title}</h1>
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

const badge = 'inline-block rounded-full px-2.5 py-0.5 text-[0.8rem] font-bold whitespace-nowrap';

export const STATUS_LABELS = { open: 'Open', found: 'Matched', returned: 'Returned', closed: 'Closed' };

const STATUS_COLORS = {
  open: 'bg-neutral-bg text-neutral',
  found: 'bg-teal-soft text-teal-dark',
  returned: 'bg-found-bg text-found',
  closed: 'bg-neutral-bg text-neutral',
};

export function TypeBadge({ type }) {
  return <span className={cn(badge, type === 'lost' ? 'bg-lost-bg text-lost' : 'bg-found-bg text-found')}>{type === 'lost' ? 'LOST' : 'FOUND'}</span>;
}

export function StatusBadge({ status }) {
  return <span className={cn(badge, STATUS_COLORS[status] || STATUS_COLORS.open)}>{STATUS_LABELS[status] || status}</span>;
}

export function RemovedBadge() {
  return <span className={cn(badge, 'bg-danger-bg text-danger')}>Removed</span>;
}

/* ------------------------------------------------------------------ */
/* Loading, empty and error states                                     */
/* ------------------------------------------------------------------ */

export function Spinner({ label }) {
  return <Loader2 className="size-4 shrink-0 motion-safe:animate-spin" role={label ? 'status' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

export function Loading({ label = 'Loading' }) {
  return <p className="flex items-center justify-center gap-2 p-[25px] text-muted" role="status"><Spinner />{label}</p>;
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="p-[25px] text-center text-muted">
      <p className="font-bold text-ink">{title}</p>
      {children && <p className="mt-1">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-card border border-danger-line bg-danger-bg p-4 text-danger" role="alert">
      <p>{error?.message || 'Something went wrong while loading this page.'}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export function Pagination({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) return null;
  const { current_page: page, last_page: last, total } = meta;
  return (
    <nav className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-muted" aria-label="Pagination">
      <span>{total} results, page {page} of {last}</span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>Previous</Button>
        <Button variant="secondary" size="sm" onClick={() => onPage(page + 1)} disabled={page >= last}>Next</Button>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Form field                                                          */
/* ------------------------------------------------------------------ */

/**
 * One labelled control with its hint and error.
 * children is a render function receiving the props to spread on the control.
 */
export function Field({ label, error, hint, required, children, className }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-[0.92rem] font-bold">
        {label}
        {required && <span className="text-danger" aria-hidden="true"> *</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, required })}
      {hint && <p className="mt-1 text-sm text-muted" id={hintId}>{hint}</p>}
      {error && <p className="mt-1 text-sm font-bold text-danger" id={errorId}>{error}</p>}
    </div>
  );
}

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
      <div className="fixed right-4 bottom-4 left-4 z-50 flex flex-col items-end gap-2 sm:left-auto" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'}
            className={cn('flex w-full max-w-sm items-start gap-3 rounded-card border border-l-4 border-line bg-white p-3 shadow-panel',
              t.kind === 'error' ? 'border-l-danger' : 'border-l-teal')}>
            <p className="flex-1 text-sm">{t.message}</p>
            <button type="button" className="cursor-pointer text-muted hover:text-ink" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <X className="size-4" aria-hidden="true" />
            </button>
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

export function Modal({ open, title, onClose, children, footer, wide = false, busy = false }) {
  const panelRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const panel = panelRef.current;
    const first = panel?.querySelector('[data-autofocus]') || panel?.querySelector(FOCUSABLE);
    first?.focus();
    document.body.style.overflow = 'hidden';

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
      document.body.style.overflow = '';
      previous?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-navy/40 p-4 sm:items-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={cn('w-full rounded-panel border border-line bg-white shadow-panel', wide ? 'max-w-2xl' : 'max-w-md')}>
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-lg break-words">{title}</h2>
          <button type="button" className="cursor-pointer text-muted hover:text-ink" onClick={onClose} disabled={busy} aria-label="Close dialog">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>
        <div className="space-y-4 px-5 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</footer>}
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
      footer={(
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={busy} busy={busy} data-autofocus={children ? undefined : true}>
            {confirmLabel}
          </Button>
        </>
      )}
    >
      {message && <p className="text-muted">{message}</p>}
      {children}
    </Modal>
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

/** A plain table inside a panel; scrolls sideways inside itself on a phone, never the page. */
export function Table({ children, caption }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top [&_th]:px-3 [&_th]:py-2 [&_th]:font-bold [&_th]:whitespace-nowrap [&_th]:text-muted">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}
