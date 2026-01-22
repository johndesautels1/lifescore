/**
 * LIFE SCORE Header Component
 * Clues Intelligence LTD
 */

import React from 'react';
import ThemeToggle from './ThemeToggle';
import { useAuth } from '../contexts/AuthContext';
import './Header.css';

export const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="header">
      <div className="header-container">
        {/* Theme Toggle + User Account */}
        <div className="header-actions">
          <ThemeToggle />

          {/* User Account Display */}
          {isAuthenticated && user && (
            <div className="user-account">
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
