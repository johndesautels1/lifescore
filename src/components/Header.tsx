/**
 * LIFE SCORE Header Component
 * Clues Intelligence LTD
 */

import React from 'react';
import ThemeToggle from './ThemeToggle';
import './Header.css';

export const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-container">
        {/* Theme Toggle */}
        <div className="header-actions">
          <ThemeToggle />
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
