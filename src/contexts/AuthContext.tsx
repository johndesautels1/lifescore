/**
 * LIFE SCORE™ Authentication Context
 * Manages user authentication state across the application
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  error: string | null;
}

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('lifescore_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('lifescore_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Login function
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Demo credentials check (replace with real API in production)
      // Accept any email/password for demo, or specific test accounts
      const validCredentials = [
        { email: 'demo@lifescore.com', password: 'demo123', name: 'Demo User' },
        { email: 'admin@clues.com', password: 'admin123', name: 'Admin' },
        { email: 'john@clues.com', password: 'clues2026', name: 'John D.' },
      ];

      const match = validCredentials.find(
        cred => cred.email.toLowerCase() === email.toLowerCase() && cred.password === password
      );

      if (match) {
        const authenticatedUser: User = {
          id: crypto.randomUUID(),
          email: match.email,
          name: match.name,
        };

        setUser(authenticatedUser);
        localStorage.setItem('lifescore_user', JSON.stringify(authenticatedUser));
        setIsLoading(false);
        return true;
      }

      // For demo: accept any email with password "lifescore"
      if (password === 'lifescore') {
        const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const authenticatedUser: User = {
          id: crypto.randomUUID(),
          email: email.toLowerCase(),
          name: name || 'User',
        };

        setUser(authenticatedUser);
        localStorage.setItem('lifescore_user', JSON.stringify(authenticatedUser));
        setIsLoading(false);
        return true;
      }

      setError('Invalid email or password');
      setIsLoading(false);
      return false;
    } catch (err) {
      setError('Authentication failed. Please try again.');
      setIsLoading(false);
      return false;
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('lifescore_user');
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// HOOK
// ============================================================================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
