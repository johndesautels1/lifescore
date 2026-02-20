/**
 * LIFE SCORE - NotifyMeModal Component
 * Modal that appears when a user triggers a long-running task.
 * Offers "Wait Here" (current behavior) or "Notify Me & Go" (fire-and-forget).
 *
 * Clues Intelligence LTD
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { NotifyChannel } from '../types/database';
import './NotifyMeModal.css';

interface NotifyMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWaitHere: () => void;                                  // User wants to wait (current behavior)
  onNotifyMe: (channels: NotifyChannel[]) => void;         // User wants fire-and-forget
  taskLabel: string;                                        // e.g., "City Comparison", "Judge Verdict"
  estimatedSeconds?: number;                                // e.g., 90
}

const REMEMBER_KEY = 'lifescore_notify_preference';

export const NotifyMeModal: React.FC<NotifyMeModalProps> = ({
  isOpen,
  onClose,
  onWaitHere,
  onNotifyMe,
  taskLabel,
  estimatedSeconds = 90,
}) => {
  const { user } = useAuth();
  const [emailChecked, setEmailChecked] = useState(true);
  const [inAppChecked, setInAppChecked] = useState(true);
  const [rememberPreference, setRememberPreference] = useState(false);

  // Load saved preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) {
        const pref = JSON.parse(saved);
        if (pref.email !== undefined) setEmailChecked(pref.email);
        if (pref.inApp !== undefined) setInAppChecked(pref.inApp);
        if (pref.remember) setRememberPreference(true);
      }
    } catch { /* ignore */ }
  }, []);

  if (!isOpen) return null;

  const handleWaitHere = () => {
    onWaitHere();
    onClose();
  };

  const handleNotifyMe = () => {
    const channels: NotifyChannel[] = [];
    if (inAppChecked) channels.push('in_app');
    if (emailChecked) channels.push('email');
    // Always include in_app as fallback
    if (channels.length === 0) channels.push('in_app');

    // Save preference if requested
    if (rememberPreference) {
      try {
        localStorage.setItem(REMEMBER_KEY, JSON.stringify({
          email: emailChecked,
          inApp: inAppChecked,
          remember: true,
        }));
      } catch { /* ignore */ }
    }

    onNotifyMe(channels);
    onClose();
  };

  const estimatedLabel = estimatedSeconds >= 60
    ? `about ${Math.round(estimatedSeconds / 60)} minute${estimatedSeconds >= 120 ? 's' : ''}`
    : `about ${estimatedSeconds} seconds`;

  return (
    <div className="notify-modal-overlay" onClick={onClose}>
      <div className="notify-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="notify-modal-header">
          <h3>How should we notify you?</h3>
          <button className="notify-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        <div className="notify-modal-body">
          <p className="notify-modal-estimate">
            <strong>{taskLabel}</strong> takes {estimatedLabel}.
          </p>

          <div className="notify-options">
            <label className="notify-option">
              <input
                type="checkbox"
                checked={emailChecked}
                onChange={e => setEmailChecked(e.target.checked)}
              />
              <span className="notify-option-icon">📧</span>
              <span className="notify-option-label">
                Email
                {user?.email && <span className="notify-option-detail">({user.email})</span>}
              </span>
            </label>

            <label className="notify-option">
              <input
                type="checkbox"
                checked={inAppChecked}
                onChange={e => setInAppChecked(e.target.checked)}
              />
              <span className="notify-option-icon">🔔</span>
              <span className="notify-option-label">In-App Notification</span>
            </label>
          </div>

          <label className="notify-remember">
            <input
              type="checkbox"
              checked={rememberPreference}
              onChange={e => setRememberPreference(e.target.checked)}
            />
            <span>Remember my preference</span>
          </label>
        </div>

        <div className="notify-modal-actions">
          <button className="notify-btn-wait" onClick={handleWaitHere}>
            Wait Here
          </button>
          <button className="notify-btn-go" onClick={handleNotifyMe}>
            Notify Me &amp; Go
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotifyMeModal;
