import { EmailScene } from "authing-js-sdk";
import { create } from "zustand";
import { getAuthingClient } from "@/lib/auth/authing";
import { getToken, setToken, removeToken } from "@/lib/auth/token";
import { isEazoMobile } from "@/lib/api/fetch-with-auth";
import { fetchUserProfile } from "@/lib/api";
import type { UserInfo } from "@/components/user-profile/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthState {
  user: UserInfo | null;
  loading: boolean;
  initialized: boolean;
  loginModalOpen: boolean;

  openLoginModal: () => void;
  closeLoginModal: () => void;
  initAuth: () => Promise<void>;
  loginWithSocial: (extIdpIdentifier: string) => Promise<void>;
  loginWithEmailPassword: (email: string, password: string) => Promise<void>;
  loginWithEmailCode: (email: string, code: string) => Promise<void>;
  sendEmailCode: (email: string) => Promise<void>;
  logout: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Prevent concurrent initAuth calls
let initAuthInFlight: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  initialized: false,
  loginModalOpen: false,

  openLoginModal: () => set({ loginModalOpen: true }),
  closeLoginModal: () => set({ loginModalOpen: false }),

  /**
   * Called once on app start. Fetches user profile via /api/user/profile so
   * both Eazo Mobile and Web share the exact same initialization path.
   *
   * Web: requires a valid JWT in localStorage; if absent/expired the server
   *      returns 401 and we clear the user.
   * Mobile: fetchWithAuth injects the bridge session header automatically;
   *         no token storage needed.
   */
  initAuth: async () => {
    if (get().initialized) return;
    if (initAuthInFlight) return initAuthInFlight;

    initAuthInFlight = (async () => {
      set({ loading: true });

      // Web: skip network call entirely if there's no local token
      if (!isEazoMobile() && !getToken()) {
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

  loginWithSocial: (extIdpIdentifier) =>
    new Promise<void>((resolve, reject) => {
      const client = getAuthingClient();
      client.social.authorize(extIdpIdentifier, {
        onSuccess: async (profile) => {
          const p = profile as unknown as Record<string, unknown>;
          const token = (p.token ?? p.id_token) as string | undefined;
          if (token) setToken(token);
          // Fetch canonical profile from server (runs JWKS verification)
          const user = await fetchUserProfile();
          set({ user, loginModalOpen: false });
          resolve();
        },
        onError: (code: number, message: string) => {
          reject(new Error(message || `Social login failed (${code})`));
        },
      });
    }),

  loginWithEmailPassword: async (email, password) => {
    const client = getAuthingClient();
    const result = (await client.loginByEmail(email, password)) as unknown as Record<string, unknown>;
    const token = (result.token ?? result.id_token) as string | undefined;
    if (token) setToken(token);
    const user = await fetchUserProfile();
    set({ user, loginModalOpen: false });
  },

  loginWithEmailCode: async (email, code) => {
    const client = getAuthingClient();
    const result = (await client.loginByEmailCode(email, code)) as unknown as Record<string, unknown>;
    const token = (result.token ?? result.id_token) as string | undefined;
    if (token) setToken(token);
    const user = await fetchUserProfile();
    set({ user, loginModalOpen: false });
  },

  sendEmailCode: async (email) => {
    const client = getAuthingClient();
    await client.sendEmail(email, EmailScene.LOGIN_VERIFY_CODE);
  },

  logout: () => {
    removeToken();
    set({ user: null, initialized: true, loading: false });
  },
}));
