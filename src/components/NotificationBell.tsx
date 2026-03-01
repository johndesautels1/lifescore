/**
 * LIFE SCORE - Notification Bell Component
 * Bell icon in the header with unread count badge and dropdown list.
 *
 * Clues Intelligence LTD
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import type { Notification } from '../types/database';
import './NotificationBell.css';

/** Format a timestamp to relative time (e.g., "2m ago", "1h ago") */
function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/** Icon for notification type */
function notificationIcon(n: Notification): string {
  if (n.title.toLowerCase().includes('comparison')) return '📊';
  if (n.title.toLowerCase().includes('judge')) return '⚖️';
  if (n.title.toLowerCase().includes('court order')) return '🎬';
  if (n.title.toLowerCase().includes('freedom tour')) return '🌍';
  if (n.title.toLowerCase().includes('gamma') || n.title.toLowerCase().includes('report')) return '📑';
  if (n.type === 'email') return '📧';
  return '🔔';
}

interface NotificationBellProps {
  /** SPA navigation handler — receives the notification link (e.g. "/?tab=visuals").
   *  When provided the bell navigates in-app instead of doing a full page reload. */
  onNavigate?: (link: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onNavigate }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleBellClick = () => {
    setIsOpen(prev => !prev);
  };

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) {
      markAsRead(n.id);
    }
    if (n.link) {
      if (onNavigate) {
        onNavigate(n.link);
      } else {
        // Fallback: full reload (should not happen when mounted inside App)
        window.location.href = n.link;
      }
    }
    setIsOpen(false);
  };

  // Only show in-app notifications in dropdown (not email record entries)
  const visibleNotifications = notifications.filter(n => n.type === 'in_app');

  return (
    <div className="notification-bell-wrapper" ref={dropdownRef}>
      <button
        className="notification-bell-btn"
        onClick={handleBellClick}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown" role="menu">
          <div className="notification-dropdown-header">
            <span className="notification-dropdown-title">Notifications</span>
            {unreadCount > 0 && (
              <button
                className="notification-mark-all"
                onClick={() => markAllAsRead()}
              >
                Mark all read
              </button>
            )}
            <button
              className="notification-close-btn"
              onClick={() => setIsOpen(false)}
              aria-label="Close notifications"
              type="button"
            >
              ✕
            </button>
          </div>

          <div className="notification-list">
            {visibleNotifications.length === 0 ? (
              <div className="notification-empty">
                <span>🔔</span>
                <p>No notifications yet</p>
              </div>
            ) : (
              visibleNotifications.map(n => (
                <button
                  key={n.id}
                  className={`notification-item ${!n.read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(n)}
                  role="menuitem"
                >
                  <span className="notification-icon">{notificationIcon(n)}</span>
                  <div className="notification-content">
                    <span className="notification-title">{n.title}</span>
                    {n.message && <span className="notification-message">{n.message}</span>}
                    <span className="notification-time">{timeAgo(n.created_at)}</span>
                  </div>
                  {!n.read && <span className="notification-dot" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
