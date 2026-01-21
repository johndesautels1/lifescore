/**
 * LIFE SCORE™ Ask Olivia Component
 * AI Assistant with D-ID/HeyGen avatar integration
 * Full chat, voice, and video avatar support
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { EnhancedComparisonResult } from '../types/enhancedComparison';
import type { ComparisonResult } from '../types/metrics';
import type { OliviaQuickAction } from '../types/olivia';
import { DEFAULT_QUICK_ACTIONS } from '../types/olivia';
import { useOliviaChat } from '../hooks/useOliviaChat';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useTTS } from '../hooks/useTTS';
import './AskOlivia.css';

interface AskOliviaProps {
  comparisonResult?: EnhancedComparisonResult | ComparisonResult | null;
}

const AskOlivia: React.FC<AskOliviaProps> = ({ comparisonResult }) => {
  // Chat state
  const {
    messages,
    isTyping,
    error: chatError,
    sendMessage,
    clearHistory,
  } = useOliviaChat(comparisonResult);

  // Voice recognition
  const {
    isSupported: voiceSupported,
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceRecognition({
    onResult: (text, isFinal) => {
      if (isFinal && text.trim()) {
        handleSendMessage(text.trim());
        resetTranscript();
      }
    },
  });

  // TTS
  const { isPlaying: isSpeaking, play: speakText, stop: stopSpeaking } = useTTS();

  // Local state
  const [inputText, setInputText] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-speak assistant responses
  useEffect(() => {
    if (autoSpeak && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant' && !lastMessage.audioUrl) {
        speakText(lastMessage.content);
      }
    }
  }, [messages, autoSpeak, speakText]);

  // Handle sending a message
  const handleSendMessage = useCallback(async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    setInputText('');
    await sendMessage(messageText);
  }, [inputText, sendMessage]);

  // Handle quick action
  const handleQuickAction = useCallback((action: OliviaQuickAction) => {
    setShowChat(true);
    handleSendMessage(action.prompt);
  }, [handleSendMessage]);

  // Handle voice toggle
  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Check if comparison data is available
  const hasComparisonData = !!comparisonResult;
  const city1 = comparisonResult?.city1?.city || 'City 1';
  const city2 = comparisonResult?.city2?.city || 'City 2';

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
            {hasComparisonData
              ? `I'm ready to discuss your ${city1} vs ${city2} comparison. Ask me about specific metrics, category breakdowns, or personalized recommendations.`
              : 'Run a city comparison first, then come back to discuss the results with me.'}
          </p>
          {!showChat && hasComparisonData && (
            <button className="start-chat-btn" onClick={() => setShowChat(true)}>
              Start Conversation
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="olivia-actions card">
        <h3>Quick Questions</h3>
        <div className="action-buttons">
          {DEFAULT_QUICK_ACTIONS.slice(0, 8).map((action) => (
            <button
              key={action.id}
              className={`action-btn ${!hasComparisonData ? 'disabled' : ''}`}
              onClick={() => hasComparisonData && handleQuickAction(action)}
              disabled={!hasComparisonData}
              title={action.prompt}
            >
              <span className="action-icon">{action.icon}</span>
              <span className="action-text">{action.label}</span>
            </button>
          ))}
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
                  <span className={`status-dot ${isTyping ? 'typing' : ''}`}></span>
                  {isTyping ? 'Thinking...' : isSpeaking ? 'Speaking...' : 'Online'}
                </span>
              </div>
            </div>
            <div className="chat-controls">
              <button
                className={`control-btn ${autoSpeak ? 'active' : ''}`}
                onClick={() => setAutoSpeak(!autoSpeak)}
                title={autoSpeak ? 'Auto-speak ON' : 'Auto-speak OFF'}
              >
                {autoSpeak ? '🔊' : '🔇'}
              </button>
              <button
                className="control-btn"
                onClick={clearHistory}
                title="Clear chat"
              >
                🗑️
              </button>
              <button
                className="close-chat-btn"
                onClick={() => setShowChat(false)}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <p>
                  Hi! I'm Olivia, your AI freedom advisor. I have full context of your
                  <strong> {city1} vs {city2}</strong> comparison.
                  Ask me anything about the results!
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.role}`}>
                <div className="message-avatar">
                  {msg.role === 'assistant' ? '🎙️' : '👤'}
                </div>
                <div className="message-content">
                  <div className="message-text">{msg.content}</div>
                  <div className="message-meta">
                    <span className="message-time">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.role === 'assistant' && (
                      <button
                        className="speak-btn"
                        onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.content)}
                        title={isSpeaking ? 'Stop speaking' : 'Speak this message'}
                      >
                        {isSpeaking ? '⏹️' : '🔊'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="chat-message assistant">
                <div className="message-avatar">🎙️</div>
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            {chatError && (
              <div className="chat-error">
                {chatError.message}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Voice Transcript */}
          {(transcript || interimTranscript) && (
            <div className="voice-transcript">
              <span className="transcript-label">🎤 Listening:</span>
              <span className="transcript-text">
                {transcript}
                <span className="interim">{interimTranscript}</span>
              </span>
            </div>
          )}

          {/* Chat Input */}
          <div className="chat-input-container">
            <div className="chat-input-wrapper">
              <textarea
                className="chat-input"
                placeholder="Ask Olivia anything about your comparison..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={1}
              />
              {voiceSupported && (
                <button
                  className={`voice-btn ${isListening ? 'listening' : ''}`}
                  onClick={handleVoiceToggle}
                  title={isListening ? 'Stop listening' : 'Start voice input'}
                >
                  {isListening ? '⏹️' : '🎤'}
                </button>
              )}
              <button
                className="send-btn"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() && !isListening}
              >
                ➤
              </button>
            </div>
          </div>
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
          <span className="info-icon">🎤</span>
          <h4>Voice Enabled</h4>
          <p>Speak naturally with voice input and hear Olivia's responses read aloud.</p>
        </div>
        <div className="info-card card">
          <span className="info-icon">📈</span>
          <h4>Data Context</h4>
          <p>Olivia knows all 100 metrics, sources, and can explain any detail of your comparison.</p>
        </div>
      </div>
    </div>
  );
};

export default AskOlivia;
