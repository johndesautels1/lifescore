/**
 * Cookie Consent Banner
 * GDPR/CCPA compliant cookie consent management
 */

import React, { useState, useEffect } from 'react';
import './CookieConsent.css';

interface CookiePreferences {
  essential: boolean; // Always true, cannot be disabled
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  essential: true,
  functional: true,
  analytics: false,
  marketing: false,
  timestamp: '',
};

const STORAGE_KEY = 'clues_cookie_consent';
const ANONYMOUS_ID_KEY = 'clues_anonymous_id';

// Generate or retrieve anonymous ID for consent tracking
const getAnonymousId = (): string => {
  let id = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
};

// Log consent to database (non-blocking)
const logConsentToServer = async (
  action: 'granted' | 'denied' | 'withdrawn',
  categories: CookiePreferences
): Promise<void> => {
  try {
    await fetch('/api/consent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consentType: 'cookies',
        consentAction: action,
        consentCategories: {
          essential: categories.essential,
          functional: categories.functional,
          analytics: categories.analytics,
          marketing: categories.marketing,
        },
        anonymousId: getAnonymousId(),
        pageUrl: window.location.href,
        policyVersion: '1.0',
      }),
    });
  } catch (error) {
    // Silent fail - consent still works locally
    console.debug('[CookieConsent] Failed to log consent to server:', error);
  }
};

const CookieConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);

  // Check for existing consent on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CookiePreferences;
        setPreferences(parsed);
        // Don't show banner if consent already given
      } catch {
        setShowBanner(true);
      }
    } else {
      // No consent stored, show banner
      setShowBanner(true);
    }
  }, []);

  // Listen for settings open event from footer
  useEffect(() => {
    const handleOpenSettings = () => {
      setShowSettings(true);
      setShowBanner(true);
    };

    window.addEventListener('openCookieSettings', handleOpenSettings);
    return () => window.removeEventListener('openCookieSettings', handleOpenSettings);
  }, []);

  const savePreferences = (prefs: CookiePreferences, action: 'granted' | 'denied' = 'granted') => {
    const withTimestamp = { ...prefs, timestamp: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withTimestamp));
    setPreferences(withTimestamp);
    setShowBanner(false);
    setShowSettings(false);

    // Log consent to server (non-blocking)
    logConsentToServer(action, withTimestamp);
  };

  const handleAcceptAll = () => {
    savePreferences({
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      timestamp: '',
    });
  };

  const handleRejectNonEssential = () => {
    savePreferences({
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      timestamp: '',
    }, 'denied');
  };

  const handleSavePreferences = () => {
    savePreferences(preferences);
  };

  const togglePreference = (key: keyof CookiePreferences) => {
    if (key === 'essential' || key === 'timestamp') return; // Cannot toggle essential
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (!showBanner) return null;

  return (
    <div className="cookie-consent-overlay">
      <div className="cookie-consent-banner">
        {!showSettings ? (
          // Simple banner view
          <>
            <div className="cookie-consent-content">
              <div className="cookie-icon">🍪</div>
              <div className="cookie-text">
                <h3>We use cookies</h3>
                <p>
                  We use essential cookies for authentication and functionality.
                  With your consent, we may also use analytics cookies to improve our service.
                  <button
                    type="button"
                    className="cookie-learn-more"
                    onClick={() => setShowSettings(true)}
                  >
                    Learn more
                  </button>
                </p>
              </div>
            </div>
            <div className="cookie-consent-actions">
              <button
                type="button"
                className="cookie-btn cookie-btn-secondary"
                onClick={handleRejectNonEssential}
              >
                Essential Only
              </button>
              <button
                type="button"
                className="cookie-btn cookie-btn-secondary"
                onClick={() => setShowSettings(true)}
              >
                Customize
              </button>
              <button
                type="button"
                className="cookie-btn cookie-btn-primary"
                onClick={handleAcceptAll}
              >
                Accept All
              </button>
            </div>
          </>
        ) : (
          // Detailed settings view
          <>
            <div className="cookie-settings-header">
              <h3>Cookie Preferences</h3>
              <button
                type="button"
                className="cookie-settings-close"
                onClick={() => setShowSettings(false)}
              >
                &times;
              </button>
            </div>
            <div className="cookie-settings-content">
              <div className="cookie-category">
                <div className="cookie-category-header">
                  <div>
                    <h4>Essential Cookies</h4>
                    <p>Required for authentication and core functionality. Cannot be disabled.</p>
                  </div>
                  <div className="cookie-toggle cookie-toggle-disabled">
                    <span className="toggle-always-on">Always On</span>
                  </div>
                </div>
              </div>

              <div className="cookie-category">
                <div className="cookie-category-header">
                  <div>
                    <h4>Functional Cookies</h4>
                    <p>Remember your preferences like theme and language settings.</p>
                  </div>
                  <label className="cookie-toggle">
                    <input
                      type="checkbox"
                      checked={preferences.functional}
                      onChange={() => togglePreference('functional')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="cookie-category">
                <div className="cookie-category-header">
                  <div>
                    <h4>Analytics Cookies</h4>
                    <p>Help us understand how you use the service to improve it.</p>
                  </div>
                  <label className="cookie-toggle">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={() => togglePreference('analytics')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>

              <div className="cookie-category">
                <div className="cookie-category-header">
                  <div>
                    <h4>Marketing Cookies</h4>
                    <p>Used for targeted advertising. We currently do not use these.</p>
                  </div>
                  <label className="cookie-toggle">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={() => togglePreference('marketing')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
            <div className="cookie-settings-actions">
              <button
                type="button"
                className="cookie-btn cookie-btn-secondary"
                onClick={handleRejectNonEssential}
              >
                Reject All
              </button>
              <button
                type="button"
                className="cookie-btn cookie-btn-primary"
                onClick={handleSavePreferences}
              >
                Save Preferences
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Export helper to check consent
export const getCookieConsent = (): CookiePreferences | null => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as CookiePreferences;
  } catch {
    return null;
  }
};

export const hasAnalyticsConsent = (): boolean => {
  const consent = getCookieConsent();
  return consent?.analytics ?? false;
};

export default CookieConsent;
