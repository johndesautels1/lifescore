/**
 * LIFE SCORE Footer Component
 * John E. Desautels & Associates
 */

import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>Company Information</h3>
          <p className="company-title">John E. Desautels & Associates</p>
          <p className="address">290 41st Ave</p>
          <p>St. Pete Beach, FL 33706</p>
          <p className="license">Licensed Real Estate Broker</p>
          <p>Florida & Colorado</p>
          <p className="experience">35+ Years Experience</p>
        </div>

        <div className="footer-section">
          <h3>Contact & Services</h3>
          <a href="tel:7274523506">📞 (727) 452-3506</a>
          <a href="mailto:cluesnomads@gmail.com">✉️ cluesnomads@gmail.com</a>
          <a href="mailto:brokerpinellas@gmail.com">✉️ brokerpinellas@gmail.com</a>
          <a href="https://cluesnomad.com" target="_blank" rel="noopener noreferrer">
            🌐 cluesnomad.com
          </a>
          <a href="https://youtube.com/@modernlodges" target="_blank" rel="noopener noreferrer">
            📺 YouTube: @modernlodges
          </a>
          <a href="https://www.facebook.com/johndesautels1/" target="_blank" rel="noopener noreferrer" className="facebook-link">
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
        <p>© {new Date().getFullYear()} John E. Desautels & Associates. All rights reserved.</p>
        <small>CLUES, SMART, and LIFE SCORE are trademarks of John E. Desautels & Associates</small>
        <p className="powered-by">
          <small>AI-Powered Global Relocation Intelligence Platform</small>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
