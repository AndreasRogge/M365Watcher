import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./components/layout/Layout";
import { Overview } from "./pages/Overview";
import { Snapshots } from "./pages/Snapshots";
import { SnapshotDetail } from "./pages/SnapshotDetail";
import { Monitors } from "./pages/Monitors";
import { MonitorDetail } from "./pages/MonitorDetail";
import { Drifts } from "./pages/Drifts";
import { DriftDetail } from "./pages/DriftDetail";
import { MonitoringResults } from "./pages/MonitoringResults";
import { ResourceTypes } from "./pages/ResourceTypes";
import { Settings } from "./pages/SettingsPage";
import { LoginPage } from "./pages/LoginPage";
import { useAuth } from "./auth/AuthContext";
import { setTokenProvider } from "./api/client";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
    },
  },
});

function AppContent() {
  const { mode, isAuthenticated, loading, getAccessToken } = useAuth();

  // Wire up token provider for the axios client
  useEffect(() => {
    setTokenProvider(getAccessToken);
  }, [getAccessToken]);

  if (loading) return null;

  // If user mode selected but not yet authenticated, show login
  if (mode === "user" && !isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="snapshots" element={<Snapshots />} />
          <Route path="snapshots/:id" element={<SnapshotDetail />} />
          <Route path="monitors" element={<Monitors />} />
          <Route path="monitors/:id" element={<MonitorDetail />} />
          <Route path="drifts" element={<Drifts />} />
          <Route path="drifts/:id" element={<DriftDetail />} />
          <Route path="monitoring-results" element={<MonitoringResults />} />
          <Route path="resource-types" element={<ResourceTypes />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
