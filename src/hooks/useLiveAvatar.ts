/**
 * LIFE SCORE - useLiveAvatar: Olivia's live face on HeyGen LiveAvatar (LITE mode).
 *
 * The connect / speak / keep-alive / teardown sequence is the questionnaire
 * engine's (src/platform/OliviaPresenter.tsx), driven by the engine's protocol
 * module ported verbatim (src/lib/liveAvatar/liteProtocol.ts):
 *   1. our server starts the session (the vendor key never reaches the browser);
 *   2. the LiveKit room carries her face and audio into the page;
 *   3. her voice goes down the session socket as PCM 24 kHz, in paced chunks,
 *      ONLY after the socket has said "connected" (earlier sends are discarded);
 *   4. keep-alive every 2.5 minutes; stop on disconnect, unmount and page hide,
 *      because the session bills while it is open.
 *
 * Every step reports failure as a value. useOliviaFace() falls back to Olivia's
 * previous face (Simli, then D-ID) when this one cannot connect.
 *
 * Clues Intelligence LTD
 * © 2025-2026 All Rights Reserved
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LITE_KEEP_ALIVE_MS,
  interruptCommand,
  isClosedEvent,
  isConnectedEvent,
  isSpeakEndedEvent,
  isSpeakStartedEvent,
  planUtterance,
  sendUtterance,
  utteranceId,
  type LiteCommand,
} from '../lib/liveAvatar/liteProtocol';
import {
  fetchLiveSpeech,
  keepLiveSessionAlive,
  startLiveSession,
  stopLiveSession,
  type LiveSession,
} from '../lib/liveAvatar/oliviaLive';

/** The engine's connect ceiling (OliviaPresenter.tsx CONNECT_TIMEOUT_MS). */
const CONNECT_TIMEOUT_MS = 15_000;

export type LiveAvatarStatus = 'idle' | 'connecting' | 'connected' | 'speaking' | 'error' | 'disconnected';

export interface UseLiveAvatarOptions {
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}

export interface UseLiveAvatarReturn {
  status: LiveAvatarStatus;
  error: string | null;
  isConnected: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  /** Resolves true once she is connected, false (with `error` set) when she could not be. */
  connect: () => Promise<boolean>;
  speak: (text: string) => Promise<void>;
  disconnect: () => void;
  interrupt: () => void;
  pause: () => void;
  resume: () => void;
}

export function useLiveAvatar(options: UseLiveAvatarOptions = {}): UseLiveAvatarReturn {
  const { videoRef, audioRef } = options;
  const [status, setStatus] = useState<LiveAvatarStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const roomRef = useRef<{ disconnect: () => void } | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const sessionRef = useRef<LiveSession | null>(null);
  const extraAudioRef = useRef<HTMLMediaElement | null>(null);
  /** Aborts whatever she is part-way through saying. */
  const runRef = useRef<AbortController | null>(null);
  /** The socket has said "connected". Events before it are discarded by the vendor. */
  const readyRef = useRef(false);
  /** Ids stay unique across a session without a clock. */
  const seedRef = useRef(0);
  /** What she last said, so Resume can say it again. */
  const lastTextRef = useRef<string | null>(null);

  /** Send one vendor command, if the socket is open and has said hello. */
  const send = useCallback((message: LiteCommand) => {
    const socket = socketRef.current;
    if (socket === null || socket.readyState !== WebSocket.OPEN || !readyRef.current) return;
    socket.send(JSON.stringify(message));
  }, []);

  /** Close everything and stop the meter. Safe to call twice. */
  const teardown = useCallback((leaving: boolean) => {
    runRef.current?.abort();
    runRef.current = null;
    readyRef.current = false;
    socketRef.current?.close();
    socketRef.current = null;
    roomRef.current?.disconnect();
    roomRef.current = null;
    extraAudioRef.current?.remove();
    extraAudioRef.current = null;
    const session = sessionRef.current;
    sessionRef.current = null;
    if (session !== null) void stopLiveSession(session.sessionId, leaving);
  }, []);

  /** She was live when the tab was hidden, so she comes back when it is shown. */
  const reconnectOnShowRef = useRef(false);
  const connectRef = useRef<(() => Promise<boolean>) | null>(null);

  // The meter stops when they leave, however they leave (the engine's cost brake).
  // Switching tabs ends the paid session; coming back opens a fresh one.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (sessionRef.current !== null) {
          reconnectOnShowRef.current = true;
          teardown(true);
          setStatus('disconnected');
        }
      } else if (reconnectOnShowRef.current) {
        reconnectOnShowRef.current = false;
        void connectRef.current?.();
      }
    };
    const onPageHide = () => teardown(true);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      teardown(true);
    };
  }, [teardown]);

  // Keep the session past the vendor's five-minute idle timeout.
  const live = status === 'connected' || status === 'speaking';
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => {
      const session = sessionRef.current;
      if (session !== null) void keepLiveSessionAlive(session.sessionId);
    }, LITE_KEEP_ALIVE_MS);
    return () => clearInterval(timer);
  }, [live]);

  const connect = useCallback(async (): Promise<boolean> => {
    if (sessionRef.current !== null && readyRef.current) return true;
    setStatus('connecting');
    setError(null);
    // Nothing in here may throw: every failure becomes a sentence and `false`.
    try {
      const started = await startLiveSession();
      if (started.kind === 'error') {
        setError(started.message);
        setStatus('error');
        return false;
      }
      sessionRef.current = started.session;

      // Loaded on demand: nobody who never opens Olivia pays for the room client.
      const { Room, RoomEvent, Track } = await import('livekit-client');
      const room = new Room({ adaptiveStream: true, dynacast: true });
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Video && videoRef?.current) track.attach(videoRef.current);
        if (track.kind === Track.Kind.Audio) {
          if (audioRef?.current) {
            track.attach(audioRef.current);
          } else {
            const el = track.attach();
            el.volume = 1;
            extraAudioRef.current = el;
          }
        }
      });
      room.on(RoomEvent.Disconnected, () => setStatus('disconnected'));
      await room.connect(started.session.livekitUrl, started.session.livekitToken);
      roomRef.current = room;

      const failure = await new Promise<string | null>((resolve) => {
        const socket = new WebSocket(started.session.wsUrl);
        socketRef.current = socket;
        const timer = setTimeout(() => resolve("Olivia's connection didn't finish in time."), CONNECT_TIMEOUT_MS);
        socket.onmessage = (event: MessageEvent<string>) => {
          let message: unknown;
          try {
            message = JSON.parse(event.data);
          } catch {
            return;
          }
          if (isConnectedEvent(message)) {
            readyRef.current = true;
            clearTimeout(timer);
            resolve(null);
          } else if (isClosedEvent(message)) {
            readyRef.current = false;
            setStatus('disconnected');
          } else if (isSpeakStartedEvent(message)) {
            setStatus('speaking');
          } else if (isSpeakEndedEvent(message)) {
            setStatus((s) => (s === 'speaking' ? 'connected' : s));
          }
        };
        socket.onerror = () => {
          clearTimeout(timer);
          resolve("Olivia's connection dropped.");
        };
      });

      if (failure !== null) {
        teardown(false);
        setError(failure);
        setStatus('error');
        return false;
      }
      setStatus('connected');
      return true;
    } catch (err) {
      console.error('[useLiveAvatar] connect failed', err);
      teardown(false);
      setError("Olivia couldn't connect just now.");
      setStatus('error');
      return false;
    }
  }, [audioRef, teardown, videoRef]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const speak = useCallback(async (text: string): Promise<void> => {
    const words = text.trim();
    if (!words || !readyRef.current) return;
    lastTextRef.current = words;
    setIsPaused(false);
    runRef.current?.abort();
    const controller = new AbortController();
    runRef.current = controller;

    const spoken = await fetchLiveSpeech(words, controller.signal);
    if (controller.signal.aborted) return;
    if (spoken.kind === 'error') {
      setError(spoken.message);
      return;
    }
    seedRef.current += 1;
    setStatus('speaking');
    await sendUtterance(planUtterance(spoken.audioBase64, utteranceId(seedRef.current)), send, controller.signal);
  }, [send]);

  const interrupt = useCallback(() => {
    runRef.current?.abort();
    runRef.current = null;
    send(interruptCommand());
    setStatus((s) => (s === 'speaking' ? 'connected' : s));
  }, [send]);

  /** LITE has no mid-sentence pause: Pause stops her, Resume says the reply again. */
  const pause = useCallback(() => {
    interrupt();
    setIsPaused(true);
  }, [interrupt]);

  const resume = useCallback(() => {
    setIsPaused(false);
    if (lastTextRef.current) void speak(lastTextRef.current);
  }, [speak]);

  const disconnect = useCallback(() => {
    teardown(false);
    setIsPaused(false);
    setStatus('idle');
  }, [teardown]);

  return {
    status,
    error,
    isConnected: status === 'connected' || status === 'speaking',
    isSpeaking: status === 'speaking',
    isPaused,
    connect,
    speak,
    disconnect,
    interrupt,
    pause,
    resume,
  };
}
