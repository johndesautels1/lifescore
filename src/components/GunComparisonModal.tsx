/**
 * Gun Comparison Modal
 *
 * Standalone, unscored comparison of gun laws between two cities.
 * Deliberately separated from the 100-metric scoring system because
 * gun rights are uniquely polarizing — constitutional carry in a
 * Florida Publix is maximum freedom to one person and maximum danger
 * to another.
 */

import React, { useEffect } from 'react';
import { useGunComparison } from '../hooks/useGunComparison';
import type { GunComparisonData } from '../hooks/useGunComparison';
import './GunComparisonModal.css';

interface GunComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityA: string;
  cityB: string;
}

const LoadingSkeleton: React.FC = () => (
  <div className="gun-loading">
    <div className="gun-loading-spinner" />
    <p>Researching gun laws for both cities...</p>
    <p className="gun-loading-sub">This takes a few seconds</p>
  </div>
);

const ErrorState: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="gun-error">
    <p>Failed to load gun law comparison</p>
    <p className="gun-error-detail">{error}</p>
    <button className="gun-retry-btn" onClick={onRetry}>Try Again</button>
  </div>
);

const ComparisonTable: React.FC<{ data: GunComparisonData }> = ({ data }) => (
  <div className="gun-comparison-content">
    <div className="gun-city-headers">
      <div className="gun-city-label">{data.cityA}</div>
      <div className="gun-category-spacer">Category</div>
      <div className="gun-city-label">{data.cityB}</div>
    </div>

    <div className="gun-categories">
      {data.categories.map((cat, i) => (
        <div key={i} className="gun-category-row">
          <div className="gun-cell gun-cell-a" data-city={data.cityA}>{cat.cityA}</div>
          <div className="gun-cell gun-cell-label">{cat.label}</div>
          <div className="gun-cell gun-cell-b" data-city={data.cityB}>{cat.cityB}</div>
        </div>
      ))}
    </div>

    {data.summary && (
      <div className="gun-summary">
        <strong>Summary:</strong> {data.summary}
      </div>
    )}
  </div>
);

export const GunComparisonModal: React.FC<GunComparisonModalProps> = ({
  isOpen,
  onClose,
  cityA,
  cityB,
}) => {
  const { status, data, error, fetchComparison, reset } = useGunComparison();

  useEffect(() => {
    if (isOpen && status === 'idle') {
      fetchComparison(cityA, cityB);
    }
  }, [isOpen, status, cityA, cityB, fetchComparison]);

  // Reset when closed so next open re-checks cache
  useEffect(() => {
    if (!isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="gun-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Gun Rights Comparison">
      <div className="gun-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="gun-modal-header">
          <h3>Gun Rights Comparison</h3>
          <button className="gun-close-btn" onClick={onClose} aria-label="Close">&times;</button>
        </div>

        {/* Disclaimer */}
        <div className="gun-disclaimer">
          <h4>Why Gun Rights Are Separated</h4>
          <p>
            We have separated the gun metric into its own standalone comparison because of the
            enormous polarizing opinions on whether guns mean more freedom or less freedom.
          </p>
          <p>
            To someone in a constitutional carry state, unrestricted firearm access IS freedom —
            the foundation of personal safety and self-determination. To someone from a country
            with strict gun control, being surrounded by armed civilians in a grocery store is
            NOT freedom — it's danger.
          </p>
          <p>
            We believe we cannot create an accurate derived freedom score for such a deeply
            divisive subject. Instead, we enable you to compare any two cities purely on their
            gun laws — which city has more gun freedoms vs. more restrictions — and let you
            decide what that means for <strong>your</strong> definition of freedom.
          </p>
        </div>

        {/* Content */}
        <div className="gun-modal-body">
          {status === 'loading' && <LoadingSkeleton />}
          {status === 'error' && (
            <ErrorState
              error={error || 'Unknown error'}
              onRetry={() => fetchComparison(cityA, cityB)}
            />
          )}
          {status === 'ready' && data && <ComparisonTable data={data} />}
        </div>

        {/* Footer */}
        <div className="gun-modal-footer">
          <p>
            This comparison is factual and unscored. It does not affect
            the LIFE SCORE freedom index in any way.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GunComparisonModal;
