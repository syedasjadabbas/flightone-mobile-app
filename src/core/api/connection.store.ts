import { create } from "zustand";

/**
 * Whether the FlightOne API answered the last request. Set by the shared API
 * layer: a network failure / timeout marks it unreachable; any HTTP response
 * (even an error status) marks it reachable again.
 */
type ConnectionState = {
  reachable: boolean;
  setReachable: (reachable: boolean) => void;
};

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  reachable: true,
  setReachable: (reachable) => {
    if (get().reachable !== reachable) set({ reachable });
  },
}));
