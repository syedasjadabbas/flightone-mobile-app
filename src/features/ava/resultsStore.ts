import { create } from "zustand";
import type { SearchResultsPanel } from "./types";

/**
 * Hands one reply's results to the full results page (`/results/[id]`).
 * The chat keeps the panel on the message; this is just the bridge between screens.
 */
type ResultsState = {
  panels: Record<string, SearchResultsPanel>;
  put: (id: string, panel: SearchResultsPanel) => void;
};

export const useResultsStore = create<ResultsState>((set) => ({
  panels: {},
  put: (id, panel) => set((s) => ({ panels: { ...s.panels, [id]: panel } })),
}));
