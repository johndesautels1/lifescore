/**
 * LIFE SCORE™ Help Modal
 *
 * Modal container with documentation tabs and Emilia AI chat.
 * Tabs: User Manual | Customer Service | Tech Support | Legal | App Schema | Judge Equations | Prompts | APIs
 *
 * Access Control:
 * - User Manual: All authenticated users
 * - All other tabs: Admin only
 *
 * Features:
 * - Tab navigation for different manuals
 * - "Ask Emilia" button to open AI chat
 * - Smooth transitions and responsive design
 */

import React, { useState, useEffect, useCallback } from 'react';
import ManualViewer from './ManualViewer';
import PromptsManager from './PromptsManager';
import EnvConfigPanel from './EnvConfigPanel';
import EmiliaChat from './EmiliaChat';
import { useAuth } from '../contexts/AuthContext';
import './HelpModal.css';

export type ManualTabType = 'csm' | 'tech' | 'user' | 'legal' | 'schema' | 'equations' | 'prompts' | 'apis';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Tabs configuration with access level
const ALL_TABS: { id: ManualTabType; label: string; icon: string; adminOnly: boolean }[] = [
  { id: 'user', label: 'User Manual', icon: '📖', adminOnly: false },
  { id: 'csm', label: 'Customer Service', icon: '💬', adminOnly: true },
  { id: 'tech', label: 'Tech Support', icon: '🔧', adminOnly: true },
  { id: 'legal', label: 'Legal', icon: '⚖️', adminOnly: true },
  { id: 'schema', label: 'App Schema', icon: '🗄️', adminOnly: true },
  { id: 'equations', label: 'Judge Equations', icon: '🧮', adminOnly: true },
  { id: 'prompts', label: 'Prompts', icon: '📝', adminOnly: true },
  { id: 'apis', label: 'APIs', icon: '🔑', adminOnly: true },
];

// Admin emails that can access restricted manuals
const ADMIN_EMAILS = ['cluesnomads@gmail.com', 'brokerpinellas@gmail.com', 'jdes7@aol.com'];

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<ManualTabType>('user');
  const [showChat, setShowChat] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Get user info for access control
  const { user } = useAuth();
  const userEmail = user?.email || null;
  const isAdmin = userEmail ? ADMIN_EMAILS.includes(userEmail.toLowerCase()) : false;

  // Filter tabs based on admin status
  const visibleTabs = ALL_TABS.filter(tab => !tab.adminOnly || isAdmin);

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
      role="dialog"
      aria-modal="true"
      aria-label="Help"
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
            {visibleTabs.map((tab) => (
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
              {activeTab === 'prompts' ? (
                <PromptsManager />
              ) : activeTab === 'apis' ? (
                <EnvConfigPanel />
              ) : (
                <ManualViewer type={activeTab} userEmail={userEmail} />
              )}

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
