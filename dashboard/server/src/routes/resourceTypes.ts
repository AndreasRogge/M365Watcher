import { Router } from "express";
import { getResourceTypes } from "../services/resourceTypeService.js";

const router = Router();

router.get("/", (_req, res) => {
  res.json(getResourceTypes());
});

export default router;
