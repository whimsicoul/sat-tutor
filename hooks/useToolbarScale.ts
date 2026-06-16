import { useState } from 'react';

const STORAGE_KEY = 'dc_toolbar_scale';
const DEFAULT_SCALE = 1;
const MIN_SCALE = 0.75;
const MAX_SCALE = 2;

export function useToolbarScale(): [number, (s: number) => void] {
  const [scale, setScaleState] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_SCALE;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_SCALE;
    const parsed = parseFloat(stored);
    return isNaN(parsed) ? DEFAULT_SCALE : Math.min(MAX_SCALE, Math.max(MIN_SCALE, parsed));
  });

  const setScale = (s: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
    setScaleState(clamped);
    localStorage.setItem(STORAGE_KEY, String(clamped));
  };

  return [scale, setScale];
}
