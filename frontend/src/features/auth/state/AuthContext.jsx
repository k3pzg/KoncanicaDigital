import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loginRequest, logoutRequest, meRequest } from '../api/authApi';

const TOKEN_KEY = 'kd_token';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  useEffect(() => {
    async function loadCurrentUser() {
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const result = await meRequest(token);
        setUser(result.user);
      } catch {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadCurrentUser();
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      isLoading,
      async login(credentials) {
        const result = await loginRequest(credentials);
        localStorage.setItem(TOKEN_KEY, result.token);
        setToken(result.token);
        setUser(result.user);
      },
      async logout() {
        if (token) {
          await logoutRequest(token);
        }

        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    }),
    [token, user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
