import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, "../../.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Check your .env file.`
    );
  }
  return value;
}

export type AuthMode = "app" | "user" | "dual";

const authMode = (process.env.AUTH_MODE || "dual") as AuthMode;
if (!["app", "user", "dual"].includes(authMode)) {
  throw new Error(`Invalid AUTH_MODE: ${authMode}. Must be "app", "user", or "dual".`);
}

// Client secret is only required when app credentials mode is available
const clientSecret: string | undefined = authMode === "user"
  ? process.env.AZURE_CLIENT_SECRET
  : requireEnv("AZURE_CLIENT_SECRET");

// Allowed tenant IDs for multi-tenant user authentication.
// The home tenant is always allowed. Additional tenants are loaded from
// ALLOWED_TENANT_IDS (comma-separated). These are the tenants whose user
// tokens will be accepted by the auth middleware.
const homeTenantId = requireEnv("AZURE_TENANT_ID");
const extraTenantIds = (process.env.ALLOWED_TENANT_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const allowedTenantIds = new Set<string>([homeTenantId, ...extraTenantIds]);

export const config = {
  authMode,
  azure: {
    tenantId: homeTenantId,
    clientId: requireEnv("AZURE_CLIENT_ID"),
    clientSecret,
    allowedTenantIds,
  },
  server: {
    port: parseInt(process.env.PORT || "3001", 10),
    allowedOrigins: (process.env.CORS_ORIGIN || "http://localhost:5173")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },
  graph: {
    baseUrl: "https://graph.microsoft.com",
    utcmBasePath: "/beta/admin/configurationManagement",
    scopes: ["https://graph.microsoft.com/.default"],
  },
  tenantStore: {
    filePath: process.env.TENANT_STORE_PATH || resolve(__dirname, "../../data/tenants.json"),
  },
};
