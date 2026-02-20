import { LogIn, LogOut, Server, User } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export function Settings() {
  const { mode, isAuthenticated, account, supportedModes, login, logout, switchMode } = useAuth();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-100">Settings</h1>

      {/* Auth mode section */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Authentication
        </h2>

        <div className="space-y-3">
          {/* App credentials option */}
          {supportedModes.includes("app") && (
            <button
              onClick={() => switchMode("app")}
              className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
                mode === "app"
                  ? "border-blue-500/50 bg-blue-600/10"
                  : "border-gray-800 hover:border-gray-700"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  mode === "app" ? "bg-blue-600/20 text-blue-400" : "bg-gray-800 text-gray-500"
                }`}
              >
                <Server className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${mode === "app" ? "text-blue-400" : "text-gray-300"}`}>
                  App Credentials
                </p>
                <p className="text-xs text-gray-500">
                  Uses client ID and secret configured on the server
                </p>
              </div>
              {mode === "app" && (
                <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                  Active
                </span>
              )}
            </button>
          )}

          {/* User OAuth option */}
          {supportedModes.includes("user") && (
            <button
              onClick={() => {
                if (mode !== "user") {
                  switchMode("user");
                  if (!isAuthenticated) login();
                }
              }}
              className={`flex w-full items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
                mode === "user"
                  ? "border-blue-500/50 bg-blue-600/10"
                  : "border-gray-800 hover:border-gray-700"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  mode === "user" ? "bg-blue-600/20 text-blue-400" : "bg-gray-800 text-gray-500"
                }`}
              >
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${mode === "user" ? "text-blue-400" : "text-gray-300"}`}>
                  User OAuth
                </p>
                <p className="text-xs text-gray-500">
                  Sign in with your Microsoft account (delegated permissions)
                </p>
              </div>
              {mode === "user" && (
                <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-[10px] font-medium text-blue-400">
                  Active
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* User info section — shown when in user mode and authenticated */}
      {mode === "user" && isAuthenticated && account && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-300 uppercase tracking-wider">
            Signed-in User
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {(account.name || account.username || "?").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-200">{account.name}</p>
              <p className="text-xs text-gray-500">{account.username}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:border-red-800 hover:text-red-400"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Sign in prompt — shown when in user mode but not authenticated */}
      {mode === "user" && !isAuthenticated && (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">Not signed in</p>
            <button
              onClick={login}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign in
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
