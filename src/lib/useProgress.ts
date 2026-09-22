import { useSyncExternalStore } from 'react';
import { getServerSnapshot, getSnapshot, subscribe, type ProgressState } from './progress';

/**
 * Subscribes a React island to the localStorage-backed store.
 *
 * During SSR (and the first client render before hydration) this returns the
 * empty state, so every component that reads progress must tolerate "nothing
 * yet" — see `useHydrated` for gating anything that would otherwise flash.
 */
export function useProgress(): ProgressState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

import { useEffect, useState } from 'react';

/** False during SSR and the first client render, true afterwards. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
