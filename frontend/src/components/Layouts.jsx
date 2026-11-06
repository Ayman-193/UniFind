import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../auth.jsx';
import { Spinner, useToast } from './ui.jsx';

export function Brand({ to = '/', light = true }) {
  return (
    <Link to={to} className={`brand${light ? ' brand-light' : ''}`}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="brand-mark">
        <circle cx="14" cy="14" r="8" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M20 20l6.5 6.5" stroke="#5fc3cf" strokeWidth="3.6" strokeLinecap="round" />
      </svg>
      <span>UniFind</span>
    </Link>
  );
}

function FullPageLoader() {
  return <div className="page-loader"><Spinner label="Loading" /></div>;
}

/** Route guard: signed-out users go to /login (remembering the page), wrong roles to /403. */
export function RequireRole({ role, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) return <Navigate to="/403" replace state={{ from: location.pathname }} />;
  return children;
}

function useSignOut() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  return async () => {
    await logout();
    toast.success('Signed out.');
    navigate('/login', { replace: true });
  };
}

function SkipLink() {
  return <a href="#main" className="skip-link">Skip to content</a>;
}

export function StudentLayout() {
  const { user } = useAuth();
  const signOut = useSignOut();

  return (
    <div className="student-shell">
      <SkipLink />
      <header className="topbar">
        <div className="container topbar-inner">
          <Brand to="/app" />
          <nav className="topnav" aria-label="Main">
            <NavLink to="/app" end>Found items</NavLink>
            <NavLink to="/app/requests" end>My requests</NavLink>
          </nav>
          <div className="topbar-end">
            <Link to="/app/requests/new" className="btn btn-accent btn-sm">Report a lost item</Link>
            <span className="topbar-user" title={user?.email}>{user?.name}</span>
            <button type="button" className="btn btn-ghost-light btn-sm" onClick={signOut}>Sign out</button>
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer container">
        <p>UniFind is run by the university Lost &amp; Found Office, Student Affairs building, room 12.</p>
        <p>Sunday to Thursday, 8:00 to 14:00</p>
      </footer>
    </div>
  );
}

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', end: true, icon: 'M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z' },
  { to: '/admin/cases', label: 'Cases', end: true, icon: 'M4 6h16M4 12h16M4 18h10' },
  { to: '/admin/cases/new', label: 'Add found item', end: true, icon: 'M12 5v14M5 12h14' },
  { to: '/admin/database', label: 'Database', end: false, icon: 'M12 4c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3zM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3' },
  { to: '/admin/activity', label: 'Activity log', end: true, icon: 'M4 12h4l2-6 4 12 2-6h4' },
];

export function AdminLayout() {
  const { user } = useAuth();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <div className={`admin-shell${open ? ' nav-open' : ''}`}>
      <SkipLink />
      <aside className="sidebar">
        <div className="sidebar-head">
          <Brand to="/admin" />
          <button type="button" className="icon-button menu-toggle" aria-expanded={open} aria-controls="admin-nav" onClick={() => setOpen((v) => !v)}>
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} /></svg>
          </button>
        </div>
        <p className="sidebar-office">Lost &amp; Found Office</p>
        <nav id="admin-nav" className="sidenav" aria-label="Admin">
          {ADMIN_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={item.icon} /></svg>
              {item.label}
            </NavLink>
          ))}
          <div className="sidebar-foot">
            <span className="sidebar-user">{user?.name}<small>{user?.email}</small></span>
            <button type="button" className="btn btn-ghost-light btn-sm" onClick={signOut}>Sign out</button>
          </div>
        </nav>
      </aside>
      <main id="main" className="admin-main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

export function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <FullPageLoader />;
  return <Navigate to={homeFor(user)} replace />;
}

export function PageHeader({ title, children, back }) {
  return (
    <div className="page-header">
      <div>
        {back && <Link to={back.to} className="back-link">{back.label}</Link>}
        <h1>{title}</h1>
      </div>
      {children && <div className="page-header-actions">{children}</div>}
    </div>
  );
}
