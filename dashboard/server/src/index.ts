import express from "express";
import cors from "cors";
import { existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { config } from "./config.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authMiddleware } from "./middleware/authMiddleware.js";
import authRoutes from "./routes/auth.js";
import snapshotRoutes from "./routes/snapshots.js";
import monitorRoutes from "./routes/monitors.js";
import driftRoutes from "./routes/drifts.js";
import monitoringResultRoutes from "./routes/monitoringResults.js";
import resourceTypeRoutes from "./routes/resourceTypes.js";
import summaryRoutes from "./routes/summary.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Auth config endpoint (public, before auth middleware)
app.use("/api/auth", authRoutes);

// Auth middleware for all other API routes
app.use("/api", authMiddleware);

// API Routes
app.use("/api/snapshots", snapshotRoutes);
app.use("/api/monitors", monitorRoutes);
app.use("/api/drifts", driftRoutes);
app.use("/api/monitoring-results", monitoringResultRoutes);
app.use("/api/resource-types", resourceTypeRoutes);
app.use("/api/summary", summaryRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// In production (Docker), serve the built React frontend
const publicDir = resolve(__dirname, "../public");
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  // SPA fallback: serve index.html for all non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(resolve(publicDir, "index.html"));
  });
}

// Error handling (must be last)
app.use(errorHandler);

app.listen(config.server.port, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║   M365Watcher Dashboard API Server           ║
  ║   Running on http://localhost:${config.server.port}            ║
  ║                                              ║
  ║   Tenant: ${config.azure.tenantId.substring(0, 8)}...  ║
  ║   Client: ${config.azure.clientId.substring(0, 8)}...  ║
  ╚══════════════════════════════════════════════╝
  `);
});
