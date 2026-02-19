import { Router, Request, Response, NextFunction } from "express";
import { listSnapshots } from "../services/snapshotService.js";
import { listMonitors } from "../services/monitorService.js";
import { listDrifts } from "../services/driftService.js";
import { listMonitoringResults } from "../services/monitoringResultService.js";

const router = Router();

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // Fetch all data in parallel for the overview
    const [snapshots, monitors, activeDrifts, monitoringResults] =
      await Promise.all([
        listSnapshots(),
        listMonitors(),
        listDrifts({ status: "active" }),
        listMonitoringResults(),
      ]);

    // Find most recent monitoring result
    const sortedResults = monitoringResults.sort(
      (a, b) =>
        new Date(b.detectedDateTime).getTime() -
        new Date(a.detectedDateTime).getTime()
    );

    // Get recent drifts (last 10)
    const allDrifts = await listDrifts();
    const recentDrifts = allDrifts
      .sort(
        (a, b) =>
          new Date(b.detectedDateTime).getTime() -
          new Date(a.detectedDateTime).getTime()
      )
      .slice(0, 10);

    res.json({
      counts: {
        snapshots: snapshots.length,
        snapshotsByStatus: {
          succeeded: snapshots.filter((s) => s.status === "succeeded").length,
          inProgress: snapshots.filter((s) => s.status === "inProgress").length,
          failed: snapshots.filter((s) => s.status === "failed").length,
        },
        monitors: monitors.length,
        activeDrifts: activeDrifts.length,
        totalDrifts: allDrifts.length,
      },
      lastMonitoringRun: sortedResults[0] || null,
      recentDrifts,
      monitors: monitors.map((m) => ({
        id: m.id,
        displayName: m.displayName,
        createdDateTime: m.createdDateTime,
        lastMonitoringResult: m.lastMonitoringResult,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
