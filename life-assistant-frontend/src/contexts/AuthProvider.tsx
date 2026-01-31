import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authApi } from '../lib/api';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ReturnType<typeof authApi.me> extends Promise<infer T> ? T | null : never>(null);
  const [isLoading, setIsLoading] = useState(() => {
    // Initialize based on whether token exists - avoids sync setState in effect
    return !!localStorage.getItem('auth_token');
  });

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      authApi
        .me()
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, []);

  const login = async (credentials: Parameters<typeof authApi.login>[0]) => {
    const response = await authApi.login(credentials);
    localStorage.setItem('auth_token', response.access_token);
    setUser(response.user);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
