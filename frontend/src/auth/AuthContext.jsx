import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { loginUser, registerUser, fetchProfile } from '../api';
import { resetSocket } from '../socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchProfile()
        .then((res) => setUser(res.user || res))
        .catch(() => {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          delete api.defaults.headers.common['Authorization'];
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    resetSocket(); // ensure a fresh socket for the new session
    const res = await loginUser({ email, password });
    localStorage.setItem('access_token', res.access);
    localStorage.setItem('refresh_token', res.refresh);
    api.defaults.headers.common['Authorization'] = `Bearer ${res.access}`;
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (data) => {
    const res = await registerUser(data);
    return res;
  }, []);

  const logout = useCallback(async () => {
    resetSocket(); // drop any socket bound to the previous session
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
