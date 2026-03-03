import { Shield, LogIn, Server, AlertTriangle } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { login, switchMode, supportedModes, msalReady } = useAuth();

  return (
    <div className="login-bg flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm animate-in animate-in-1">
        <div className="card-surface rounded-2xl p-8 shadow-2xl shadow-black/40">
          {/* Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="logo-glow flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-lg font-bold tracking-tight text-gray-100">
                M365Watcher
              </h1>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500">
                UTCM Dashboard
              </p>
            </div>
          </div>

          <div className="my-6 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* Sign in button */}
          <div className="space-y-3">
            {msalReady ? (
              <button
                onClick={login}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-blue-600 px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 hover:shadow-blue-500/30 hover:translate-y-[-1px] active:translate-y-0"
              >
                <LogIn className="h-4 w-4" />
                Sign in with Microsoft
              </button>
            ) : (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-[12px] leading-relaxed text-amber-400/80">
                    OAuth login requires HTTPS or localhost. Use app credentials
                    on plain HTTP, or access this dashboard via HTTPS.
                  </p>
                </div>
              </div>
            )}

            {/* Switch to app mode */}
            {supportedModes.includes("app") && (
              <button
                onClick={() => switchMode("app")}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[13px] font-medium text-gray-400 transition-all hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-gray-200"
              >
                <Server className="h-4 w-4" />
                Use App Credentials
              </button>
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-gray-700">
          Unified Tenant Configuration Management
        </p>
      </div>
    </div>
  );
}
