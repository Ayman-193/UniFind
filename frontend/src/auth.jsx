import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, onUnauthorized, token } from './api.js';
import { useToast } from './components/ui.jsx';

const AuthContext = createContext(null);

export function homeFor(user) {
  if (!user) return '/login';
  return user.role === 'admin' ? '/admin' : '/app';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  // Restore the session from a stored token.
  useEffect(() => {
    if (!token.get()) {
      setLoading(false);
      return;
    }
    api('/api/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => token.clear())
      .finally(() => setLoading(false));
  }, []);

  // Any 401 from the API signs the user out everywhere.
  const userRef = useRef(null);
  userRef.current = user;
  useEffect(() => {
    onUnauthorized(() => {
      if (userRef.current) toast.error('Your session has ended. Sign in again to continue.');
      setUser(null);
    });
  }, [toast]);

  const login = useCallback(async (email, password) => {
    const data = await api('/api/auth/login', { method: 'POST', body: { email, password } });
    token.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {
      // The token may already be invalid; sign out locally anyway.
    }
    token.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
