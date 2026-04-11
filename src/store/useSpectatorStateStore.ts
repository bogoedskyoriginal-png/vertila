import type { SpectatorHiddenState } from "../types/motion";
import { createSimpleStore, useSimpleStore } from "./simpleStore";

const EMPTY_STATE: SpectatorHiddenState = {
  classifiedDirection: null,
  classifiedResultIndex: null,
  selectedPredictionText: null,
  confidenceScore: null,
  lockedAt: null
};

const spectatorStore = createSimpleStore<SpectatorHiddenState>({ ...EMPTY_STATE });

export function useSpectatorStateStore<T>(selector: (state: SpectatorHiddenState) => T) {
  return useSimpleStore(spectatorStore, selector);
}

export function updateSpectatorHiddenState(updater: (prev: SpectatorHiddenState) => SpectatorHiddenState) {
  spectatorStore.set(updater);
}

export function resetSpectatorHiddenState() {
  spectatorStore.set({ ...EMPTY_STATE });
}
