import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { fieldError, get } from '../api.js';
import { homeFor, useAuth } from '../auth.jsx';
import { Brand } from '../components/Layouts.jsx';
import { Field, Spinner, useToast } from '../components/ui.jsx';

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
  const [busy, setBusy] = useState(null);
  const [demo, setDemo] = useState([]);

  useEffect(() => {
    get('/api/demo-accounts').then((d) => setDemo(d.data || [])).catch(() => setDemo([]));
  }, []);

  const from = location.state?.from;

  if (!loading && user) return <Navigate to={allowedFor(user, from) ? from : homeFor(user)} replace />;

  async function signIn(credentials, key) {
    setBusy(key);
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
      setBusy(null);
    }
  }

  function submit(event) {
    event.preventDefault();
    const local = {};
    if (!email.trim()) local.email = 'Enter your university email.';
    if (!password) local.password = 'Enter your password.';
    if (local.email || local.password) { setErrors(local); return; }
    signIn({ email, password }, 'form');
  }

  return (
    <div className="login-page">
      <section className="login-aside" aria-hidden="false">
        <Brand to="/login" />
        <div className="login-aside-copy">
          <p className="login-display">Find what matters.</p>
          <p>The campus Lost &amp; Found Office, online. Check what has been handed in, report what you lost, and get told when it turns up.</p>
        </div>
        <p className="login-aside-foot">Student Affairs building, room 12</p>
      </section>

      <main className="login-main" id="main">
        <div className="login-card">
          <h1>Sign in</h1>
          <p className="login-sub">Use your university account. Accounts are created by the Lost &amp; Found Office.</p>

          {demo.length > 0 && (
            <div className="demo-block">
              <p className="demo-title">Demo accounts</p>
              <div className="demo-buttons">
                {demo.map((account) => (
                  <button key={account.email} type="button" className={`btn ${account.role === 'admin' ? 'btn-navy' : 'btn-primary'} btn-block`}
                    disabled={busy !== null} onClick={() => signIn(account, account.role)}>
                    {busy === account.role && <Spinner />}{account.label}
                  </button>
                ))}
              </div>
              <p className="demo-note">Demo mode is on. These buttons sign in with seeded test accounts.</p>
            </div>
          )}

          <form onSubmit={submit} noValidate className="login-form">
            {formError && <p className="form-alert" role="alert">{formError}</p>}
            <Field label="Email" error={errors.email}>
              {(p) => <input {...p} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@uqu.edu.sa" />}
            </Field>
            <Field label="Password" error={errors.password}>
              {(p) => <input {...p} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            </Field>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy !== null}>
              {busy === 'form' && <Spinner />}Sign in
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

function StatusPage({ code, title, children }) {
  const { user } = useAuth();
  return (
    <main className="status-page" id="main">
      <Brand to={homeFor(user)} light={false} />
      <p className="status-code" aria-hidden="true">{code}</p>
      <h1>{title}</h1>
      <p>{children}</p>
      <Link to={homeFor(user)} className="btn btn-primary">{user ? 'Go to my home page' : 'Go to sign in'}</Link>
    </main>
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
