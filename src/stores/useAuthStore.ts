import { create } from "zustand";
import type { SocialConnection } from "@eazo/auth";
import { auth } from "@eazo/sdk";

interface AuthUIState {
  loginModalOpen: boolean;
  socialConnections: SocialConnection[];
  socialConnectionsLoading: boolean;

  openLoginModal: () => void;
  closeLoginModal: () => void;
  loadSocialConnections: () => Promise<void>;
}

let loadConnectionsInFlight: Promise<void> | null = null;

export const useAuthStore = create<AuthUIState>((set, get) => ({
  loginModalOpen: false,
  socialConnections: [],
  socialConnectionsLoading: false,

  openLoginModal: () => {
    set({ loginModalOpen: true });
    get().loadSocialConnections().catch(console.error);
  },
  closeLoginModal: () => set({ loginModalOpen: false }),

  loadSocialConnections: async () => {
    if (get().socialConnections.length > 0) return;
    if (loadConnectionsInFlight) return loadConnectionsInFlight;

    loadConnectionsInFlight = (async () => {
      set({ socialConnectionsLoading: true });
      try {
        const all = await auth.fetchSocialConnections();
        set({ socialConnections: all.filter((c) => c.tagsStatus) });
      } catch (err) {
        console.error(err);
      } finally {
        set({ socialConnectionsLoading: false });
        loadConnectionsInFlight = null;
      }
    })();

    return loadConnectionsInFlight;
  },
}));
