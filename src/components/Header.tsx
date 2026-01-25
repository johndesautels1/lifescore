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
}

export const Header: React.FC<HeaderProps> = ({ onUpgradeClick, onCostDashboardClick }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { tier } = useTierAccess();

  return (
    <header className="header">
      <div className="header-container">
        {/* Theme Toggle + User Account */}
        <div className="header-actions">
          <ThemeToggle />

          {/* User Account Display */}
          {isAuthenticated && user && (
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
          )}
        </div>

        {/* Company Name */}
        <h1 className="company-name">CLUES INTELLIGENCE LTD</h1>

        {/* CLUES Branding */}
        <div className="clues-branding">
          <span className="clues-logo">🔍🌍</span>
          <span className="clues-text">CLUES</span>
          <span className="clues-tagline">Comprehensive Location Utility & Evaluation System</span>
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
