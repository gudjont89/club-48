import { useEffect } from 'react';

interface UseKeyboardOptions {
  onEscape?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  enabled?: boolean;
}

export function useKeyboard({ onEscape, onArrowLeft, onArrowRight, enabled = true }: UseKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
      }
      if (e.key === 'ArrowLeft' && onArrowLeft) {
        e.preventDefault();
        onArrowLeft();
      }
      if (e.key === 'ArrowRight' && onArrowRight) {
        e.preventDefault();
        onArrowRight();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, onArrowLeft, onArrowRight, enabled]);
}
