/**
 * LIFE SCORE - useNotifications Hook
 * Polls the notifications table for the current user.
 * Provides unread count (for bell badge) and full notification list (for dropdown).
 *
 * Clues Intelligence LTD
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Notification } from '../types/database';

const POLL_INTERVAL_MS = 30000; // 30 seconds
const MAX_NOTIFICATIONS = 50;   // Cap dropdown list

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || !user?.id || !isSupabaseConfigured()) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(MAX_NOTIFICATIONS);

      if (error) {
        console.error('[Notifications] Fetch error:', error.message);
        return;
      }

      const items = (data || []) as Notification[];
      setNotifications(items);
      setUnreadCount(items.filter(n => !n.read && n.type === 'in_app').length);
    } catch (err) {
      console.error('[Notifications] Fetch exception:', err);
    }
  }, [user?.id, isAuthenticated]);

  // Initial fetch + polling
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);
    fetchNotifications().finally(() => setIsLoading(false));

    // Poll every 30s
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAuthenticated, user?.id, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    if (!user?.id) return;

    // Optimistic update
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Notifications] Mark read error:', error.message);
      // Revert on failure
      await fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('[Notifications] Mark all read error:', error.message);
      await fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
