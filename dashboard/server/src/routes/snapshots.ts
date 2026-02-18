import { Router, Request, Response, NextFunction } from "express";
import {
  listSnapshots,
  getSnapshot,
  createSnapshot,
  deleteSnapshot,
} from "../services/snapshotService.js";

const router = Router();

router.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const snapshots = await listSnapshots();
    res.json(snapshots);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const snapshot = await getSnapshot(req.params.id);
    res.json(snapshot);
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const snapshot = await createSnapshot(req.body);
    res.status(201).json(snapshot);
  } catch (err) {
    next(err);
  }
});

router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await deleteSnapshot(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

export default router;
