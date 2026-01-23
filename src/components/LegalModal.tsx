/**
 * Legal Modal Component
 * Displays Privacy Policy, Terms of Service, Cookie Policy
 */

import React from 'react';
import './LegalModal.css';

export type LegalPage = 'privacy' | 'terms' | 'cookies' | null;

interface LegalModalProps {
  page: LegalPage;
  onClose: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ page, onClose }) => {
  if (!page) return null;

  const titles: Record<string, string> = {
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    cookies: 'Cookie Policy',
  };

  return (
    <div className="legal-modal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal-header">
          <h2>{titles[page]}</h2>
          <button className="legal-modal-close" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="legal-modal-content">
          {page === 'privacy' && <PrivacyContent />}
          {page === 'terms' && <TermsContent />}
          {page === 'cookies' && <CookiesContent />}
        </div>
        <div className="legal-modal-footer">
          <p>Clues Intelligence LTD &bull; United Kingdom</p>
          <p>Contact: privacy@cluesintelligence.com</p>
        </div>
      </div>
    </div>
  );
};

// Privacy Policy Content
const PrivacyContent: React.FC = () => (
  <div className="legal-content">
    <p className="legal-effective">Effective Date: January 23, 2026</p>

    <h3>1. Introduction</h3>
    <p>
      Clues Intelligence LTD ("Clues," "we," "us," or "our") is committed to protecting your privacy.
      This Privacy Policy explains how we collect, use, disclose, and safeguard your information when
      you use our CLUES Comparison Reports services, including LIFE SCORE and future comparison products.
    </p>

    <h3>2. Information We Collect</h3>
    <h4>Account Information</h4>
    <p>Email address, name, and password (hashed) for account creation and authentication.</p>

    <h4>Comparison Data</h4>
    <p>Cities compared, saved reports, notes, and favorites to provide the service.</p>

    <h4>AI Conversations</h4>
    <p>Your conversations with Olivia AI assistant to provide personalized responses.</p>

    <h4>Automatically Collected</h4>
    <p>Usage data, device information, and cookies for service improvement and security.</p>

    <h3>3. How We Use Your Information</h3>
    <ul>
      <li>Provide and improve the Service</li>
      <li>Process payments via Stripe</li>
      <li>Send service communications</li>
      <li>Generate AI-powered comparison reports</li>
      <li>Comply with legal obligations</li>
    </ul>

    <h3>4. AI Processing</h3>
    <p>
      We use multiple AI providers (OpenAI, Anthropic, Google, xAI, Perplexity) to evaluate city comparisons.
      AI conversations may be used by providers to improve their models. We recommend not sharing
      sensitive personal information in AI conversations.
    </p>

    <h3>5. Data Sharing</h3>
    <p>
      We do not sell your personal data. We share data with service providers (Supabase, Vercel, Stripe,
      AI providers) only as necessary to provide the Service.
    </p>

    <h3>6. Your Rights</h3>
    <p><strong>UK/EU Residents (GDPR):</strong> Access, rectification, erasure, portability, restriction, and objection rights.</p>
    <p><strong>California Residents (CCPA):</strong> Know, delete, correct, and opt-out rights.</p>
    <p>Exercise rights via Account Settings or email privacy@cluesintelligence.com</p>

    <h3>7. Data Retention</h3>
    <p>
      Account data is retained until deletion + 30 days. Financial records are kept 7 years for legal compliance.
      Server logs are retained 90 days.
    </p>

    <h3>8. Security</h3>
    <p>
      We implement encryption in transit (TLS/HTTPS), encryption at rest, access controls, and regular security assessments.
    </p>

    <h3>9. Contact</h3>
    <p>
      Email: privacy@cluesintelligence.com<br />
      Supervisory Authority: UK Information Commissioner's Office (ico.org.uk)
    </p>

    <p className="legal-version">Document Version 1.0</p>
  </div>
);

// Terms of Service Content
const TermsContent: React.FC = () => (
  <div className="legal-content">
    <p className="legal-effective">Effective Date: January 23, 2026</p>

    <h3>1. Agreement to Terms</h3>
    <p>
      By using CLUES Comparison Reports services ("Service"), including LIFE SCORE, you agree to these Terms.
      If you do not agree, do not use the Service.
    </p>

    <h3>2. Description of Service</h3>
    <p>
      CLUES Comparison Reports uses AI to compare cities across various metrics. Features include city comparisons,
      AI-powered analysis, visual report generation, and the Olivia AI assistant.
    </p>
    <p className="legal-warning">
      <strong>Important:</strong> Reports are informational only. They do not constitute legal, financial,
      immigration, or professional advice. Always consult qualified professionals for important decisions.
    </p>

    <h3>3. User Accounts</h3>
    <ul>
      <li>You must be at least 16 years old</li>
      <li>Provide accurate information</li>
      <li>Maintain password security</li>
      <li>Accept responsibility for account activity</li>
    </ul>

    <h3>4. Acceptable Use</h3>
    <p><strong>You may:</strong> Use reports for personal/business decisions, share with colleagues, quote with attribution.</p>
    <p><strong>You may NOT:</strong> Resell reports, scrape data, reverse-engineer AI systems, use for illegal purposes.</p>

    <h3>5. Intellectual Property</h3>
    <p>
      Clues owns the software, algorithms, and methodology. You own your generated reports and notes.
      You grant us license to store and improve the Service with anonymized data.
    </p>

    <h3>6. AI Content Disclaimer</h3>
    <p>
      Reports are generated using AI which may produce inaccurate, incomplete, or outdated information.
      Results should be independently verified for important decisions.
    </p>

    <h3>7. Limitation of Liability</h3>
    <p>
      The Service is provided "AS IS." We are not liable for indirect, incidental, or consequential damages.
      Total liability is limited to amounts paid in the 12 months before the claim or £100, whichever is greater.
    </p>

    <h3>8. Governing Law</h3>
    <p>
      These Terms are governed by the laws of England and Wales. Courts of England and Wales have exclusive
      jurisdiction, except EU consumers may bring claims in their country of residence.
    </p>

    <h3>9. Changes</h3>
    <p>
      We may modify these Terms at any time. Continued use after changes constitutes acceptance.
    </p>

    <h3>10. Contact</h3>
    <p>Email: legal@cluesintelligence.com</p>

    <p className="legal-version">Document Version 1.0</p>
  </div>
);

// Cookie Policy Content
const CookiesContent: React.FC = () => (
  <div className="legal-content">
    <p className="legal-effective">Effective Date: January 23, 2026</p>

    <h3>1. What Are Cookies?</h3>
    <p>
      Cookies are small text files stored on your device when you visit websites. They help remember
      preferences, understand usage, and improve your experience.
    </p>

    <h3>2. Cookies We Use</h3>

    <h4>Essential Cookies (Always Active)</h4>
    <table className="legal-table">
      <thead>
        <tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr>
      </thead>
      <tbody>
        <tr><td>sb-*-auth-token</td><td>User authentication</td><td>Session</td></tr>
        <tr><td>__vercel_live_token</td><td>Deployment verification</td><td>Session</td></tr>
      </tbody>
    </table>

    <h4>Functional Cookies</h4>
    <table className="legal-table">
      <thead>
        <tr><th>Cookie</th><th>Purpose</th><th>Duration</th></tr>
      </thead>
      <tbody>
        <tr><td>theme</td><td>Light/dark mode preference</td><td>1 year</td></tr>
        <tr><td>cookieConsent</td><td>Remember cookie choices</td><td>1 year</td></tr>
      </tbody>
    </table>

    <h3>3. Third-Party Cookies</h3>
    <p>
      Some features may set cookies from Supabase (authentication), Vercel (hosting), and Stripe (payments).
      We do not control third-party cookies.
    </p>

    <h3>4. Managing Cookies</h3>
    <p>
      Use the "Cookie Settings" link in the footer to change preferences. You can also control cookies
      through your browser settings.
    </p>
    <p>
      <strong>Note:</strong> Blocking essential cookies may prevent the Service from working correctly.
    </p>

    <h3>5. Local Storage</h3>
    <p>
      We use browser local storage for saved comparisons, recent cities, and UI preferences.
      This data stays on your device.
    </p>

    <h3>6. Contact</h3>
    <p>Email: privacy@cluesintelligence.com</p>

    <p className="legal-version">Document Version 1.0</p>
  </div>
);

export default LegalModal;
