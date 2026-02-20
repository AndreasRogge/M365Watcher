import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import {
  PublicClientApplication,
  type AccountInfo,
  InteractionRequiredAuthError,
} from "@azure/msal-browser";
import { buildMsalConfig, graphScopes } from "./msalConfig";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [mode, setMode] = useState<AuthModeOption>("app");
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const msalRef = useRef<PublicClientApplication | null>(null);

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

  // Initialize MSAL when config is available
  useEffect(() => {
    if (!config) return;

    const msalConfig = buildMsalConfig(config.clientId, config.tenantId);
    const msal = new PublicClientApplication(msalConfig);

    msal.initialize().then(() => {
      msalRef.current = msal;
      // Check for cached accounts
      const accounts = msal.getAllAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }
    });
  }, [config]);

  const login = useCallback(async () => {
    const msal = msalRef.current;
    if (!msal) return;

    try {
      const result = await msal.loginPopup({
        scopes: graphScopes,
      });
      if (result.account) {
        setAccount(result.account);
        setMode("user");
        sessionStorage.setItem(MODE_STORAGE_KEY, "user");
      }
    } catch (err) {
      console.error("Login failed:", err);
    }
  }, []);

  const logout = useCallback(async () => {
    const msal = msalRef.current;
    if (!msal || !account) return;

    try {
      await msal.logoutPopup({ account });
      setAccount(null);
      // If user mode is the only option, stay on user. Otherwise switch to app.
      if (config?.supportedModes.includes("app")) {
        setMode("app");
        sessionStorage.setItem(MODE_STORAGE_KEY, "app");
      }
    } catch (err) {
      console.error("Logout failed:", err);
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
      if (err instanceof InteractionRequiredAuthError) {
        try {
          const result = await msal.acquireTokenPopup({
            scopes: graphScopes,
            account,
          });
          return result.accessToken;
        } catch (popupErr) {
          console.error("Token acquisition popup failed:", popupErr);
          return null;
        }
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
