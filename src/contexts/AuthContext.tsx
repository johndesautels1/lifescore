/**
 * LIFE SCORE - Auth Context
 * Provides authentication state and methods throughout the app
 *
 * SUPPORTS TWO MODES:
 * 1. Supabase mode (production) - Real auth with database
 * 2. Demo mode (fallback) - When Supabase not configured
 *
 * Usage:
 * 1. Wrap your app with <AuthProvider>
 * 2. Use useAuth() hook in any component
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, withRetry, SUPABASE_TIMEOUT_MS } from '../lib/supabase';
import type { Profile, UserPreferences } from '../types/database';
import { fullDatabaseSync } from '../services/savedComparisons';

// ============================================================================
// TYPES
// ============================================================================

// Legacy User type for backwards compatibility
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthState {
  // Supabase user (raw)
  supabaseUser: SupabaseUser | null;
  session: Session | null;

  // Our user (normalized)
  user: User | null;
  profile: Profile | null;
  preferences: UserPreferences | null;

  // Status
  isLoading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  // Sign in methods
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithGitHub: () => Promise<{ error: AuthError | null }>;
  signInWithMagicLink: (email: string) => Promise<{ error: AuthError | null }>;

  // Sign up
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;

  // Password reset
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;

  // Sign out
  signOut: () => Promise<void>;

  // Legacy alias
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;

  // Profile management
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<{ error: Error | null }>;

  // Refresh
  refreshProfile: () => Promise<void>;
}

// ============================================================================
// DEMO MODE (when Supabase not configured)
// Demo is disabled unless VITE_DEMO_ENABLED=true is set in environment.
// ============================================================================

const DEMO_ENABLED = import.meta.env.VITE_DEMO_ENABLED === 'true';

// ============================================================================
// CONTEXT
// ============================================================================

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    supabaseUser: null,
    session: null,
    user: null,
    profile: null,
    preferences: null,
    isLoading: true,
    isAuthenticated: false,
    isConfigured: isSupabaseConfigured(),
    error: null,
  });

  // ══════════════════════════════════════════════════════════════════════════
  // HELPER: Convert Supabase user to our User type
  // ══════════════════════════════════════════════════════════════════════════

  const normalizeUser = (supabaseUser: SupabaseUser | null, profile: Profile | null): User | null => {
    if (!supabaseUser) return null;
    return {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      name: profile?.full_name || supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User',
      avatar: profile?.avatar_url || supabaseUser.user_metadata?.avatar_url,
    };
  };

  // ══════════════════════════════════════════════════════════════════════════
  // FETCH PROFILE & PREFERENCES
  // ══════════════════════════════════════════════════════════════════════════

  // Track if we're already fetching to prevent duplicate calls
  const fetchingRef = React.useRef<string | null>(null);

  const fetchUserData = useCallback(async (userId: string) => {
    if (!state.isConfigured) return { profile: null, preferences: null };

    // Prevent duplicate fetches for the same user
    if (fetchingRef.current === userId) {
      console.log("[Auth] Already fetching profile for user, skipping duplicate");
      return { profile: null, preferences: null };
    }

    fetchingRef.current = userId;
    console.log("[Auth] Fetching profile for user:", userId);

    try {
      // Fetch profile and preferences in parallel with retry + exponential backoff
      const [profileResult, prefsResult] = await Promise.all([
        withRetry(
          () => supabase
            .from('profiles')
            .select('id, email, full_name, tier, avatar_url, created_at')
            .eq('id', userId)
            .maybeSingle(),
          { operationName: 'Profile fetch', timeoutMs: SUPABASE_TIMEOUT_MS }
        ).catch(err => {
          console.error('[Auth] Profile fetch failed after retries:', err.message);
          return { data: null, error: err };
        }),
        withRetry(
          () => supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle(),
          { operationName: 'Preferences fetch', timeoutMs: SUPABASE_TIMEOUT_MS }
        ).catch(err => {
          console.error('[Auth] Preferences fetch failed after retries:', err.message);
          return { data: null, error: err };
        }),
      ]);

      const profile = profileResult.data;
      const preferences = prefsResult.data;

      if (profile) {
        console.log('[Auth] Profile loaded:', profile.email);
      } else {
        console.log('[Auth] No profile found for user (will use defaults)');
      }

      fetchingRef.current = null;
      return { profile: profile || null, preferences: preferences || null };
    } catch (error) {
      console.error('[Auth] Error in fetchUserData:', error);
      fetchingRef.current = null;
      // Return nulls on timeout/error - app continues without DB profile
      return { profile: null, preferences: null };
    }
  }, [state.isConfigured]);

  // ══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // DEMO MODE: Check localStorage for demo user
    if (!state.isConfigured) {
      const storedUser = localStorage.getItem('lifescore_user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser) as User;
          setState(prev => ({
            ...prev,
            user,
            isAuthenticated: true,
            isLoading: false,
          }));
        } catch {
          localStorage.removeItem('lifescore_user');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
      return;
    }

    // SUPABASE MODE: Get initial session with timeout (45s for slow Supabase cold starts)
    const SESSION_TIMEOUT_MS = 45000;
    let sessionHandled = false;
    const sessionTimeout = setTimeout(() => {
      if (!sessionHandled) {
        console.warn("[Auth] Session check timed out after 45s");
        setState(prev => ({ ...prev, isLoading: false, isAuthenticated: false }));
      }
    }, SESSION_TIMEOUT_MS);

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (sessionHandled) return; // Already handled by auth state change
      sessionHandled = true;
      clearTimeout(sessionTimeout);

      if (error) {
        console.error("[Auth] getSession error:", error);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      if (session?.user) {
        const { profile, preferences } = await fetchUserData(session.user.id);
        const user = normalizeUser(session.user, profile as Profile | null);
        setState({
          supabaseUser: session.user,
          session,
          user,
          profile: profile as Profile | null,
          preferences: preferences as UserPreferences | null,
          isLoading: false,
          isAuthenticated: true,
          isConfigured: true,
          error: null,
        });
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isAuthenticated: false,
        }));
      }
    }).catch(err => {
      console.error("[Auth] getSession exception:", err);
      if (!sessionHandled) {
        sessionHandled = true;
        clearTimeout(sessionTimeout);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[Auth] State change:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          const { profile, preferences } = await fetchUserData(session.user.id);
          const user = normalizeUser(session.user, profile as Profile | null);
          setState({
            supabaseUser: session.user,
            session,
            user,
            profile: profile as Profile | null,
            preferences: preferences as UserPreferences | null,
            isLoading: false,
            isAuthenticated: true,
            isConfigured: true,
            error: null,
          });

          // Sync saved comparisons with database after sign-in
          // This pulls any comparisons from the database and pushes local ones
          fullDatabaseSync().then(result => {
            console.log('[Auth] Database sync complete:', result.message);
          }).catch(err => {
            console.error('[Auth] Database sync failed:', err);
          });
        } else if (event === 'SIGNED_OUT') {
          setState({
            supabaseUser: null,
            session: null,
            user: null,
            profile: null,
            preferences: null,
            isLoading: false,
            isAuthenticated: false,
            isConfigured: true,
            error: null,
          });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setState(prev => ({ ...prev, session }));
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [state.isConfigured, fetchUserData]);

  // ══════════════════════════════════════════════════════════════════════════
  // AUTH METHODS
  // ══════════════════════════════════════════════════════════════════════════

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // DEMO MODE — only active when Supabase is not configured AND demo is explicitly enabled
    if (!state.isConfigured) {
      if (!DEMO_ENABLED) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Authentication service is not configured. Please contact support.',
        }));
        return { error: new Error('Auth not configured') };
      }

      await new Promise(resolve => setTimeout(resolve, 800));

      // Generic demo user — no hardcoded credentials in client code
      const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const user: User = {
        id: crypto.randomUUID(),
        email: email.toLowerCase(),
        name: name || 'Demo User',
      };

      localStorage.setItem('lifescore_user', JSON.stringify(user));
      setState(prev => ({
        ...prev,
        user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      }));
      return { error: null };
    }

    // SUPABASE MODE
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
    }

    return { error };
  }, [state.isConfigured]);

  const signInWithGoogle = useCallback(async () => {
    if (!state.isConfigured) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, [state.isConfigured]);

  const signInWithGitHub = useCallback(async () => {
    if (!state.isConfigured) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, [state.isConfigured]);

  const signInWithMagicLink = useCallback(async (email: string) => {
    if (!state.isConfigured) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { error };
  }, [state.isConfigured]);

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    if (!state.isConfigured) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
        },
      },
    });

    setState(prev => ({
      ...prev,
      isLoading: false,
      error: error?.message || null,
    }));

    return { error };
  }, [state.isConfigured]);

  const resetPassword = useCallback(async (email: string) => {
    if (!state.isConfigured) {
      return { error: { message: 'Supabase not configured' } as AuthError };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    setState(prev => ({
      ...prev,
      isLoading: false,
      error: error?.message || null,
    }));

    return { error };
  }, [state.isConfigured]);

  const signOut = useCallback(async () => {
    if (!state.isConfigured) {
      // Demo mode logout
      localStorage.removeItem('lifescore_user');
      setState(prev => ({
        ...prev,
        user: null,
        isAuthenticated: false,
        error: null,
      }));
      return;
    }

    await supabase.auth.signOut();
  }, [state.isConfigured]);

  // Legacy aliases
  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    const { error } = await signInWithEmail(email, password);
    return !error;
  }, [signInWithEmail]);

  const logout = useCallback(() => {
    signOut();
  }, [signOut]);

  // ══════════════════════════════════════════════════════════════════════════
  // PROFILE METHODS
  // ══════════════════════════════════════════════════════════════════════════

  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!state.supabaseUser || !state.isConfigured) {
      return { error: new Error('Not authenticated or Supabase not configured') };
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', state.supabaseUser.id);

    if (!error) {
      setState(prev => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, ...updates } : null,
        user: prev.user ? { ...prev.user, name: updates.full_name || prev.user.name } : null,
      }));
    }

    return { error: error ? new Error(error.message) : null };
  }, [state.supabaseUser, state.isConfigured]);

  const updatePreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    if (!state.supabaseUser || !state.isConfigured) {
      return { error: new Error('Not authenticated or Supabase not configured') };
    }

    const { error } = await supabase
      .from('user_preferences')
      .update(updates)
      .eq('user_id', state.supabaseUser.id);

    if (!error) {
      setState(prev => ({
        ...prev,
        preferences: prev.preferences ? { ...prev.preferences, ...updates } : null,
      }));
    }

    return { error: error ? new Error(error.message) : null };
  }, [state.supabaseUser, state.isConfigured]);

  const refreshProfile = useCallback(async () => {
    if (!state.supabaseUser) return;

    const { profile, preferences } = await fetchUserData(state.supabaseUser.id);
    const user = normalizeUser(state.supabaseUser, profile as Profile | null);
    setState(prev => ({
      ...prev,
      profile: profile as Profile | null,
      preferences: preferences as UserPreferences | null,
      user,
    }));
  }, [state.supabaseUser, fetchUserData]);

  // ══════════════════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ══════════════════════════════════════════════════════════════════════════

  const value: AuthContextValue = {
    ...state,
    signInWithEmail,
    signInWithGoogle,
    signInWithGitHub,
    signInWithMagicLink,
    signUp,
    resetPassword,
    signOut,
    login,
    logout,
    updateProfile,
    updatePreferences,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to access auth context
 * Must be used within an AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Hook that returns true only when authenticated
 */
export function useIsAuthenticated(): boolean {
  const { isAuthenticated, isLoading } = useAuth();
  return !isLoading && isAuthenticated;
}

/**
 * Hook that returns the current user or null
 */
export function useUser(): User | null {
  const { user } = useAuth();
  return user;
}

/**
 * Hook that returns the current profile or null
 */
export function useProfile(): Profile | null {
  const { profile } = useAuth();
  return profile;
}

export default AuthContext;
