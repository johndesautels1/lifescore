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
    <header className="header">
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
                  <svg viewBox="0 0 24 24" width="14" height="14">
                    <path fill="currentColor" d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
                  </svg>
                  <span>Upgrade</span>
                </button>
              )}

              {/* Tier Badge for Paid Users */}
              {tier !== 'free' && (
                <div className="tier-badge" title={`${TIER_NAMES[tier]} Plan`}>
                  <svg viewBox="0 0 24 24" width="12" height="12">
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
                  <svg viewBox="0 0 24 24" width="16" height="16">
                    <path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                  </svg>
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
              >
                <svg viewBox="0 0 24 24" width="16" height="16">
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
            Compare legal freedom between any two cities worldwide across 100 comprehensive metrics
          </p>
        </div>
      </div>
    </header>
  );
};

export default Header;
