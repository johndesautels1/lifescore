/**
 * LIFE SCORE Header Component
 * Clues Intelligence LTD
 */

import React from 'react';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import { useTierAccess, TIER_NAMES } from '../hooks/useTierAccess';
import './Header.css';

interface HeaderProps {
  onUpgradeClick?: () => void;
  onCostDashboardClick?: () => void;
  onSettingsClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onUpgradeClick, onCostDashboardClick, onSettingsClick }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { tier } = useTierAccess();

  return (
    <header className="header" role="banner">
      <div className="header-container">
        {/* Theme Toggle - LEFT side */}
        <div className="header-left">
          <ThemeToggle />
        </div>

        {/* User Account - RIGHT side */}
        {isAuthenticated && user && (
          <div className="header-right">
            <div className="user-account">
              {/* Upgrade Button for Free Users */}
              {tier === 'free' && onUpgradeClick && (
                <button
                  className="upgrade-btn"
                  onClick={onUpgradeClick}
                  title="Upgrade to Premium"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                    <path fill="currentColor" d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                  </svg>
                  <span>Upgrade</span>
                </button>
              )}

              {/* Tier Badge for Paid Users */}
              {tier !== 'free' && (
                <div className="tier-badge" title={`${TIER_NAMES[tier]} Plan`}>
                  <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
                    <path fill="currentColor" d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                  </svg>
                  <span>{TIER_NAMES[tier]}</span>
                </div>
              )}

              {/* Admin Cost Dashboard Button */}
              {onCostDashboardClick && (
                <button
                  className="admin-btn"
                  onClick={onCostDashboardClick}
                  title="Cost Dashboard (Admin)"
                >
                  <span>💰</span>
                </button>
              )}

              {/* Settings Button */}
              {onSettingsClick && (
                <button
                  className="settings-btn"
                  onClick={onSettingsClick}
                  title="Account Settings"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                    <path fill="currentColor" d="M12 15.5A3.5 3.5 0 0 1 8.5 12 3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5 3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97 0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 14 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z"/>
                  </svg>
                  <span>Settings</span>
                </button>
              )}

              <div className="user-info">
                <span className="user-avatar">
                  {user.name.charAt(0).toUpperCase()}
                </span>
                <span className="user-name">{user.name}</span>
              </div>
              <button
                className="logout-btn"
                onClick={logout}
                title="Sign Out"
                aria-label="Sign Out"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                  <path fill="currentColor" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Company Name */}
        <h1 className="company-name">CLUES INTELLIGENCE LTD</h1>

        {/* CLUES Branding */}
        <div className="clues-branding">
          <span className="clues-logo">🔍🌍</span>
          <span className="clues-text">CLUES</span>
          <span className="clues-tagline">
            <span className="tagline-line1">Comprehensive Location Utility</span>
            <br className="tagline-break" />
            <span className="tagline-line2">& Evaluation System</span>
          </span>
        </div>

        {/* Contact Info */}
        <div className="header-contact">
          <a href="tel:7274523506">📞 (727) 452-3506</a>
          <a href="https://cluesnomad.com" target="_blank" rel="noopener noreferrer">
            🌐 cluesnomad.com
          </a>
        </div>

        {/* LIFE SCORE Title */}
        <div className="life-score-title">
          <h2>LIFE SCORE</h2>
          <p className="life-score-subtitle">Legal Independence & Freedom Evaluation</p>
          <p className="life-score-description">
            Compare legal &amp; lived freedom between any two cities worldwide across 100 comprehensive metrics
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;
