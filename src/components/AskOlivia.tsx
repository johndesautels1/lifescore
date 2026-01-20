/**
 * LIFE SCORE™ Ask Olivia Component
 * AI Assistant with D-ID/HeyGen avatar integration
 * Glassmorphic design with iframe container
 */

import React, { useState } from 'react';
import './AskOlivia.css';

interface AskOliviaProps {
  // Future: Pass comparison data for Olivia's context
  comparisonData?: {
    city1?: string;
    city2?: string;
    winner?: string;
  };
}

const AskOlivia: React.FC<AskOliviaProps> = ({ comparisonData }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);

  // Placeholder URL - will be replaced with actual D-ID/HeyGen embed
  const OLIVIA_EMBED_URL = process.env.REACT_APP_OLIVIA_EMBED_URL || '';

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="ask-olivia">
      {/* Hero Section */}
      <div className="olivia-hero card">
        <div className="hero-content">
          <div className="olivia-avatar-preview">
            <div className="avatar-circle">
              <span className="avatar-icon">🎙️</span>
            </div>
            <div className="pulse-ring"></div>
            <div className="pulse-ring delay-1"></div>
            <div className="pulse-ring delay-2"></div>
          </div>
          <h2 className="olivia-title">Meet Olivia</h2>
          <p className="olivia-subtitle">Your AI Freedom Advisor</p>
          <p className="olivia-description">
            Ask Olivia anything about your comparison results, specific metrics,
            or get personalized recommendations based on your priorities.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="olivia-actions card">
        <h3>Quick Questions</h3>
        <div className="action-buttons">
          <button
            className="action-btn"
            onClick={() => setShowChat(true)}
          >
            <span className="action-icon">🏆</span>
            <span className="action-text">Explain the winner</span>
          </button>
          <button
            className="action-btn"
            onClick={() => setShowChat(true)}
          >
            <span className="action-icon">📊</span>
            <span className="action-text">Compare specific metrics</span>
          </button>
          <button
            className="action-btn"
            onClick={() => setShowChat(true)}
          >
            <span className="action-icon">🎯</span>
            <span className="action-text">Best city for my priorities</span>
          </button>
          <button
            className="action-btn"
            onClick={() => setShowChat(true)}
          >
            <span className="action-icon">⚖️</span>
            <span className="action-text">Deep dive on laws</span>
          </button>
        </div>
      </div>

      {/* Chat Interface */}
      {showChat && (
        <div className="olivia-chat-container card">
          <div className="chat-header">
            <div className="chat-title">
              <span className="chat-avatar">🎙️</span>
              <div>
                <h3>Olivia</h3>
                <span className="chat-status">
                  <span className="status-dot"></span>
                  Online
                </span>
              </div>
            </div>
            <button
              className="close-chat-btn"
              onClick={() => setShowChat(false)}
            >
              ✕
            </button>
          </div>

          {OLIVIA_EMBED_URL ? (
            <div className="chat-iframe-container">
              {isLoading && (
                <div className="iframe-loading">
                  <div className="loading-spinner"></div>
                  <p>Connecting to Olivia...</p>
                </div>
              )}
              <iframe
                src={OLIVIA_EMBED_URL}
                className="olivia-iframe"
                title="Ask Olivia AI Assistant"
                onLoad={handleIframeLoad}
                allow="microphone; camera"
              />
            </div>
          ) : (
            <div className="chat-placeholder">
              <div className="placeholder-content">
                <span className="placeholder-icon">🚧</span>
                <h4>Coming Soon</h4>
                <p>
                  Olivia's video avatar is being configured.
                  Soon you'll be able to have natural conversations
                  about your freedom comparison results.
                </p>
                <div className="features-preview">
                  <div className="feature-item">
                    <span>🎥</span>
                    <span>Video AI Avatar</span>
                  </div>
                  <div className="feature-item">
                    <span>🗣️</span>
                    <span>Voice Conversation</span>
                  </div>
                  <div className="feature-item">
                    <span>📊</span>
                    <span>Data-Aware Responses</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Cards */}
      <div className="olivia-info-grid">
        <div className="info-card card">
          <span className="info-icon">🧠</span>
          <h4>GPT-Powered</h4>
          <p>Olivia is powered by advanced AI with access to all your comparison data and LIFE SCORE methodology.</p>
        </div>
        <div className="info-card card">
          <span className="info-icon">🎥</span>
          <h4>Video Avatar</h4>
          <p>Interact with a realistic AI avatar for a more personal, engaging experience.</p>
        </div>
        <div className="info-card card">
          <span className="info-icon">📈</span>
          <h4>Data Context</h4>
          <p>Olivia knows your comparison results and can explain any metric in detail.</p>
        </div>
      </div>
    </div>
  );
};

export default AskOlivia;
