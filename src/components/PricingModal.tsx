/**
 * LIFE SCORE™ Premium Pricing Modal
 *
 * Glassmorphic modal overlay for subscription upgrades.
 * Triggered from Header upgrade button or FeatureGate overlays.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTierAccess } from '../hooks/useTierAccess';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { UserTier } from '../types/database';
import './PricingModal.css';

// ============================================================================
// TYPES
// ============================================================================

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightFeature?: string;
  highlightTier?: UserTier;
}

type BillingInterval = 'monthly' | 'annual';

interface PricingTier {
  id: UserTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  popular?: boolean;
  features: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'FREE',
    tagline: 'Start Your Journey',
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      '1 comparison/month (1 LLM)',
      'Basic metric analysis',
      'Local storage only',
    ],
  },
  {
    id: 'pro',
    name: 'NAVIGATOR',
    tagline: 'Chart Your Course',
    monthlyPrice: 29,
    annualPrice: 249,
    popular: true,
    features: [
      '1 comparison/month (1 LLM)',
      '15 min Olivia AI/month',
      '1 Judge video/month',
      '1 Gamma report/month',
      'Cloud sync across devices',
      'Chat support',
    ],
  },
  {
    id: 'enterprise',
    name: 'SOVEREIGN',
    tagline: 'Command Your Destiny',
    monthlyPrice: 99,
    annualPrice: 899,
    features: [
      '1 comparison/month (5 LLMs)',
      '60 min Olivia AI/month',
      '1 Judge video/month',
      '1 Gamma report/month (5 LLMs)',
      'Enhanced Mode',
      'API access',
      'Phone + Video + 60min tech support',
    ],
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  highlightFeature,
  highlightTier,
}) => {
  const { user, profile, session } = useAuth();
  const { tier: currentTier } = useTierAccess();
  const focusTrapRef = useFocusTrap(isOpen);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('annual');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getSavingsPercent = (monthly: number, annual: number): number => {
    if (monthly === 0) return 0;
    const monthlyTotal = monthly * 12;
    return Math.round(((monthlyTotal - annual) / monthlyTotal) * 100);
  };

  const handleCheckout = async (tierId: UserTier) => {
    if (tierId === 'free') return;
    if (!user?.email || !profile?.id) {
      alert('Please sign in to upgrade your subscription.');
      return;
    }

    const priceKey = `${tierId === 'pro' ? 'navigator' : 'sovereign'}_${billingInterval}`;
    setIsLoading(priceKey);

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          priceKey,
          userId: profile.id,
          userEmail: user.email,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('[PricingModal] Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!profile?.id) { console.error("[PricingModal] Cannot manage subscription: profile.id missing", { profile }); alert("Unable to manage subscription. Please refresh and try again."); return; }

    setIsLoading('manage');

    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ userId: profile.id }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Failed to open billing portal');
      }
    } catch (error) {
      console.error('[PricingModal] Portal error:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div ref={focusTrapRef} className="pricing-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Pricing" onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div className="pricing-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="modal-close-btn" onClick={onClose}>
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>

        {/* Header */}
        <header className="modal-header">
          <div className="modal-crown">
            <svg viewBox="0 0 24 24" width="32" height="32">
              <path fill="currentColor" d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z"/>
            </svg>
          </div>
          <h2 className="modal-title">Unlock Premium</h2>
          <p className="modal-subtitle">
            {highlightFeature
              ? `Upgrade to access ${highlightFeature}`
              : 'Choose your path to freedom intelligence'}
          </p>
        </header>

        {/* Billing Toggle */}
        <div className="modal-billing-toggle">
          <button
            className={`toggle-option ${billingInterval === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingInterval('monthly')}
          >
            Monthly
          </button>
          <button
            className={`toggle-option ${billingInterval === 'annual' ? 'active' : ''}`}
            onClick={() => setBillingInterval('annual')}
          >
            Annual
            <span className="save-tag">Save 28%</span>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="modal-pricing-grid">
          {PRICING_TIERS.filter(t => t.id !== 'free').map((tier) => {
            const price = billingInterval === 'monthly' ? tier.monthlyPrice : tier.annualPrice;
            const savings = getSavingsPercent(tier.monthlyPrice, tier.annualPrice);
            const isCurrentTier = currentTier === tier.id;
            const isHighlighted = highlightTier === tier.id;

            return (
              <div
                key={tier.id}
                className={`modal-pricing-card ${tier.popular ? 'popular' : ''} ${isCurrentTier ? 'current' : ''} ${isHighlighted ? 'highlighted' : ''}`}
              >
                {tier.popular && !isCurrentTier && (
                  <div className="popular-ribbon">MOST POPULAR</div>
                )}

                {isCurrentTier && (
                  <div className="current-ribbon">CURRENT PLAN</div>
                )}

                <h3 className="tier-name">{tier.name}</h3>
                <p className="tier-tagline">{tier.tagline}</p>

                <div className="tier-price">
                  <span className="currency">$</span>
                  <span className="amount">{price}</span>
                  <span className="interval">/{billingInterval === 'monthly' ? 'mo' : 'yr'}</span>
                </div>

                {billingInterval === 'annual' && savings > 0 && (
                  <div className="savings-badge">Save {savings}%</div>
                )}

                <ul className="tier-features">
                  {tier.features.map((feature, idx) => (
                    <li key={idx}>
                      <span className="check-icon">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {isCurrentTier ? (
                  <button
                    className="tier-btn manage"
                    onClick={handleManageSubscription}
                    disabled={isLoading === 'manage'}
                  >
                    {isLoading === 'manage' ? 'Loading...' : 'Manage Subscription'}
                  </button>
                ) : (
                  <button
                    className={`tier-btn ${tier.popular ? 'primary' : 'secondary'}`}
                    onClick={() => handleCheckout(tier.id)}
                    disabled={!!isLoading}
                  >
                    {isLoading === `${tier.id === 'pro' ? 'navigator' : 'sovereign'}_${billingInterval}`
                      ? 'Loading...'
                      : 'Upgrade Now'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Trust Footer */}
        <footer className="modal-footer">
          <div className="trust-badges">
            <span className="trust-badge">
              <span className="badge-icon">🔒</span>
              Secure checkout
            </span>
            <span className="trust-badge">
              <span className="badge-icon">↩️</span>
              Cancel anytime
            </span>
            <span className="trust-badge">
              <span className="badge-icon">💳</span>
              Powered by Stripe
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default PricingModal;
