/**
 * LIFE SCORE™ useEmilia Hook
 *
 * Manages Emilia chat state, including:
 * - Thread management with OpenAI Assistants API
 * - Message history
 * - Voice playback (TTS)
 * - Conversation export features
 */

import { useState, useEffect, useCallback, useRef } from 'react';
// FIX #73: Import cost tracking utilities
import { appendServiceCost, calculateTTSCost } from '../utils/costCalculator';
import { toastSuccess } from '../utils/toast';

export interface EmiliaMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
}

interface UseEmiliaReturn {
  messages: EmiliaMessage[];
  isLoading: boolean;
  isInitializing: boolean;
  error: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearConversation: () => void;
  downloadConversation: (format: 'json' | 'txt') => void;
  printConversation: () => void;
  shareConversation: () => Promise<void>;
  emailConversation: () => void;
  canShare: boolean;
  playMessage: (messageId: string, content: string) => Promise<void>;
  stopPlaying: () => void;
  isPlaying: boolean;
  playingMessageId: string | null;
}

// Session storage key for thread persistence
const THREAD_STORAGE_KEY = 'emilia_thread_id';
const MESSAGES_STORAGE_KEY = 'emilia_messages';

export function useEmilia(): UseEmiliaReturn {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<EmiliaMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load saved messages from session storage
  useEffect(() => {
    try {
      const savedMessages = sessionStorage.getItem(MESSAGES_STORAGE_KEY);
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);
        setMessages(
          parsed.map((m: EmiliaMessage) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          }))
        );
      }
    } catch (err) {
      console.error('[useEmilia] Error loading saved messages:', err);
    }
  }, []);

  // Save messages to session storage when they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(messages));
      } catch (err) {
        console.error('[useEmilia] Error saving messages:', err);
      }
    }
  }, [messages]);

  // Initialize thread on mount
  useEffect(() => {
    const initThread = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        // Check for existing thread
        const savedThreadId = sessionStorage.getItem(THREAD_STORAGE_KEY);

        if (savedThreadId && messages.length > 0) {
          // Resume existing thread
          setThreadId(savedThreadId);
          setIsInitializing(false);
          return;
        }

        // Create new thread
        const response = await fetch('/api/emilia/thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Failed to create thread: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.threadId) {
          setThreadId(data.threadId);
          sessionStorage.setItem(THREAD_STORAGE_KEY, data.threadId);

          // Don't add welcome message automatically - let the UI handle that
        } else {
          throw new Error(data.error || 'Failed to initialize chat');
        }
      } catch (err) {
        console.error('[useEmilia] Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize Emilia');
      } finally {
        setIsInitializing(false);
      }
    };

    initThread();
  }, []); // Empty deps - only run once on mount

  // Send message to Emilia
  const sendMessage = useCallback(
    async (text: string) => {
      if (!threadId || !text.trim()) return;

      const userMessage: EmiliaMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/emilia/message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            threadId,
            message: text.trim(),
          }),
        });

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && data.response) {
          const assistantMessage: EmiliaMessage = {
            id: data.response.id || `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.response.content,
            timestamp: new Date(),
          };

          setMessages((prev) => [...prev, assistantMessage]);
        } else {
          throw new Error(data.error || 'Failed to get response');
        }
      } catch (err) {
        console.error('[useEmilia] Send error:', err);
        setError(err instanceof Error ? err.message : 'Failed to send message');
      } finally {
        setIsLoading(false);
      }
    },
    [threadId]
  );

  // Clear conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
    setThreadId(null);
    setError(null);
    sessionStorage.removeItem(THREAD_STORAGE_KEY);
    sessionStorage.removeItem(MESSAGES_STORAGE_KEY);
    stopPlayingRef.current();

    // Re-initialize thread
    const reinit = async () => {
      setIsInitializing(true);
      try {
        const response = await fetch('/api/emilia/thread', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (data.success && data.threadId) {
          setThreadId(data.threadId);
          sessionStorage.setItem(THREAD_STORAGE_KEY, data.threadId);
        }
      } catch (err) {
        console.error('[useEmilia] Reinit error:', err);
        setError('Failed to restart conversation');
      } finally {
        setIsInitializing(false);
      }
    };
    reinit();
  }, []);

  // Download conversation
  const downloadConversation = useCallback(
    (format: 'json' | 'txt') => {
      if (messages.length === 0) return;

      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        content = JSON.stringify(
          messages.map((m) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp.toISOString(),
          })),
          null,
          2
        );
        filename = `emilia-conversation-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        const header = `LIFE SCORE - Emilia Conversation\nExported: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
        content =
          header +
          messages
            .map((m) => {
              const sender = m.role === 'assistant' ? 'EMILIA' : 'YOU';
              const time = m.timestamp.toLocaleString();
              return `[${time}] ${sender}:\n${m.content}\n`;
            })
            .join('\n');
        filename = `emilia-conversation-${new Date().toISOString().split('T')[0]}.txt`;
        mimeType = 'text/plain';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    [messages]
  );

  // Print conversation
  const printConversation = useCallback(() => {
    if (messages.length === 0) return;

    const printContent = `
      <html>
        <head>
          <title>LIFE SCORE - Emilia Conversation</title>
          <style>
            body { font-family: 'Inter', -apple-system, sans-serif; padding: 40px; max-width: 700px; margin: 0 auto; }
            h1 { color: #14B8A6; font-size: 24px; border-bottom: 2px solid #14B8A6; padding-bottom: 10px; }
            .meta { color: #64748b; font-size: 12px; margin-bottom: 30px; }
            .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
            .assistant { background: #f0fdfa; border-left: 3px solid #14B8A6; }
            .user { background: #0f172a; color: #e2e8f0; border-left: 3px solid #64748b; }
            .sender { font-weight: 700; font-size: 11px; letter-spacing: 0.1em; margin-bottom: 8px; }
            .assistant .sender { color: #14B8A6; }
            .user .sender { color: #94a3b8; }
            .content { line-height: 1.6; white-space: pre-wrap; }
            .time { font-size: 10px; color: #94a3b8; margin-top: 8px; }
          </style>
        </head>
        <body>
          <h1>EMILIA - Help Assistant</h1>
          <div class="meta">${new Date().toLocaleString()}</div>
          ${messages
            .map(
              (msg) => `
            <div class="message ${msg.role}">
              <div class="sender">${msg.role === 'assistant' ? 'EMILIA' : 'YOU'}</div>
              <div class="content">${msg.content}</div>
              <div class="time">${msg.timestamp.toLocaleTimeString()}</div>
            </div>
          `
            )
            .join('')}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  }, [messages]);

  // Check if Web Share API is supported
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  // Share conversation using Web Share API
  const shareConversation = useCallback(async () => {
    if (messages.length === 0) return;

    const conversationText = messages
      .map((m) => {
        const sender = m.role === 'assistant' ? 'Emilia' : 'Me';
        return `${sender}: ${m.content}`;
      })
      .join('\n\n');

    const shareData = {
      title: 'LIFE SCORE - Emilia Help Conversation',
      text: `My conversation with Emilia (LIFE SCORE Help Assistant):\n\n${conversationText}\n\n---\nPowered by clueslifescore.com`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.text);
        toastSuccess('Conversation copied to clipboard!');
      }
    } catch (err) {
      // User cancelled or error - silently fail
      if ((err as Error).name !== 'AbortError') {
        console.error('[useEmilia] Share error:', err);
      }
    }
  }, [messages]);

  // Email conversation
  const emailConversation = useCallback(() => {
    if (messages.length === 0) return;

    const conversationText = messages
      .map((m) => {
        const sender = m.role === 'assistant' ? 'Emilia' : 'Me';
        const time = m.timestamp.toLocaleTimeString();
        return `[${time}] ${sender}:\n${m.content}`;
      })
      .join('\n\n');

    const subject = encodeURIComponent('LIFE SCORE - Emilia Help Conversation');
    const body = encodeURIComponent(
      `My conversation with Emilia (LIFE SCORE Help Assistant)\n` +
      `Date: ${new Date().toLocaleDateString()}\n\n` +
      `${conversationText}\n\n` +
      `---\n` +
      `Powered by clueslifescore.com`
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [messages]);

  // Stop playing audio (used in clearConversation)
  const stopPlayingRef = useRef(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (speechSynthRef.current) {
      window.speechSynthesis?.cancel();
      speechSynthRef.current = null;
    }
    setIsPlaying(false);
    setPlayingMessageId(null);
  });

  // Stop playing
  const stopPlaying = useCallback(() => {
    stopPlayingRef.current();
  }, []);

  // Play message with TTS
  const playMessage = useCallback(
    async (messageId: string, content: string) => {
      // Stop any current playback
      stopPlaying();

      setIsPlaying(true);
      setPlayingMessageId(messageId);

      try {
        // Try ElevenLabs TTS first
        const response = await fetch('/api/emilia/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: content }),
        });

        if (response.ok) {
          const data = await response.json();
          // FIX #73: Record Emilia TTS cost
          if (data.usage) {
            const provider = data.usage.provider === 'openai' ? 'openai' as const : 'elevenlabs' as const;
            const chars = data.usage.characterCount;
            const cost = calculateTTSCost(provider, chars);
            appendServiceCost('tts', {
              provider,
              characters: chars,
              cost,
              timestamp: Date.now(),
              context: 'emilia-tts',
            });
          } else if (content.length > 0) {
            // Fallback: estimate from input text
            const cost = calculateTTSCost('elevenlabs', Math.min(content.length, 5000));
            appendServiceCost('tts', {
              provider: 'elevenlabs',
              characters: Math.min(content.length, 5000),
              cost,
              timestamp: Date.now(),
              context: 'emilia-tts-estimated',
            });
          }
          if (data.success && data.audioUrl) {
            const audio = new Audio(data.audioUrl);
            audioRef.current = audio;

            audio.onended = () => {
              setIsPlaying(false);
              setPlayingMessageId(null);
              audioRef.current = null;
            };

            audio.onerror = () => {
              // Fallback to browser TTS
              fallbackToSpeechSynthesis(content, messageId);
            };

            await audio.play();
            return;
          }
        }

        // Fallback to browser TTS
        fallbackToSpeechSynthesis(content, messageId);
      } catch (err) {
        console.error('[useEmilia] TTS error:', err);
        // Fallback to browser TTS
        fallbackToSpeechSynthesis(content, messageId);
      }
    },
    [stopPlaying]
  );

  // Browser TTS fallback
  const fallbackToSpeechSynthesis = (content: string, _messageId: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.rate = 0.9;
      speechSynthRef.current = utterance;

      utterance.onend = () => {
        setIsPlaying(false);
        setPlayingMessageId(null);
        speechSynthRef.current = null;
      };

      utterance.onerror = () => {
        setIsPlaying(false);
        setPlayingMessageId(null);
        speechSynthRef.current = null;
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlaying(false);
      setPlayingMessageId(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPlayingRef.current();
    };
  }, []);

  return {
    messages,
    isLoading,
    isInitializing,
    error,
    sendMessage,
    clearConversation,
    downloadConversation,
    printConversation,
    shareConversation,
    emailConversation,
    canShare,
    playMessage,
    stopPlaying,
    isPlaying,
    playingMessageId,
  };
}
