import { useCallback, useEffect, useState } from 'react';
import { guests } from '../config';

/** true when the OS asks for reduced motion. Reacts to live changes. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Probes for a usable WebGL context once. false → render the 2D fallback. */
export function useWebGLSupport(): boolean {
  const [supported] = useState(() => {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(
        window.WebGLRenderingContext &&
          (canvas.getContext('webgl2') || canvas.getContext('webgl')),
      );
    } catch {
      return false;
    }
  });
  return supported;
}

/**
 * Per-bomboniera personalisation.
 * Supports /?for=marco, /#marco and /graduation/marco — the last one only on
 * hosts with SPA rewrites; the query form is the safe default for the QR.
 */
export function useGuest() {
  const [key] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get('for');
    const fromHash = window.location.hash.replace(/^#\/?/, '');
    const fromPath = window.location.pathname.split('/').filter(Boolean).pop();
    for (const candidate of [fromQuery, fromHash, fromPath]) {
      const slug = candidate?.toLowerCase();
      if (slug && slug in guests) return slug;
    }
    return null;
  });
  return key ? { key, ...guests[key] } : null;
}

/** A boolean flag persisted in localStorage (safe in private mode). */
export function usePersistentFlag(storageKey: string) {
  const [value, setValue] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });
  const set = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        /* storage unavailable — keep it in memory only */
      }
    },
    [storageKey],
  );
  return [value, set] as const;
}

/** A persisted set of discovered easter-egg ids. */
export function useFoundEggs(storageKey = 'bomboniera.eggs') {
  const [found, setFound] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  /** Returns true when the egg was new. */
  const discover = useCallback(
    (id: string) => {
      let isNew = false;
      setFound((prev) => {
        if (prev.includes(id)) return prev;
        isNew = true;
        const next = [...prev, id];
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      return isNew;
    },
    [storageKey],
  );

  return { found, discover };
}

/** Locks body scroll while a full-screen panel is open. */
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [locked]);
}
