/**
 * LIFE SCORE™ Dealbreakers Warning
 * Shows warnings when a city fails on user's must-have metrics
 */

import React from 'react';
import { ALL_METRICS } from '../shared/metrics';
import './DealbreakersWarning.css';

// Metric icons mapping
const METRIC_ICONS: Record<string, string> = {
  'Cannabis': '🌿', 'Alcohol Laws': '🍺', 'Gambling': '🎰', 'Sex Work Laws': '💋',
  'Drug Penalties': '💊', 'Abortion Access': '⚕️', 'LGBTQ+ Rights': '🏳️‍🌈',
  'Assisted Dying': '🕊️', 'Smoking Laws': '🚬', 'Public Drinking': '🍻',
  'Helmet Laws': '⛑️', 'Seatbelt Laws': '🚗', 'Jaywalking': '🚶', 'Curfews': '🌙',
  'Noise Laws': '🔊', 'HOA Prevalence': '🏘️', 'HOA Power': '📋', 'Property Tax': '💰',
  'Rent Control': '🔒', 'Eviction Protection': '🛡️', 'Zoning': '🗺️', 'Permits': '📝',
  'STR/Airbnb': '🏠', 'ADU Laws': '🏗️', 'Home Business': '💼', 'Eminent Domain': '⚖️',
  'Squatter Rights': '🏚️', 'Historic Rules': '🏛️', 'Foreign Ownership': '🌐',
  'Transfer Tax': '💸', 'Lawn Rules': '🌱', 'Exterior Rules': '🎨', 'Fence Rules': '🧱',
  'Parking Rules': '🅿️', 'Pet Rules': '🐕', 'Business License': '📄',
  'Occupation License': '🎓', 'Min Wage': '💵', 'Right to Work': '✊',
  'Employment Laws': '📜', 'Paid Leave': '🏖️', 'Parental Leave': '👶',
  'Non-Compete': '📑', 'Corp Tax': '🏢', 'Income Tax': '💳', 'Sales Tax': '🛒',
  'Gig Work Laws': '📱', 'Work Visa': '🛂', 'Remote Work': '💻', 'Overtime Rules': '⏰',
  'Union Rights': '🤝', 'Safety Standards': '🦺', 'Anti-Discrimination': '⚖️',
  'Startup Ease': '🚀', 'Food Trucks': '🚚', 'Contractor License': '🔧',
  'Health Mandate': '🏥', 'Tip Credit': '💵', 'Banking Access': '🏦', 'Crypto Laws': '₿',
  'Transit Quality': '🚇', 'Walkability': '👟', 'Bike Infra': '🚲', 'Car Dependency': '🚗',
  'Rideshare': '🚕', 'Speed Limits': '⚡', 'Traffic Cameras': '📷', 'Toll Roads': '🛣️',
  'Vehicle Inspection': '🔍', 'License Reqs': '🪪', 'DUI Laws': '🍸', 'E-Mobility': '🛴',
  'Airport Access': '✈️', 'Traffic': '🚦', 'Incarceration': '🔒', 'Police Density': '👮',
  'Asset Forfeiture': '💸', 'Mandatory Mins': '⏱️', 'Bail System': '🏛️',
  'Police Oversight': '👁️', 'Qualified Immunity': '🛡️', 'Legal Costs': '💳',
  'Court Efficiency': '⚖️', 'Jury Rights': '🧑‍⚖️', 'Surveillance': '📹',
  'Search Protections': '🔐', 'Death Penalty': '⚠️', 'Prison Standards': '🏢',
  'Expungement': '📋', 'Free Speech': '🗣️', 'Press Freedom': '📰',
  'Internet Freedom': '🌐', 'Hate Speech Laws': '🚫', 'Protest Rights': '✊',
  'Religious Freedom': '🙏', 'Data Privacy': '🔏', 'Dress Freedom': '👔',
  'Tolerance': '🤝', 'Defamation Laws': '⚖️'
};

interface FailedDealbreaker {
  metricId: string;
  shortName: string;
  score: number;
}

interface DealbreakersWarningProps {
  cityName: string;
  failedDealbreakers: FailedDealbreaker[];
}

export const DealbreakersWarning: React.FC<DealbreakersWarningProps> = ({
  cityName,
  failedDealbreakers
}) => {
  if (failedDealbreakers.length === 0) return null;

  return (
    <div className="dealbreakers-warning">
      <div className="warning-header">
        <span className="warning-icon">🚨</span>
        <span className="warning-title">Dealbreaker Alert for {cityName}</span>
      </div>
      <p className="warning-text">
        This city scores below 50 on {failedDealbreakers.length} of your must-have metrics:
      </p>
      <div className="failed-list">
        {failedDealbreakers.map(item => {
          const metric = ALL_METRICS.find(m => m.id === item.metricId);
          const icon = metric ? METRIC_ICONS[metric.shortName] || '📊' : '📊';
          return (
            <div key={item.metricId} className="failed-item">
              <span className="failed-icon">{icon}</span>
              <span className="failed-name">{item.shortName}</span>
              <span className="failed-score">{Math.round(item.score)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Check which dealbreakers a city fails on
 */
export const checkDealbreakers = (
  dealbreakers: string[],
  metrics: Array<{ metricId: string; consensusScore: number }>
): FailedDealbreaker[] => {
  const failed: FailedDealbreaker[] = [];

  dealbreakers.forEach(dealbreakerId => {
    const metricScore = metrics.find(m => m.metricId === dealbreakerId);
    if (metricScore && metricScore.consensusScore < 50) {
      const metricDef = ALL_METRICS.find(m => m.id === dealbreakerId);
      failed.push({
        metricId: dealbreakerId,
        shortName: metricDef?.shortName || dealbreakerId,
        score: metricScore.consensusScore
      });
    }
  });

  return failed;
};

export default DealbreakersWarning;
