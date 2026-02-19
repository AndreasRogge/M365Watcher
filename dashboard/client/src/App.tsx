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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000, // 30 seconds
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
