/**
 * LIFE SCORE™ Emilia Help Bubble
 *
 * Floating help button that appears on ALL pages.
 * Position: Fixed, bottom-left (opposite side from Olivia)
 * Color: Teal (#14B8A6)
 *
 * Click opens HelpModal with documentation tabs and Emilia AI chat.
 * Available to ALL users (no tier restriction).
 */

import React, { useState } from 'react';
import HelpModal from './HelpModal';
import { useDraggable } from '../hooks/useDraggable';
import './HelpBubble.css';

const HelpBubble: React.FC = () => {
  const { position, isDragging, wasDragged, handlePointerDown } = useDraggable({
    storageKey: 'lifescore_help_bubble_pos',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasUnreadTip, setHasUnreadTip] = useState(false);

  const handleOpen = () => {
    if (wasDragged) return;
    setIsModalOpen(true);
    setHasUnreadTip(false);
  };

  const handleClose = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Floating Help Button */}
      <button
        className={`help-bubble ${hasUnreadTip ? 'has-notification' : ''} ${isDragging ? 'dragging' : ''}`}
        onClick={handleOpen}
        onPointerDown={handlePointerDown}
        aria-label="Get help from Emilia"
        title="Need help? Ask Emilia"
        style={{
          transform: `translate(${position.x}px, ${-position.y}px)`,
          touchAction: 'none',
        }}
      >
        <div className="help-bubble-inner">
          <span className="help-bubble-icon">?</span>
          <div className="help-bubble-rings">
            <span className="ring ring-1"></span>
            <span className="ring ring-2"></span>
          </div>
        </div>
        <span className="help-bubble-label">Help</span>
        {hasUnreadTip && <span className="help-bubble-badge">1</span>}
        <span className="help-bubble-tooltip">Ask Emilia for Help</span>
      </button>

      {/* Help Modal */}
      <HelpModal isOpen={isModalOpen} onClose={handleClose} />
    </>
  );
};

export default HelpBubble;
