/**
 * LIFE SCORE™ Olivia Avatar Component
 *
 * Real-time photorealistic avatar using Simli AI.
 * Replaces D-ID for cost-effective interactive chat.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import React, { useRef, useEffect, useState } from 'react';
import { useSimli } from '../hooks/useSimli';
import './OliviaAvatar.css';

interface OliviaAvatarProps {
  onReady?: () => void;
  onSpeakingStart?: () => void;
  onSpeakingEnd?: () => void;
  onError?: (error: string) => void;
  autoConnect?: boolean;
  className?: string;
}

export const OliviaAvatar: React.FC<OliviaAvatarProps> = ({
  onReady,
  onSpeakingStart,
  onSpeakingEnd,
  onError,
  autoConnect = true,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [showFallback, setShowFallback] = useState(false);

  // Pass videoRef and audioRef to useSimli so it can attach the WebRTC stream
  const {
    status,
    isConnected,
    isSpeaking,
    connect,
    disconnect,
    interrupt,
    error,
  } = useSimli({
    videoRef,
    audioRef,
    onError: (err) => {
      console.error('[OliviaAvatar] Simli error:', err);
      onError?.(err);
      setShowFallback(true);
    },
  });

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect]);

  // Notify parent of status changes
  useEffect(() => {
    if (isConnected && onReady) {
      onReady();
    }
  }, [isConnected, onReady]);

  useEffect(() => {
    if (isSpeaking && onSpeakingStart) {
      onSpeakingStart();
    } else if (!isSpeaking && status === 'connected' && onSpeakingEnd) {
      onSpeakingEnd();
    }
  }, [isSpeaking, status, onSpeakingStart, onSpeakingEnd]);

  // Show fallback when there's an error (callback already notified parent)
  useEffect(() => {
    if (error) {
      setShowFallback(true);
    }
  }, [error]);

  // Status indicator colors
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return '#22c55e';
      case 'speaking': return '#3b82f6';
      case 'listening': return '#f59e0b';
      case 'connecting': return '#fbbf24';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'READY';
      case 'speaking': return 'SPEAKING';
      case 'listening': return 'LISTENING';
      case 'connecting': return 'CONNECTING...';
      case 'error': return 'OFFLINE';
      default: return 'STANDBY';
    }
  };

  return (
    <div className={`olivia-avatar ${className}`}>
      {/* Video Container */}
      <div className="avatar-video-container">
        {/* Simli Video Stream */}
        {!showFallback ? (
          <>
            <video
              ref={videoRef}
              className="avatar-video"
              autoPlay
              playsInline
              muted
            />
            <audio ref={audioRef} autoPlay />
          </>
        ) : (
          /* Fallback Static Image */
          <div className="avatar-fallback">
            <img
              src="/images/olivia-avatar.jpg"
              alt="Olivia"
              className="avatar-image"
            />
            <div className="avatar-pulse" />
          </div>
        )}

        {/* Status Overlay */}
        <div className="avatar-status-overlay">
          <div
            className="status-indicator"
            style={{ backgroundColor: getStatusColor() }}
          />
          <span className="status-text">{getStatusText()}</span>
        </div>

        {/* Speaking Animation */}
        {isSpeaking && (
          <div className="speaking-indicator">
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
            <div className="wave-bar" />
          </div>
        )}

        {/* Connection Error */}
        {status === 'error' && (
          <div className="avatar-error-overlay">
            <span className="error-icon">⚠️</span>
            <p className="error-message">{error || 'Connection failed'}</p>
            <button className="retry-btn" onClick={() => { setShowFallback(false); connect(); }}>
              Retry Connection
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      {isConnected && isSpeaking && (
        <button className="interrupt-btn" onClick={interrupt}>
          ⏹ Interrupt
        </button>
      )}
    </div>
  );
};

// Export speak function for external use
export { useSimli } from '../hooks/useSimli';

export default OliviaAvatar;
