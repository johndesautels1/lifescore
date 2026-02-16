/**
 * LIFE SCORE - Reset Password Screen
 *
 * Shown when a user clicks the password reset link from their email.
 * Supabase fires PASSWORD_RECOVERY, and this form lets them set a new password.
 * Reuses LoginScreen.css for consistent styling.
 */

import React, { useState, useCallback } from 'react';
import type { AuthError } from '@supabase/supabase-js';
import './LoginScreen.css';

interface ResetPasswordScreenProps {
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  clearPasswordRecovery: () => void;
}

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ updatePassword, clearPasswordRecovery }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    const { error: updateError } = await updatePassword(password);
    setIsLoading(false);

    if (updateError) {
      setError(updateError.message || 'Failed to update password');
    } else {
      setSuccess(true);
      // Redirect to main app after short delay
      setTimeout(() => {
        clearPasswordRecovery();
      }, 2000);
    }
  }, [password, confirmPassword, updatePassword, clearPasswordRecovery]);

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

        {/* Reset Card */}
        <div className="login-card">
          <div className="card-header">
            <h2>Set New Password</h2>
            <p>Enter your new password below</p>
          </div>

          {success ? (
            <div className="login-form">
              <div className="form-success">
                <svg viewBox="0 0 24 24" width="16" height="16">
                  <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>Password updated successfully! Redirecting...</span>
              </div>
            </div>
          ) : (
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="newPassword"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    disabled={isLoading}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? '\u{1F441}\uFE0F' : '\u{1F441}\uFE0F\u200D\u{1F5E8}\uFE0F'}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmNewPassword">Confirm New Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="confirmNewPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    autoComplete="new-password"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {error && (
                <div className="form-error" role="alert">
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                  </svg>
                  <span>{error}</span>
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
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Update Password</span>
                    <svg viewBox="0 0 24 24" width="18" height="18">
                      <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
                    </svg>
                  </>
                )}
              </button>

              <button
                type="button"
                className="back-to-signin"
                onClick={clearPasswordRecovery}
              >
                Skip — go to app
              </button>
            </form>
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

export default ResetPasswordScreen;
