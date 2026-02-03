/**
 * LIFE SCORE - Freedom Hero Footer Component
 *
 * Displays the AI-generated hero statement for each category tab.
 * Joyful summary of freedom advantages in the winning city.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React from 'react';
import type { FreedomHeroFooterProps } from '../types/freedomEducation';
import './FreedomHeroFooter.css';

// ============================================================================
// COMPONENT
// ============================================================================

const FreedomHeroFooter: React.FC<FreedomHeroFooterProps> = ({
  heroStatement,
  winnerCity,
  categoryName: _categoryName, // Reserved for future use
}) => {
  if (!heroStatement) {
    return null;
  }

  return (
    <div className="freedom-hero-footer">
      <div className="hero-glow"></div>
      <div className="hero-content">
        <div className="hero-icon">✨</div>
        <blockquote className="hero-statement">
          "{heroStatement}"
        </blockquote>
        <div className="hero-badge">
          <span className="badge-icon">🏆</span>
          <span className="badge-text">{winnerCity} Advantage</span>
        </div>
      </div>
    </div>
  );
};

export default FreedomHeroFooter;
