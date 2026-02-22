import { Router } from "express";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { config } from "../config.js";
import {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  setDefaultTenant,
} from "../services/tenantStore.js";

const router = Router();

// GET /api/tenants — List all registered tenants
router.get("/", async (_req, res, next) => {
  try {
    const tenants = await listTenants();
    res.json({ value: tenants });
  } catch (err) {
    next(err);
  }
});

// GET /api/tenants/:id — Get a single tenant registration
router.get("/:id", async (req, res, next) => {
  try {
    const tenant = await getTenant(req.params.id);
    if (!tenant) {
      res.status(404).json({
        error: { code: "NotFound", message: `Tenant registration ${req.params.id} not found.` },
      });
      return;
    }
    res.json(tenant);
  } catch (err) {
    next(err);
  }
});

// POST /api/tenants — Register a new tenant
router.post("/", async (req, res, next) => {
  try {
    const { displayName, tenantId, color } = req.body;

    if (!displayName || !tenantId) {
      res.status(400).json({
        error: { code: "BadRequest", message: "displayName and tenantId are required." },
      });
      return;
    }

    const tenant = await createTenant({ displayName, tenantId, color });
    res.status(201).json(tenant);
  } catch (err) {
    if (err instanceof Error && err.message.includes("already registered")) {
      res.status(409).json({ error: { code: "Conflict", message: err.message } });
      return;
    }
    if (err instanceof Error && err.message.includes("Invalid tenant ID")) {
      res.status(400).json({ error: { code: "BadRequest", message: err.message } });
      return;
    }
    next(err);
  }
});

// PUT /api/tenants/:id — Update a tenant registration
router.put("/:id", async (req, res, next) => {
  try {
    const { displayName, color } = req.body;
    const tenant = await updateTenant(req.params.id, { displayName, color });
    res.json(tenant);
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      res.status(404).json({ error: { code: "NotFound", message: err.message } });
      return;
    }
    next(err);
  }
});

// DELETE /api/tenants/:id — Remove a tenant registration
router.delete("/:id", async (req, res, next) => {
  try {
    await deleteTenant(req.params.id);
    res.status(204).end();
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      res.status(404).json({ error: { code: "NotFound", message: err.message } });
      return;
    }
    next(err);
  }
});

// POST /api/tenants/:id/default — Set a tenant as the default
router.post("/:id/default", async (req, res, next) => {
  try {
    const tenant = await setDefaultTenant(req.params.id);
    res.json(tenant);
  } catch (err) {
    if (err instanceof Error && err.message.includes("not found")) {
      res.status(404).json({ error: { code: "NotFound", message: err.message } });
      return;
    }
    next(err);
  }
});

// POST /api/tenants/:id/test — Test connectivity to a tenant
router.post("/:id/test", async (req, res, next) => {
  try {
    const tenant = await getTenant(req.params.id);
    if (!tenant) {
      res.status(404).json({
        error: { code: "NotFound", message: `Tenant registration ${req.params.id} not found.` },
      });
      return;
    }

    if (!config.azure.clientSecret) {
      res.status(500).json({
        error: { code: "ConfigError", message: "Client credentials not configured." },
      });
      return;
    }

    // Try to acquire a token for this tenant using the shared app credentials
    const testClient = new ConfidentialClientApplication({
      auth: {
        clientId: config.azure.clientId,
        authority: `https://login.microsoftonline.com/${tenant.tenantId}`,
        clientSecret: config.azure.clientSecret,
      },
    });

    const result = await testClient.acquireTokenByClientCredential({
      scopes: config.graph.scopes,
    });

    if (!result?.accessToken) {
      res.json({
        success: false,
        message: "Token acquisition returned no access token.",
      });
      return;
    }

    // Try a basic Graph call to verify the token works
    const graphResponse = await fetch(
      `${config.graph.baseUrl}/v1.0/organization`,
      {
        headers: { Authorization: `Bearer ${result.accessToken}` },
      }
    );

    if (graphResponse.ok) {
      const data = await graphResponse.json();
      const orgName = data.value?.[0]?.displayName || "Unknown";
      res.json({
        success: true,
        message: `Connected successfully to "${orgName}" (${tenant.tenantId}).`,
        organization: orgName,
      });
    } else {
      res.json({
        success: false,
        message: `Token acquired but Graph call failed with HTTP ${graphResponse.status}.`,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.json({
      success: false,
      message: `Connection test failed: ${message}`,
    });
  }
});

export default router;
