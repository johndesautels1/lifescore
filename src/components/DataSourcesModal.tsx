/**
 * Data Sources Modal - Shows authoritative sources used for scoring
 */

import React from 'react';
import './DataSourcesModal.css';

interface DataSourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DATA_SOURCES = [
  {
    name: 'Freedom House',
    category: 'Political & Civil Rights',
    url: 'https://freedomhouse.org',
    icon: '🗽',
    description: 'Political rights, civil liberties, press freedom indices'
  },
  {
    name: 'CATO Human Freedom Index',
    category: 'Overall Freedom',
    url: 'https://www.cato.org/human-freedom-index',
    icon: '📊',
    description: 'Personal freedom, economic freedom rankings'
  },
  {
    name: 'World Bank Open Data',
    category: 'Economic & Regulatory',
    url: 'https://data.worldbank.org',
    icon: '🏦',
    description: 'Business regulations, ease of doing business'
  },
  {
    name: 'Transparency International',
    category: 'Corruption & Governance',
    url: 'https://www.transparency.org',
    icon: '👁️',
    description: 'Corruption Perception Index'
  },
  {
    name: 'Reporters Without Borders',
    category: 'Press Freedom',
    url: 'https://rsf.org',
    icon: '📰',
    description: 'Press Freedom Index'
  },
  {
    name: 'Numbeo',
    category: 'Cost of Living & Crime',
    url: 'https://www.numbeo.com',
    icon: '🏠',
    description: 'Property prices, rent, crime rates, quality of life'
  },
  {
    name: 'OECD Data',
    category: 'Economic & Social',
    url: 'https://data.oecd.org',
    icon: '📈',
    description: 'Employment, education, health, inequality'
  },
  {
    name: 'Official Government Sources',
    category: 'Legal & Regulatory',
    url: '#',
    icon: '🏛️',
    description: 'State/local government websites, municipal codes'
  }
];

export const DataSourcesModal: React.FC<DataSourcesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="data-sources-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📚 Data Sources</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <p className="modal-intro">
          LIFE SCORE™ uses multiple AI models that search and cross-reference these authoritative sources
          to generate accurate, verifiable freedom scores.
        </p>

        <div className="sources-grid">
          {DATA_SOURCES.map((source, i) => (
            <a
              key={i}
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="source-card"
            >
              <span className="source-icon">{source.icon}</span>
              <div className="source-info">
                <span className="source-name">{source.name}</span>
                <span className="source-category">{source.category}</span>
                <span className="source-desc">{source.description}</span>
              </div>
              {source.url !== '#' && <span className="external-icon">↗</span>}
            </a>
          ))}
        </div>

        <div className="modal-footer">
          <p>
            <strong>How it works:</strong> 5 AI models independently evaluate each metric using web search,
            then Claude Opus 4.5 synthesizes their findings into a consensus score.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataSourcesModal;
