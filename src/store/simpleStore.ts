import { useCallback, useSyncExternalStore } from "react";

type Listener = () => void;

export type SimpleStore<T> = {
  get: () => T;
  set: (updater: T | ((prev: T) => T)) => void;
  subscribe: (listener: Listener) => () => void;
};

export function createSimpleStore<T>(initialState: T): SimpleStore<T> {
  let state = initialState;
  const listeners = new Set<Listener>();

  function set(updater: T | ((prev: T) => T)) {
    const next = typeof updater === "function" ? (updater as (p: T) => T)(state) : updater;
    if (Object.is(next, state)) return;
    state = next;
    listeners.forEach((l) => l());
  }

  function subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    get: () => state,
    set,
    subscribe
  };
}

export function useSimpleStore<T, S>(store: SimpleStore<T>, selector: (state: T) => S): S {
  const getSnapshot = useCallback(() => selector(store.get()), [store, selector]);
  return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
}
