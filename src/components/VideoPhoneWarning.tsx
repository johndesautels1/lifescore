/**
 * VideoPhoneWarning
 * Small banner that appears above/near video players on mobile devices.
 * Warns users that making or receiving phone calls will mute video audio.
 * Dismissible per-session (sessionStorage) so it doesn't nag forever.
 */

import React, { useState, useEffect } from 'react';
import './VideoPhoneWarning.css';

const SESSION_KEY = 'lifescore_phone_warning_dismissed';
const MOBILE_BREAKPOINT = 768;

const VideoPhoneWarning: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    if (isMobile) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="video-phone-warning">
      <span className="vpw-icon">&#128222;</span>
      <span className="vpw-text">
        <strong>Phone calls will mute video audio.</strong> Avoid making or answering calls while videos are playing.
      </span>
      <button className="vpw-close" onClick={dismiss} aria-label="Dismiss warning">×</button>
    </div>
  );
};

export default VideoPhoneWarning;
