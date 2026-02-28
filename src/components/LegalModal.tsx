/**
 * Legal Modal Component
 * Displays Privacy Policy, Terms of Service, Cookie Policy
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LegalModal.css';

export type LegalPage = 'privacy' | 'terms' | 'cookies' | 'acceptable-use' | 'refunds' | 'do-not-sell' | null;

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
    'acceptable-use': 'Acceptable Use Policy',
    refunds: 'Refund Policy',
    'do-not-sell': 'Do Not Sell or Share My Personal Information',
  };

  return (
    <div className="legal-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Legal Information">
      <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal-header">
          <h2>{titles[page]}</h2>
          <button className="legal-modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="legal-modal-content">
          {page === 'privacy' && <PrivacyContent />}
          {page === 'terms' && <TermsContent />}
          {page === 'cookies' && <CookiesContent />}
          {page === 'acceptable-use' && <AcceptableUseContent />}
          {page === 'refunds' && <RefundContent />}
          {page === 'do-not-sell' && <DoNotSellContent />}
        </div>
        <div className="legal-modal-footer">
          <p>Clues Intelligence LTD &bull; United Kingdom</p>
          <p>Contact: cluesnomads@gmail.com</p>
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
    <p><strong>California Residents (CCPA/CPRA):</strong></p>
    <ul>
      <li><strong>Right to Know</strong> what personal information we collect and how it's used</li>
      <li><strong>Right to Delete</strong> your personal information</li>
      <li><strong>Right to Correct</strong> inaccurate personal information</li>
      <li><strong>Right to Opt-Out</strong> of the sale or sharing of personal information</li>
      <li><strong>Right to Non-Discrimination</strong> for exercising your rights</li>
    </ul>
    <p>
      <strong>We do not sell your personal information.</strong> To opt out of sharing,
      click "Do Not Sell or Share My Personal Information" in the site footer.
    </p>
    <p>Exercise other rights via Account Settings or email cluesnomads@gmail.com</p>

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
      Email: cluesnomads@gmail.com<br />
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
    <p>Email: cluesnomads@gmail.com</p>

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
    <p>Email: cluesnomads@gmail.com</p>

    <p className="legal-version">Document Version 1.0</p>
  </div>
);

// Acceptable Use Policy Content
const AcceptableUseContent: React.FC = () => (
  <div className="legal-content">
    <p className="legal-effective">Effective Date: January 23, 2026</p>

    <h3>1. Permitted Uses</h3>
    <p>You MAY use the Service to:</p>
    <ul>
      <li>Compare cities for personal relocation decisions</li>
      <li>Research locations for business expansion</li>
      <li>Generate reports for internal business use</li>
      <li>Share reports with family, colleagues, or advisors</li>
      <li>Quote reports with attribution to "CLUES Intelligence"</li>
    </ul>

    <h3>2. Prohibited Uses</h3>

    <h4>Illegal Activities</h4>
    <ul>
      <li>Violate any applicable laws or regulations</li>
      <li>Facilitate illegal immigration or visa fraud</li>
      <li>Plan or execute illegal activities</li>
    </ul>

    <h4>Commercial Misuse</h4>
    <ul>
      <li>Resell or redistribute reports for profit</li>
      <li>Create derivative products for sale</li>
      <li>Scrape or bulk-download content</li>
      <li>Use automated tools (bots) to access the Service</li>
    </ul>

    <h4>System Abuse</h4>
    <ul>
      <li>Attempt to reverse-engineer our AI systems</li>
      <li>Circumvent rate limits or access controls</li>
      <li>Exploit security vulnerabilities</li>
      <li>Interfere with other users' access</li>
    </ul>

    <h4>Misrepresentation</h4>
    <ul>
      <li>Present AI content as official government data</li>
      <li>Claim reports are legal/financial advice</li>
      <li>Impersonate other users or staff</li>
    </ul>

    <h3>3. Enforcement</h3>
    <table className="legal-table">
      <thead>
        <tr><th>Severity</th><th>Action</th></tr>
      </thead>
      <tbody>
        <tr><td>Minor violation</td><td>Warning email</td></tr>
        <tr><td>Moderate violation</td><td>Temporary suspension</td></tr>
        <tr><td>Severe violation</td><td>Immediate termination</td></tr>
      </tbody>
    </table>

    <h3>4. Reporting Violations</h3>
    <p>Email: cluesnomads@gmail.com</p>

    <p className="legal-version">Document Version 1.0</p>
  </div>
);

// Refund Policy Content
const RefundContent: React.FC = () => (
  <div className="legal-content">
    <p className="legal-effective">Effective Date: January 23, 2026</p>

    <h3>1. Subscription Refunds</h3>

    <h4>Monthly Subscriptions</h4>
    <ul>
      <li>Cancel anytime - no refund for current month</li>
      <li>Access continues until period ends</li>
      <li>Billing errors are fully refunded</li>
    </ul>

    <h4>Annual Subscriptions</h4>
    <ul>
      <li>Cancel within 14 days - full refund (minus reports generated)</li>
      <li>Cancel after 14 days - no refund, access continues</li>
      <li>Billing errors are fully refunded</li>
    </ul>

    <h3>2. Report Purchase Refunds</h3>
    <p className="legal-warning">
      <strong>No refunds after report generation.</strong> Once generated, AI processing
      costs are incurred and the report is immediately available.
    </p>

    <h4>Exceptions</h4>
    <ul>
      <li>Failed generation due to our error - automatic credit or refund</li>
      <li>Significant errors - contact support within 7 days</li>
    </ul>

    <h3>3. How to Request a Refund</h3>
    <p><strong>Self-Service:</strong> Account Settings → Billing → Request Refund</p>
    <p><strong>Email:</strong> cluesnomads@gmail.com</p>

    <h4>Processing Time</h4>
    <table className="legal-table">
      <thead>
        <tr><th>Method</th><th>Response</th><th>Refund</th></tr>
      </thead>
      <tbody>
        <tr><td>Self-service</td><td>Immediate</td><td>5-10 business days</td></tr>
        <tr><td>Email</td><td>2 business days</td><td>5-10 business days</td></tr>
      </tbody>
    </table>

    <h3>4. Non-Refundable Items</h3>
    <ul>
      <li>Reports already generated</li>
      <li>Subscriptions cancelled after refund window</li>
      <li>Accounts terminated for policy violations</li>
      <li>Promotional or discounted purchases</li>
    </ul>

    <h3>5. Contact</h3>
    <p>Email: cluesnomads@gmail.com</p>

    <p className="legal-version">Document Version 1.0</p>
  </div>
);

// CCPA "Do Not Sell or Share My Personal Information" Content
const DNS_STORAGE_KEY = 'clues_ccpa_dns_optout';

const DoNotSellContent: React.FC = () => {
  const { isAuthenticated, preferences, updatePreferences } = useAuth();
  const [optedOut, setOptedOut] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Load opt-out state: Supabase for logged-in users, localStorage for anonymous
  useEffect(() => {
    if (isAuthenticated && preferences) {
      // Logged-in: read from Supabase (source of truth)
      setOptedOut(preferences.ccpa_dns_optout === true);
      // Sync localStorage to match Supabase
      if (preferences.ccpa_dns_optout) {
        localStorage.setItem(DNS_STORAGE_KEY, JSON.stringify({ optedOut: true, timestamp: new Date().toISOString() }));
      } else {
        localStorage.removeItem(DNS_STORAGE_KEY);
      }
    } else {
      // Anonymous: read from localStorage
      const stored = localStorage.getItem(DNS_STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setOptedOut(parsed.optedOut === true);
        } catch { /* ignore */ }
      }
    }
  }, [isAuthenticated, preferences]);

  const logConsentAction = (action: 'denied' | 'granted') => {
    const anonymousId = localStorage.getItem('clues_anonymous_id') || `anon_${Date.now()}`;
    fetch('/api/consent/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        consentType: 'ccpa_dns',
        consentAction: action,
        consentCategories: {
          sale_of_data: action === 'granted',
          sharing_of_data: action === 'granted',
          targeted_advertising: action === 'granted',
        },
        anonymousId,
        pageUrl: window.location.href,
        policyVersion: '1.0',
      }),
    }).catch(() => { /* Silent fail — opt-out still works locally */ });
  };

  const handleOptOut = async () => {
    setSubmitting(true);
    try {
      // Always persist to localStorage (works for everyone)
      localStorage.setItem(DNS_STORAGE_KEY, JSON.stringify({
        optedOut: true,
        timestamp: new Date().toISOString(),
      }));

      // Persist to Supabase if logged in (survives device changes)
      if (isAuthenticated) {
        await updatePreferences({ ccpa_dns_optout: true });
      }

      setOptedOut(true);
      setConfirmed(true);

      // Log audit trail (non-blocking)
      logConsentAction('denied');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOptIn = async () => {
    setSubmitting(true);
    try {
      localStorage.removeItem(DNS_STORAGE_KEY);

      if (isAuthenticated) {
        await updatePreferences({ ccpa_dns_optout: false });
      }

      setOptedOut(false);
      setConfirmed(false);

      logConsentAction('granted');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="legal-content">
      <p className="legal-effective">Effective Date: February 28, 2026</p>

      <h3>Your Rights Under California Law</h3>
      <p>
        Under the California Consumer Privacy Act (CCPA) and the California Privacy Rights Act (CPRA),
        California residents have the right to opt out of the sale or sharing of their personal information.
      </p>

      <h3>Our Data Practices</h3>
      <p>
        <strong>Clues Intelligence LTD does not sell your personal information.</strong> We do not exchange
        your personal data for monetary or other valuable consideration.
      </p>
      <p>
        We may share limited data with service providers (such as AI providers, hosting, and payment processing)
        strictly to operate the Service. Under CCPA definitions, some of this sharing for cross-context behavioral
        advertising could be considered "sharing" even without a sale.
      </p>

      <h3>Categories of Personal Information</h3>
      <table className="legal-table">
        <thead>
          <tr><th>Category</th><th>Collected</th><th>Sold</th><th>Shared</th></tr>
        </thead>
        <tbody>
          <tr><td>Identifiers (name, email)</td><td>Yes</td><td>No</td><td>Service providers only</td></tr>
          <tr><td>Internet activity (usage data)</td><td>Yes</td><td>No</td><td>Analytics (with consent)</td></tr>
          <tr><td>Geolocation (city-level only)</td><td>No</td><td>No</td><td>No</td></tr>
          <tr><td>Professional information</td><td>No</td><td>No</td><td>No</td></tr>
          <tr><td>Sensitive personal information</td><td>No</td><td>No</td><td>No</td></tr>
          <tr><td>AI conversation content</td><td>Yes</td><td>No</td><td>AI providers (for responses)</td></tr>
          <tr><td>Payment information</td><td>Via Stripe</td><td>No</td><td>Stripe only</td></tr>
        </tbody>
      </table>

      <h3>Opt-Out of Sale and Sharing</h3>
      <p>
        Even though we do not currently sell your data, you may submit an opt-out request below.
        This ensures that if our practices ever change, your preference is already recorded and will
        be honored immediately.
      </p>

      <div style={{
        background: optedOut ? '#f0fdf4' : '#fefce8',
        border: `2px solid ${optedOut ? '#16a34a' : '#ca8a04'}`,
        borderRadius: '12px',
        padding: '1.5rem',
        margin: '1.5rem 0',
        textAlign: 'center',
      }}>
        {optedOut ? (
          <>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#16a34a', margin: '0 0 0.5rem' }}>
              You have opted out of the sale and sharing of your personal information.
            </p>
            <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: '0 0 1rem' }}>
              Your preference is recorded and will be honored. You may change this at any time.
            </p>
            <button
              type="button"
              onClick={handleOptIn}
              disabled={submitting}
              style={{
                padding: '0.5rem 1.5rem',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: submitting ? 'wait' : 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {submitting ? 'Processing...' : 'Withdraw Opt-Out'}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: '1.1rem', fontWeight: 600, color: '#92400e', margin: '0 0 0.5rem' }}>
              You have not opted out.
            </p>
            <p style={{ fontSize: '0.875rem', color: '#4b5563', margin: '0 0 1rem' }}>
              Click below to opt out of the sale or sharing of your personal information.
            </p>
            <button
              type="button"
              onClick={handleOptOut}
              disabled={submitting}
              style={{
                padding: '0.75rem 2rem',
                background: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: submitting ? 'wait' : 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
              }}
            >
              {submitting ? 'Processing...' : 'Do Not Sell or Share My Personal Information'}
            </button>
          </>
        )}
        {confirmed && (
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#16a34a', fontWeight: 500 }}>
            Your opt-out has been recorded. A confirmation has been logged for compliance purposes.
          </p>
        )}
      </div>

      <h3>Your Additional CCPA/CPRA Rights</h3>
      <ul>
        <li><strong>Right to Know:</strong> Request what personal information we collect, use, and disclose</li>
        <li><strong>Right to Delete:</strong> Request deletion of your personal information (Account Settings)</li>
        <li><strong>Right to Correct:</strong> Request correction of inaccurate personal information</li>
        <li><strong>Right to Opt-Out:</strong> Opt out of the sale or sharing of personal information (this page)</li>
        <li><strong>Right to Limit Use of Sensitive Information:</strong> We do not collect sensitive personal information</li>
        <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your rights</li>
      </ul>

      <h3>How to Submit a Request</h3>
      <ul>
        <li><strong>Opt-Out:</strong> Use the button above or email cluesnomads@gmail.com</li>
        <li><strong>Data Access/Deletion:</strong> Account Settings or email cluesnomads@gmail.com</li>
        <li><strong>Authorized Agent:</strong> An authorized agent may submit a request on your behalf with written permission</li>
      </ul>
      <p>
        We will verify your identity before processing requests. We respond to all verified requests within 45 days.
      </p>

      <h3>Contact for Privacy Inquiries</h3>
      <p>
        Email: cluesnomads@gmail.com<br />
        Clues Intelligence LTD<br />
        167-169 Great Portland Street, 5th Floor<br />
        London W1W 5PF, United Kingdom
      </p>

      <p className="legal-version">Document Version 1.0</p>
    </div>
  );
};

// Export helper to check CCPA opt-out status (localStorage — for non-React contexts)
// For React components, use useAuth().preferences?.ccpa_dns_optout instead
export const getCcpaDnsOptOut = (): boolean => {
  const stored = localStorage.getItem(DNS_STORAGE_KEY);
  if (!stored) return false;
  try {
    const parsed = JSON.parse(stored);
    return parsed.optedOut === true;
  } catch {
    return false;
  }
};

export default LegalModal;
