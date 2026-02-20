import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { AccountInfo } from "@azure/msal-browser";
import { graphScopes } from "./msalConfig";

type AuthModeOption = "app" | "user";

interface AuthConfig {
  tenantId: string;
  clientId: string;
  supportedModes: AuthModeOption[];
}

interface AuthContextValue {
  mode: AuthModeOption;
  isAuthenticated: boolean;
  account: AccountInfo | null;
  supportedModes: AuthModeOption[];
  loading: boolean;
  msalReady: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  switchMode: (mode: AuthModeOption) => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

const MODE_STORAGE_KEY = "m365watcher_auth_mode";

// Detect if crypto.subtle is available (requires HTTPS or localhost)
function isSecureContext(): boolean {
  try {
    return typeof globalThis.crypto?.subtle !== "undefined";
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [mode, setMode] = useState<AuthModeOption>("app");
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [msalReady, setMsalReady] = useState(false);
  // Use `any` for the ref since we lazy-import the MSAL module
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msalRef = useRef<any>(null);

  // Fetch auth config from backend on mount
  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then((data: AuthConfig) => {
        setConfig(data);

        // Determine initial mode
        const saved = sessionStorage.getItem(MODE_STORAGE_KEY) as AuthModeOption | null;
        if (saved && data.supportedModes.includes(saved)) {
          setMode(saved);
        } else if (data.supportedModes.length === 1) {
          setMode(data.supportedModes[0]);
        } else {
          setMode("app");
        }
      })
      .catch((err) => {
        console.error("Failed to fetch auth config:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Lazy-initialize MSAL only when user mode is supported AND crypto.subtle is available.
  // MSAL requires crypto.subtle (HTTPS or localhost). On plain HTTP to a non-localhost
  // address, we skip MSAL init entirely — app credentials mode still works fine.
  useEffect(() => {
    if (!config) return;
    if (!config.supportedModes.includes("user")) return;
    if (!isSecureContext()) {
      console.warn(
        "[Auth] crypto.subtle is not available (requires HTTPS or localhost). " +
        "User OAuth login is disabled. App credentials mode still works."
      );
      return;
    }

    // Dynamic import to avoid loading MSAL at all when not needed
    import("@azure/msal-browser").then(async ({ PublicClientApplication }) => {
      try {
        const { buildMsalConfig } = await import("./msalConfig");
        const msalConfig = buildMsalConfig(config.clientId, config.tenantId);
        const msal = new PublicClientApplication(msalConfig);
        await msal.initialize();

        // Process any pending redirect (returns auth result after login redirect)
        const redirectResult = await msal.handleRedirectPromise();
        if (redirectResult?.account) {
          setAccount(redirectResult.account);
          setMode("user");
          sessionStorage.setItem(MODE_STORAGE_KEY, "user");
        }

        msalRef.current = msal;
        setMsalReady(true);

        // Check for cached accounts (covers page refresh after previous login)
        if (!redirectResult) {
          const accounts = msal.getAllAccounts();
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }
        }
      } catch (err) {
        console.error("[Auth] MSAL initialization failed:", err);
      }
    }).catch((err) => {
      console.error("[Auth] Failed to load MSAL module:", err);
    });
  }, [config]);

  const login = useCallback(async () => {
    const msal = msalRef.current;
    if (!msal) return;

    try {
      // Use redirect flow — navigates away then returns with auth code.
      // handleRedirectPromise() in the MSAL init effect processes the result.
      await msal.loginRedirect({
        scopes: graphScopes,
      });
    } catch (err) {
      console.error("Login redirect failed:", err);
    }
  }, []);

  const logout = useCallback(async () => {
    const msal = msalRef.current;
    if (!msal || !account) return;

    try {
      // Clear mode before redirect so the app returns to app-credentials mode
      if (config?.supportedModes.includes("app")) {
        sessionStorage.setItem(MODE_STORAGE_KEY, "app");
      }
      await msal.logoutRedirect({ account });
    } catch (err) {
      console.error("Logout redirect failed:", err);
    }
  }, [account, config]);

  const switchMode = useCallback(
    (newMode: AuthModeOption) => {
      if (config?.supportedModes.includes(newMode)) {
        setMode(newMode);
        sessionStorage.setItem(MODE_STORAGE_KEY, newMode);
      }
    },
    [config]
  );

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (mode !== "user" || !account) return null;

    const msal = msalRef.current;
    if (!msal) return null;

    try {
      const result = await msal.acquireTokenSilent({
        scopes: graphScopes,
        account,
      });
      return result.accessToken;
    } catch (err) {
      // Dynamic import to avoid top-level MSAL dependency
      try {
        const { InteractionRequiredAuthError } = await import("@azure/msal-browser");
        if (err instanceof InteractionRequiredAuthError) {
          // Redirect to re-authenticate; handleRedirectPromise() will process on return
          await msal.acquireTokenRedirect({
            scopes: graphScopes,
            account,
          });
          return null;
        }
      } catch (redirectErr) {
        console.error("Token acquisition redirect failed:", redirectErr);
        return null;
      }
      console.error("Token acquisition failed:", err);
      return null;
    }
  }, [mode, account]);

  const isAuthenticated = mode === "user" && account !== null;

  return (
    <AuthContext.Provider
      value={{
        mode,
        isAuthenticated,
        account,
        supportedModes: config?.supportedModes ?? [],
        loading,
        msalReady,
        login,
        logout,
        switchMode,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
