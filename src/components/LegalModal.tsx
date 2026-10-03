/**
 * Legal Modal Component
 * Shows the seven legal pages. Their words live in ONE place —
 * src/legal/legalContent.ts — which also generates docs/legal/*.md, so the
 * pop-up and the documents can never disagree (rewritten 2026-10-03).
 * The "Do Not Sell or Share" opt-out box and the supplier register are drawn
 * from code beneath the words they belong to.
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { legalPage, parseBody, type LegalSlug, type LegalWidget, type TextRun } from '../legal/legalContent';
import { LEGAL_EFFECTIVE, LEGAL_FACTS } from '../legal/legalFacts';
import { LAST_UPDATED, SUB_PROCESSORS } from '../legal/subProcessors';
import './LegalModal.css';

export type LegalPage = LegalSlug | null;

interface LegalModalProps {
  page: LegalPage;
  onClose: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ page, onClose }) => {
  if (!page) return null;
  const words = legalPage(page);

  return (
    <div className="legal-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Legal Information">
      <div className="legal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal-header">
          <h2>{words.title}</h2>
          <button className="legal-modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div className="legal-modal-content">
          <div className="legal-content">
            <p className="legal-effective">Effective Date: {words.effective}</p>
            {words.sections.map((section) => (
              <section key={section.id} id={`legal-${section.id}`}>
                <h3>{section.heading}</h3>
                <LegalBody body={section.body} />
                {section.widget && <Widget widget={section.widget} />}
              </section>
            ))}
          </div>
        </div>
        <div className="legal-modal-footer">
          <p>{LEGAL_FACTS.company} &bull; {LEGAL_FACTS.address}</p>
          <p>Contact: {LEGAL_FACTS.contact}</p>
        </div>
      </div>
    </div>
  );
};

/** Bold runs inside one line. */
const Runs: React.FC<{ runs: readonly TextRun[] }> = ({ runs }) => (
  <>
    {runs.map((run, i) =>
      run.bold ? <strong key={i}>{run.text}</strong> : <React.Fragment key={i}>{run.text}</React.Fragment>
    )}
  </>
);

/** Paragraphs and bullet lists from a section's body. */
const LegalBody: React.FC<{ body: string }> = ({ body }) => (
  <>
    {parseBody(body).map((block, i) =>
      block.kind === 'paragraph' ? (
        <p key={i}>
          <Runs runs={block.runs} />
        </p>
      ) : (
        <ul key={i}>
          {block.items.map((runs, j) => (
            <li key={j}>
              <Runs runs={runs} />
            </li>
          ))}
        </ul>
      )
    )}
  </>
);

const Widget: React.FC<{ widget: LegalWidget }> = ({ widget }) => {
  switch (widget) {
    case 'processors':
      return <ProcessorRegister />;
    case 'dns-optout':
      return <DoNotSellOptOut />;
    default: {
      const exhaustive: never = widget;
      return exhaustive;
    }
  }
};

/** The supplier register (src/legal/subProcessors.ts). */
const ProcessorRegister: React.FC = () => (
  <>
    <div className="legal-table-wrap" style={{ overflowX: 'auto' }}>
      <table className="legal-table">
        <thead>
          <tr><th>Supplier</th><th>What it does</th><th>What it receives</th><th>Where</th></tr>
        </thead>
        <tbody>
          {SUB_PROCESSORS.map((p) => (
            <tr key={p.name}>
              <td>{p.name}</td>
              <td>{p.role}</td>
              <td>{p.data}</td>
              <td>{p.jurisdiction}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="legal-version">Supplier list last updated {LAST_UPDATED}</p>
  </>
);

// CCPA "Do Not Sell or Share My Personal Information" — the opt-out box
const DNS_STORAGE_KEY = 'clues_ccpa_dns_optout';

const DoNotSellOptOut: React.FC = () => {
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
        policyVersion: LEGAL_EFFECTIVE,
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
