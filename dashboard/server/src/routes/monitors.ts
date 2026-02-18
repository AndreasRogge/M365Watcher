import { Router, Request, Response, NextFunction } from "express";
import {
  listMonitors,
  getMonitor,
  createMonitor,
  updateMonitorBaseline,
  deleteMonitor,
} from "../services/monitorService.js";

const router = Router();

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const monitors = await listMonitors();
    res.json(monitors);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monitor = await getMonitor(req.params.id);
    res.json(monitor);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const monitor = await createMonitor(req.body);
    res.status(201).json(monitor);
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/:id/baseline",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const monitor = await updateMonitorBaseline(
        req.params.id,
        req.body.newBaselineSnapshotId
      );
      res.json(monitor);
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteMonitor(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
