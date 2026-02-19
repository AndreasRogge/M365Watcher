import { Router, Request, Response, NextFunction } from "express";
import { listDrifts, getDrift } from "../services/driftService.js";

const router = Router();

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const drifts = await listDrifts({
      monitorId: req.query.monitorId as string | undefined,
      status: req.query.status as "active" | "resolved" | undefined,
    });
    res.json(drifts);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const drift = await getDrift(req.params.id);
    res.json(drift);
  } catch (err) {
    next(err);
  }
});

export default router;
