import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { homeFor, useAuth } from '../auth.jsx';
import { cn } from '@/lib/utils.js';
import { Loading, useToast } from './ui.jsx';

const container = 'mx-auto w-full max-w-[1000px] px-4 sm:px-[22px]';

const NAV = {
  student: [
    { to: '/app', label: 'Found items', end: true },
    { to: '/app/requests', label: 'My requests', end: true },
    { to: '/app/requests/new', label: 'Report a lost item', end: true },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/cases', label: 'Cases', end: true },
    { to: '/admin/cases/new', label: 'Add found item', end: true },
    { to: '/admin/database', label: 'Database', end: false },
    { to: '/admin/activity', label: 'Activity log', end: true },
  ],
};

/** The prototype's navy top bar: "UniFind" and the tagline, plus the menu when signed in. */
function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  async function signOut() {
    await logout();
    toast.success('Signed out.');
    navigate('/login', { replace: true });
  }

  return (
    <header className="on-navy bg-navy text-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-button focus:bg-white focus:px-3 focus:py-2 focus:text-ink">Skip to content</a>
      <div className={cn(container, 'flex items-center justify-between gap-4 py-[17px]')}>
        <Link to={homeFor(user)} className="flex items-center gap-2 text-[1.55rem] font-extrabold text-white no-underline">
          <Search className="size-6" strokeWidth={2.75} aria-hidden="true" />UniFind
        </Link>
        {user ? (
          <div className="flex min-w-0 items-center gap-3 text-sm">
            <span className="hidden truncate text-tagline sm:inline" title={user.email}>{user.name}</span>
            <button type="button" onClick={signOut} className="cursor-pointer rounded-button border border-white/40 px-3 py-1.5 font-bold text-white hover:bg-white/10">Sign out</button>
          </div>
        ) : (
          <span className="hidden text-[0.9rem] text-tagline sm:inline">Campus Lost &amp; Found</span>
        )}
      </div>
      {user && (
        <nav aria-label="Main" className="border-t border-white/15">
          <div className={cn(container, 'flex flex-wrap gap-x-5 gap-y-1 py-2 text-[0.95rem]')}>
            {NAV[user.role].map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) => cn('border-b-2 py-1 font-bold no-underline', isActive ? 'border-white text-white' : 'border-transparent text-tagline hover:text-white')}>
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}

function Footer() {
  return (
    <footer className={cn(container, 'pt-1.5 pb-[30px] text-[0.85rem] text-muted-strong')}>
      UniFind &bull; Lost &amp; Found Office, Student Affairs building, room 12 &bull; Sunday to Thursday, 8:00 to 14:00
    </footer>
  );
}

/** Top bar, page content and footer: the same frame for students, the admin and the sign-in page. */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main id="main" tabIndex={-1} className={cn(container, 'flex-1 outline-none')}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

/** Route guard: signed-out users go to /login (remembering the page), wrong roles to /403. */
export function RequireRole({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (role && user.role !== role) return <Navigate to="/403" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  return <Navigate to={homeFor(user)} replace />;
}
