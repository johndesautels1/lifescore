/**
 * Mobile Warning Modal
 * Shows a one-time warning to mobile users that LIFE SCORE
 * is best experienced on desktop. Dismisses permanently via localStorage.
 */

import React, { useState, useEffect } from 'react';
import './MobileWarningModal.css';

const STORAGE_KEY = 'lifescore_mobile_warning_dismissed';
const MOBILE_BREAKPOINT = 768;

const MobileWarningModal: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Already dismissed?
    if (localStorage.getItem(STORAGE_KEY)) return;

    // Check viewport width (not user-agent — more reliable)
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    if (isMobile) {
      // Small delay so the page loads first
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="mobile-warning-overlay" onClick={dismiss} role="dialog" aria-modal="true">
      <div className="mobile-warning-card" onClick={e => e.stopPropagation()}>

        <div className="mobile-warning-icon">&#128187;</div>

        <h2 className="mobile-warning-title">Desktop Recommended</h2>

        <p className="mobile-warning-body">
          LIFE SCORE compares <strong>100 freedom metrics</strong> across cities
          with multi-LLM analysis, interactive charts, and detailed judge reports.
          For the best experience, visit us on a desktop or laptop.
        </p>

        <p className="mobile-warning-sub">
          You can still browse on mobile — some features may be limited.
        </p>

        <button className="mobile-warning-btn" onClick={dismiss}>
          Got It — Continue on Mobile
        </button>
      </div>
    </div>
  );
};

export default MobileWarningModal;
