import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { fieldError } from '../api.js';
import { homeFor, useAuth } from '../auth.jsx';
import { Button, ButtonLink, Field, Hero, Panel, useToast } from '../components/ui.jsx';

function allowedFor(user, path) {
  if (!path) return false;
  return user.role === 'admin' ? path.startsWith('/admin') : path.startsWith('/app');
}

export function Login() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from;

  if (!loading && user) return <Navigate to={allowedFor(user, from) ? from : homeFor(user)} replace />;

  async function signIn(credentials) {
    setBusy(true);
    setErrors({});
    setFormError('');
    try {
      const signedIn = await login(credentials.email, credentials.password);
      toast.success(`Signed in as ${signedIn.name}.`);
      navigate(allowedFor(signedIn, from) ? from : homeFor(signedIn), { replace: true });
    } catch (error) {
      if (error.status === 422 && error.errors) {
        setErrors({ email: fieldError(error.errors, 'email'), password: fieldError(error.errors, 'password') });
      } else {
        setFormError(error.message);
      }
      toast.error(error.message);
      setBusy(false);
    }
  }

  function submit(event) {
    event.preventDefault();
    const local = {};
    if (!email.trim()) local.email = 'Enter your university email.';
    if (!password) local.password = 'Enter your password.';
    if (local.email || local.password) { setErrors(local); return; }
    signIn({ email, password });
  }

  return (
    <>
      <Hero title="Find what matters." text="The campus Lost & Found Office, online. Check what has been handed in and report what you lost." />
      <Panel className="max-w-md" aria-labelledby="signin-title">
        <h2 id="signin-title" className="mb-1 text-2xl">Sign in</h2>
        <p className="mb-5 text-[0.9rem] text-muted">Use your university account. Accounts are created by the Lost &amp; Found Office.</p>
        <form onSubmit={submit} noValidate className="space-y-[15px]">
          {formError && <p className="rounded-card border border-danger-line bg-danger-bg p-3 text-sm text-danger" role="alert">{formError}</p>}
          <Field label="Email" error={errors.email}>
            {(p) => <input {...p} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@uqu.edu.sa" />}
          </Field>
          <Field label="Password" error={errors.password}>
            {(p) => <input {...p} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
          <Button type="submit" className="w-full" busy={busy} disabled={busy}>Sign in</Button>
        </form>
      </Panel>
    </>
  );
}

function StatusPage({ code, title, children }) {
  const { user } = useAuth();
  return (
    <Hero title={title} text={children} eyebrow={code}
      action={<ButtonLink to={homeFor(user)}>{user ? 'Go to my home page' : 'Go to sign in'}</ButtonLink>} />
  );
}

export function Forbidden() {
  return (
    <StatusPage code="403" title="This page is for the Lost & Found Office">
      Your account does not have access to it. If you think it should, contact the office at Student Affairs.
    </StatusPage>
  );
}

export function NotFound() {
  return (
    <StatusPage code="404" title="We could not find that page">
      The link may be old or mistyped.
    </StatusPage>
  );
}
