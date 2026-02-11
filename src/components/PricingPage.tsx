/**
 * LIFE SCORE™ Premium Pricing Page
 *
 * Elegant pricing display with Stripe integration.
 * Design: Swiss private banking meets James Bond meets Patek Philippe
 *
 * Features:
 * - Three tier pricing cards (Free, Navigator, Sovereign)
 * - Monthly/Annual toggle with savings display
 * - Feature comparison matrix
 * - Stripe checkout integration
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTierAccess } from '../hooks/useTierAccess';
import type { UserTier } from '../types/database';
import { toastError } from '../utils/toast';
import './PricingPage.css';

// ============================================================================
// TYPES
// ============================================================================

type BillingInterval = 'monthly' | 'annual';

interface PricingTier {
  id: UserTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  popular?: boolean;
  features: string[];
  limitations?: string[];
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
    limitations: [
      'No Olivia AI',
      'No Enhanced Mode',
      'No video reports',
      'No visual exports',
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
      '1 comparison image set/month',
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

const PricingPage: React.FC = () => {
  const { user, profile, session } = useAuth();
  const { tier: currentTier } = useTierAccess();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Calculate savings percentage
  const getSavingsPercent = (monthly: number, annual: number): number => {
    if (monthly === 0) return 0;
    const monthlyTotal = monthly * 12;
    return Math.round(((monthlyTotal - annual) / monthlyTotal) * 100);
  };

  // Handle checkout
  const handleCheckout = async (tierId: UserTier) => {
    if (tierId === 'free') return;
    if (!user?.email || !profile?.id) {
      toastError('Please sign in to upgrade your subscription.');
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
      console.error('[Pricing] Checkout error:', error);
      toastError('Failed to start checkout. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  // Handle manage subscription
  const handleManageSubscription = async () => {
    if (!profile?.id) { console.error("[PricingPage] Cannot manage subscription: profile.id missing", { profile }); toastError("Unable to manage subscription. Please refresh and try again."); return; }

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
      console.error('[Pricing] Portal error:', error);
      toastError('Failed to open billing portal. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="pricing-page">
      {/* Background Effects */}
      <div className="pricing-bg-effects">
        <div className="bg-gradient-1"></div>
        <div className="bg-gradient-2"></div>
        <div className="bg-grid"></div>
      </div>

      <div className="pricing-container">
        {/* Header */}
        <header className="pricing-header">
          <h1 className="pricing-title">
            <span className="title-accent">CHOOSE</span> YOUR PATH
          </h1>
          <p className="pricing-subtitle">
            100 Freedom Metrics. One Clear Decision.
          </p>
        </header>

        {/* Billing Toggle */}
        <div className="billing-toggle">
          <button
            className={`toggle-btn ${billingInterval === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingInterval('monthly')}
          >
            Monthly
          </button>
          <button
            className={`toggle-btn ${billingInterval === 'annual' ? 'active' : ''}`}
            onClick={() => setBillingInterval('annual')}
          >
            Annual
            <span className="save-badge">Save up to 28%</span>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="pricing-grid">
          {PRICING_TIERS.map((tier) => {
            const price = billingInterval === 'monthly' ? tier.monthlyPrice : tier.annualPrice;
            const savings = getSavingsPercent(tier.monthlyPrice, tier.annualPrice);
            const isCurrentTier = currentTier === tier.id;
            const isDowngrade =
              (currentTier === 'enterprise' && tier.id !== 'enterprise') ||
              (currentTier === 'pro' && tier.id === 'free');

            return (
              <div
                key={tier.id}
                className={`pricing-card ${tier.popular ? 'popular' : ''} ${isCurrentTier ? 'current' : ''}`}
              >
                {tier.popular && (
                  <div className="popular-badge">MOST POPULAR</div>
                )}

                {isCurrentTier && (
                  <div className="current-badge">CURRENT PLAN</div>
                )}

                <div className="card-header">
                  <h2 className="tier-name">{tier.name}</h2>
                  <p className="tier-tagline">{tier.tagline}</p>
                </div>

                <div className="card-price">
                  {price === 0 ? (
                    <span className="price-free">FREE</span>
                  ) : (
                    <>
                      <span className="price-currency">$</span>
                      <span className="price-amount">{price}</span>
                      <span className="price-interval">
                        /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </>
                  )}
                  {billingInterval === 'annual' && savings > 0 && (
                    <div className="savings-tag">Save {savings}%</div>
                  )}
                </div>

                <ul className="card-features">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="feature-item included">
                      <span className="feature-icon">✓</span>
                      <span className="feature-text">{feature}</span>
                    </li>
                  ))}
                  {tier.limitations?.map((limitation, idx) => (
                    <li key={`lim-${idx}`} className="feature-item excluded">
                      <span className="feature-icon">✗</span>
                      <span className="feature-text">{limitation}</span>
                    </li>
                  ))}
                </ul>

                <div className="card-action">
                  {isCurrentTier ? (
                    currentTier !== 'free' ? (
                      <button
                        className="action-btn manage"
                        onClick={handleManageSubscription}
                        disabled={isLoading === 'manage'}
                      >
                        {isLoading === 'manage' ? 'Loading...' : 'Manage Subscription'}
                      </button>
                    ) : (
                      <button className="action-btn current" disabled>
                        Current Plan
                      </button>
                    )
                  ) : tier.id === 'free' ? (
                    <button className="action-btn downgrade" disabled={isDowngrade}>
                      {isDowngrade ? 'Contact Support' : 'Get Started'}
                    </button>
                  ) : tier.id === 'enterprise' ? (
                    <button
                      className="action-btn enterprise"
                      onClick={() => handleCheckout(tier.id)}
                      disabled={!!isLoading}
                    >
                      {isLoading === `sovereign_${billingInterval}` ? 'Loading...' : 'Upgrade Now'}
                    </button>
                  ) : (
                    <button
                      className="action-btn primary"
                      onClick={() => handleCheckout(tier.id)}
                      disabled={!!isLoading}
                    >
                      {isLoading === `navigator_${billingInterval}` ? 'Loading...' : 'Upgrade Now'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison */}
        <section className="feature-comparison">
          <h3 className="comparison-title">Feature Comparison</h3>
          <div className="comparison-table">
            <div className="comparison-header">
              <div className="comparison-feature">Feature</div>
              <div className="comparison-tier">Free</div>
              <div className="comparison-tier">Navigator</div>
              <div className="comparison-tier">Sovereign</div>
            </div>

            <div className="comparison-row">
              <div className="comparison-feature">LLM Providers</div>
              <div className="comparison-value">1</div>
              <div className="comparison-value">1</div>
              <div className="comparison-value highlight">5</div>
            </div>

            <div className="comparison-row">
              <div className="comparison-feature">Comparisons/month</div>
              <div className="comparison-value">1</div>
              <div className="comparison-value">1</div>
              <div className="comparison-value">1 (all 5 LLMs)</div>
            </div>

            <div className="comparison-row">
              <div className="comparison-feature">Olivia AI</div>
              <div className="comparison-value">—</div>
              <div className="comparison-value">15 min/month</div>
              <div className="comparison-value highlight">60 min/month</div>
            </div>

            <div className="comparison-row">
              <div className="comparison-feature">Judge Video</div>
              <div className="comparison-value">—</div>
              <div className="comparison-value">1/month</div>
              <div className="comparison-value">1/month</div>
            </div>

            <div className="comparison-row">
              <div className="comparison-feature">Gamma Report</div>
              <div className="comparison-value">—</div>
              <div className="comparison-value">1/month</div>
              <div className="comparison-value">1/month (5 LLMs)</div>
            </div>

            <div className="comparison-row">
              <div className="comparison-feature">Cloud Sync</div>
              <div className="comparison-value">—</div>
              <div className="comparison-value check">✓</div>
              <div className="comparison-value check">✓</div>
            </div>

            <div className="comparison-row">
              <div className="comparison-feature">API Access</div>
              <div className="comparison-value">—</div>
              <div className="comparison-value">—</div>
              <div className="comparison-value check">✓</div>
            </div>

            <div className="comparison-row">
              <div className="comparison-feature">Support</div>
              <div className="comparison-value">—</div>
              <div className="comparison-value">Chat</div>
              <div className="comparison-value highlight">Phone + Video + 60min tech</div>
            </div>
          </div>
        </section>

        {/* FAQ or Trust Signals */}
        <section className="trust-signals">
          <div className="trust-item">
            <span className="trust-icon">🔒</span>
            <span className="trust-text">Secure payments via Stripe</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">↩️</span>
            <span className="trust-text">Cancel anytime</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">💳</span>
            <span className="trust-text">No hidden fees</span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default PricingPage;
