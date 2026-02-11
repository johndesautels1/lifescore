/**
 * LIFE SCORE Footer Component
 * Clues Intelligence LTD
 */

import React from 'react';
import type { LegalPage } from './LegalModal';
import './Footer.css';

interface FooterProps {
  onOpenLegal?: (page: LegalPage) => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenLegal }) => {
  const handleLegalClick = (page: LegalPage) => (e: React.MouseEvent) => {
    e.preventDefault();
    onOpenLegal?.(page);
  };

  return (
    <footer className="footer" aria-label="Site footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>Company Information</h3>
          <p className="company-title">Clues Intelligence LTD</p>
          <p className="tagline">AI-Powered Global Relocation Intelligence</p>
          <p className="founder">Founded by John E. Desautels</p>
          <p className="experience">35+ Years Real Estate Experience</p>
        </div>

        <div className="footer-section">
          <h3>Contact & Services</h3>
          <a href="tel:7274523506">📞 (727) 452-3506</a>
          <a href="mailto:cluesnomads@gmail.com">✉️ cluesnomads@gmail.com</a>
          <a href="mailto:brokerpinellas@gmail.com">✉️ brokerpinellas@gmail.com</a>
          <a href="https://cluesnomad.com" target="_blank" rel="noopener noreferrer" aria-label="cluesnomad.com (opens in new window)">
            🌐 cluesnomad.com
          </a>
          <a href="https://youtube.com/@modernlodges" target="_blank" rel="noopener noreferrer" aria-label="YouTube: @modernlodges (opens in new window)">
            📺 YouTube: @modernlodges
          </a>
          <a href="https://www.facebook.com/johndesautels1/" target="_blank" rel="noopener noreferrer" className="facebook-link" aria-label="Facebook (opens in new window)">
            <span className="facebook-icon">f</span> Facebook
          </a>
        </div>

        <div className="footer-section">
          <h3>Proprietary Technology</h3>
          <div className="footer-tech">
            <p className="tech-name">CLUES</p>
            <small>Comprehensive Location Utility & Evaluation System</small>
          </div>
          <div className="footer-tech">
            <p className="tech-name">SMART</p>
            <small>Strategic Market Assessment & Rating Technology</small>
          </div>
          <div className="footer-tech">
            <p className="tech-name">LIFE SCORE</p>
            <small>Legal Independence & Freedom Evaluation</small>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Clues Intelligence LTD. All rights reserved.</p>

        <div className="footer-legal-links">
          <button type="button" className="legal-link" onClick={handleLegalClick('privacy')}>
            Privacy
          </button>
          <span className="legal-separator">|</span>
          <button type="button" className="legal-link" onClick={handleLegalClick('terms')}>
            Terms
          </button>
          <span className="legal-separator">|</span>
          <button type="button" className="legal-link" onClick={handleLegalClick('cookies')}>
            Cookies
          </button>
          <span className="legal-separator">|</span>
          <button type="button" className="legal-link" onClick={handleLegalClick('acceptable-use')}>
            Acceptable Use
          </button>
          <span className="legal-separator">|</span>
          <button type="button" className="legal-link" onClick={handleLegalClick('refunds')}>
            Refunds
          </button>
          <span className="legal-separator">|</span>
          <button
            type="button"
            className="legal-link cookie-settings-btn"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('openCookieSettings'));
            }}
          >
            Cookie Settings
          </button>
        </div>

        <small>CLUES, SMART, and LIFE SCORE are trademarks of Clues Intelligence LTD</small>
        <p className="powered-by">
          <small>AI-Powered Global Relocation Intelligence Platform</small>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
