import { create } from "zustand";
import type { UserInfo, SocialConnection } from "@eazo/auth";
import { auth } from "@/lib/auth/client";
import { getSession, setSession, removeSession } from "@/utils/token";
import { fetchUserProfile } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthState {
  user: UserInfo | null;
  loading: boolean;
  initialized: boolean;
  loginModalOpen: boolean;

  socialConnections: SocialConnection[];
  socialConnectionsLoading: boolean;

  openLoginModal: () => void;
  closeLoginModal: () => void;
  initAuth: () => Promise<void>;
  loadSocialConnections: () => Promise<void>;
  loginWithSocial: (extIdpIdentifier: string) => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  loginWithEmailCode: (email: string, code: string) => Promise<void>;
  sendEmailCode: (email: string) => Promise<void>;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let initAuthInFlight: Promise<void> | null = null;
let loadConnectionsInFlight: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,
  loginModalOpen: false,

  socialConnections: [],
  socialConnectionsLoading: false,

  openLoginModal: () => {
    set({ loginModalOpen: true });
    // Kick off social connection fetch when the modal opens (no-op if already loaded)
    get().loadSocialConnections().catch(console.error);
  },
  closeLoginModal: () => set({ loginModalOpen: false }),

  initAuth: async () => {
    if (get().initialized) return;
    if (initAuthInFlight) return initAuthInFlight;

    initAuthInFlight = (async () => {
      set({ loading: true });

      if (auth.isEazoMobile()) {
        // Fetch session from bridge and persist it so request() can read it
        const session = await auth.loginByEazoMobile();
        setSession(session);
      }

      if (!getSession()) {
        set({ user: null, loading: false, initialized: true });
        return;
      }

      const user = await fetchUserProfile();
      set({ user, loading: false, initialized: true });
    })();

    try {
      await initAuthInFlight;
    } finally {
      initAuthInFlight = null;
    }
  },

  loadSocialConnections: async () => {
    // Skip if already loaded or in-flight
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

  loginWithSocial: async (extIdpIdentifier) => {
    const session = await auth.loginWithSocial(extIdpIdentifier);
    setSession(session);
    const user = await fetchUserProfile();
    set({ user, loginModalOpen: false });
  },

  loginWithEmailPassword: async (email, password) => {
    const session = await auth.loginWithEmailPassword(email, password);
    setSession(session);
    const user = await fetchUserProfile();
    set({ user, loginModalOpen: false });
  },

  loginWithEmailCode: async (email, code) => {
    const session = await auth.loginWithEmailCode(email, code);
    setSession(session);
    const user = await fetchUserProfile();
    set({ user, loginModalOpen: false });
  },

  sendEmailCode: (email) => auth.sendEmailCode(email),

  logout: () => {
    removeSession();
    set({ user: null, initialized: true, loading: false });
  },
}));
