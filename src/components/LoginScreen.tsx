/**
 * LIFE SCORE - Authentication Screen
 *
 * Full authentication with Sign In, Sign Up, and Password Reset.
 * Clean, professional design.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoginScreen.css';

type AuthMode = 'signin' | 'signup' | 'forgot';

// ============================================================================
// REMEMBER ME — localStorage helpers (email only — password left to browser)
// ============================================================================
const REMEMBER_EMAIL_KEY = 'lifescore_remember_email';

function loadSavedEmail(): string | null {
  try {
    return localStorage.getItem(REMEMBER_EMAIL_KEY);
  } catch {
    return null;
  }
}

function saveEmail(email: string): void {
  try {
    localStorage.setItem(REMEMBER_EMAIL_KEY, email);
  } catch { /* ignore quota errors */ }
}

function clearSavedEmail(): void {
  try { localStorage.removeItem(REMEMBER_EMAIL_KEY); } catch { /* ignore */ }
}

// Migrate: remove old insecure credential storage if present
try { localStorage.removeItem('lifescore_remember_me'); } catch { /* ignore */ }

// ============================================================================
// COMPONENT
// ============================================================================

const LoginScreen: React.FC = () => {
  const { signInWithEmail, signInWithGoogle, signInWithGitHub, signUp, resetPassword, isLoading, error, isConfigured } = useAuth();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [localError, setLocalError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  // Load saved email on mount (password is handled by browser password manager)
  useEffect(() => {
    const savedEmail = loadSavedEmail();
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFullName('');
    setLocalError('');
    setSuccessMessage('');
  }, []);

  const handleModeChange = useCallback((newMode: AuthMode) => {
    setMode(newMode);
    setLocalError('');
    setSuccessMessage('');
  }, []);

  const handleSignIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }

    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    const { error: signInError } = await signInWithEmail(email, password);
    if (signInError) {
      // Provide clearer error messages
      let errorMessage = signInError.message || 'Invalid email or password';
      if (errorMessage.includes('Invalid login') || errorMessage.includes('invalid')) {
        errorMessage = 'Invalid email or password. If you just signed up, please verify your email first (check spam folder).';
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email before signing in. Check your inbox (and spam folder) for the verification link.';
      }
      setLocalError(errorMessage);
    } else {
      // Save or clear email based on Remember Me (password handled by browser)
      if (rememberMe) {
        saveEmail(email);
      } else {
        clearSavedEmail();
      }
    }
  }, [email, password, rememberMe, signInWithEmail]);

  const handleSignUp = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }

    if (!password) {
      setLocalError('Please enter a password');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    const { error: signUpError } = await signUp(email, password, fullName || undefined);

    if (signUpError) {
      // Provide clearer error messages for common Supabase errors
      let errorMessage = signUpError.message || 'Failed to create account';
      if (errorMessage.includes('already registered')) {
        errorMessage = 'This email is already registered. Try signing in or reset your password.';
      } else if (errorMessage.includes('valid email')) {
        errorMessage = 'Please enter a valid email address.';
      } else if (errorMessage.includes('password')) {
        errorMessage = 'Password must be at least 6 characters.';
      }
      setLocalError(errorMessage);
    } else {
      setSuccessMessage('Account created! Please check your email (including spam folder) to verify your account before signing in.');
      resetForm();
      // Switch to sign in mode after successful signup
      setTimeout(() => setMode('signin'), 3000);
    }
  }, [email, password, confirmPassword, fullName, signUp, resetForm]);

  const handleForgotPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccessMessage('');

    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }

    const { error: resetError } = await resetPassword(email);

    if (resetError) {
      setLocalError(resetError.message || 'Failed to send reset email');
    } else {
      setSuccessMessage('Password reset link sent! Please check your email.');
    }
  }, [email, resetPassword]);

  const handleGoogleSignIn = useCallback(async () => {
    setLocalError('');
    setOauthLoading('google');

    const { error: googleError } = await signInWithGoogle();

    if (googleError) {
      setLocalError(googleError.message || 'Failed to sign in with Google');
      setOauthLoading(null);
    }
    // On success, Supabase will redirect - no need to clear loading
  }, [signInWithGoogle]);

  const handleGitHubSignIn = useCallback(async () => {
    setLocalError('');
    setOauthLoading('github');

    const { error: githubError } = await signInWithGitHub();

    if (githubError) {
      setLocalError(githubError.message || 'Failed to sign in with GitHub');
      setOauthLoading(null);
    }
    // On success, Supabase will redirect - no need to clear loading
  }, [signInWithGitHub]);

  const displayError = localError || error;

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Create Account';
      case 'forgot': return 'Reset Password';
      default: return 'Welcome Back';
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case 'signup': return 'Join LIFE SCORE to compare cities';
      case 'forgot': return 'Enter your email to receive a reset link';
      default: return 'Sign in to access your account';
    }
  };

  return (
    <div className="login-screen">
      {/* Background Effects */}
      <div className="login-bg-effects">
        <div className="bg-gradient-1"></div>
        <div className="bg-gradient-2"></div>
        <div className="bg-grid"></div>
      </div>

      {/* Main Content */}
      <div className="login-container">
        {/* Brand Header */}
        <div className="login-brand">
          <div className="brand-icon">
            <span className="icon-inner">LS</span>
            <div className="icon-ring"></div>
          </div>
          <h1 className="brand-title">LIFE SCORE</h1>
          <p className="brand-tagline">Legal Independence & Freedom Evaluation</p>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <div className="card-header">
            <h2>{getTitle()}</h2>
            <p>{getSubtitle()}</p>
          </div>

          {/* Mode Tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => handleModeChange('signin')}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => handleModeChange('signup')}
            >
              Sign Up
            </button>
          </div>

          {/* Sign In Form */}
          {mode === 'signin' && (
            <form className="login-form" onSubmit={handleSignIn} autoComplete="on">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </span>
                  <input
                    type="email"
                    id="email"
                    name="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="username"
                    disabled={isLoading}
                    aria-required="true"
                    aria-invalid={!!displayError}
                    aria-describedby={displayError ? 'auth-error' : undefined}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    aria-required="true"
                    aria-invalid={!!displayError}
                    aria-describedby={displayError ? 'auth-error' : undefined}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="remember-forgot-row">
                <label className="remember-me-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="remember-me-checkbox"
                  />
                  <span className="remember-me-checkmark"></span>
                  <span className="remember-me-text">Remember me</span>
                </label>
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={() => handleModeChange('forgot')}
                >
                  Forgot your password?
                </button>
              </div>

              {displayError && (
                <div className="form-error" id="auth-error" role="alert">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  <span>{displayError}</span>
                </div>
              )}

              <button
                type="submit"
                className={`login-btn ${isLoading ? 'loading' : ''}`}
                disabled={isLoading || oauthLoading !== null}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                    </svg>
                  </>
                )}
              </button>

              {/* OAuth Divider */}
              {isConfigured && (
                <>
                  <div className="oauth-divider">
                    <span>or continue with</span>
                  </div>

                  {/* OAuth Buttons */}
                  <div className="oauth-buttons">
                    <button
                      type="button"
                      className={`oauth-btn google-btn ${oauthLoading === 'google' ? 'loading' : ''}`}
                      onClick={handleGoogleSignIn}
                      disabled={isLoading || oauthLoading !== null}
                    >
                      {oauthLoading === 'google' ? (
                        <span className="spinner"></span>
                      ) : (
                        <svg viewBox="0 0 24 24" width="20" height="20">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      className={`oauth-btn github-btn ${oauthLoading === 'github' ? 'loading' : ''}`}
                      onClick={handleGitHubSignIn}
                      disabled={isLoading || oauthLoading !== null}
                    >
                      {oauthLoading === 'github' ? (
                        <span className="spinner"></span>
                      ) : (
                        <svg viewBox="0 0 24 24" width="20" height="20">
                          <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      )}
                      <span>GitHub</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* Sign Up Form */}
          {mode === 'signup' && (
            <form className="login-form" onSubmit={handleSignUp}>
              <div className="form-group">
                <label htmlFor="fullName">Full Name (Optional)</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </span>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    autoComplete="name"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="signupEmail">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </span>
                  <input
                    type="email"
                    id="signupEmail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="signupPassword">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="signupPassword"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {displayError && (
                <div className="form-error" id="auth-error" role="alert">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  <span>{displayError}</span>
                </div>
              )}

              {successMessage && (
                <div className="form-success">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span>{successMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className={`login-btn ${isLoading ? 'loading' : ''}`}
                disabled={isLoading || oauthLoading !== null}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                    </svg>
                  </>
                )}
              </button>

              {/* OAuth Divider */}
              {isConfigured && (
                <>
                  <div className="oauth-divider">
                    <span>or sign up with</span>
                  </div>

                  {/* OAuth Buttons */}
                  <div className="oauth-buttons">
                    <button
                      type="button"
                      className={`oauth-btn google-btn ${oauthLoading === 'google' ? 'loading' : ''}`}
                      onClick={handleGoogleSignIn}
                      disabled={isLoading || oauthLoading !== null}
                    >
                      {oauthLoading === 'google' ? (
                        <span className="spinner"></span>
                      ) : (
                        <svg viewBox="0 0 24 24" width="20" height="20">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      <span>Google</span>
                    </button>

                    <button
                      type="button"
                      className={`oauth-btn github-btn ${oauthLoading === 'github' ? 'loading' : ''}`}
                      onClick={handleGitHubSignIn}
                      disabled={isLoading || oauthLoading !== null}
                    >
                      {oauthLoading === 'github' ? (
                        <span className="spinner"></span>
                      ) : (
                        <svg viewBox="0 0 24 24" width="20" height="20">
                          <path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                      )}
                      <span>GitHub</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <form className="login-form" onSubmit={handleForgotPassword}>
              <div className="form-group">
                <label htmlFor="resetEmail">Email Address</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </span>
                  <input
                    type="email"
                    id="resetEmail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {displayError && (
                <div className="form-error" id="auth-error" role="alert">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  <span>{displayError}</span>
                </div>
              )}

              {successMessage && (
                <div className="form-success">
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span>{successMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className={`login-btn ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Link</span>
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </>
                )}
              </button>

              <button
                type="button"
                className="back-to-signin"
                onClick={() => handleModeChange('signin')}
              >
                Back to Sign In
              </button>
            </form>
          )}

          {/* Configuration Warning */}
          {!isConfigured && (
            <div className="config-warning">
              <p>Supabase authentication is not configured. Using demo mode.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="login-footer">
          <div className="footer-brand">
            <span className="footer-logo">CLUES</span>
            <span className="footer-divider">|</span>
            <span className="footer-company">Clues Intelligence LTD</span>
          </div>
          <p className="footer-legal">Secure authentication powered by Supabase</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
