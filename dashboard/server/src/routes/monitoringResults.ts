import { Router, Request, Response, NextFunction } from "express";
import {
  listMonitoringResults,
  getMonitoringResult,
} from "../services/monitoringResultService.js";

const router = Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await listMonitoringResults(
      req.query.monitorId as string | undefined
    );
    res.json(results);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getMonitoringResult(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
