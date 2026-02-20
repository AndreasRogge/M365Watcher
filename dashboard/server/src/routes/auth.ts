import { Router } from "express";
import { config } from "../config.js";
import { getRequestAuth } from "../middleware/requestContext.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = Router();

// Public — returns MSAL config for the frontend to bootstrap before auth.
// tenantId and clientId are non-secret OAuth public identifiers.
router.get("/config", (_req, res) => {
  const supportedModes: string[] = [];
  if (config.authMode === "app" || config.authMode === "dual") {
    supportedModes.push("app");
  }
  if (config.authMode === "user" || config.authMode === "dual") {
    supportedModes.push("user");
  }

  res.json({
    tenantId: config.azure.tenantId,
    clientId: config.azure.clientId,
    supportedModes,
  });
});

// Protected — returns current auth mode and user info
router.get("/status", authMiddleware, (req, res) => {
  const auth = getRequestAuth();

  if (auth.mode === "user" && auth.userClaims) {
    const claims = auth.userClaims;
    res.json({
      mode: "user",
      user: {
        name: claims.name || claims.preferred_username,
        email: claims.preferred_username || claims.upn || claims.email,
        oid: claims.oid,
      },
    });
    return;
  }

  res.json({ mode: "app" });
});

export default router;
