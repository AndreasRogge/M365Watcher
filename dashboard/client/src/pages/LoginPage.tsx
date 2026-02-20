import { Shield, LogIn, Server, AlertTriangle } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login, switchMode, supportedModes, msalReady } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-gray-800 bg-gray-900 p-8">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-bold text-gray-100">M365Watcher</h1>
            <p className="text-xs text-gray-500 uppercase tracking-wider">
              UTCM Dashboard
            </p>
          </div>
        </div>

        {/* Sign in button */}
        {msalReady ? (
          <button
            onClick={login}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            <LogIn className="h-4 w-4" />
            Sign in with Microsoft
          </button>
        ) : (
          <div className="rounded-lg border border-yellow-800/50 bg-yellow-900/20 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
              <p className="text-xs text-yellow-400/80">
                OAuth login requires HTTPS or localhost. Use app credentials on
                plain HTTP, or access this dashboard via HTTPS.
              </p>
            </div>
          </div>
        )}

        {/* Switch to app mode */}
        {supportedModes.includes("app") && (
          <button
            onClick={() => switchMode("app")}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-700 px-4 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-200"
          >
            <Server className="h-4 w-4" />
            Use App Credentials
          </button>
        )}
      </div>
    </div>
  );
}
