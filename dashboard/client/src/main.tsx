import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";

// If this page is loaded inside a popup after an OAuth redirect, don't render
// the full app. The parent window's MSAL instance will read the URL params
// (code, state) from this popup and close it. Rendering the SPA would cause
// React Router to clear the URL params before the parent can read them.
const isPopupRedirect =
  window.opener !== null &&
  (window.location.search.includes("code=") ||
    window.location.hash.includes("code="));

if (!isPopupRedirect) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>
  );
}
