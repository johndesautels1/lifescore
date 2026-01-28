/**
 * LIFE SCORE™ Help Modal
 *
 * Modal container with three documentation tabs and Emilia AI chat.
 * Tabs: Customer Service | Tech Support | User Manual
 *
 * Features:
 * - Tab navigation for different manuals
 * - "Ask Emilia" button to open AI chat
 * - Smooth transitions and responsive design
 */

import React, { useState, useEffect, useCallback } from 'react';
import ManualViewer from './ManualViewer';
import EmiliaChat from './EmiliaChat';
import './HelpModal.css';

export type ManualTabType = 'csm' | 'tech' | 'user';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS: { id: ManualTabType; label: string; icon: string }[] = [
  { id: 'user', label: 'User Manual', icon: '📖' },
  { id: 'csm', label: 'Customer Service', icon: '💬' },
  { id: 'tech', label: 'Tech Support', icon: '🔧' },
];

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ManualTabType>('user');
  const [showChat, setShowChat] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setShowChat(false);
      onClose();
    }, 200);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleBackToManuals = () => {
    setShowChat(false);
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`help-modal-overlay ${isClosing ? 'closing' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="help-modal-header">
          <div className="help-modal-title-area">
            <div className="help-modal-emilia-icon">
              <span>E</span>
            </div>
            <div className="help-modal-title-text">
              <h2 className="help-modal-title">
                {showChat ? 'Ask Emilia' : 'Help Center'}
              </h2>
              <p className="help-modal-subtitle">
                {showChat
                  ? "I'm here to help with any questions"
                  : 'Documentation & AI Support'}
              </p>
            </div>
          </div>
          <button
            className="help-modal-close"
            onClick={handleClose}
            aria-label="Close help"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="currentColor"
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>

        {/* Tab Navigation (hidden when in chat mode) */}
        {!showChat && (
          <div className="help-modal-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`help-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="help-tab-icon">{tab.icon}</span>
                <span className="help-tab-label">{tab.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="help-modal-content">
          {showChat ? (
            <EmiliaChat onBack={handleBackToManuals} />
          ) : (
            <>
              <ManualViewer type={activeTab} />

              {/* Ask Emilia CTA */}
              <div className="ask-emilia-cta">
                <div className="ask-emilia-cta-content">
                  <div className="ask-emilia-avatar">
                    <span>E</span>
                  </div>
                  <div className="ask-emilia-text">
                    <p className="ask-emilia-heading">Can't find what you need?</p>
                    <p className="ask-emilia-description">
                      Emilia can answer questions about features, troubleshooting, and more.
                    </p>
                  </div>
                </div>
                <button
                  className="ask-emilia-button"
                  onClick={() => setShowChat(true)}
                >
                  <span className="ask-emilia-button-icon">?</span>
                  <span>Ask Emilia</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
