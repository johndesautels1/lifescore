/**
 * LIFE SCORE - Settings Modal
 * User account management: profile, password, preferences
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTierAccess, TIER_NAMES } from '../hooks/useTierAccess';
import { supabase } from '../lib/supabase';
import type { LLMAPIKeys } from '../types/enhancedComparison';
import { getStoredAPIKeys, saveAPIKeys } from '../services/enhancedComparison';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeClick?: () => void;
}

type SettingsTab = 'profile' | 'security' | 'subscription' | 'api-keys' | 'data';

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onUpgradeClick }) => {
  const { user, profile, updateProfile, isConfigured } = useAuth();
  const { tier } = useTierAccess();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Profile state
  const [fullName, setFullName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // API Keys state
  const [apiKeys, setApiKeys] = useState<LLMAPIKeys>(getStoredAPIKeys());
  const [apiKeysSaved, setApiKeysSaved] = useState(false);

  // Data management state
  const [storageUsage, setStorageUsage] = useState<{ used: number; percentage: number }>({ used: 0, percentage: 0 });
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);

  // Calculate localStorage usage
  const calculateStorageUsage = useCallback(() => {
    let totalChars = 0;
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        // Include key length + value length
        totalChars += key.length + (localStorage.getItem(key)?.length || 0);
      }
    }
    // localStorage stores UTF-16 strings: each character = 2 bytes
    const totalBytes = totalChars * 2;
    // localStorage limit is ~5MB (5,242,880 bytes) in most browsers
    const maxStorage = 5 * 1024 * 1024;
    const percentage = Math.round((totalBytes / maxStorage) * 100);
    setStorageUsage({ used: totalBytes, percentage: Math.min(percentage, 100) });
  }, []);

  // Clear all LIFE SCORE local data
  const handleClearLocalData = useCallback(() => {
    const keysToRemove = [
      'lifescore_saved_enhanced',
      'lifescore_saved_comparisons',
      'lifescore_saved_gamma_reports',
      'lifescore_judge_reports',
      'lifescore_court_orders',
    ];
    keysToRemove.forEach(key => localStorage.removeItem(key));
    setShowClearConfirm(false);
    setClearSuccess(true);
    calculateStorageUsage();
    setTimeout(() => setClearSuccess(false), 3000);
  }, [calculateStorageUsage]);

  // Calculate storage on mount and tab switch
  useEffect(() => {
    if (activeTab === 'data') {
      calculateStorageUsage();
    }
  }, [activeTab, calculateStorageUsage]);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFullName(user.name || '');
    }
  }, [user]);

  // Clear messages when switching tabs
  useEffect(() => {
    setProfileSuccess('');
    setProfileError('');
    setPasswordSuccess('');
    setPasswordError('');
    setApiKeysSaved(false);
  }, [activeTab]);

  // Handle API keys save
  const handleSaveApiKeys = useCallback(() => {
    saveAPIKeys(apiKeys);
    setApiKeysSaved(true);
    // Clear saved message after 3 seconds
    setTimeout(() => setApiKeysSaved(false), 3000);
  }, [apiKeys]);

  // Handle profile update
  const handleProfileUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    if (!fullName.trim()) {
      setProfileError('Name cannot be empty');
      setProfileLoading(false);
      return;
    }

    const { error } = await updateProfile({ full_name: fullName.trim() });

    if (error) {
      setProfileError(error.message || 'Failed to update profile');
    } else {
      setProfileSuccess('Profile updated successfully');
    }

    setProfileLoading(false);
  }, [fullName, updateProfile]);

  // Handle password change
  const handlePasswordChange = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');

    if (!isConfigured) {
      setPasswordError('Password change not available in demo mode');
      setPasswordLoading(false);
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      setPasswordLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      setPasswordLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setPasswordError(error.message || 'Failed to update password');
      } else {
        setPasswordSuccess('Password updated successfully');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPasswordError('An unexpected error occurred');
    }

    setPasswordLoading(false);
  }, [newPassword, confirmPassword, isConfigured]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // FIX #52: Prevent background scroll when modal is open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-header">
          <h2>Account Settings</h2>
          <button className="settings-close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            <span>Profile</span>
          </button>
          <button
            className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
            </svg>
            <span>Security</span>
          </button>
          <button
            className={`settings-tab ${activeTab === 'subscription' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscription')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
            </svg>
            <span>Subscription</span>
          </button>
          <button
            className={`settings-tab ${activeTab === 'api-keys' ? 'active' : ''}`}
            onClick={() => setActiveTab('api-keys')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
            </svg>
            <span>API Keys</span>
          </button>
          <button
            className={`settings-tab ${activeTab === 'data' ? 'active' : ''}`}
            onClick={() => setActiveTab('data')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path fill="currentColor" d="M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z"/>
            </svg>
            <span>Data</span>
          </button>
        </div>

        {/* Content */}
        <div className="settings-content">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form className="settings-form" onSubmit={handleProfileUpdate}>
              <div className="settings-section">
                <h3>Profile Information</h3>

                {/* Avatar */}
                <div className="avatar-section">
                  <div className="avatar-display">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user.name} />
                    ) : (
                      <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <div className="avatar-info">
                    <p className="avatar-email">{user?.email}</p>
                    <p className="avatar-joined">Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>

                {/* Full Name */}
                <div className="form-field">
                  <label htmlFor="fullName">Full Name</label>
                  <input
                    type="text"
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    disabled={profileLoading}
                  />
                </div>

                {/* Email (read-only) */}
                <div className="form-field">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="readonly"
                  />
                  <p className="field-hint">Contact support to change your email address</p>
                </div>

                {profileError && (
                  <div className="settings-error">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <span>{profileError}</span>
                  </div>
                )}

                {profileSuccess && (
                  <div className="settings-success">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>{profileSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className={`settings-btn primary ${profileLoading ? 'loading' : ''}`}
                  disabled={profileLoading}
                >
                  {profileLoading ? (
                    <>
                      <span className="spinner"></span>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <form className="settings-form" onSubmit={handlePasswordChange}>
              <div className="settings-section">
                <h3>Change Password</h3>

                {!isConfigured && (
                  <div className="settings-warning">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                    </svg>
                    <span>Password management is not available in demo mode</span>
                  </div>
                )}

                <div className="form-field">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    disabled={passwordLoading || !isConfigured}
                    minLength={6}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    disabled={passwordLoading || !isConfigured}
                  />
                </div>

                {passwordError && (
                  <div className="settings-error">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="settings-success">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className={`settings-btn primary ${passwordLoading ? 'loading' : ''}`}
                  disabled={passwordLoading || !isConfigured}
                >
                  {passwordLoading ? (
                    <>
                      <span className="spinner"></span>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>

              <div className="settings-section">
                <h3>Connected Accounts</h3>
                <p className="section-description">
                  Sign in methods linked to your account
                </p>

                <div className="connected-accounts">
                  <div className="connected-account">
                    <div className="account-icon email">
                      <svg viewBox="0 0 24 24" width="20" height="20">
                        <path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                      </svg>
                    </div>
                    <div className="account-info">
                      <span className="account-name">Email</span>
                      <span className="account-value">{user?.email}</span>
                    </div>
                    <span className="account-status connected">Connected</span>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="settings-form">
              <div className="settings-section">
                <h3>Current Plan</h3>

                <div className="subscription-card">
                  <div className="subscription-tier">
                    <div className={`tier-badge ${tier}`}>
                      <svg viewBox="0 0 24 24" width="24" height="24">
                        <path fill="currentColor" d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                      </svg>
                      <span>{TIER_NAMES[tier]}</span>
                    </div>
                    {tier === 'free' && (
                      <p className="tier-description">
                        Basic access with limited features. Upgrade to unlock more.
                      </p>
                    )}
                    {tier === 'pro' && (
                      <p className="tier-description">
                        NAVIGATOR plan with enhanced features and monthly allocations.
                      </p>
                    )}
                    {tier === 'enterprise' && (
                      <p className="tier-description tier-sovereign">
                        SOVEREIGN plan with full access to all features.
                      </p>
                    )}
                  </div>

                  {tier === 'free' && onUpgradeClick && (
                    <button
                      type="button"
                      className="settings-btn primary upgrade"
                      onClick={() => {
                        onClose();
                        onUpgradeClick();
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18">
                        <path fill="currentColor" d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                      </svg>
                      <span>Upgrade Plan</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="settings-section">
                <h3>Plan Features</h3>

                <div className="features-list">
                  <div className="feature-item">
                    <svg viewBox="0 0 24 24" width="16" height="16" className="check">
                      <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    <span>City comparisons</span>
                  </div>
                  <div className="feature-item">
                    <svg viewBox="0 0 24 24" width="16" height="16" className="check">
                      <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                    <span>100 freedom metrics</span>
                  </div>
                  <div className={`feature-item ${tier === 'free' ? 'disabled' : ''}`}>
                    <svg viewBox="0 0 24 24" width="16" height="16" className={tier !== 'free' ? 'check' : 'x'}>
                      {tier !== 'free' ? (
                        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      ) : (
                        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      )}
                    </svg>
                    <span>Olivia AI Assistant</span>
                  </div>
                  <div className={`feature-item ${tier === 'free' ? 'disabled' : ''}`}>
                    <svg viewBox="0 0 24 24" width="16" height="16" className={tier !== 'free' ? 'check' : 'x'}>
                      {tier !== 'free' ? (
                        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      ) : (
                        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      )}
                    </svg>
                    <span>Gamma visual reports</span>
                  </div>
                  <div className={`feature-item ${tier !== 'enterprise' ? 'disabled' : ''}`}>
                    <svg viewBox="0 0 24 24" width="16" height="16" className={tier === 'enterprise' ? 'check' : 'x'}>
                      {tier === 'enterprise' ? (
                        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      ) : (
                        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      )}
                    </svg>
                    <span>Enhanced mode (5 LLMs)</span>
                  </div>
                  <div className={`feature-item ${tier !== 'enterprise' ? 'disabled' : ''}`}>
                    <svg viewBox="0 0 24 24" width="16" height="16" className={tier === 'enterprise' ? 'check' : 'x'}>
                      {tier === 'enterprise' ? (
                        <path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      ) : (
                        <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      )}
                    </svg>
                    <span>Judge video verdicts</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API Keys Tab */}
          {activeTab === 'api-keys' && (
            <div className="settings-form">
              <div className="settings-section">
                <h3>LLM API Keys</h3>
                <p className="section-description">
                  Configure your API keys to enable enhanced multi-LLM comparison.
                  Keys are stored locally in your browser.
                </p>

                <div className="api-key-list">
                  <div className="api-key-group">
                    <label>
                      <span className="key-icon">🎭</span>
                      Anthropic (Claude)
                    </label>
                    <input
                      type="password"
                      value={apiKeys.anthropic || ''}
                      onChange={e => setApiKeys({ ...apiKeys, anthropic: e.target.value })}
                      placeholder="sk-ant-..."
                    />
                    <span className="key-models">Claude Opus 4.5 (Judge), Sonnet 4.5</span>
                  </div>

                  <div className="api-key-group">
                    <label>
                      <span className="key-icon">🤖</span>
                      OpenAI
                    </label>
                    <input
                      type="password"
                      value={apiKeys.openai || ''}
                      onChange={e => setApiKeys({ ...apiKeys, openai: e.target.value })}
                      placeholder="sk-..."
                    />
                    <span className="key-models">GPT-4o</span>
                  </div>

                  <div className="api-key-group">
                    <label>
                      <span className="key-icon">💎</span>
                      Gemini
                    </label>
                    <input
                      type="password"
                      value={apiKeys.gemini || ''}
                      onChange={e => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                      placeholder="AI..."
                    />
                    <span className="key-models">Gemini 3 Pro</span>
                  </div>

                  <div className="api-key-group">
                    <label>
                      <span className="key-icon">𝕏</span>
                      xAI
                    </label>
                    <input
                      type="password"
                      value={apiKeys.xai || ''}
                      onChange={e => setApiKeys({ ...apiKeys, xai: e.target.value })}
                      placeholder="xai-..."
                    />
                    <span className="key-models">Grok 4</span>
                  </div>

                  <div className="api-key-group">
                    <label>
                      <span className="key-icon">🔮</span>
                      Perplexity
                    </label>
                    <input
                      type="password"
                      value={apiKeys.perplexity || ''}
                      onChange={e => setApiKeys({ ...apiKeys, perplexity: e.target.value })}
                      placeholder="pplx-..."
                    />
                    <span className="key-models">Sonar Reasoning Pro</span>
                  </div>

                  <div className="api-key-group optional">
                    <label>
                      <span className="key-icon">🔍</span>
                      Tavily (Optional)
                    </label>
                    <input
                      type="password"
                      value={apiKeys.tavily || ''}
                      onChange={e => setApiKeys({ ...apiKeys, tavily: e.target.value })}
                      placeholder="tvly-..."
                    />
                    <span className="key-models">Web search for Claude (enhances accuracy)</span>
                  </div>
                </div>

                {apiKeysSaved && (
                  <div className="settings-success">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>API keys saved successfully</span>
                  </div>
                )}

                <button
                  type="button"
                  className="settings-btn primary"
                  onClick={handleSaveApiKeys}
                >
                  <span>Save API Keys</span>
                </button>
              </div>

              <div className="settings-section">
                <h3>How It Works</h3>
                <p className="section-description">
                  Enhanced mode uses 5 different AI providers to evaluate each metric,
                  then Claude Opus synthesizes a final verdict as the Judge.
                </p>
                <div className="api-key-info">
                  <p><strong>SOVEREIGN tier required</strong> for Enhanced Mode (5 LLMs)</p>
                  <p>Your keys are stored only in your browser's local storage and never sent to our servers.</p>
                </div>
              </div>
            </div>
          )}

          {/* Data Tab */}
          {activeTab === 'data' && (
            <div className="settings-panel">
              <div className="settings-section">
                <h3>Local Storage Usage</h3>
                <p className="section-description">
                  LIFE SCORE stores your saved comparisons and reports in your browser's local storage.
                </p>

                <div className="storage-meter">
                  <div className="storage-bar">
                    <div
                      className={`storage-fill ${storageUsage.percentage > 80 ? 'warning' : ''} ${storageUsage.percentage > 95 ? 'critical' : ''}`}
                      style={{ width: `${storageUsage.percentage}%` }}
                    />
                  </div>
                  <div className="storage-text">
                    <span>{(storageUsage.used / 1024 / 1024).toFixed(2)} MB used</span>
                    <span>{storageUsage.percentage}% of 5 MB</span>
                  </div>
                </div>

                {storageUsage.percentage > 80 && (
                  <div className="storage-warning">
                    ⚠️ Storage is almost full. Consider clearing old data to prevent issues.
                  </div>
                )}
              </div>

              <div className="settings-section">
                <h3>Clear Local Data</h3>
                <p className="section-description">
                  Delete all locally stored comparisons, reports, and cached data.
                  Data synced to your account will remain in the cloud.
                </p>

                {!showClearConfirm ? (
                  <button
                    type="button"
                    className="settings-btn danger"
                    onClick={() => setShowClearConfirm(true)}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                    <span>Clear All Local Data</span>
                  </button>
                ) : (
                  <div className="clear-confirm">
                    <p className="confirm-text">Are you sure? This will delete all locally saved comparisons and reports.</p>
                    <div className="confirm-buttons">
                      <button
                        type="button"
                        className="settings-btn secondary"
                        onClick={() => setShowClearConfirm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="settings-btn danger"
                        onClick={handleClearLocalData}
                      >
                        Yes, Clear Everything
                      </button>
                    </div>
                  </div>
                )}

                {clearSuccess && (
                  <div className="settings-success">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <span>Local data cleared successfully</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
