/**
 * Legal Modal Component
 * Shows the seven legal pages. Their words live in ONE place —
 * src/legal/legalContent.ts — which also generates docs/legal/*.md, so the
 * pop-up and the documents can never disagree (rewritten 2026-10-03).
 *
 * The look follows the questionnaire engine's legal pages (John, 2026-10-03:
 * "use those but adopt them to this repo"): the pages as tabs, a "Legal"
 * eyebrow over a gradient title, an "On this page" contents card, gold-square
 * bullets, the supplier register as cards, and the company card at the end —
 * in LIFE SCORE's own sapphire and gold, with light and dark faces
 * (LegalModal.css). The "Do Not Sell or Share" opt-out box works as before.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  LEGAL_SLUGS,
  legalPage,
  parseBody,
  type LegalSection,
  type LegalSlug,
  type LegalWidget,
  type TextRun,
} from '../legal/legalContent';
import { LEGAL_EFFECTIVE, LEGAL_FACTS } from '../legal/legalFacts';
import { LAST_UPDATED, SUB_PROCESSORS } from '../legal/subProcessors';
import './LegalModal.css';

export type LegalPage = LegalSlug | null;

interface LegalModalProps {
  page: LegalPage;
  onClose: () => void;
}

/** Opened from the footer; each opening starts on the page that was clicked. */
const LegalModal: React.FC<LegalModalProps> = ({ page, onClose }) => {
  if (!page) return null;
  return <LegalDialog key={page} initial={page} onClose={onClose} />;
};

const LegalDialog: React.FC<{ initial: LegalSlug; onClose: () => void }> = ({ initial, onClose }) => {
  const [slug, setSlug] = useState<LegalSlug>(initial);
  const contentRef = useRef<HTMLDivElement>(null);
  const words = legalPage(slug);

  // Escape closes the dialog, as every dialog in the app should.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const choosePage = (next: LegalSlug) => {
    setSlug(next);
    contentRef.current?.scrollTo({ top: 0 });
  };

  const jumpTo = (sectionId: string) => {
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    document
      .getElementById(`legal-${slug}-${sectionId}`)
      ?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <div className="legal-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="legal-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-title"
      >
        <div className="legal-modal-bar">
          <span className="legal-eyebrow">Legal</span>
          <button type="button" className="legal-modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="legal-modal-content" ref={contentRef}>
          <nav className="legal-pills" aria-label="Legal pages">
            {LEGAL_SLUGS.map((s) => (
              <button
                key={s}
                type="button"
                className={`legal-pill${s === slug ? ' current' : ''}`}
                aria-current={s === slug ? 'page' : undefined}
                onClick={() => choosePage(s)}
              >
                {legalPage(s).title}
              </button>
            ))}
          </nav>

          <h1 id="legal-title" className="legal-title">
            <span className="legal-gradient-text">{words.title}</span>
          </h1>
          <p className="legal-meta">
            Effective {words.effective} · {LEGAL_FACTS.company}
          </p>

          <nav className="legal-toc legal-card" aria-label="On this page">
            <div className="legal-eyebrow">On this page</div>
            <ol>
              {words.sections.map((section, index) => (
                <li key={section.id}>
                  <button type="button" onClick={() => jumpTo(section.id)}>
                    <span className="legal-toc-number" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>{section.heading}</span>
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          {words.sections.map((section) => (
            <Section key={section.id} slug={slug} section={section} />
          ))}

          <div className="legal-company legal-card">
            <div className="legal-company-name">{LEGAL_FACTS.company}</div>
            <p>
              {LEGAL_FACTS.address}
              <br />
              <a href={`mailto:${LEGAL_FACTS.contact}`}>{LEGAL_FACTS.contact}</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ slug: LegalSlug; section: LegalSection }> = ({ slug, section }) => {
  const id = `legal-${slug}-${section.id}`;
  return (
    <section id={id} className="legal-section" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{section.heading}</h2>
      <LegalBody body={section.body} />
      {section.widget && <Widget widget={section.widget} />}
    </section>
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

/** Paragraphs, and lists with the gold square. */
const LegalBody: React.FC<{ body: string }> = ({ body }) => (
  <>
    {parseBody(body).map((block, i) =>
      block.kind === 'paragraph' ? (
        <p key={i}>
          <Runs runs={block.runs} />
        </p>
      ) : (
        <ul key={i} className="legal-bullets">
          {block.items.map((runs, j) => (
            <li key={j}>
              <span className="legal-bullet-mark" aria-hidden="true" />
              <span>
                <Runs runs={runs} />
              </span>
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

/** The supplier register (src/legal/subProcessors.ts), one card per supplier. */
const ProcessorRegister: React.FC = () => (
  <div className="legal-processors">
    {SUB_PROCESSORS.map((p) => (
      <div key={p.name} className="legal-processor legal-card">
        <div className="legal-processor-name">{p.name}</div>
        <div>{p.role}</div>
        <div className="legal-processor-data">
          <strong>What it receives:</strong> {p.data}
        </div>
        <div className="legal-processor-where">{p.jurisdiction}</div>
      </div>
    ))}
    <p className="legal-meta">Supplier list last updated {LAST_UPDATED}. Material changes are notified before they apply.</p>
  </div>
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
