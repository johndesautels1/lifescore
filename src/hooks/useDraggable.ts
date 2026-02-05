/**
 * LIFE SCORE™ useDraggable Hook
 *
 * Provides drag-to-reposition for floating UI elements (Olivia/Emilia bubbles).
 * Uses Pointer Events API for unified mouse/touch handling.
 *
 * - Click vs drag discrimination (5px threshold)
 * - Session persistence via localStorage
 * - Viewport boundary clamping
 */

import { useState, useRef, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface UseDraggableOptions {
  storageKey: string;
  dragThreshold?: number;
}

interface UseDraggableReturn {
  position: Position;
  isDragging: boolean;
  wasDragged: boolean;
  handlePointerDown: (e: React.PointerEvent) => void;
}

export function useDraggable({
  storageKey,
  dragThreshold = 5,
}: UseDraggableOptions): UseDraggableReturn {
  const [position, setPosition] = useState<Position>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { x: 0, y: 0 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const [wasDragged, setWasDragged] = useState(false);
  const wasDraggedRef = useRef(false);
  const dragStartRef = useRef<{
    pointerX: number;
    pointerY: number;
    posX: number;
    posY: number;
  } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;

    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    wasDraggedRef.current = false;
    setWasDragged(false);

    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      posX: position.x,
      posY: position.y,
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (!dragStartRef.current) return;

      const dx = ev.clientX - dragStartRef.current.pointerX;
      const dy = ev.clientY - dragStartRef.current.pointerY;

      if (!wasDraggedRef.current && Math.sqrt(dx * dx + dy * dy) < dragThreshold) {
        return;
      }

      wasDraggedRef.current = true;
      setIsDragging(true);
      setWasDragged(true);

      const newX = dragStartRef.current.posX + dx;
      const newY = dragStartRef.current.posY + dy;

      // Clamp to viewport (bubble is ~60px, keep at least 20px visible)
      const maxX = window.innerWidth - 40;
      const maxY = window.innerHeight - 40;

      setPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY)),
      });
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      if (wasDraggedRef.current) {
        setPosition(prev => {
          try {
            localStorage.setItem(storageKey, JSON.stringify(prev));
          } catch { /* ignore */ }
          return prev;
        });
      }
      // Reset wasDragged after a tick so click handlers can check it
      setTimeout(() => setWasDragged(false), 0);
      dragStartRef.current = null;
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  }, [position, dragThreshold, storageKey]);

  return { position, isDragging, wasDragged, handlePointerDown };
}
